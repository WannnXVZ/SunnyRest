# SunnyRest — Sistem Arsip Foto & Restorasi Terpadu Berbasis AI & Blockchain

**Proyek Terpadu AI & Blockchain** — Tema **P5: Arsip Foto dan Restorasi Terpadu**  
**TIM 5A — Kelompok 01 / 03** | D4 Teknik Informatika Multimedia, Politeknik Negeri Samarinda  
**Dosen Pembimbing:** M. Farman Andrijasa, S.Kom., M.Kom.

| NIM | Nama Anggota |
| :--- | :--- |
| `246651002` | Muhammad Arief Irawan |
| `246651007` | Haikal Alie Rhanditya |
| `246651029` | Hanafi Purnama Yudi |

---

## 1. Ringkasan Proyek

**SunnyRest** adalah aplikasi arsip foto dan restorasi terpadu yang menggabungkan kecerdasan buatan (**EfficientNet-B0** untuk klasifikasi adegan 3 kelas dan **Real-ESRGAN x4plus** untuk *super-resolution* 4×) dengan pencatatan provenance pada smart contract Ethereum **ERC-721** (`ArsipFotoVersi.sol`) dan penyimpanan konten terdesentralisasi berbasis **IPFS / Pinata**.

Setiap berkas asli dan hasil restorasi tidak saling menimpa: versi turunan/restorasi diterbitkan sebagai token terpisah yang terhubung ke `parentId` induknya, dilindungi pemeriksaan duplikasi hash SHA-256 on-chain (`hashTerpakai`), mekanisme biaya escrow restorasi `0.01 ETH`, serta kontrol akses kurator (`CURATOR_ROLE`).

---

## 2. Fitur Utama & Arsitektur 3 Peran

### Fitur Utama
- **Klasifikasi Adegan AI (`EfficientNet-B0`):** Mengklasifikasikan foto arsip ke dalam 3 kategori (`bangunan`, `lanskap`, `orang`), dievaluasi terhadap baseline klasik **SVM (`RBF`, `C=10`)** dan **KNN (`k=5`)**.
- **Restorasi Super-Resolution (`Real-ESRGAN x4plus`):** Menghasilkan versi peningkatan resolusi 4× sebagai artefak/token terpisah dengan evaluasi pembanding **Bicubic** melalui `backend/ml/sr_eval.py`.
- **Smart Contract Provenance (`ArsipFotoVersi.sol`):** Standar `ERC721` + `ERC721URIStorage` + `AccessControl` + `ReentrancyGuard` untuk relasi `parentId`, pencegahan duplikasi berkas via `hashTerpakai` (SHA-256), `CURATOR_ROLE`, dan escrow biaya restorasi `0.01 ETH`.
- **Penyimpanan Terdesentralisasi & Manajemen Pengajuan:** Pinning berkas media dan metadata JSON ke IPFS (`PINATA_JWT` / node IPFS lokal) disertai sinkronisasi status pengajuan pada backend FastAPI (`/submissions`).
- **Verifikasi Publik Ganda & Privasi Receipt:** Halaman `VerificationPage` mendukung verifikasi arsip berdasarkan pencarian lokal, `Token ID` on-chain, hash **SHA-256** (`hashTerpakai`), maupun **Transaction Hash** (`getTransactionReceipt` melalui `fetchTransactionReceiptOnChain`), sementara riwayat transaksi pribadi (`TransactionReceiptHistory`) tetap privat bagi pemilik/pemohon.

### Arsitektur 3 Peran Pengguna
| Peran | Halaman / Modul Utama | Kapabilitas & Batasan |
| :--- | :--- | :--- |
| **1. Pengunjung Publik** | `PublicPortalPage`, `PublicArchiveModal`, `ArchiveGalleryPage`, `ArchiveDetailPage`, `VerificationPage` | Menjelajahi arsip yang telah terbit dan memverifikasi integritas berkas (`SHA-256` / `Token ID` / `Transaction Hash`) tanpa melihat riwayat transaksi privat pemohon lain. |
| **2. Pemohon / Kontributor** | `ContributorOverviewPage`, `ContributorDashboardPage`, `UploadPage`, `RestorationPage`, `VerificationPage`, `SettingsPage` | Mengunggah foto, menjalankan klasifikasi & restorasi AI, melakukan pinning IPFS, mengirim pengajuan restorasi beserta escrow `0.01 ETH`, serta melihat bukti transaksi pribadinya. |
| **3. Kurator / Admin** | `OverviewPage`, `CuratorReviewPage` | Meninjau pengajuan masuk dengan otoritas `CURATOR_ROLE` dan mengeksekusi transaksi minting on-chain (versi asli maupun versi turunan/restorasi) melalui MetaMask. |

