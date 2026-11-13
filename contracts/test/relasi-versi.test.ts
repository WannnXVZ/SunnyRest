import { expect } from "chai";
import { ethers } from "hardhat";
import { ArsipFotoVersi } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("Uji Relasi Versi (Relasi Versi Test)", function () {
  let kontrak: ArsipFotoVersi;
  let kurator: HardhatEthersSigner;
  let pemilik: HardhatEthersSigner;

  const uriRoot = "ipfs://QmRootPhotoOriginal123456789";
  const hashRoot = ethers.keccak256(ethers.toUtf8Bytes("foto-original.jpg"));

  const uriChild = "ipfs://QmChildPhotoRestoredEnhanced123";
  const hashChild = ethers.keccak256(ethers.toUtf8Bytes("foto-restored.jpg"));

  beforeEach(async function () {
    const [, _kurator, , _pemilik] = await ethers.getSigners();
    kurator = _kurator;
    pemilik = _pemilik;

    const ArsipFotoVersiFactory = await ethers.getContractFactory("ArsipFotoVersi");
    kontrak = await ArsipFotoVersiFactory.deploy(kurator.address);
    await kontrak.waitForDeployment();
  });

  it("Kasus 5: parentId yang tidak terdaftar ditolak (ParentTidakTerdaftar)", async function () {
    const nonExistentParentId = 999;
    await expect(
      kontrak.connect(kurator).terbitkanVersi(
        pemilik.address,
        uriChild,
        hashChild,
        nonExistentParentId
      )
    ).to.be.revertedWithCustomError(kontrak, "ParentTidakTerdaftar");
  });

  it("Kasus 7: Versi turunan dengan parent valid berhasil dan menunjuk parent benar", async function () {
    // 1. Terbitkan versi asli (ID: 1)
    await kontrak.connect(kurator).terbitkanVersi(
      pemilik.address,
      uriRoot,
      hashRoot,
      0
    );

    // 2. Terbitkan versi turunan/restorasi (ID: 2) merujuk parentId: 1
    await kontrak.connect(kurator).terbitkanVersi(
      pemilik.address,
      uriChild,
      hashChild,
      1
    );

    const versiTurunan = await kontrak.getVersi(2);
    expect(versiTurunan.parentId).to.equal(1);
    expect(versiTurunan.fileHash).to.equal(hashChild);
    expect(versiTurunan.publisher).to.equal(kurator.address);
  });

  it("Kasus 8: Membaca tokenURI dan getVersi sesuai dengan input saat minting", async function () {
    await kontrak.connect(kurator).terbitkanVersi(
      pemilik.address,
      uriRoot,
      hashRoot,
      0
    );

    expect(await kontrak.tokenURI(1)).to.equal(uriRoot);

    const versi = await kontrak.getVersi(1);
    expect(versi.parentId).to.equal(0);
    expect(versi.fileHash).to.equal(hashRoot);

    // Verifikasi membaca token yang belum ada
    await expect(kontrak.getVersi(99)).to.be.revertedWithCustomError(
      kontrak,
      "TokenTidakDitemukan"
    );
    await expect(kontrak.tokenURI(99)).to.be.revertedWithCustomError(
      kontrak,
      "TokenTidakDitemukan"
    );
  });

  it("Kasus 15: Versi lama tidak berubah setelah versi turunan terbit (Immutability)", async function () {
    // Terbitkan versi asli
    await kontrak.connect(kurator).terbitkanVersi(
      pemilik.address,
      uriRoot,
      hashRoot,
      0
    );
    const versi1Sebelum = await kontrak.getVersi(1);

    // Terbitkan versi turunan
    await kontrak.connect(kurator).terbitkanVersi(
      pemilik.address,
      uriChild,
      hashChild,
      1
    );

    // Cek kembali versi asli, harus identik 100%
    const versi1Sesudah = await kontrak.getVersi(1);
    expect(versi1Sesudah.parentId).to.equal(versi1Sebelum.parentId);
    expect(versi1Sesudah.fileHash).to.equal(versi1Sebelum.fileHash);
    expect(versi1Sesudah.publisher).to.equal(versi1Sebelum.publisher);
    expect(versi1Sesudah.publishedAt).to.equal(versi1Sebelum.publishedAt);
  });
});

