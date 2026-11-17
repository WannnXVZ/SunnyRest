import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Klasifikasi Adegan & SR"
    MODEL_CLASSIFIER_PATH: str = "models/finetuned_model_3class.pth"
    MODEL_SR_PATH: str = "models/RealESRGAN_x4plus.pth"
    
    # Fallback jika finetuned belum ada
    if not os.path.exists(MODEL_CLASSIFIER_PATH):
        MODEL_CLASSIFIER_PATH = "models/best_model_3class.pth"

    CLASS_NAMES: list = ["bangunan", "lanskap", "orang"]

settings = Settings()