### Diagram Alur Sistem

```text
+-------------------------------------------------------------------------+
|                    FRONTEND (React 18 + Vite + Tailwind + Zustand)      |
|  Public Portal & Verification | Contributor Dashboard | Curator Review  |
+-------------------+---------------------------------+-------------------+
                    | REST (VITE_API_URL)             | MetaMask + Ethers.js v6
                    v                                 v
+---------------------------------------+   +-----------------------------+
|        BACKEND API (FastAPI)          |   |   BLOCKCHAIN (EVM)          |
|  - /predict   -> EfficientNet-B0      |   |   ArsipFotoVersi.sol        |
|  - /enhance   -> Real-ESRGAN x4plus   |   |   - ERC-721 + parentId      |
|  - /ipfs/*    -> Pinata / IPFS Node   |   |   - hashTerpakai (SHA-256)  |
|  - /submissions & /storage/files/*    |   |   - CURATOR_ROLE & 0.01 ETH |
|  - onchain.py -> Verifikasi Tx Escrow |   |   - Localhost / Sepolia     |
+-------------------+-------------------+   +--------------+--------------+
                    |                                      ^
                    v                                      |
          +-------------------+                            |
          |   IPFS / Pinata   | --- tokenURI (CID JSON) ---+
          +-------------------+
```

---

## 3. Tech Stack & Versi Terkunci

| Lapisan | Teknologi & Versi Terverifikasi |
| :--- | :--- |
| **Runtime & Package Manager** | Node.js `v26.13.0`, npm `11.20.0`, Python `3.11.9` |
| **Frontend** | React `18.3.1`, TypeScript `5.7.3`, Vite `6.2.0`, Tailwind CSS `3.4.17`, Zustand `5.0.3`, Ethers.js `6.13.5`, Vitest `3.0.9` |
| **Backend & AI** | FastAPI, Uvicorn, PyTorch (`EfficientNet-B0`, `Real-ESRGAN x4plus`), scikit-learn (`SVM`, `KNN`), `pytest` |
| **Blockchain & Contract** | Solidity `0.8.24` (EVM `cancun`, optimizer `200` runs), Hardhat `2.29.2` (`^2.22.10`), OpenZeppelin Contracts `^5.0.2` |
| **Decentralized Storage** | Pinata Cloud API (`PINATA_JWT`) / node IPFS (`IPFS_API_URL`, `IPFS_GATEWAY`) |

---

## 4. Struktur Direktori Aktual

