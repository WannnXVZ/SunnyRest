import hashlib
import io
import logging
import os
import time
from typing import Optional

import torch
import torch.nn.functional as F
from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from PIL import Image, UnidentifiedImageError
from torchvision import transforms

from .config import settings
from .inference.classifier import CLASS_NAMES, create_model
from .inference.enhancer import RealESRGANEnhancer
from .onchain import OnChainVerificationError, verify_restoration_payment
from .schemas import HealthResponse, PredictionResponse

logger = logging.getLogger("sunnyrest.api")
logging.basicConfig(level=logging.INFO)

app = FastAPI(title=settings.PROJECT_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=[
        "X-Method",
        "X-Model-Version",
        "X-Inference-Time-MS",
        "X-Scale",
        "X-Request-Id",
        "X-Payment-Verified",
    ],
)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

classifier_model = None
classifier_loaded = False
classifier_version = "efficientnet_b0_v1"

enhancer = None
sr_loaded = False


def _file_sha256(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def _load_models() -> None:
    global classifier_model, classifier_loaded, classifier_version, enhancer, sr_loaded

    classifier_path = settings.resolved_classifier_path()
    if os.path.exists(classifier_path):
        try:
            model = create_model(pretrained=False).to(device)
            ckpt = torch.load(classifier_path, map_location=device, weights_only=True)
            state_dict = ckpt["model_state_dict"] if isinstance(ckpt, dict) and "model_state_dict" in ckpt else ckpt
            model.load_state_dict(state_dict)
            model.eval()
            classifier_model = model
            classifier_loaded = True
            classifier_version = os.path.splitext(os.path.basename(classifier_path))[0]
            logger.info(
                "Classifier loaded: %s (sha256=%s)",
                classifier_path,
                _file_sha256(classifier_path),
            )
        except Exception as exc:
            classifier_loaded = False
            logger.error("Failed to load classifier (%s): %s", classifier_path, exc)
    else:
        classifier_loaded = False
        logger.warning("Classifier checkpoint not found at: %s", classifier_path)

    if os.path.exists(settings.MODEL_SR_PATH):
        try:
            enhancer = RealESRGANEnhancer(model_path=settings.MODEL_SR_PATH, device=device)
            sr_loaded = True
            logger.info(
                "SR Model loaded: %s (sha256=%s)",
                settings.MODEL_SR_PATH,
                _file_sha256(settings.MODEL_SR_PATH),
            )
        except Exception as exc:
            sr_loaded = False
            logger.error("Failed to load SR model (%s): %s", settings.MODEL_SR_PATH, exc)
    else:
        sr_loaded = False
        logger.warning("SR checkpoint not found at: %s", settings.MODEL_SR_PATH)


_load_models()

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])


async def _read_and_validate_image(file: UploadFile, check_dim: bool = False) -> Image.Image:
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Berkas kosong atau rusak.")
    if len(content) > settings.MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Ukuran berkas melebihi batas maksimum {settings.MAX_UPLOAD_BYTES // (1024 * 1024)} MB.",
        )
    try:
        img = Image.open(io.BytesIO(content))
        img.load()
        rgb_img = img.convert("RGB")
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=f"Berkas gambar tidak valid atau rusak: {exc}") from exc

    if check_dim and max(rgb_img.size) > settings.MAX_IMAGE_DIM:
        raise HTTPException(
            status_code=413,
            detail=f"Dimensi sisi terpanjang melebihi batas {settings.MAX_IMAGE_DIM} px.",
        )
    return rgb_img


@app.get("/health", response_model=HealthResponse)
async def health():
    all_ready = classifier_loaded and sr_loaded
    return {
        "status": "ok" if all_ready else "degraded",
        "model_loaded": all_ready,
        "classifier_loaded": classifier_loaded,
        "sr_loaded": sr_loaded,
    }


@app.post("/predict", response_model=PredictionResponse)
async def predict(file: UploadFile = File(...)):
    if not classifier_loaded or classifier_model is None:
        raise HTTPException(status_code=503, detail="Model klasifikasi belum dimuat atau tidak tersedia.")

    img = await _read_and_validate_image(file, check_dim=False)
    try:
        tensor_img = transform(img).unsqueeze(0).to(device)
        with torch.no_grad():
            outputs = classifier_model(tensor_img)
            probs = F.softmax(outputs, dim=1).squeeze().cpu().numpy()

        pred_idx = int(probs.argmax())
        scores = {CLASS_NAMES[i]: float(probs[i]) for i in range(len(CLASS_NAMES))}

        return {
            "label": CLASS_NAMES[pred_idx],
            "confidence": float(probs[pred_idx]),
            "scores": scores,
            "model_version": classifier_version,
        }
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Kegagalan inferensi klasifikasi: {exc}") from exc


@app.post("/enhance")
async def enhance(
    file: UploadFile = File(...),
    scale: int = Form(4),
    request_id: Optional[int] = Form(None),
    request_id_query: Optional[int] = Query(None, alias="request_id"),
):
    if scale != 4:
        raise HTTPException(status_code=400, detail="Hanya faktor pembesaran scale=4 yang didukung oleh model Real-ESRGAN x4.")

    if not sr_loaded or enhancer is None:
        raise HTTPException(status_code=503, detail="Model super-resolution belum dimuat atau tidak tersedia.")

    effective_request_id = request_id if request_id is not None else request_id_query
    payment_verified = False
    if settings.VERIFY_ONCHAIN_PAYMENT:
        try:
            verify_restoration_payment(settings.RPC_URL, settings.CONTRACT_ADDRESS, effective_request_id)
            payment_verified = True
        except OnChainVerificationError as exc:
            raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc

    img = await _read_and_validate_image(file, check_dim=True)
    try:
        start_time = time.perf_counter()
        enhanced_img = enhancer.enhance(img)
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        buf = io.BytesIO()
        enhanced_img.save(buf, format="PNG")
        buf.seek(0)

        headers = {
            "X-Method": "Real-ESRGAN",
            "X-Model-Version": "x4plus",
            "X-Scale": "4",
            "X-Inference-Time-MS": str(elapsed_ms),
            "X-Payment-Verified": "true" if payment_verified else "false",
        }
        if effective_request_id is not None:
            headers["X-Request-Id"] = str(effective_request_id)

        return StreamingResponse(buf, media_type="image/png", headers=headers)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Kegagalan inferensi super-resolution: {exc}") from exc
