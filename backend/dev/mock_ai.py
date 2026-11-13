import base64
import hashlib
import os
import time

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

LABELS = ["orang", "bangunan", "lanskap"]
MOCK_FAIL = os.getenv("MOCK_FAIL") == "1"  # 1 = simulasi layanan AI gagal (HTTP 503)

app = FastAPI(title="Mock AI P5 - SunnyRest")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def cek_layanan():
    """Simulasi kegagalan layanan AI jika MOCK_FAIL=1 untuk uji fallback UI."""
    if MOCK_FAIL:
        raise HTTPException(status_code=503, detail="Layanan AI tiruan sengaja dimatikan")


async def baca_berkas(file: UploadFile) -> bytes:
    """Validasi dan baca payload berkas gambar."""
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Berkas kosong atau rusak")
    return data


@app.get("/health")
def health():
    """Cek status endpoint dan kesiapan backend."""
    return {"status": "ok", "model_loaded": not MOCK_FAIL, "mock": True}


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    """
    Simulasi klasifikasi adegan foto arsip (orang, bangunan, lanskap).
    Skor dan label dihitung deterministik berdasarkan SHA-256 berkas.
    """
    cek_layanan()
    data = await baca_berkas(file)
    h = hashlib.sha256(data).digest()
    idx = h[0] % 3
    utama = 0.6 + (h[1] % 30) / 100          # Rentang confidence 0.60 - 0.89
    sisa = (1 - utama) / 2
    scores = {k: round(sisa, 3) for k in LABELS}
    scores[LABELS[idx]] = round(utama, 3)
    return {
        "label": LABELS[idx],
        "confidence": round(utama, 3),        # skala 0-1
        "scores": scores,
        "model_version": "mock-0",
        "mock": True,
    }


@app.post("/enhance")
async def enhance(file: UploadFile = File(...), scale: int = Form(4)):
    """
    Simulasi Super-Resolution (restorasi resolusi gambar).
    Mengembalikan data base64 berkas tanpa komputasi model berat untuk uji cepat UI.
    """
    cek_layanan()
    data = await baca_berkas(file)
    mulai = time.perf_counter()
    # Tiruan: gambar dikembalikan apa adanya dalam format Base64
    ms = round((time.perf_counter() - mulai) * 1000, 2)
    return {
        "image_base64": base64.b64encode(data).decode("ascii"),
        "method": "mock",
        "params": {"scale": scale},
        "model_version": "mock-0",
        "ms": ms,
        "mock": True,
    }

