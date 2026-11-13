# Dokumentasi Teknik AI Klasifikasi Adegan & Super-Resolution (P5 Arsip Foto)

## 1. Model Utama: Klasifikasi Adegan

### 1.1 Arsitektur
- **Backbone**: EfficientNet-B0 (transfer learning dari ImageNet)
- **Modifikasi**:
  - Ganti classifier ImageNet (1000 kelas) menjadi 3 kelas custom: `bangunan`, `lanskap`, `orang`
  - Dropout (0.3) dan Linear layer (input: 1280, output: 3)
- **Pengaturan**:
  - `pretrained=False` (untuk training dari awal) atau `True` (fine-tuning)
  - `freeze_backbone=True` (untuk eksperimen frozen) atau `False` (untuk fine-tuning)

### 1.2 Training
- **Eksperimen Terkontrol**:
  - **Frozen**: Backbone tidak diupdate, hanya classifier di-rantai
  - **Fine-tuned**: Semua layer diupdate (unfreeze seluruh jaringan)
  - **Seed**: 42 untuk reproduktifitas
- **Hyperparameter**:
  - Epochs: 15
  - Batch Size: 32
  - Loss: CrossEntropyLoss
  - Metrik: Accuracy, Precision, Recall, F1 (per kelas dan macro)

### 1.3 Inferensi
- Input: Gambar RGB (resolusi acak)
- Preprocessing: Resize 224x224, Normalize (mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
- Output:
  ```json
  {
    "label": "orang",
    "confidence": 87.5,
    "scores": {"orang": 87.5, "bangunan": 6.2, "lanskap": 6.3},
    "model_version": "efficientnet_b0_v1"
  }
  ```

### 1.4 Model Checkpoint
- `models/best_model_3class.pth`: Checkpoint terbaik berdasarkan validation accuracy (frozen)
- `models/finetuned_model_3class.pth`: Checkpoint terbaik (fine-tuned)

---

## 2. Super-Resolution (SR)

### 2.1 Arsitektur Real-ESRGAN
- **Struktur**:
  - **RRDBNet**: 23 residual dense blocks (each with 5 convolutional layers)
  - **Tile-based inference**: Membagi gambar besar menjadi tile (512x512) untuk mencegah OOM
  - **Scale factor**: 4x (4x upscaling)
- **Parameter**:
  - `num_feat=64`, `num_block=23`, `num_grow_ch=32`
  - Preprocessing: Normalisasi 0-1, tensor (C, H, W) → GPU

### 2.2 Training & Data
- **Data Asli**: DIV2K Validation (resolusi 2K)
- **LR Synthesis**: 
  - Bicubic downscaling 4x dari HR (resolusi asli)
  - Simpan pasangan HR/LR di `ml/data/restorasi/hr/` dan `ml/data/restorasi/lr/`
- **Evaluasi**:
  - PSNR (dB): `20 * log10(255 / sqrt(mse))`
  - SSIM: Perbandingan rata-rata statistik (muatan, variansi, korelasi)

### 2.3 Inference Output
- Input: Gambar LR (bicubic downscaled)
- Output: Gambar HR (4x lebih besar) + metrik:
  ```json
  {
    "method": "Real-ESRGAN",
    "params": {"scale": 4},
    "model_version": "x4plus",
    "ms": 120.5
  }
  ```

---

## 3. Data & Manifest

### 3.1 Sumber Data
| Sumber | Kategori | Resolusi | Lisensi | Cara Unduh |
|--------|----------|----------|---------|------------|
| Intel Image Classification | bangunan, lanskap | seg_train (2048x2048) | CC0 | Hugging Face Hub API |
| COCO Person | orang | 640x640 | CC BY 4.0 | Hugging Face Hub API |
| Wikimedia Commons (KITLV) | semua | variabel | Public Domain/CC BY | Wikimedia API |
| DIV2K | HR (2K) | 2048x2048 | Non-komersial riset | Hugging Face Hub API |

### 3.2 Struktur Manifest (`ml/data/manifest.csv`)
| Kolom | Deskripsi |
|-------|-----------|
| `path` | Lokasi relatif file (misal: `classification/train/bangunan/intel_bld_0000.jpg`) |
| `label` | `orang`, `bangunan`, `lanskap` |
| `source` | `intel_image`, `coco`, `wikimedia_commons` |
| `license` | Lisensi penggunaan (CC0, CC BY 4.0, dll) |
| `group` | ID sesi/objek (misal: `commons_kitlv_orang_00`) untuk anti-leak |
| `split` | `train`, `val`, `test` (70/15/15 via GroupShuffleSplit) |

### 3.3 Aturan Anti-Kebocoran
- **Group-based split**: Gambar dari satu `group` hanya muncul di satu split
- **Augmentasi hanya pada train**: Transformasi (flip, rotasi) hanya pada data train
- **Test data tidak digunakan untuk tuning**: Model dan hyperparameter dipilih dari train/val

---

## 4. API Endpoint

### 4.1 `/predict` (POST)
- **Input**: File gambar (multipart/form-data)
- **Output**:
  ```json
  {
    "label": "orang",
    "confidence": 87.5,
    "scores": {"orang": 87.5, "bangunan": 6.2, "lanskap": 6.3},
    "model_version": "efficientnet_b0_v1"
  }
  ```
- **Error**: 400 (file rusak), 503 (model gagal)

### 4.2 `/enhance` (POST)
- **Input**: File gambar + parameter `scale` (integer, default=4)
- **Output**:
  - Stream PNG (image/png)
  - Header tambahan: `X-Method`, `X-Model-Version`, `X-Inference-Time-MS`
- **Error**: 503 (SR model tidak terload)

### 4.3 `/health` (GET)
- **Output**:
  ```json
  {
    "status": "ok",
    "model_loaded": true
  }
  ```

---

## 5. Training & Evaluasi

### 5.1 Training CNN
```bash
python ml/train_cnn.py
```
- **Eksperimen**:
  - `frozen`: Backbone freeze (lr=1e-3)
  - `finetuned`: Unfreeze semua (lr=1e-4)
- **Output**: Checkpoint di `backend/ml/checkpoints/`, log di `experiments/`

### 5.2 Training Baseline (KNN/SVM)
```bash
python ml/train_baseline.py
```
- **Fitur**: Histogram warna (32 bins) + GLCM (5 properti × 3 sudut = 15)
- **Metrik**: Macro-F1, confusion matrix, waktu eksekusi

### 5.4 Evaluasi Akhir
```bash
python ml/evaluate.py
```
- **Output**:
  - Akurasi test set
  - Per-kelas precision/recall/F1
  - Contoh gagal (misal: lanskap diklasifikasikan sebagai bangunan)
  - Jumlah sampel per kelas (minimal 10 per kelas di test)

---

## 6. Catatan Penting
- **GPU**: Diperlukan untuk training SR (Real-ESRGAN), tapi tidak wajib (pilih model kecil)
- **Data**: Gunakan semua data lab yang valid, jangan buat dataset baru
- **SR Claim**: Hasil SR harus diverifikasi dengan PSNR/SSIM, tidak boleh mengklaim detail sejarah
- **API**: Tidak menerima private key atau transaksi, hanya melayani prediksi dan restorasi

Dokumentasi ini mencakup semua aspek teknis yang diperlukan untuk memahami, melatih, dan menggunakan sistem ini sesuai PRD.