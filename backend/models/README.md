# Checkpoint Bobot Model AI (SunnyRest)

Direktori ini digunakan untuk menyimpan file bobot model machine learning (`.pth`) yang digunakan oleh layanan backend SunnyRest untuk klasifikasi adegan foto dan restorasi super-resolution.

> **Catatan:** File `.pth` tidak dilacak oleh Git (diabaikan di `.gitignore`) karena ukurannya yang besar.

---

## 1. Daftar File Model yang Diperlukan

| Nama File | Ukuran | Fungsi | Sumber |
| :--- | :--- | :--- | :--- |
| `finetuned_model_3class.pth` | ~16.3 MB | Model klasifikasi adegan (EfficientNet-B0 finetuned: bangunan, lanskap, orang) | Model kustom tim |
| `best_model_3class.pth` | ~16.3 MB | Checkpoint cadangan (fallback) klasifikasi adegan | Model kustom tim |
| `RealESRGAN_x4plus.pth` | ~67.0 MB | Model Super-Resolution 4x untuk restorasi foto | Pre-trained Real-ESRGAN |

---

## 2. Cara Mendapatkan Model (Untuk Rekan Tim)

### Opsi A: Unduh Arsip Google Drive (Semua Model Sekaligus)
1. Unduh file zip model dari tautan Google Drive tim:  
    **`https://drive.google.com/file/d/1g6lLdrY7gHJ3AXWdpmSJMio5ipnNUau1/view?usp=drive_link`**
2. Ekstrak seluruh isi file `.pth` langsung ke dalam folder ini (`backend/models/`).
3. Pastikan struktur file terlihat seperti berikut:
   ```text
   backend/models/
   ├── .gitkeep
   ├── README.md
   ├── best_model_3class.pth
   ├── finetuned_model_3class.pth
   └── RealESRGAN_x4plus.pth
   ```

### Opsi B: Unduh Model Super-Resolution Resmi (Real-ESRGAN)
File `RealESRGAN_x4plus.pth` juga dapat diunduh langsung dari rilis resmi:
- URL: `https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth`

---

## 3. Verifikasi Instalasi Model
Setelah file `.pth` diletakkan di folder ini, jalankan verifikasi dari root direktori proyek:
```powershell
python backend/tests/test_models.py
```
Jika sukses, output akan menampilkan:
```text
Loaded classifier from: ...\backend\models\finetuned_model_3class.pth
[PASS] test_classifier_load
[PASS] test_sr_architecture
[PASS] test_health_endpoint: {'status': 'ok', 'model_loaded': True}
All tests passed successfully.
```
