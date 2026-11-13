# Dokumentasi Teknik AI Klasifikasi Adegan & Super-Resolution (P5 Arsip Foto)

Dokumen ini menjelaskan cara memahami, melatih, dan menggunakan sistem AI untuk klasifikasi adegan foto serta peningkatan resolusi (super-resolution) sesuai Permintaan Desain Produk (PRD) P5 Arsip Foto.

## Struktur Dokumen

1. **models.md** - Penjelasan teknis tentang model klasifikasi dan super-resolution
2. **usage.md** - Panduan penggunaan, setup, dan cara menjalankan sistem
3. **data.md** - Penjelasan tentang struktur data, manifest, dan aturan pembagian split

## Cara Menggunakan Dokumen Ini

1. **Baca models.md** untuk memahami arsitektur model, training, dan evaluasi
2. **Baca usage.md** untuk setup lingkungan, jalankan API, dan lakukan training
3. **Baca data.md** untuk memahami struktur data dan aturan pembagian split

## Catatan Penting

- Semua kode dan konfigurasi sesuai PRD P5 Arsip Foto
- Data asli di `backend/ml/data/`, script di `backend/ml/`
- Pastikan environment Python terinstall dengan torch CUDA 12.8
- Gunakan `.venv` untuk dependencies terisolasi