# SunnyRest: Arsip Foto dan Restorasi Terpadu (P5)

Prototipe DApp arsip foto berizin dengan klasifikasi adegan berbantuan AI (orang, bangunan, lanskap), peningkatan resolusi (super-resolution), peninjauan kurator, penyimpanan off-chain IPFS, dan pencatatan versi sumber-turunan berbasis ERC-721.

## Anggota Kelompok (Cinta Segitiga 5A)

- **Hanafi Purnama Yudi** (246651029): Koordinator, AI & Data
- **Haikal Alie Rhanditya** (246651007): Smart Contract & Blockchain
- **Muhammad Arief Irawan** (246651002): UI Frontend, IPFS & Dokumentasi

## Struktur Folder

```text
SunnyRest/
├── frontend/                  # SPA React + TypeScript + Tailwind + Ethers.js
│   ├── public/
│   └── src/
│       ├── config/            # Konfigurasi env, jaringan (Hardhat/Sepolia), kontrak
│       ├── abi/               # ABI hasil kompilasi kontrak
│       ├── lib/               # Wallet, kontrak, IPFS, hash SHA-256, klien API
│       ├── store/             # State UI (Zustand)
│       ├── pages/             # Halaman aplikasi
│       ├── components/        # Komponen UI reusable
│       ├── types/             # Definisi tipe TypeScript
│       └── tests/             # Unit & integration test frontend
├── backend/                   # Layanan Python FastAPI untuk AI & proxy IPFS
│   ├── app/                   # Endpoint /predict, /enhance, dan pinning IPFS
│   ├── models/                # Checkpoint model & loader inferensi
│   ├── training/              # Pipeline praproses, split, CNN, KNN/SVM, SR
│   └── tests/                 # Pengujian API & inferensi
├── contracts/                 # Proyek Hardhat & Solidity (ERC-721)
│   ├── contracts/             # Smart contract arsip & relasi versi
│   ├── scripts/               # Script deployment lokal & Sepolia
│   ├── test/                  # Minimal 12 automated test & coverage
│   └── deployments/           # Alamat, chainId, dan ABI per jaringan
├── data/
│   └── manifests/             # Manifest sumber, izin, label, grup, dan split dataset
├── portfolio/                 # Bukti praktikum pendukung minggu 1-14
│   ├── ai/                    # Portofolio AI (KNN/SVM, K-Means, MLP, YOLO, dll.)
│   └── blockchain/            # Portofolio Blockchain (hash, konsensus, ERC-20, audit, dll.)
└── docs/                      # Dokumentasi proyek & bukti evaluasi
    ├── proposal/              # Proposal & proposal revisi 1 halaman
    ├── evidence/              # Matriks bukti M1-M16, receipt, CID, log gas
    ├── report/                # Laporan 12-16 halaman, slide, dan video demo
    ├── usability/             # Hasil uji penggunaan (3 sukarelawan x 3 tugas)
    └── contributions/         # Log kontribusi anggota, review silang, deklarasi AI
```

