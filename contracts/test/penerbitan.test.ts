import { expect } from "chai";
import { ethers } from "hardhat";
import { ArsipFotoVersi } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("Uji Penerbitan Versi (Penerbitan Test)", function () {
  let kontrak: ArsipFotoVersi;
  let admin: HardhatEthersSigner;
  let kurator: HardhatEthersSigner;
  let bukanKurator: HardhatEthersSigner;
  let penerima: HardhatEthersSigner;

  const validUri = "ipfs://QmZtmD2qt8fJv3CL1ChENab3udybNNx98dUG5ae22zp39y";
  const validHash = ethers.keccak256(ethers.toUtf8Bytes("foto-arsip-1.jpg"));

  beforeEach(async function () {
    [admin, kurator, bukanKurator, penerima] = await ethers.getSigners();

    const ArsipFotoVersiFactory = await ethers.getContractFactory("ArsipFotoVersi");
    kontrak = await ArsipFotoVersiFactory.deploy(kurator.address);
    await kontrak.waitForDeployment();
  });

  it("Kasus 1: Kurator berhasil menerbitkan versi asli", async function () {
    // Versi asli memiliki parentId = 0
    const tx = await kontrak.connect(kurator).terbitkanVersi(
      penerima.address,
      validUri,
      validHash,
      0
    );
    await tx.wait();

    // Verifikasi kepemilikan dan state
    expect(await kontrak.ownerOf(1)).to.equal(penerima.address);
    expect(await kontrak.hashTerpakai(validHash)).to.be.true;

    const versi = await kontrak.getVersi(1);
    expect(versi.parentId).to.equal(0);
    expect(versi.fileHash).to.equal(validHash);
    expect(versi.publisher).to.equal(kurator.address);
  });

  it("Kasus 2: Akun tanpa peran kurator ditolak saat menerbitkan", async function () {
    await expect(
      kontrak.connect(bukanKurator).terbitkanVersi(
        penerima.address,
        validUri,
        validHash,
        0
      )
    ).to.be.revertedWithCustomError(kontrak, "AccessControlUnauthorizedAccount");
  });

  it("Kasus 3: Penerima beralamat nol ditolak (AlamatPenerimaNol)", async function () {
    await expect(
      kontrak.connect(kurator).terbitkanVersi(
        ethers.ZeroAddress,
        validUri,
        validHash,
        0
      )
    ).to.be.revertedWithCustomError(kontrak, "AlamatPenerimaNol");
  });

  it("Kasus 4: URI kosong atau fileHash nol ditolak", async function () {
    // Uji URI kosong
    await expect(
      kontrak.connect(kurator).terbitkanVersi(
        penerima.address,
        "",
        validHash,
        0
      )
    ).to.be.revertedWithCustomError(kontrak, "UriKosong");

    // Uji fileHash nol
    await expect(
      kontrak.connect(kurator).terbitkanVersi(
        penerima.address,
        validUri,
        ethers.ZeroHash,
        0
      )
    ).to.be.revertedWithCustomError(kontrak, "HashBerkasNol");
  });

  it("Kasus 6: Hash berkas yang sama ditolak jika diterbitkan dua kali (anti-duplikat)", async function () {
    // Penerbitan pertama sukses
    await kontrak.connect(kurator).terbitkanVersi(
      penerima.address,
      validUri,
      validHash,
      0
    );

    // Penerbitan kedua dengan hash sama wajib revert
    await expect(
      kontrak.connect(kurator).terbitkanVersi(
        penerima.address,
        "ipfs://QmAnotherUriDifferentMetadata",
        validHash,
        0
      )
    ).to.be.revertedWithCustomError(kontrak, "HashSudahTerpakai");
  });

  it("Kasus Tambahan: Constructor menolak initialCurator alamat nol", async function () {
    const ArsipFotoVersiFactory = await ethers.getContractFactory("ArsipFotoVersi");
    await expect(
      ArsipFotoVersiFactory.deploy(ethers.ZeroAddress)
    ).to.be.revertedWithCustomError(kontrak, "AlamatPenerimaNol");
  });

  it("Kasus Tambahan: Constructor saat initialCurator sama dengan deployer", async function () {
    const ArsipFotoVersiFactory = await ethers.getContractFactory("ArsipFotoVersi");
    const kontrakSama = await ArsipFotoVersiFactory.deploy(admin.address);
    await kontrakSama.waitForDeployment();

    const curatorRole = await kontrakSama.CURATOR_ROLE();
    expect(await kontrakSama.hasRole(curatorRole, admin.address)).to.be.true;
  });

  it("Kasus Tambahan: Mendukung supportsInterface ERC-721 dan AccessControl", async function () {
    expect(await kontrak.supportsInterface("0x80ac58cd")).to.be.true;
    expect(await kontrak.supportsInterface("0x7965db0b")).to.be.true;
  });
});
