# Dokumentasi Teknik AI Klasifikasi Adegan & Super-Resolution (P5 Arsip Foto)

## 1. Struktur Data dan Manifest

## 3.1 Sumber Data
| Sumber | Kategori | Resolusi | Lisensi | Cara Unduh |
|--------|----------|----------|---------|------------|
| Intel Image Classification | bangunan, lanskap | seg_train (2048x2048) | CC0 | Hugging Face Hub API |
| COCO Person | orang | 640x640 | CC BY 4.0 | Hugging Face Hub API |
| Wikimedia Commons (KITLV) | semua | variabel | Public Domain/CC BY | Wikimedia API |
| DIV2K | HR (2K) | 2048x2048 | Non-komersial riset | Hugging Face Hub API |

## 3.2 Struktur Manifest (`ml/data/manifest.csv`)
| Kolom | Deskripsi |
|-------|-----------|
| `path` | Lokasi relatif file (misal: `classification/train/bangunan/intel_bld_0000.jpg`) |
| `label` | `orang`, `bangunan`, `lanskap` |
| `source` | `intel_image`, `coco`, `wikimedia_commons` |
| `license` | Lisensi penggunaan (CC0, CC BY 4.0, dll) |
| `group` | ID sesi/objek (misal: `commons_kitlv_orang_00`) untuk anti-leak |
| `split` | `train`, `val`, `test` (70/15/15 via GroupShuffleSplit) |

## 3.3 Aturan Anti-Kebocoran
- **Group-based split**: Gambar dari satu `group` hanya muncul di satu split
- **Augmentasi hanya pada train**: Transformasi (flip, rotasi) hanya pada data train
- **Test data tidak digunakan untuk tuning**: Model dan hyperparameter dipilih dari train/val

## 3.4 Struktur Folder Data
```
ml/data/
├── manifest.csv                # Single source of truth
├── README.md                   # Dokumentasi asal sumber & prosedur
├── raw/                        # Unduhan asli immutable
│   ├── intel_image/            # Intel Image Classification (buildings, landscape)
│   ├── coco_person/            # COCO Person (orang)
│   └── arsip_commons/          # Wikimedia Commons (KITLV archives)
├── classification/             # Terdistribusi per split & label
│   ├── train/                  # train/{bangunan,lanskap,orang}
│   ├── val/                    # val/{bangunan,lanskap,orang}
│   └── test/                   # test/{bangunan,lanskap,orang} [>=30 total, >=10 per kelas]
└── restorasi/                  # Data restorasi super-resolution
    ├── hr/                     # Foto HR asli (2K)
    ├── lr/                     # LR sintesis 4x bicubic
    └── output_sr/              # Hasil SR dari model
```

## 3.5 Proses Pembagian Data
1. **GroupShuffleSplit**: 70% train, 15% val, 15% test (base on `group` column)
2. **Anti-leak**: Tidak ada grup yang muncul di lebih dari satu split
3. **Test data**: Minimal 30 sampel total, minimal 10 per kelas
4. **Synchronisasi**: `split_manifest.py` menyalin file dari `raw/` ke `classification/{split}/{label}/`

## 3.6 Proses Restorasi (SR)
- **HR Directory**: `ml/data/restorasi/hr/` berisi foto asli resolusi tinggi (2K)
- **LR Directory**: `ml/data/restorasi/lr/` berisi pasangan LR hasil bicubic downscaling 4x
- **Output**: `ml/data/restorasi/output_sr/` menyimpan hasil SR model

## 3.7 Catatan Penting
- Data asli tidak boleh diubah setelah pembuatan manifest
- Augmentasi hanya berlaku pada data train
- Test data harus tetap tidak digunakan untuk tuning hyperparameter
- Semua file data harus konsisten dengan PRD AI Klasifikasi Adegan dan Super-Resolution

Dokumentasi ini menjelaskan seluruh struktur data, sumber, dan aturan pembagian yang diperlukan untuk sistem ini sesuai PRD.