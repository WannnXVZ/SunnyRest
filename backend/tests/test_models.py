# Tests: uji muat model & uji endpoint
import os
import sys
from pathlib import Path
import torch

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

def test_classifier_load():
    """Uji: classifier bisa dimuat dan memprediksi tensor dummy."""
    from app.inference.classifier import create_model, CLASS_NAMES
    from app.config import settings
    
    model = create_model(pretrained=False)
    if os.path.exists(settings.MODEL_CLASSIFIER_PATH):
        ckpt = torch.load(settings.MODEL_CLASSIFIER_PATH, map_location="cpu", weights_only=False)
        model.load_state_dict(ckpt["model_state_dict"])
        print(f"Loaded classifier from: {settings.MODEL_CLASSIFIER_PATH}")
    else:
        print("[WARN] Model classifier checkpoint not found, testing architecture only.")
    
    model.eval()
    dummy = torch.randn(1, 3, 224, 224)
    with torch.no_grad():
        out = model(dummy)
    
    assert out.shape == (1, 3), f"Expected (1,3), got {out.shape}"
    assert len(CLASS_NAMES) == 3
    print("[PASS] test_classifier_load")

def test_sr_architecture():
    """Uji: arsitektur RRDBNet dapat forward pass."""
    sys.path.insert(0, str(BASE_DIR / "ml"))
    from sr_eval import RRDBNet
    
    model = RRDBNet(num_in_ch=3, num_out_ch=3, scale=4, num_feat=64, num_block=6, num_grow_ch=32)
    model.eval()
    dummy = torch.randn(1, 3, 32, 32)
    with torch.no_grad():
        out = model(dummy)
    
    assert out.shape == (1, 3, 128, 128), f"Expected 4x upscale, got {out.shape}"
    print("[PASS] test_sr_architecture")

def test_health_endpoint():
    """Uji: /health endpoint mengembalikan status."""
    try:
        from fastapi.testclient import TestClient
        from app.main import app
        
        client = TestClient(app)
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert "status" in data
        print(f"[PASS] test_health_endpoint: {data}")
    except ImportError:
        print("[SKIP] test_health_endpoint: fastapi/httpx not installed")

if __name__ == "__main__":
    test_classifier_load()
    test_sr_architecture()
    test_health_endpoint()
    print("\nAll tests passed successfully.")
