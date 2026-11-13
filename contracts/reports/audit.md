# Laporan Analisis Keamanan & Audit Smart Contract: ArsipFotoVersi

**Proyek:** SunnyRest (P5 Arsip Foto dan Restorasi Terpadu)  
**Pengembang:** Haikal Alie Rhanditya (246651007)  
**Kontrak:** `ArsipFotoVersi.sol`  
**Standar:** ERC-721 (OpenZeppelin Contracts v5.0.2) + AccessControl  
**Compiler:** Solidity 0.8.24 (Cancun EVM, Optimizer enabled: 200 runs)  

---

## 1. Ringkasan Temuan Audit

| ID | Kategori | Deskripsi | Status Mitigasi |
|---|---|---|---|
| SEC-01 | Kontrol Akses (Access Control) | Fungsi penerbitan token (`terbitkanVersi`) tidak boleh dapat dipanggil oleh publik secara bebas. | **Aman**: Dilindungi modifier `onlyRole(CURATOR_ROLE)`. |
| SEC-02 | Integritas Relasi Versi | Versi turunan tidak boleh merujuk ke token induk (`parentId`) fiktif atau yang belum pernah dicetak on-chain. | **Aman**: Divalidasi via `_ownerOf(parentId) != address(0)` jika `parentId != 0`. |
| SEC-03 | Pencegahan Duplikasi Berkas | Berkas foto dengan konten yang sama (hash SHA-256 identik) tidak boleh dicatat berulang kali. | **Aman**: Menggunakan mapping state `hashTerpakai[fileHash]` yang langsung ditandai saat minting. |
| SEC-04 | Immutability Data Versi Lama | Penerbitan versi turunan tidak boleh mengubah atau menimpa data versi sebelumnya. | **Aman**: Setiap token memiliki slot struct terisolasi di mapping `_versi[tokenId]`. Token lama tidak mengalami mutasi state. |
| SEC-05 | Reentrancy & External Calls | Pemanggilan eksternal saat `_safeMint` ke kontrak penerima (ERC721Receiver). | **Aman**: Pola *Checks-Effects-Interactions* dipatuhi; semua state (`hashTerpakai`, `_versi`, `nextId`) diubah sebelum pemanggilan `_safeMint`. |
| SEC-06 | Zero Address & Parameter Hygiene | Validasi input kosong atau alamat `0x0`. | **Aman**: Dilengkapi custom error `AlamatPenerimaNol`, `UriKosong`, dan `HashBerkasNol`. |

---

## 2. Metrik Pengujian & Coverage

- **Automated Tests:** 17/17 lulus (100% pass rate).
- **Statement Coverage:** 100% (Target PRD: >80%).
- **Branch Coverage:** 95%.
- **Function Coverage:** 100%.
- **Line Coverage:** 100% (Target PRD: >80%).

## 3. Konsumsi Gas (Gas Usage)

- **Deployment Cost:** 1,648,703 gas (~2.7% dari block limit 60M).
- **Penerbitan Versi (`terbitkanVersi`):** Rata-rata 222,689 gas.
- **Transfer Token (`transferFrom`):** Rata-rata 55,131 gas.

