import os
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

    CLASS_NAMES: list = ["bangunan", "lanskap", "orang"]

settings = Settings()
