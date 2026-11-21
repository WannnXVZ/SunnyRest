import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BASE_DIR.parent
MODELS_DIR = BASE_DIR / "models"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(str(REPO_ROOT / ".env"), str(BASE_DIR / ".env")),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    PROJECT_NAME: str = "AI Klasifikasi Adegan & SR (SunnyRest)"
    MODEL_CLASSIFIER_PATH: str = str(MODELS_DIR / "finetuned_model_3class.pth")
    MODEL_CLASSIFIER_FALLBACK_PATH: str = str(MODELS_DIR / "best_model_3class.pth")
    MODEL_SR_PATH: str = str(MODELS_DIR / "RealESRGAN_x4plus.pth")

    CLASS_NAMES: List[str] = ["bangunan", "lanskap", "orang"]

    # CORS & Batas Input
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    MAX_UPLOAD_BYTES: int = 10 * 1024 * 1024  # 10 MB untuk input asli
    MAX_DERIVATIVE_BYTES: int = 50 * 1024 * 1024  # 50 MB untuk output PNG x4 & pinning IPFS
    MAX_IMAGE_DIM: int = 2048

    # Verifikasi Pembayaran On-Chain (PRD Biaya Restorasi 0,01 ETH)
    RPC_URL: str = "http://127.0.0.1:8545"
    CONTRACT_ADDRESS: str = "0x5FbDB2315678afecb367f032d93F642f64180aa3"
    VERIFY_ONCHAIN_PAYMENT: bool = False

    # Layanan Pinning IPFS Server-Side (Pinata JWT atau Kubo API lokal)
    IPFS_API_URL: str = ""
    PINATA_JWT: str = ""
    IPFS_GATEWAY: str = "https://gateway.pinata.cloud/ipfs/"

    # Direktori Persistensi Antrean Kurasi & Berkas Sementara Pra-Mint
    STORAGE_DIR: str = str(BASE_DIR / "storage")

    def resolved_classifier_path(self) -> str:
        if os.path.exists(self.MODEL_CLASSIFIER_PATH):
            return self.MODEL_CLASSIFIER_PATH
        return self.MODEL_CLASSIFIER_FALLBACK_PATH

    def cors_origin_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    def ipfs_configured(self) -> bool:
        return bool(self.PINATA_JWT.strip() or self.IPFS_API_URL.strip())


settings = Settings()
