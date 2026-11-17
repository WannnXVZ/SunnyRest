# P5 Arsip Foto — AI Klasifikasi Adegan & Super-Resolution

Backend AI untuk klasifikasi adegan foto (orang, bangunan, lanskap) dan peningkatan resolusi menggunakan Real-ESRGAN x4.

## Struktur

```
backend/
├── README.md
├── requirements.txt
├── app/
│   ├── main.py                  # FastAPI: /predict, /enhance, /health
│   ├── schemas.py               # Pydantic request/response
│   ├── config.py                # Konfigurasi path model
│   └── inference/
│       ├── classifier.py        # EfficientNet-B0, 3 kelas
│       └── enhancer.py          # Real-ESRGAN x4plus wrapper
├── ml/
│   └── data/                    # Dataset asli (raw, classification, restorasi)
ml/
├── preprocess.py                # Transform konsisten train/val/test
├── features.py                  # Histogram warna + GLCM untuk KNN/SVM
├── train_cnn.py                 # Training EfficientNet-B0 (frozen vs finetuned)
├── train_baseline.py            # KNN & SVM baseline
├── evaluate.py                  # Evaluasi test set + contoh gagal
├── sr_eval.py                   # Benchmark SR vs bicubic (PSNR/SSIM)
├── split_manifest.py            # GroupShuffleSplit anti-kebocoran
├── data/
│   ├── manifest.csv
│   ├── classification/{train,val,test}/{bangunan,lanskap,orang}/
│   └── restorasi/{hr,lr,output_sr}/
├── checkpoints/                 # Checkpoint training
models/
├── best_model_3class.pth        # CNN frozen
├── finetuned_model_3class.pth   # CNN fine-tuned
├── RealESRGAN_x4plus.pth        # SR model pralatih
experiments/                     # Log training, hasil evaluasi
tests/
└── test_models.py               # Uji muat model & endpoint
```

## Setup

```bash
python -m venv .venv
.venv/Scripts/activate  # Windows
pip install -r backend/requirements.txt
```

## Menjalankan API

```bash
cd backend
uvicorn app.main:app --reload
```

## Endpoint

| Endpoint | Method | Input | Output |
|----------|--------|-------|--------|
| `/health` | GET | - | `{status, model_loaded}` |
| `/predict` | POST | file gambar | `{label, confidence, scores, model_version}` |
| `/enhance` | POST | file gambar | gambar PNG (header: X-Method, X-Inference-Time-MS) |

## Training

```bash
# 1. Extract fitur untuk baseline
python ml/features.py

# 2. Train baseline KNN/SVM
python ml/train_baseline.py

# 3. Train CNN (frozen vs finetuned)
python ml/train_cnn.py

# 4. Evaluasi pada test set
python ml/evaluate.py

# 5. Benchmark SR
python ml/sr_eval.py
```

## Model

- **Classifier**: EfficientNet-B0 transfer learning, 3 kelas (bangunan, lanskap, orang)
- **Super-Resolution**: Real-ESRGAN x4plus (pralatih, sumber: xinntao/Real-ESRGAN, BSD-3-Clause)
- **Baseline**: KNN (k=5) dan SVM (RBF, C=10) pada fitur histogram + GLCM

## Python

Python 3.10+ dengan PyTorch CUDA 12.8 (di `.venv`).
