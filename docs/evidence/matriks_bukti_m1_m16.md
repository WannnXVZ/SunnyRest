# Matriks Bukti Proyek Terpadu (Minggu 1–16)

**Tema:** P5 Arsip Foto dan Restorasi Terpadu (**SunnyRest**)  
**Kelompok:** Hanafi Purnama Yudi (AI & Data) · Haikal Alie Rhanditya (Blockchain) · Muhammad Arief Irawan (UI, IPFS & Dokumentasi)  
**Status:** `direncanakan` | `tersedia` | `diperiksa` | `perlu perbaikan`

---

## A. Matriks Kecerdasan Buatan (Bagian 7 Panduan)

| ID | Minggu & Materi | Posisi (K/P/E) | Lokasi Bukti & Prosedur | Hasil Aktual & Status | Penanggung Jawab |
|---|---|---|---|---|---|
| **AI-01** | M1: Konsep, paradigma & etika AI | K/P | `backend/ml/data/README.md`, `backend/ml/data/manifest.csv` | 345 foto berizin (CC0/CC BY/Public Domain), split anti-leak; status: `tersedia` *(perlu lengkapi kolom author/url)* | Hanafi |
| **AI-02** | M2: Pencarian BFS/DFS dan A* | P | `portfolio/ai/` *(isi artefak praktikum M2)* | Status: `direncanakan` | Tim |
| **AI-03** | M3: Praproses & ekstraksi fitur media | K/P | `backend/ml/preprocess.py`, `backend/ml/features.py` | Resize, normalisasi ImageNet, histogram warna + GLCM (`features.csv` 345 sampel); status: `tersedia` | Hanafi |
| **AI-04** | M4: Supervised learning KNN/SVM | K/P | `backend/ml/train_baseline.py`, `backend/experiments/baseline_results.json` | 48 test: KNN Acc 0.48 (Macro-F1 0.4517); SVM Acc 0.50 (Macro-F1 0.5016); status: `tersedia` | Hanafi |
| **AI-05** | M5: K-Means dan palet warna | P | `portfolio/ai/` *(isi artefak praktikum M5)* | Status: `direncanakan` | Tim |
| **AI-06** | M6: ANN dan MLP | P | `portfolio/ai/` *(isi artefak praktikum M6)* | Status: `direncanakan` | Tim |
| **AI-07** | M7: CNN dan transfer learning | K/P | `backend/ml/train_cnn.py`, `backend/ml/evaluate.py`, `backend/models/finetuned_model_3class.pth`, `backend/models/best_model_3class.pth`, `backend/experiments/cnn_eval_results.json`, `backend/experiments/cnn_frozen_eval_results.json` | Eksperimen frozen vs fine-tuned pada 48 test: keduanya Acc 0.9792, Macro-F1 0.9804, 1 salah kelas (`kitlv_bangunan_03.jpg`); status: `tersedia` | Hanafi |
| **AI-08** | M8: Artefak UTS | E | `portfolio/ai/` *(tautkan artefak UTS yang sudah dinilai)* | Status: `direncanakan` | Tim |
| **AI-09** | M9: YOLO dan deteksi objek | P | `portfolio/ai/` *(isi artefak praktikum M9)* | Status: `direncanakan` | Tim |
| **AI-10** | M10: Audio MFCC/spektrogram | P | `portfolio/ai/` *(isi artefak praktikum M10)* | Status: `direncanakan` | Tim |
| **AI-11** | M11: Neural Style Transfer & SR | K/P | `backend/ml/sr_eval.py`, `backend/models/RealESRGAN_x4plus.pth`, `backend/experiments/sr_eval_results.json` | Terukur pada `0003.png` (Bicubic 23.30 dB / 0.9474 vs SR 21.69 dB / 0.9351) & `0006.png` (Bicubic 30.79 dB / 0.9875 vs SR 28.93 dB / 0.9856); status: `tersedia` | Hanafi |
| **AI-12** | M12: GAN dan diffusion | P | `portfolio/ai/` *(penjelasan prinsip generator/discriminator SR & eksperimen lab)* | Status: `direncanakan` | Hanafi |
| **AI-13** | M13: NLP dan dialog LLM | P | `portfolio/ai/` *(isi artefak praktikum M13)* | Status: `direncanakan` | Tim |
| **AI-14** | M14: Agen FSM BT dan Q-Learning | P | `portfolio/ai/` *(isi artefak praktikum M14)* | Status: `direncanakan` | Tim |
| **AI-15** | M15: GUI integrasi & deployment | K | `backend/app/main.py`, `backend/tests/test_api.py`, `backend/tests/test_models.py`, `docs/evidence/log_uji_integrasi.md` | API FastAPI CORS + `/predict` + `/enhance` PNG lulus 7 test `pytest` + uji endpoint nyata; status: `tersedia` *(uji UI 6 skenario menunggu eksekusi)* | Hanafi & Arief |
| **AI-16** | M16: Showcase dan UAS | E | `docs/report/`, video demo, slide | Status: `direncanakan` | Semua |

