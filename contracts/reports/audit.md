# Laporan Analisis Keamanan & Audit Smart Contract: ArsipFotoVersi

**Proyek:** SunnyRest (P5 Arsip Foto dan Restorasi Terpadu)  
**Pengembang:** Haikal Alie Rhanditya (246651007)  
**Kontrak:** `ArsipFotoVersi.sol`  
**Standar:** ERC-721 (OpenZeppelin Contracts v5.0.2) + AccessControl + ReentrancyGuard  
**Compiler:** Solidity 0.8.24 (Cancun EVM, Optimizer enabled: 200 runs)  

---

## 1. Ringkasan Temuan Audit

### Versi Dasar (Pencatatan Versi ERC-721)
| ID | Kategori | Deskripsi | Status Mitigasi |
|---|---|---|---|
| SEC-01 | Kontrol Akses (Access Control) | Fungsi penerbitan token (`terbitkanVersi`) tidak boleh dapat dipanggil oleh publik secara bebas. | **Aman**: Dilindungi modifier `onlyRole(CURATOR_ROLE)`. |
| SEC-02 | Integritas Relasi Versi | Versi turunan tidak boleh merujuk ke token induk (`parentId`) fiktif atau yang belum pernah dicetak on-chain. | **Aman**: Divalidasi via `_ownerOf(parentId) != address(0)` jika `parentId != 0`. |
| SEC-03 | Pencegahan Duplikasi Berkas | Berkas foto dengan konten yang sama (hash SHA-256 identik) tidak boleh dicatat berulang kali. | **Aman**: Menggunakan mapping state `hashTerpakai[fileHash]` yang langsung ditandai saat minting. |
| SEC-04 | Immutability Data Versi Lama | Penerbitan versi turunan tidak boleh mengubah atau menimpa data versi sebelumnya. | **Aman**: Setiap token memiliki slot struct terisolasi di mapping `_versi[tokenId]`. Token lama tidak mengalami mutasi state. |
| SEC-05 | Reentrancy Minting | Pemanggilan eksternal saat `_safeMint` ke kontrak penerima (ERC721Receiver). | **Aman**: Pola *Checks-Effects-Interactions* dipatuhi; semua state (`hashTerpakai`, `_versi`, `nextId`) diubah sebelum pemanggilan `_safeMint`. |
| SEC-06 | Zero Address & Parameter Hygiene | Validasi input kosong atau alamat `0x0`. | **Aman**: Dilengkapi custom error `AlamatPenerimaNol`, `UriKosong`, dan `HashBerkasNol`. |

### Fitur Biaya Restorasi 0,01 ETH & Manajemen Dana
| ID | Kategori | Deskripsi | Status Mitigasi |
|---|---|---|---|
| SEC-07 | Reentrancy Penarikan & Refund | Risiko serangan masuk ulang saat `tarikBiaya` atau `kembalikanBiaya` mengirim ETH melalui `.call{value:...}("")`. | **Aman**: Kedua fungsi dilindungi `nonReentrant` (`ReentrancyGuard`) dan menerapkan pola *Checks-Effects-Interactions* (`req.selesai = true` & `danaTertahan -= jumlah` sebelum `call`). Terverifikasi oleh kontrak uji `PenyerangReentrancy`. |
| SEC-08 | Perlindungan Dana Pengguna Tertahan | Admin tidak boleh menarik dana milik pemohon yang permintaannya masih dalam antrean (belum selesai diproses atau di-refund). | **Aman**: Kontrak melacak `danaTertahan`. `tarikBiaya` hanya dapat menarik `address(this).balance - danaTertahan` setelah `terbitkanVersiRestorasi` menyelesaikan permintaan. |
| SEC-09 | Validasi Pembayaran Tepat & Pemakaian Ulang | Pembayaran kurang/lebih dari `biayaRestorasi` atau pemakaian `requestId` yang sama lebih dari satu kali. | **Aman**: `ajukanRestorasi` memaksa `msg.value == biayaRestorasi` (revert `BiayaTidakTepat`). `terbitkanVersiRestorasi` dan `kembalikanBiaya` menolak jika `req.selesai == true` (`PermintaanSudahSelesai`). |
| SEC-10 | Penolakan Transfer ETH Langsung | Pengiriman ETH langsung tanpa memanggil `ajukanRestorasi` dapat mengunci dana tanpa `requestId`. | **Aman**: Kontrak sengaja tidak mendefinisikan `receive()` maupun `fallback()`, sehingga transfer ETH langsung otomatis ditolak EVM. |
| SEC-11 | Risiko Diterima: Force-Send via `selfdestruct` | ETH dapat dipaksa masuk melalui `selfdestruct` dari kontrak eksternal. | **Risiko Diterima**: Tidak merusak invarian `danaTertahan` maupun aturan `ajukanRestorasi`. Kelebihan saldo tersebut dapat ditarik admin lewat `tarikBiaya`. |

---

## 2. Metrik Pengujian & Coverage

- **Automated Tests:** 35/35 lulus (17 test dasar + 18 test biaya restorasi, refund, dan reentrancy).
- **Statement Coverage:** 100% (Target PRD: >80%).
- **Branch Coverage:** 98.39% (61/62 cabang; 1 cabang implisit berada pada modifier akses internal saat penyiapan state).
- **Function Coverage:** 100%.
- **Line Coverage:** 100% (Target PRD: >80%).

---

## 3. Konsumsi Gas (Gas Usage)

Diukur melalui `hardhat-gas-reporter` (Solc `0.8.24`, optimizer `200` runs):
- **Deployment (`ArsipFotoVersi`):** Rata-rata `2,273,283 gas` (~3.8% dari block limit 60M)
- **`ajukanRestorasi(parentId)`:** Min `127,105` / Max `144,205` / Avg `141,762 gas` *(catatan: biaya layanan 0,01 ETH masuk ke saldo kontrak, terpisah dari gas jaringan)*
- **`terbitkanVersi(...)`:** Min `177,095` / Max `226,983` / Avg `197,700 gas`
- **`terbitkanVersiRestorasi(...)`:** Min `195,582` / Max `212,694` / Avg `198,321 gas`
- **`tarikBiaya(tujuan)`:** Avg `39,820 gas`
- **`kembalikanBiaya(requestId)`:** Avg `49,657 gas`
- **`aturBiaya(baru)`:** Avg `30,309 gas`
- **`transferFrom(...)`:** Avg `55,101 gas`
