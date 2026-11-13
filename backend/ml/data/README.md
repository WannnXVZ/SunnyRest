# Dataset P5 Arsip Foto & Restorasi

Dataset disusun sesuai standar spesifikasi panduan P5 untuk klasifikasi foto dan perbandingan restorasi super-resolution.

## 1. Asal Sumber & Lisensi
- **Intel Image Classification** (`raw/intel_image/`):
  - Kategori: `buildings` (bangunan) dan `landscape` (glacier, forest, mountain, sea).
  - Lisensi: CC0 / Kaggle Open Data.
  - Unduh: `sfarrukhm/intel-image-classification` via Hugging Face Hub API.
- **COCO Person** (`raw/coco_person/`):
  - Kategori: `orang`.
  - Lisensi: Creative Commons Attribution 4.0 International (CC BY 4.0).
  - Unduh: `naufalso/coco-2017-person-val` via Hugging Face Hub API.
- **Wikimedia Commons / KITLV** (`raw/arsip_commons/`):
  - Kategori: Foto arsip sejarah Hindia Belanda (bangunan, lanskap, orang).
  - Lisensi: Public Domain / CC BY 4.0 (tercatat per entri di `manifest.csv`).
  - Unduh: Wikimedia Commons API.
- **DIV2K Validation HR** (`restorasi/hr/`):
  - Resolusi 2K asli untuk benchmark Super-Resolution.
  - Lisensi: Non-komersial riset (CVPR NTIRE Workshop).
  - Unduh: `shivamsark/div2k` via Hugging Face Hub API.

## 2. Struktur Folder
```
backend/ml/data/
├── README.md              # Dokumentasi asal sumber, lisensi & prosedur
├── manifest.csv           # Single source of truth (path, label, source, license, group, split)
├── raw/                   # Unduhan asli immutable
│   ├── intel_image/
│   ├── coco_person/
│   └── arsip_commons/
├── classification/        # Terdistribusi per split & label
│   ├── train/ (bangunan, lanskap, orang)
│   ├── val/   (bangunan, lanskap, orang)
│   └── test/  (bangunan, lanskap, orang) [>= 30 total, >= 10 per kelas]
└── restorasi/
    ├── hr/                # Foto resolusi tinggi asli (2K)
    └── lr/                # Sintetis penurunan resolusi bicubic 4x
```

## 3. Prosedur Pembagian Split
- Dijalankan via `backend/ml/split_manifest.py` menggunakan `GroupShuffleSplit` (70% train, 15% val, 15% test).
- Pemisahan berbasis `group` mencegah kebocoran data (*data leakage*).
- Folder `classification/test/` dibekukan untuk pengujian akhir.

## 4. Prosedur Sintesis Restorasi (LR)
- Setiap gambar HR di `restorasi/hr/` diturunkan resolusinya ke seperempat (skala 4x) menggunakan filter `PIL.Image.Resampling.BICUBIC`.
- Pasangan sejajar HR dan LR digunakan untuk menghitung metrik evaluasi PSNR dan SSIM terhadap model Real-ESRGAN (x4).
