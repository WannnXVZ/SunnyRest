"""
Server AI tiruan untuk pengembangan lokal dan uji integrasi awal.
Meniru kontrak API backend asli:
- GET  /health
- POST /predict -> JSON
- POST /enhance -> PNG StreamingResponse + header X-Method, X-Model-Version, X-Inference-Time-MS
"""
import hashlib
import io
import os
import sys
import time
from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from PIL import Image, UnidentifiedImageError

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from app.onchain import OnChainVerificationError, verify_restoration_payment  # noqa: E402

LABELS = ["orang", "bangunan", "lanskap"]
MOCK_FAIL = os.getenv("MOCK_FAIL") == "1"  # 1 = simulasi layanan AI gagal (HTTP 503)
MOCK_VERIFY_ONCHAIN = os.getenv("VERIFY_ONCHAIN_PAYMENT", "false").lower() == "true"
RPC_URL = os.getenv("RPC_URL", "http://127.0.0.1:8545")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS", "0x5FbDB2315678afecb367f032d93F642f64180aa3")

app = FastAPI(title="Mock AI P5 - SunnyRest")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=[
        "X-Method",
        "X-Model-Version",
        "X-Inference-Time-MS",
        "X-Scale",
        "X-Request-Id",
        "X-Payment-Verified",
        "X-Mock",
    ],
)


def cek_layanan():
    """Simulasi kegagalan layanan AI jika MOCK_FAIL=1 untuk uji fallback UI."""
    if MOCK_FAIL:
        raise HTTPException(status_code=503, detail="Layanan AI tiruan sengaja dimatikan")


async def baca_berkas(file: UploadFile) -> tuple[bytes, Image.Image]:
    """Validasi dan baca payload berkas gambar."""
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Berkas kosong atau rusak")
    try:
        img = Image.open(io.BytesIO(data))
        img.load()
        rgb = img.convert("RGB")
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=f"Berkas bukan gambar valid: {exc}") from exc
    return data, rgb


@app.get("/health")
def health():
    """Cek status endpoint dan kesiapan backend tiruan."""
    loaded = not MOCK_FAIL
    return {
        "status": "ok" if loaded else "degraded",
        "model_loaded": loaded,
        "classifier_loaded": loaded,
        "sr_loaded": loaded,
        "mock": True,
    }


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    """
    Simulasi klasifikasi adegan foto arsip (orang, bangunan, lanskap).
    Skor dan label dihitung deterministik berdasarkan SHA-256 berkas.
    """
    cek_layanan()
    data, _ = await baca_berkas(file)
    h = hashlib.sha256(data).digest()
    idx = h[0] % 3
    utama = 0.6 + (h[1] % 30) / 100  # Rentang confidence 0.60 - 0.89
    sisa = (1 - utama) / 2
    scores = {k: round(sisa, 3) for k in LABELS}
    scores[LABELS[idx]] = round(utama, 3)
    return {
        "label": LABELS[idx],
        "confidence": round(utama, 3),  # skala 0-1
        "scores": scores,
        "model_version": "mock-0",
        "mock": True,
    }


@app.post("/enhance")
async def enhance(
    file: UploadFile = File(...),
    scale: int = Form(4),
    request_id: Optional[int] = Form(None),
    request_id_query: Optional[int] = Query(None, alias="request_id"),
):
    """
    Simulasi Super-Resolution x4 dengan kontrak PNG StreamingResponse + header
    yang identik dengan backend asli `app/main.py`.
    """
    cek_layanan()
    if scale != 4:
        raise HTTPException(status_code=400, detail="Hanya scale=4 yang didukung.")

    effective_request_id = request_id if request_id is not None else request_id_query
    payment_verified = False
    if MOCK_VERIFY_ONCHAIN:
        try:
            verify_restoration_payment(RPC_URL, CONTRACT_ADDRESS, effective_request_id)
            payment_verified = True
        except OnChainVerificationError as exc:
            raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc

    _, img = await baca_berkas(file)
    mulai = time.perf_counter()

    # Tiruan ringan: ekspor PNG (tanpa bobot Real-ESRGAN berat)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    ms = round((time.perf_counter() - mulai) * 1000, 2)

    headers = {
        "X-Method": "mock",
        "X-Model-Version": "mock-0",
        "X-Scale": "4",
        "X-Inference-Time-MS": str(ms),
        "X-Payment-Verified": "true" if payment_verified else "false",
        "X-Mock": "true",
    }
    if effective_request_id is not None:
        headers["X-Request-Id"] = str(effective_request_id)

    return StreamingResponse(buf, media_type="image/png", headers=headers)