---

## B. Matriks Teknologi Blockchain (Bagian 8 Panduan)

| ID | Minggu & Materi | Posisi (K/P/E) | Lokasi Bukti & Prosedur | Hasil Aktual & Status | Penanggung Jawab |
|---|---|---|---|---|---|
| **BC-01** | M1: Blockchain & arsitektur Web3 | K/P | `contracts/hardhat.config.ts`, `frontend/src/config/networks.ts` | Lingkungan Hardhat lokal & arsitektur trust boundary terdokumentasi; status: `tersedia` | Haikal |
| **BC-02** | M2: Hash tanda tangan & Merkle Tree | K/P | `frontend/src/lib/hash.ts`, `contracts/contracts/ArsipFotoVersi.sol` (`fileHash`), `portfolio/blockchain/` | SHA-256 client-side & pencatatan `bytes32 fileHash` anti-duplikat di kontrak; status: `tersedia` *(lengkapi lab Merkle di portfolio)* | Haikal |
| **BC-03** | M3: Blok dan konsensus | P | `portfolio/blockchain/` *(isi bukti simulator/analisis PoW/PoS/PoA)* | Status: `direncanakan` | Haikal |
| **BC-04** | M4: EVM gas dan Remix | P | `contracts/reports/gas-report.txt`, `portfolio/blockchain/` | Pengamatan `gasUsed` seluruh fungsi kontrak; status: `tersedia` *(lengkapi bukti Remix lab)* | Haikal |
| **BC-05** | M5: Solidity tipe data dan akses | K/P | `contracts/contracts/ArsipFotoVersi.sol` | `struct Versi`, `struct Permintaan`, `mapping hashTerpakai`, `AccessControl` (`CURATOR_ROLE`, `DEFAULT_ADMIN_ROLE`); status: `tersedia` | Haikal |
| **BC-06** | M6: ERC-20 | P | `portfolio/blockchain/` *(kontrak lab ERC-20)* | Status: `direncanakan` | Haikal |
| **BC-07** | M7: NFT ERC-721/1155 & IPFS | K/P | `contracts/contracts/ArsipFotoVersi.sol`, `frontend/src/lib/ipfs.ts` | Standar ERC-721 + relasi `parentId` + metadata JSON IPFS; status: `tersedia` | Haikal & Arief |
| **BC-08** | M8: UTS | E | `portfolio/blockchain/` *(bukti UTS/live coding)* | Status: `direncanakan` | Haikal |
| **BC-09** | M9: Hardhat & automated testing | K/P | `contracts/test/*.test.ts`, `contracts/reports/coverage/` | 35/35 automated tests lulus; coverage 100% Stmts, 100% Lines, 100% Funcs, 98.39% Branches; status: `tersedia` | Haikal |
| **BC-10** | M10: Frontend Web3 dan wallet | K | `frontend/src/lib/wallet.ts`, `frontend/src/lib/contract.ts`, `frontend/src/store/useArchiveStore.ts`, `frontend/src/tests/contractAndHash.test.ts` | MetaMask, `accountsChanged`/`chainChanged`, tx `ajukanRestorasi` 0,01 ETH, `terbitkanVersi`, parser custom error; 4/4 `vitest` lulus + `vite build` sukses; status: `tersedia` | Arief & Haikal |
| **BC-11** | M11: Penyimpanan dan media IPFS | K/P | `frontend/src/lib/ipfs.ts`, `docs/evidence/log_uji_integrasi.md` | Pinning Kubo/Pinata siap di kode *(perlu uji pinning nyata & media hilang saat demo)*; status: `tersedia` | Arief |
| **BC-12** | M12: Marketplace dan royalti | P | `portfolio/blockchain/` *(isi bukti lab marketplace/royalti)* | Status: `direncanakan` | Haikal |
| **BC-13** | M13: Keamanan kontrak | K/P | `contracts/contracts/test-helpers/PenyerangReentrancy.sol`, `contracts/reports/audit.md` | `ReentrancyGuard`, CEI, penolakan transfer ETH langsung, audit SEC-01 s/d SEC-11 & uji reentrancy lulus; status: `tersedia` | Haikal |
| **BC-14** | M14: Oracle Chainlink dan L2 | P | `portfolio/blockchain/` *(isi bukti lab oracle & L2)* | Status: `direncanakan` | Haikal |
| **BC-15** | M15: Presentasi capstone & Sepolia | E/K | `contracts/deployments/localhost.json`, `contracts/scripts/capture-local-receipts.ts`, `05_Test_dan_Deployment/blockchain/receipt_lokal.json`, `docs/usability/uji_penggunaan_3x3.md` | Deploy & receipt lengkap lokal aktif (`31337`); Sepolia & usability 3×3 belum dieksekusi (`direncanakan`); status: `perlu perbaikan` | Semua |
| **BC-16** | M16: Laporan akhir dan UAS | E | `docs/report/`, `docs/contributions/log_kontribusi.md` | Status: `direncanakan` | Semua |
