import os
import sys
import zipfile
import urllib.request
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

REQUIRED_MODELS = {
    "finetuned_model_3class.pth": "Model klasifikasi adegan finetuned",
    "best_model_3class.pth": "Model klasifikasi adegan baseline",
    "RealESRGAN_x4plus.pth": "Model super-resolution Real-ESRGAN"
}

REALESRGAN_URL = "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth"

def check_status():
    print("=== STATUS MODEL AI SUNNYREST ===")
    missing = []
    for model_name, desc in REQUIRED_MODELS.items():
        target = MODELS_DIR / model_name
        if target.exists():
            size_mb = target.stat().st_size / (1024 * 1024)
            print(f"[OK]    {model_name:<30} ({size_mb:.1f} MB) - {desc}")
        else:
            print(f"[MISS]  {model_name:<30} (TIDAK DITEMUKAN) - {desc}")
            missing.append(model_name)
    return missing

def extract_from_zip(zip_path: Path):
    if not zip_path.exists():
        return False
    print(f"\nMengekstrak file dari {zip_path} ke {MODELS_DIR}...")
    with zipfile.ZipFile(zip_path, 'r') as zf:
        for member in zf.namelist():
            if member.endswith(".pth"):
                filename = Path(member).name
                with zf.open(member) as source, open(MODELS_DIR / filename, "wb") as target:
                    target.write(source.read())
                print(f" -> Berhasil mengekstrak: {filename}")
    return True

def download_realesrgan():
    target = MODELS_DIR / "RealESRGAN_x4plus.pth"
    if target.exists():
        return
    print(f"\nMengunduh RealESRGAN_x4plus.pth dari repository resmi...")
    try:
        def progress(count, block_size, total_size):
            percent = int(count * block_size * 100 / total_size)
            sys.stdout.write(f"\rUnduh: {percent}% [{count * block_size / (1024*1024):.1f}/{total_size / (1024*1024):.1f} MB]")
            sys.stdout.flush()
        urllib.request.urlretrieve(REALESRGAN_URL, target, reporthook=progress)
        print("\n -> Selesai mengunduh RealESRGAN_x4plus.pth.")
    except Exception as e:
        print(f"\nGagal mengunduh otomatis: {e}")

if __name__ == "__main__":
    missing = check_status()
    if not missing:
        print("\nSemua model sudah lengkap dan siap digunakan!")
        sys.exit(0)

    # Cek apakah ada file zip di folder root atau Downloads
    candidate_zips = [
        BASE_DIR.parent / "sunnyrest_models.zip",
        Path.home() / "Downloads" / "sunnyrest_models.zip",
        BASE_DIR / "sunnyrest_models.zip"
    ]

    extracted = False
    for cz in candidate_zips:
        if cz.exists():
            extracted = extract_from_zip(cz)
            break

    if "RealESRGAN_x4plus.pth" in missing and not (MODELS_DIR / "RealESRGAN_x4plus.pth").exists():
        download_realesrgan()

    print("\nStatus akhir setelah setup:")
    check_status()
