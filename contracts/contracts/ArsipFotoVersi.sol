// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title ArsipFotoVersi
 * @author Haikal Alie Rhanditya (246651007)
 * @notice Kontrak ERC-721 untuk mencatat silsilah versi arsip foto dan hasil restorasi AI.
 * @dev Mengimplementasikan relasi parent-child, pencegahan duplikasi hash, dan kontrol akses kurator.
 */
contract ArsipFotoVersi is ERC721URIStorage, AccessControl {
    bytes32 public constant CURATOR_ROLE = keccak256("CURATOR_ROLE");

    struct Versi {
        uint256 parentId;      // 0 = versi asli (tanpa induk)
        bytes32 fileHash;      // SHA-256 hash dari berkas foto asli/turunan
        address publisher;     // Alamat wallet kurator yang menerbitkan
        uint64  publishedAt;   // Waktu block saat versi dicatat on-chain
    }

    // Mapping tokenId => data Versi
    mapping(uint256 => Versi) private _versi;

    // Mapping pencegahan duplikasi hash berkas (anti-duplikat)
    mapping(bytes32 => bool) public hashTerpakai;

    // Penghitung ID token on-chain (mulai dari 1, ID 0 dikhususkan sebagai penanda root)
    uint256 public nextId;

    // Custom errors untuk efisiensi gas dan kejelasan penanganan error di UI
    error AlamatPenerimaNol();
    error UriKosong();
    error HashBerkasNol();
    error HashSudahTerpakai(bytes32 hash);
    error ParentTidakTerdaftar(uint256 parentId);
    error TokenTidakDitemukan(uint256 tokenId);

    // Event dipancarkan setiap kali versi baru berhasil dicatat on-chain
    event VersiDiterbitkan(
        uint256 indexed tokenId,
        uint256 indexed parentId,
        address indexed to,
        address publisher,
        bytes32 fileHash,
        string uri
    );

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
     * @notice [FUNGSI KUNCI] Menerbitkan versi baru foto arsip (versi asli maupun turunan restorasi).
     * @dev Hanya kurator terverifikasi (CURATOR_ROLE) yang dapat memanggil fungsi ini.
     * Aturan bisnis yang ditegakkan:
     * 1. Menolak jika penerima beralamat nol, URI kosong, atau hash berkas bernilai nol.
     * 2. Menolak jika hash berkas sudah pernah terdaftar sebelumnya (anti-duplikat).
     * 3. Jika parentId != 0 (versi turunan), wajib merujuk parentId yang sudah terdaftar di on-chain.
     * 4. State versi lama tidak akan pernah ditimpa (immutability).
     *
     * @param to Alamat wallet pemilik token (kreator/arsiparis)
     * @param uri URI metadata IPFS (CID) yang berisi laporan kurasi & deskripsi foto
     * @param fileHash SHA-256 hash off-chain dari berkas foto untuk verifikasi integritas
     * @param parentId ID token induk (isi 0 jika foto asli pertama, atau isi tokenId sebelumnya jika hasil restorasi)
     * @return tokenId ID unik dari token versi yang baru diterbitkan
     */
    function terbitkanVersi(
        address to,
        string calldata uri,
        bytes32 fileHash,
        uint256 parentId
    ) external onlyRole(CURATOR_ROLE) returns (uint256) {
        if (to == address(0)) revert AlamatPenerimaNol();
        if (bytes(uri).length == 0) revert UriKosong();
        if (fileHash == bytes32(0)) revert HashBerkasNol();
        if (hashTerpakai[fileHash]) revert HashSudahTerpakai(fileHash);

        // Validasi parentId jika merupakan versi turunan (bukan versi asli)
        if (parentId != 0 && _ownerOf(parentId) == address(0)) {
            revert ParentTidakTerdaftar(parentId);
        }

        uint256 tokenId = nextId;
        nextId++;

        // Tandai hash berkas agar tidak bisa diterbitkan ulang
        hashTerpakai[fileHash] = true;

        // Catat relasi versi permanen
        _versi[tokenId] = Versi({
            parentId: parentId,
            fileHash: fileHash,
            publisher: msg.sender,
            publishedAt: uint64(block.timestamp)
        });

        // Mint token ERC-721 dan pasang URI IPFS
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        emit VersiDiterbitkan(tokenId, parentId, to, msg.sender, fileHash, uri);

        return tokenId;
    }

    /**
     * @notice [FUNGSI KUNCI] Mengambil data relasi silsilah versi dari suatu token.
     * @dev Digunakan oleh Frontend untuk menampilkan silsilah foto (parent -> child).
     * @param tokenId ID token versi yang ingin dibaca datanya
     * @return Versi Data struct versi meliputi parentId, fileHash, publisher, dan publishedAt
     */
    function getVersi(uint256 tokenId) external view returns (Versi memory) {
        if (_ownerOf(tokenId) == address(0)) revert TokenTidakDitemukan(tokenId);
        return _versi[tokenId];
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
