# Log Kontribusi Anggota, Review Silang & Deklarasi Bantuan AI

**Proyek:** SunnyRest — Arsip Foto dan Restorasi Terpadu (P5)  
**Acuan:** Panduan Proyek Terpadu Bagian 10, 14C & 15

> **Aturan Integritas:** Kolom `Jam Aktual` dan `Review Silang` diisi jujur oleh masing-masing anggota sesuai waktu kerja sebenarnya (tidak diisi perkiraan dan tidak menghitung jam yang sama dua kali).

---

## 1. Log Kontribusi Berbasis Riwayat Commit Git Aktual

| Tanggal | Nama Anggota | Pekerjaan | Artefak / Commit | Jam Aktual | Review Silang (Oleh & Tanggal) | Tindak Lanjut |
|---|---|---|---|---|---|---|
| 2026-11-10 | Muhammad Arief Irawan (`Arief` / `WannnXVZ`) | Inisialisasi struktur proyek, UI 4 halaman desain, pemisahan Portal Publik & Workspace Kurator, util `hash.ts` | `4794a0a`, `c6543d8`, `7e561f8`, `86b4cc3`, `c7b7e12`, `5175d8c` | *[DIISI ARIEF]* | *[DIISI]* | Integrasi Web3 nyata menggantikan store simulasi (`cdfbfee`) |
| 2026-11-13 | Haikal Alie Rhanditya | Setup Hardhat, `ArsipFotoVersi.sol`, 17 unit test dasar, coverage, gas report, audit, `mock_ai.py` | `40961ba` | *[DIISI HAIKAL]* | *[DIISI]* | Perluasan fitur biaya restorasi `0,01 ETH` & integrasi Web3 |
| 2026-11-13 | Hanafi Purnama Yudi | Dataset manifest 345 foto (`GroupShuffleSplit`), pipeline baseline KNN/SVM, training CNN `EfficientNet-B0`, backend FastAPI `/predict` & `/enhance`, evaluasi SR `Real-ESRGAN` | `ff8ca9d`, `b3215ed` | *[DIISI HANAFI]* | *[DIISI]* | Penambahan CORS, `weights_only=True`, tiling 512×512, verifikasi on-chain |
| 2026-11-18 | Haikal Alie Rhanditya | Implementasi biaya restorasi `0,01 ETH` (`ajukanRestorasi`, `terbitkanVersiRestorasi`, `kembalikanBiaya`, `tarikBiaya`, `ReentrancyGuard`), 35 test kontrak, `wallet.ts`, `contract.ts`, `api.ts`, `ipfs.ts`, `onchain.py` + `vitest` + `pytest` | `cdfbfee`, `8032359`, `c78786f` + pembaruan evaluasi lokal *(belum di-push)* | *[DIISI HAIKAL]* | *[DIISI]* | Uji langsung 6 skenario browser & usability 3×3 |
| *[DIISI]* | Tim Bersama | Uji integrasi 6 skenario di browser, uji penggunaan 3 sukarelawan × 3 tugas, pengisian portofolio mingguan & ekspor laporan/video/slide final | `docs/evidence/`, `docs/usability/`, `portfolio/`, `06_Laporan_dan_Demo/` | *[DIISI TIM]* | *[DIISI]* | Selesai untuk pengumpulan final |

---

## 2. Deklarasi Model Pralatih & Sumber Aset
- **Model Klasifikasi:** `EfficientNet-B0` (Torchvision, bobot awal ImageNet, fine-tuned/frozen pada 345 foto berizin: 251 train / 46 val / 48 test).
- **Model Super-Resolution:** `Real-ESRGAN x4plus` (`xinntao/Real-ESRGAN`, lisensi **BSD-3-Clause**), dijalankan off-chain untuk peningkatan resolusi 4×. Hasil SR dinyatakan sebagai bantuan visual, bukan rekonstruksi fakta sejarah.
- **Sumber Dataset:** Intel Image Classification (`CC0 / Kaggle Open Data`), COCO Person (`CC BY 4.0`), Wikimedia Commons / KITLV (`Public Domain / CC BY 4.0`), DIV2K (`Non-komersial riset`).

## 3. Deklarasi Bantuan AI dalam Pengembangan
- **Asisten AI yang Digunakan:** **Antigravity (AI Coding Assistant — Google DeepMind)** digunakan sebagai alat bantu pemrograman (*pair-programming*), perancangan integrasi antarmuka Web3/RPC (`Dashboard Pemohon`, status arsip Publik/Privat, riwayat bukti transaksi), debugging endpoint FastAPI, penulisan *automated test*, penyusunan laporan/dokumentasi proyek, serta perapihan slide presentasi.
- **Verifikasi & Tanggung Jawab Mahasiswa:** Seluruh kode kontrak, backend, frontend, hasil *automated test* (`npx hardhat test`, `npx hardhat coverage`, `pytest`, `vitest`, `tsc && vite build`), deployment Sepolia, serta evaluasi model AI (`train_baseline.py`, `evaluate.py`, `sr_eval.py`) telah ditinjau, dijalankan, dan diverifikasi langsung oleh anggota kelompok yang bertanggung jawab penuh atas seluruh isi karya.
