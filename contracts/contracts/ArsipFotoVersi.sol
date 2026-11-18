// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ArsipFotoVersi
 * @author Haikal Alie Rhanditya (246651007)
 * @notice Kontrak ERC-721 untuk mencatat silsilah versi arsip foto, hasil restorasi AI, dan pembayaran biaya restorasi on-chain.
 * @dev Mengimplementasikan relasi parent-child, pencegahan duplikasi hash, kontrol akses kurator, dan ReentrancyGuard.
 */
contract ArsipFotoVersi is ERC721URIStorage, AccessControl, ReentrancyGuard {
    bytes32 public constant CURATOR_ROLE = keccak256("CURATOR_ROLE");

    struct Versi {
        uint256 parentId;      // 0 = versi asli (tanpa induk)
        bytes32 fileHash;      // SHA-256 hash dari berkas foto asli/turunan
        address publisher;     // Alamat wallet kurator yang menerbitkan
        uint64  publishedAt;   // Waktu block saat versi dicatat on-chain
    }

    struct Permintaan {
        address pemohon;       // Alamat wallet pengguna yang membayar biaya restorasi
        uint256 parentId;      // ID token versi sumber yang diminta untuk direstorasi
        uint256 jumlah;        // Nilai wei yang dibayarkan saat pengajuan
        uint64  diajukanPada;  // Waktu block saat permintaan diajukan
        bool    selesai;       // True jika versi turunan sudah diterbitkan atau dana sudah dikembalikan
    }

    // Mapping tokenId => data Versi
    mapping(uint256 => Versi) private _versi;

    // Mapping pencegahan duplikasi hash berkas (anti-duplikat)
    mapping(bytes32 => bool) public hashTerpakai;

    // Penghitung ID token on-chain (mulai dari 1, ID 0 dikhususkan sebagai penanda root)
    uint256 public nextId;

    // Pengaturan dan pencatatan permintaan restorasi berbayar
    uint256 public biayaRestorasi = 0.01 ether;
    uint256 public nextRequestId = 1;
    uint256 public danaTertahan;
    mapping(uint256 => Permintaan) private _permintaan;

    // Custom errors untuk efisiensi gas dan kejelasan penanganan error di UI
    error AlamatPenerimaNol();
    error UriKosong();
    error HashBerkasNol();
    error HashSudahTerpakai(bytes32 hash);
    error ParentTidakTerdaftar(uint256 parentId);
    error TokenTidakDitemukan(uint256 tokenId);
    error BiayaTidakTepat(uint256 dikirim, uint256 dibutuhkan);
    error PermintaanTidakDitemukan(uint256 requestId);
    error PermintaanSudahSelesai(uint256 requestId);
    error TujuanNol();
    error SaldoKosong();
    error TransferGagal();

    // Events on-chain
    event VersiDiterbitkan(
        uint256 indexed tokenId,
        uint256 indexed parentId,
        address indexed to,
        address publisher,
        bytes32 fileHash,
        string uri
    );
    event RestorasiDiajukan(
        uint256 indexed requestId,
        uint256 indexed parentId,
        address indexed pemohon,
        uint256 jumlah
    );
    event RestorasiSelesai(uint256 indexed requestId, uint256 indexed tokenId);
    event BiayaDiubah(uint256 lama, uint256 baru);
    event BiayaDitarik(address indexed tujuan, uint256 jumlah);
    event BiayaDikembalikan(uint256 indexed requestId, address indexed pemohon, uint256 jumlah);

    /**
     * @notice Constructor: Menginisialisasi nama token, simbol, dan menetapkan hak akses awal.
     * @dev Memberikan hak DEFAULT_ADMIN_ROLE dan CURATOR_ROLE ke deployer kontrak.
     */
    constructor(address initialCurator) ERC721("ArsipFotoVersi", "ARSIP") {
        if (initialCurator == address(0)) revert AlamatPenerimaNol();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(CURATOR_ROLE, msg.sender);

        if (initialCurator != msg.sender) {
            _grantRole(CURATOR_ROLE, initialCurator);
        }

        nextId = 1; // Token ID dimulai dari 1
    }

    /**
     * @notice [FUNGSI KUNCI] Menerbitkan versi baru foto arsip (versi asli maupun turunan kurator).
     * @dev Hanya kurator terverifikasi (CURATOR_ROLE) yang dapat memanggil fungsi ini.
     */
    function terbitkanVersi(
        address to,
        string calldata uri,
        bytes32 fileHash,
        uint256 parentId
    ) external onlyRole(CURATOR_ROLE) returns (uint256) {
        return _terbitkan(to, uri, fileHash, parentId);
    }

    /**
     * @notice [FUNGSI KUNCI] Mengajukan permintaan restorasi berbayar untuk versi yang sudah tercatat on-chain.
     * @dev Terbuka untuk siapa saja dengan wallet; wajib membayar tepat sebesar `biayaRestorasi`.
     * Dana ditahan di `danaTertahan` hingga kurator menerbitkan hasil atau admin mengembalikan dana.
     *
     * @param parentId ID token versi sumber yang sudah terdaftar (tidak boleh 0)
     * @return requestId ID unik permintaan restorasi untuk verifikasi backend dan kurator
     */
    function ajukanRestorasi(uint256 parentId) external payable returns (uint256 requestId) {
        if (parentId == 0 || _ownerOf(parentId) == address(0)) revert ParentTidakTerdaftar(parentId);
        if (msg.value != biayaRestorasi) revert BiayaTidakTepat(msg.value, biayaRestorasi);

        requestId = nextRequestId++;
        _permintaan[requestId] = Permintaan({
            pemohon: msg.sender,
            parentId: parentId,
            jumlah: msg.value,
            diajukanPada: uint64(block.timestamp),
            selesai: false
        });
        danaTertahan += msg.value;

        emit RestorasiDiajukan(requestId, parentId, msg.sender, msg.value);
    }

    /**
     * @notice [FUNGSI KUNCI] Menerbitkan versi turunan dari permintaan restorasi berbayar yang valid.
     * @dev Menandai permintaan selesai dan melepaskan dana dari `danaTertahan` agar dapat ditarik admin.
     *
     * @param to Alamat wallet penerima token turunan
     * @param uri URI metadata IPFS hasil restorasi
     * @param fileHash SHA-256 hash berkas hasil restorasi
     * @param requestId ID permintaan restorasi yang dibayar sebelumnya
     * @return tokenId ID token baru yang merujuk parentId dari permintaan
     */
    function terbitkanVersiRestorasi(
        address to,
        string calldata uri,
        bytes32 fileHash,
        uint256 requestId
    ) external onlyRole(CURATOR_ROLE) returns (uint256 tokenId) {
        if (requestId == 0 || requestId >= nextRequestId) revert PermintaanTidakDitemukan(requestId);
        Permintaan storage req = _permintaan[requestId];
        if (req.selesai) revert PermintaanSudahSelesai(requestId);

        req.selesai = true;
        danaTertahan -= req.jumlah;

        tokenId = _terbitkan(to, uri, fileHash, req.parentId);
        emit RestorasiSelesai(requestId, tokenId);
    }

    /**
     * @notice [FUNGSI KUNCI] Mengembalikan biaya restorasi ke pemohon jika proses AI/kurasi dibatalkan sebelum selesai.
     * @dev Hanya admin yang berwenang. Menerapkan Checks-Effects-Interactions dan `nonReentrant`.
     */
    function kembalikanBiaya(uint256 requestId) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        if (requestId == 0 || requestId >= nextRequestId) revert PermintaanTidakDitemukan(requestId);
        Permintaan storage req = _permintaan[requestId];
        if (req.selesai) revert PermintaanSudahSelesai(requestId);

        uint256 jumlah = req.jumlah;
        address pemohon = req.pemohon;

        req.selesai = true;
        danaTertahan -= jumlah;

        (bool ok, ) = payable(pemohon).call{value: jumlah}("");
        if (!ok) revert TransferGagal();

        emit BiayaDikembalikan(requestId, pemohon, jumlah);
    }

    /**
     * @notice Mengubah besaran biaya restorasi (dalam wei). Hanya dapat dilakukan oleh admin.
     */
    function aturBiaya(uint256 baru) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 lama = biayaRestorasi;
        biayaRestorasi = baru;
        emit BiayaDiubah(lama, baru);
    }

    /**
     * @notice [FUNGSI KUNCI] Menarik saldo biaya restorasi yang sudah selesai ke alamat tujuan.
     * @dev Tidak dapat menarik dana permintaan aktif yang masih berada di `danaTertahan`.
     */
    function tarikBiaya(address payable tujuan) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        if (tujuan == address(0)) revert TujuanNol();
        uint256 jumlah = address(this).balance - danaTertahan;
        if (jumlah == 0) revert SaldoKosong();

        (bool ok, ) = tujuan.call{value: jumlah}("");
        if (!ok) revert TransferGagal();

        emit BiayaDitarik(tujuan, jumlah);
    }

    /**
     * @notice Membaca detail permintaan restorasi berdasarkan `requestId`.
     */
    function getPermintaan(uint256 requestId) external view returns (Permintaan memory) {
        if (requestId == 0 || requestId >= nextRequestId) revert PermintaanTidakDitemukan(requestId);
        return _permintaan[requestId];
    }

    /**
     * @notice [FUNGSI KUNCI] Mengambil data relasi silsilah versi dari suatu token.
     */
    function getVersi(uint256 tokenId) external view returns (Versi memory) {
        if (_ownerOf(tokenId) == address(0)) revert TokenTidakDitemukan(tokenId);
        return _versi[tokenId];
    }

    /**
     * @dev Logika inti penerbitan versi yang dipakai bersama oleh `terbitkanVersi` dan `terbitkanVersiRestorasi`.
     */
    function _terbitkan(
        address to,
        string calldata uri,
        bytes32 fileHash,
        uint256 parentId
    ) internal returns (uint256) {
        if (to == address(0)) revert AlamatPenerimaNol();
        if (bytes(uri).length == 0) revert UriKosong();
        if (fileHash == bytes32(0)) revert HashBerkasNol();
        if (hashTerpakai[fileHash]) revert HashSudahTerpakai(fileHash);

        if (parentId != 0 && _ownerOf(parentId) == address(0)) {
            revert ParentTidakTerdaftar(parentId);
        }

        uint256 tokenId = nextId;
        nextId++;

        hashTerpakai[fileHash] = true;
        _versi[tokenId] = Versi({
            parentId: parentId,
            fileHash: fileHash,
            publisher: msg.sender,
            publishedAt: uint64(block.timestamp)
        });

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        emit VersiDiterbitkan(tokenId, parentId, to, msg.sender, fileHash, uri);

        return tokenId;
    }

    /**
     * @notice Dukungan antarmuka ERC-165 untuk ERC721URIStorage dan AccessControl.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @notice Override tokenURI bawaan ERC721URIStorage untuk memastikan kepatuhan pembacaan CID IPFS.
     */
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721URIStorage)
        returns (string memory)
    {
        if (_ownerOf(tokenId) == address(0)) revert TokenTidakDitemukan(tokenId);
        return super.tokenURI(tokenId);
    }
}