```text
SunnyRest/
├── .env.example                       # Referensi gabungan variabel environment root
├── README.md                          # Dokumentasi utama proyek
├── backend/
│   ├── .env.example                   # Template environment backend (CORS, IPFS, On-chain)
│   ├── README.md                      # Catatan teknis backend & ML
│   ├── requirements.txt               # Dependensi Python backend & inferensi AI
│   ├── setup_models.py                # Utilitas cek/ekstrak/unduh 3 file bobot .pth
│   ├── app/
│   │   ├── main.py                    # Entrypoint FastAPI & seluruh endpoint REST
│   │   ├── config.py                  # Konfigurasi environment backend
│   │   ├── schemas.py                 # Skema Pydantic request/response
│   │   ├── ipfs.py                    # Klien pinning file & JSON ke Pinata/IPFS
│   │   ├── submissions.py             # Persistensi & lifecycle pengajuan arsip
│   │   ├── onchain.py                 # Verifikasi pembayaran escrow on-chain
│   │   └── inference/
│   │       ├── classifier.py          # Loader & inferensi EfficientNet-B0 (3 kelas)
│   │       └── enhancer.py            # Loader & inferensi Real-ESRGAN x4plus
│   ├── dev/
│   │   └── mock_ai.py                 # Utilitas simulasi AI untuk pengembangan
│   ├── ml/
│   │   ├── preprocess.py              # Pra-pemrosesan citra dataset
│   │   ├── features.py                # Ekstraksi fitur untuk baseline klasik
│   │   ├── split_manifest.py          # Pembagian dataset via GroupShuffleSplit
│   │   ├── train_baseline.py          # Pelatihan baseline SVM & KNN
│   │   ├── train_cnn.py               # Pelatihan / fine-tuning EfficientNet-B0
│   │   ├── evaluate.py                # Evaluasi akurasi & Macro-F1 di data uji
│   │   ├── sr_eval.py                 # Benchmark PSNR & SSIM (Real-ESRGAN vs Bicubic)
│   │   └── data/                      # manifest.csv & features.csv
│   ├── models/                        # Direktori target penyimpanan file bobot .pth
│   ├── experiments/                   # Artefak & log hasil eksperimen model
│   └── tests/
│       ├── test_api.py                # Pengujian endpoint FastAPI & submissions
│       └── test_models.py             # Pengujian pemuatan & inferensi model AI
├── contracts/
│   ├── .env.example                   # Template environment Hardhat & Sepolia deployer
│   ├── contracts/
│   │   └── ArsipFotoVersi.sol         # Smart contract ERC-721 arsip & restorasi
│   ├── deployments/
│   │   ├── ArsipFotoVersiABI.json     # ABI hasil kompilasi untuk sinkronisasi
│   │   ├── localhost.json             # Rekaman alamat kontrak jaringan lokal (31337)
│   │   └── sepolia.json               # Rekaman alamat kontrak Sepolia (11155111)
│   ├── scripts/
│   │   ├── deploy.ts                  # Skrip deployment & penyimpanan metadata jaringan
│   │   ├── export-abi.ts              # Ekspor ABI ke deployments & frontend
│   │   └── capture-local-receipts.ts  # Pengambilan bukti transaksi node lokal
│   └── test/
│       ├── penerbitan.test.ts         # Uji minting asli, peran kurator & anti-duplikat
│       ├── relasi-versi.test.ts       # Uji silsilah parentId & token turunan
│       ├── transfer.test.ts           # Uji transfer kepemilikan ERC-721
│       ├── event-state.test.ts        # Uji emisi event & konsistensi state
│       └── biaya-restorasi.test.ts    # Uji alur permintaan & escrow biaya 0.01 ETH
└── frontend/
    ├── .env.example                   # Template environment Vite & jaringan Ethers.js
    └── src/
        ├── abi/ArsipFotoVersi.json    # Salinan ABI smart contract untuk frontend
        ├── config/networks.ts         # Konfigurasi chainId, RPC, & kontrak jaringan
        ├── components/                # AppNavbar, FooterDisclaimer, PublicArchiveModal,
        │                              # Sidebar, StatusBadge, TopHeader, TransactionReceiptHistory
        ├── lib/                       # api.ts, contract.ts, hash.ts, ipfs.ts,
        │                              # ownership.ts, receipts.ts, wallet.ts
        ├── pages/                     # PublicPortalPage, WorkspaceLoginPage, OverviewPage,
        │                              # ContributorOverviewPage, ContributorDashboardPage,
        │                              # ArchiveGalleryPage, ArchiveDetailPage, UploadPage,
        │                              # RestorationPage, CuratorReviewPage, VerificationPage, SettingsPage
        ├── store/useArchiveStore.ts   # State management Zustand
        ├── tests/contractAndHash.test.ts # Unit test Vitest (hash, contract helper & receipt)
        └── types/index.ts             # Definisi tipe TypeScript aplikasi
```

---

## 5. Konfigurasi Environment (`.env`)

Salin masing-masing `.env.example` menjadi `.env` pada folder `contracts/`, `backend/`, dan `frontend/` sebelum menjalankan sistem (file `.env.example` di root merangkum ketiganya sebagai referensi).

