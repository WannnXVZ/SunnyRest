import { expect } from "chai";
import { ethers } from "hardhat";
import { ArsipFotoVersi } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("Uji Standar Transfer ERC-721 (Transfer Test)", function () {
  let kontrak: ArsipFotoVersi;
  let kurator: HardhatEthersSigner;
  let pemilik: HardhatEthersSigner;
  let pembeli: HardhatEthersSigner;
  let pihakLain: HardhatEthersSigner;

  const validUri = "ipfs://QmValidTransferTest123456789";
  const validHash = ethers.keccak256(ethers.toUtf8Bytes("foto-transfer.jpg"));

  beforeEach(async function () {
    const [, _kurator, _pihakLain, _pemilik, _pembeli] = await ethers.getSigners();
    kurator = _kurator;
    pihakLain = _pihakLain;
    pemilik = _pemilik;
    pembeli = _pembeli;

    const ArsipFotoVersiFactory = await ethers.getContractFactory("ArsipFotoVersi");
    kontrak = await ArsipFotoVersiFactory.deploy(kurator.address);
    await kontrak.waitForDeployment();

    // Mint token ID: 1 ke akun pemilik
    await kontrak.connect(kurator).terbitkanVersi(
      pemilik.address,
      validUri,
      validHash,
      0
    );
  });

  it("Kasus 9: ownerOf dan balanceOf sesuai setelah minting", async function () {
    expect(await kontrak.ownerOf(1)).to.equal(pemilik.address);
    expect(await kontrak.balanceOf(pemilik.address)).to.equal(1);
    expect(await kontrak.balanceOf(pembeli.address)).to.equal(0);
  });

  it("Kasus 10: Transfer oleh pemilik berhasil mengubah status kepemilikan", async function () {
    // Pemilik mentransfer ke pembeli
    await kontrak.connect(pemilik).transferFrom(
      pemilik.address,
      pembeli.address,
      1
    );

    expect(await kontrak.ownerOf(1)).to.equal(pembeli.address);
    expect(await kontrak.balanceOf(pemilik.address)).to.equal(0);
    expect(await kontrak.balanceOf(pembeli.address)).to.equal(1);
  });

  it("Kasus 11: Transfer oleh pihak tanpa hak ditolak", async function () {
    // pihakLain mencoba transfer token milik pemilik
    await expect(
      kontrak.connect(pihakLain).transferFrom(
        pemilik.address,
        pembeli.address,
        1
      )
    ).to.be.revertedWithCustomError(kontrak, "ERC721InsufficientApproval");
  });

  it("Kasus 12: Transfer ke alamat nol ditolak", async function () {
    await expect(
      kontrak.connect(pemilik).transferFrom(
        pemilik.address,
        ethers.ZeroAddress,
        1
      )
    ).to.be.revertedWithCustomError(kontrak, "ERC721InvalidReceiver");
  });
});

