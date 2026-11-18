import os
<<<<<<< HEAD
from typing import List
from pydantic_settings import BaseSettings

=======
from pathlib import Path
from pydantic_settings import BaseSettings

# Base directory: D:\project\SunnyRest\SunnyRest\backend
BASE_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = BASE_DIR / "models"

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Klasifikasi Adegan & SR"
    MODEL_CLASSIFIER_PATH: str = str(MODELS_DIR / "finetuned_model_3class.pth")
    MODEL_SR_PATH: str = str(MODELS_DIR / "RealESRGAN_x4plus.pth")
    
    # Fallback jika finetuned belum ada
    if not os.path.exists(MODEL_CLASSIFIER_PATH):
        MODEL_CLASSIFIER_PATH = str(MODELS_DIR / "best_model_3class.pth")
>>>>>>> 803235905ecc64af0017e64c1292432328ddf132

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Klasifikasi Adegan & SR (SunnyRest)"
    MODEL_CLASSIFIER_PATH: str = "models/finetuned_model_3class.pth"
    MODEL_CLASSIFIER_FALLBACK_PATH: str = "models/best_model_3class.pth"
    MODEL_SR_PATH: str = "models/RealESRGAN_x4plus.pth"

    CLASS_NAMES: List[str] = ["bangunan", "lanskap", "orang"]

    # CORS & Batas Input
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    MAX_UPLOAD_BYTES: int = 10 * 1024 * 1024  # 10 MB
    MAX_IMAGE_DIM: int = 2048

    # Verifikasi Pembayaran On-Chain (PRD Biaya Restorasi 0,01 ETH)
    RPC_URL: str = "http://127.0.0.1:8545"
    CONTRACT_ADDRESS: str = "0x5FbDB2315678afecb367f032d93F642f64180aa3"
    VERIFY_ONCHAIN_PAYMENT: bool = False

    def resolved_classifier_path(self) -> str:
        if os.path.exists(self.MODEL_CLASSIFIER_PATH):
            return self.MODEL_CLASSIFIER_PATH
        return self.MODEL_CLASSIFIER_FALLBACK_PATH

    def cors_origin_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
