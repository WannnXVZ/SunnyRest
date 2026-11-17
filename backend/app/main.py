import os
import time
import io
import torch
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import StreamingResponse
from PIL import Image
from torchvision import transforms
import torch.nn.functional as F

from .config import settings
from .schemas import PredictionResponse, EnhanceResponse, HealthResponse
from .inference.classifier import create_model, CLASS_NAMES
from .inference.enhancer import RealESRGANEnhancer

app = FastAPI(title=settings.PROJECT_NAME)

# Load Models
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Classifier
classifier_model = create_model(pretrained=False).to(device)
if os.path.exists(settings.MODEL_CLASSIFIER_PATH):
    ckpt = torch.load(settings.MODEL_CLASSIFIER_PATH, map_location=device, weights_only=False)
    classifier_model.load_state_dict(ckpt["model_state_dict"])
classifier_model.eval()

# Enhancer
try:
    enhancer = RealESRGANEnhancer(model_path=settings.MODEL_SR_PATH, device=device)
    sr_loaded = True
except Exception as e:
    print(f"SR Model failed to load: {e}")
    sr_loaded = False

# Transforms
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

@app.get("/health", response_model=HealthResponse)
async def health():
    return {"status": "ok", "model_loaded": sr_loaded}

@app.post("/predict", response_model=PredictionResponse)
async def predict(file: UploadFile = File(...)):
    try:
        content = await file.read()
        img = Image.open(io.BytesIO(content)).convert("RGB")
        
        tensor_img = transform(img).unsqueeze(0).to(device)
        with torch.no_grad():
            outputs = classifier_model(tensor_img)
            probs = F.softmax(outputs, dim=1).squeeze().cpu().numpy()
        
        pred_idx = probs.argmax()
        scores = {CLASS_NAMES[i]: float(probs[i]) for i in range(len(CLASS_NAMES))}
        
        return {
            "label": CLASS_NAMES[pred_idx],
            "confidence": float(probs[pred_idx]),
            "scores": scores,
            "model_version": "efficientnet_b0_v1"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/enhance")
async def enhance(file: UploadFile = File(...), scale: int = 4):
    if not sr_loaded:
        raise HTTPException(status_code=503, detail="Super-resolution model not loaded")
    
    try:
        start_time = time.time()
        content = await file.read()
        img = Image.open(io.BytesIO(content)).convert("RGB")
        
        enhanced_img = enhancer.enhance(img)
        
        buf = io.BytesIO()
        enhanced_img.save(buf, format="PNG")
        buf.seek(0)
        
        # Note: PRD asks for image result. To include metadata, we'd need multipart or headers.
        # Here we return the image stream directly for UI convenience.
        return StreamingResponse(buf, media_type="image/png", headers={
            "X-Method": "Real-ESRGAN",
            "X-Model-Version": "x4plus",
            "X-Inference-Time-MS": str(round((time.time() - start_time) * 1000, 2))
        })
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