| Lokasi File | Variabel | Keterangan |
| :--- | :--- | :--- |
| `frontend/.env` | `VITE_API_URL` | URL dasar backend FastAPI (contoh lokal: `http://localhost:8000`) |
| `frontend/.env` | `VITE_CHAIN_ID` | ID jaringan aktif (`31337` untuk Hardhat lokal, `11155111` untuk Sepolia) |
| `frontend/.env` | `VITE_LOCAL_RPC_URL` | Endpoint RPC Hardhat lokal |
| `frontend/.env` | `VITE_CONTRACT_ADDRESS_LOCAL` | Alamat kontrak lokal (`0x5FbDB2315678afecb367f032d93F642f64180aa3`) |
| `frontend/.env` | `VITE_SEPOLIA_RPC_URL` | Endpoint RPC Sepolia (default: `https://ethereum-sepolia-rpc.publicnode.com`) |
| `frontend/.env` | `VITE_CONTRACT_ADDRESS_SEPOLIA` | Alamat kontrak Sepolia (`0xcD95dD3b876175DA2AF6b2a098f655DDFa54F2c8`) |
| `frontend/.env` | `VITE_IPFS_GATEWAY` | URL gateway IPFS untuk preview media & metadata |
| `backend/.env` | `CORS_ORIGINS` | Origin frontend yang diizinkan mengakses FastAPI |
| `backend/.env` | `PINATA_JWT` | Token JWT Pinata untuk pinning file & JSON ke IPFS |
| `backend/.env` | `IPFS_API_URL` | Endpoint API node IPFS alternatif jika tidak memakai Pinata |
| `backend/.env` | `IPFS_GATEWAY` | Gateway IPFS yang dikembalikan bersama CID |
| `backend/.env` | `RPC_URL` | URL RPC blockchain untuk pengecekan transaksi on-chain oleh backend |
| `backend/.env` | `CONTRACT_ADDRESS` | Alamat kontrak `ArsipFotoVersi` yang dipantau `onchain.py` |
| `backend/.env` | `VERIFY_ONCHAIN_PAYMENT` | Aktifkan verifikasi pembayaran escrow on-chain (`true`) |
| `contracts/.env` | `SEPOLIA_RPC_URL` | URL RPC Sepolia untuk deployment Hardhat |
| `contracts/.env` | `PRIVATE_KEY` | Private key akun deployer / testnet (**jangan unggah ke Git**) |
| `contracts/.env` | `ETHERSCAN_API_KEY` | API key Etherscan untuk verifikasi kode kontrak di Sepolia |
| `contracts/.env` | `REPORT_GAS` | Aktifkan pelaporan penggunaan gas saat pengujian (`true`) |

---

## 6. Instalasi, Persiapan Bobot Model & Menjalankan Aplikasi

### Langkah A — Siapkan Bobot Model AI (`backend/setup_models.py`)
Masuk ke direktori `backend/`, pasang dependensi, lalu jalankan `setup_models.py` untuk memeriksa, mengekstrak, atau mengunduh ketiga file bobot `.pth` ke `backend/models/`:

```powershell
cd backend
pip install -r requirements.txt
python setup_models.py
```

Checksum SHA-256 terverifikasi untuk bobot model pada `backend/models/`:

| Nama File | Ukuran (Byte) | SHA-256 Terverifikasi |
| :--- | :---: | :--- |
| `finetuned_model_3class.pth` | `16,349,857` | `ddf7eadb330dba62790d587276fe94f8711294066c89f76bb359370fbde094be` |
| `best_model_3class.pth` | `16,347,771` | `fbaaeacde00f0910a93679f7be313d13df2b3ba815d65c3efc4626cfe55070db` |
| `RealESRGAN_x4plus.pth` | `67,040,989` | `4fa0d38905f75ac06eb49a7951b426670021be3018265fd191d2125df9d682f1` |

### Langkah B — Menjalankan pada Mode Localhost (`chainId: 31337`)

1. **Jalankan Node Hardhat & Deploy Kontrak Lokal (`contracts/`):**
   ```powershell
   cd contracts
   npm install
   npx hardhat node
   ```
   Pada terminal baru:
   ```powershell
   cd contracts
   npm run deploy:local
   ```
   Alamat default deployment lokal tercatat di `contracts/deployments/localhost.json` (`0x5FbDB2315678afecb367f032d93F642f64180aa3`).

2. **Jalankan Backend FastAPI (`backend/`):**
   Pastikan `backend/.env` menyetel `RPC_URL` dan `CONTRACT_ADDRESS` sesuai node lokal (jika `VERIFY_ONCHAIN_PAYMENT=true`), lalu jalankan:
   ```powershell
   cd backend
   uvicorn app.main:app --port 8000 --reload
   ```
   *(Utilitas `backend/dev/mock_ai.py` juga tersedia bila diperlukan simulasi pengembangan tanpa menjalankan inferensi berat.)*

