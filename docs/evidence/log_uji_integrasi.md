# Log Uji Integrasi Lintas Mata Kuliah (6 Skenario Wajib P5)

**Proyek:** SunnyRest — Arsip Foto dan Restorasi Terpadu (P5)  
**Acuan:** Panduan Proyek Terpadu Bagian 9 (Halaman 22) & Bagian 14C (Halaman 28)  
**Jaringan Kontrak:** Hardhat Localhost (`chainId: 31337`, alamat: `0x5FbDB2315678afecb367f032d93F642f64180aa3`)

> **Aturan Integritas Akademik:** Kolom *Actual Output*, *Tanggal*, dan *Penguji* untuk uji UI/MetaMask langsung diisi hanya setelah pengujian dilakukan secara nyata oleh tim. Nilai yang belum diuji di browser dibiarkan kosong.

---

## 1. Bukti Uji Otomatis Terprogram (Backend, Kontrak, Frontend)

| Lapisan | Berkas Uji | Cakupan yang Sudah Terverifikasi | Hasil Aktual |
|---|---|---|---|
| Smart Contract | `contracts/test/penerbitan.test.ts`, `relasi-versi.test.ts`, `transfer.test.ts`, `event-state.test.ts`, `biaya-restorasi.test.ts` | 35 kasus (hak akses kurator, `parentId`, anti-duplikat hash, immutability versi lama, transfer, bayar `0,01 ETH`, refund, penarikan, reentrancy) | **35 passing** (Stmt 100%, Line 100%, Func 100%, Branch 98.39%) |
| Backend AI & On-Chain Gate | `backend/tests/test_api.py`, `backend/tests/test_models.py` | Muat checkpoint `.pth` asli, `/health`, `/predict`, `/enhance` PNG + headers, `400` berkas rusak, `503` layanan gagal, `402/403` verifikasi `request_id` on-chain | **7 passed** (`pytest`) & **3/3 pass** (`test_models.py`) |
| Frontend Web3 & Util | `frontend/src/tests/contractAndHash.test.ts` | Hash SHA-256 `bytes32`, truncate ID, parser custom error Solidity (`BiayaTidakTepat`, `ParentTidakTerdaftar`, `HashSudahTerpakai`), penolakan MetaMask `4001`, config jaringan | **4 passed** (`vitest`) |

---

## 2. Log Uji Integrasi End-to-End (6 Skenario Bersama — Diisi Saat Uji Alur Penuh UI + Backend + Node)

| ID | Skenario & Input / Prasyarat | Expected Output (AI + Blockchain + UI) | Actual Output | Lulus / Gagal | Path Bukti (Screenshot / Receipt / Log) | Tanggal | Penguji |
|---|---|---|---|---|---|---|---|
| **INT-01** | **Sukses Lengkap**: Unggah foto baru berizin → `/predict` → kurator menyetujui & terbitkan versi asli (`terbitkanVersi`) → ajukan restorasi `0,01 ETH` (`ajukanRestorasi`) → `/enhance` dengan `request_id` → kurator terbitkan turunan (`terbitkanVersiRestorasi`) | Prediksi kategori tampil; Token #1 terbit (`parentId = 0`); pembayaran 0,01 ETH menghasilkan `requestId = 1`; `/enhance` mengembalikan PNG x4; Token #2 terbit dengan `parentId = 1`; versi #1 tetap utuh | | | | | |
| **INT-02** | **Berkas Rusak / Kosong**: Kirim berkas teks/korup atau file 0 byte ke alur unggah / endpoint `/predict` dan `/enhance` | Backend mengembalikan HTTP `400`; UI menampilkan pesan error jelas; tidak ada transaksi wallet atau state arsip yang dibuat | *(Teruji di API `test_api.py`: HTTP 400; uji UI menunggu eksekusi langsung)* | | | | |
| **INT-03** | **Model / Layanan AI Gagal**: Matikan server AI (atau jalankan `mock_ai.py` dengan `MOCK_FAIL=1`) saat pengguna mengunggah foto | Endpoint mengembalikan HTTP `503` / koneksi gagal; UI tidak crash, memberi peringatan layanan AI tidak terjangkau, dan kurator tetap dapat memilih kategori manual | *(Teruji di API `test_api.py`: HTTP 503; uji UI menunggu eksekusi langsung)* | | | | |
| **INT-04** | **Prediksi Dikoreksi Kurator**: Foto menghasilkan saran AI tertentu (misal `kitlv_bangunan_03.jpg` terprediksi `lanskap`), kurator mengoreksi kategori final menjadi `bangunan` lalu menerbitkan | Metadata final mencatat `category_final: "bangunan"` terpisah dari `ai_category` dan `ai_confidence`; kedua versi tetap terlacak | | | | | |
| **INT-05** | **Transaksi Ditolak / Jaringan Salah / Biaya Tidak Tepat / Bukan Kurator**: (a) Tolak popup MetaMask, (b) pakai jaringan selain `31337`, (c) pakai akun non-kurator mencoba terbit, (d) kirim nilai selain `0,01 ETH` | Kontrak/MetaMask menolak; UI menampilkan alasan penolakan (`4001`, jaringan salah, `AccessControlUnauthorizedAccount`, `BiayaTidakTepat`); tidak ada status sukses palsu atau perubahan state | *(Teruji di unit test kontrak & `contractAndHash.test.ts`; uji UI menunggu eksekusi langsung)* | | | | |
| **INT-06** | **Media IPFS Hilang atau Berkas Diganti**: Putuskan akses node IPFS atau unggah berkas dengan konten berbeda untuk arsip yang sudah memiliki `fileHash` on-chain | Verifikasi integritas mendeteksi media IPFS tidak tersedia atau hash SHA-256 hitung ulang tidak cocok dengan catatan on-chain `getVersi(tokenId).fileHash` | | | | | |