3. **Jalankan Frontend React (`frontend/`):**
   Pastikan `frontend/.env` menyetel `VITE_CHAIN_ID=31337`, `VITE_CONTRACT_ADDRESS_LOCAL`, dan `VITE_API_URL`, lalu jalankan:
   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

### Langkah C — Menjalankan pada Mode Ethereum Sepolia (`chainId: 11155111`)

1. Setel `frontend/.env` ke:
   - `VITE_CHAIN_ID=11155111`
   - `VITE_SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com`
   - `VITE_CONTRACT_ADDRESS_SEPOLIA=0xcD95dD3b876175DA2AF6b2a098f655DDFa54F2c8`
2. Setel `backend/.env` (`RPC_URL` dan `CONTRACT_ADDRESS`) ke Sepolia dengan alamat kontrak yang sama agar `onchain.py` memeriksa receipt transaksi pada jaringan yang sama.
3. *(Opsional jika melakukan deployment kontrak baru)*: isi `contracts/.env` (`SEPOLIA_RPC_URL`, `PRIVATE_KEY`, `ETHERSCAN_API_KEY`) dan deploy menggunakan `contracts/scripts/deploy.ts`.
   > **Catatan Transaksi Kontrak Lama:** Apabila kontrak dideploy ulang ke alamat baru, state `hashTerpakai` kontrak baru dimulai dari kosong, tetapi bukti transaksi dari kontrak sebelumnya tetap permanen di blockchain/Etherscan Sepolia dan tetap dapat diperiksa melalui input **Transaction Hash** (`getTransactionReceipt`) pada halaman `VerificationPage`.

---

## 7. Endpoint Backend FastAPI (`backend/app/main.py`)

| Method & Path | Fungsi Utama |
| :--- | :--- |
| `GET /health` | Mengecek kesiapan server API |
| `POST /predict` | Klasifikasi adegan foto ke 3 kelas (`bangunan`, `lanskap`, `orang`) |
| `POST /enhance` | Restorasi super-resolution 4× menggunakan `Real-ESRGAN x4plus` |
| `POST /ipfs/pin-file` | Mengunggah & melakukan pinning berkas media ke IPFS/Pinata |
| `POST /ipfs/pin-json` | Mengunggah & melakukan pinning metadata JSON ERC-721 ke IPFS/Pinata |
| `GET /submissions` | Mengambil daftar pengajuan arsip/restorasi |
| `POST /submissions` | Membuat entri pengajuan baru beserta data integritas & status |
| `POST /submissions/{sub_id}/upload-file` | Mengunggah lampiran berkas pada pengajuan tertentu |
| `PATCH /submissions/{sub_id}` | Memperbarui status pengajuan (misalnya persetujuan kurator / hasil tx) |
| `GET /storage/files/{filename}` | Menyajikan berkas lokal yang tersimpan sementara di backend |

---

## 8. Smart Contract & Alamat Deployment

Smart contract **`ArsipFotoVersi.sol`** mewarisi `ERC721`, `ERC721URIStorage`, `AccessControl`, dan `ReentrancyGuard` dari OpenZeppelin `^5.0.2`, dikompilasi dengan **Solidity `0.8.24`** (`cancun`, optimizer `200` runs).

| Jaringan | Chain ID | Alamat Kontrak | Metadata Terverifikasi |
| :--- | :---: | :--- | :--- |
| **Ethereum Sepolia Testnet** | `11155111` | `0xcD95dD3b876175DA2AF6b2a098f655DDFa54F2c8` | Deployer: `0xe8C5AbA3b6c695a882D9e7CeBaaB3E691178b2f8` \| Deployed: `2026-11-23T06:47:56.786Z` (`contracts/deployments/sepolia.json`) |
| **Hardhat Localhost** | `31337` | `0x5FbDB2315678afecb367f032d93F642f64180aa3` | Deployment default jaringan lokal (`contracts/deployments/localhost.json`) |

ABI kontrak diekspor melalui `contracts/scripts/export-abi.ts` ke `contracts/deployments/ArsipFotoVersiABI.json` dan `frontend/src/abi/ArsipFotoVersi.json`.

---

## 9. Pengujian Otomatis & Hasil Evaluasi Terverifikasi

### Pengujian Smart Contract (`contracts/`)
```powershell
cd contracts
npx hardhat test && npx hardhat coverage
```
- **Berkas uji (`contracts/test/`):** `penerbitan.test.ts`, `relasi-versi.test.ts`, `transfer.test.ts`, `event-state.test.ts`, `biaya-restorasi.test.ts`
- **Hasil terverifikasi:** **35 passing**, coverage **100% Statements**, **98.39% Branches**, **100% Functions**, **100% Lines**.

### Pengujian Frontend (`frontend/`)
```powershell
cd frontend
npm test && npm run build
```
- **Berkas uji:** `frontend/src/tests/contractAndHash.test.ts`
- **Hasil terverifikasi:** **7 passed** (Vitest) serta `tsc && vite build` lulus tanpa error.

### Pengujian Backend (`backend/`)
```powershell
cd backend
python -m pytest -v
```
- **Berkas uji:** `backend/tests/test_models.py` dan `backend/tests/test_api.py`
- **Hasil terverifikasi:** `test_models.py` **3/3 passed**; snapshot log `test_api_output.txt` mencatat **7 passed** (serta cakupan tambahan lifecycle & persistensi `/submissions` pada `test_api.py`).

### Evaluasi Model AI (`backend/ml/`)
- **Dataset:** `345` foto berlisensi (`bangunan`, `lanskap`, `orang`) dibagi dengan `GroupShuffleSplit` menjadi **251 train / 46 val / 48 test** (`21 bangunan`, `14 lanskap`, `13 orang`).
- **Klasifikasi Adegan (48 sampel uji independen):**

| Model | Accuracy (Test) | Macro-F1 | Catatan Terverifikasi |
| :--- | :---: | :---: | :--- |
| **EfficientNet-B0 (Fine-Tuned)** | **97.92%** | **0.9804** | 1 misklasifikasi (`kitlv_bangunan_03.jpg`: `bangunan` → `lanskap`) |
| **EfficientNet-B0 (Frozen)** | **97.92%** | **0.9804** | Performa setara pada set uji |
| **SVM (`RBF`, `C=10`)** | 50.00% | 0.5016 | Baseline ekstraksi fitur klasik |
| **KNN (`k=5`)** | 47.92% | 0.4517 | Baseline ekstraksi fitur klasik |

- **Benchmark Super-Resolution (`backend/ml/sr_eval.py`, Real-ESRGAN x4plus vs Bicubic):**
  - `0003.png` (`510×339 → 2040×1356`): Bicubic `23.30 dB / SSIM 0.9474` vs Real-ESRGAN `21.69 dB / SSIM 0.9351`
  - `0006.png` (`339×510 → 1356×2040`): Bicubic `30.79 dB / SSIM 0.9875` vs Real-ESRGAN `28.93 dB / SSIM 0.9856`
  - *(Nilai PSNR/SSIM pada pembandingan downsample lebih rendah daripada Bicubic karena Real-ESRGAN memprioritaskan ketajaman persepsi tekstur dibandingkan minimisasi selisih piksel MSE.)*

---

## 10. Disclaimer Akademik & Lisensi

- **Keperluan Akademik:** Proyek ini dikembangkan untuk memenuhi tugas Mata Kuliah **Proyek Terpadu AI & Blockchain** (Politeknik Negeri Samarinda).
- **Batasan AI & Blockchain:** Hasil klasifikasi dan restorasi AI bersifat pendukung analisis dan wajib melalui tinjauan kurator; pencatatan token ERC-721 beserta hash SHA-256 dan CID IPFS membuktikan integritas serta kronologi digital berkas, bukan pengesahan hak cipta secara hukum.
- **Keamanan Wallet:** Gunakan hanya akun pengembangan/testnet (Hardhat lokal atau Ethereum Sepolia) dan jangan pernah membagikan atau memublikasikan file `.env` yang berisi `PRIVATE_KEY` maupun `PINATA_JWT`.
- **Lisensi:** Menggunakan lisensi **MIT** untuk kode sumber proyek akademik ini.
