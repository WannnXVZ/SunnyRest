import { expect } from "chai";
import { ethers } from "hardhat";
import { ArsipFotoVersi } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("Uji Event dan Integritas State (Event & State Test)", function () {
  let kontrak: ArsipFotoVersi;
  let kurator: HardhatEthersSigner;
  let bukanKurator: HardhatEthersSigner;
  let penerima: HardhatEthersSigner;

  const validUri = "ipfs://QmStateAndEventValidationTest123";
  const validHash = ethers.keccak256(ethers.toUtf8Bytes("foto-event-state.jpg"));

  beforeEach(async function () {
    const [, _kurator, _bukanKurator, _penerima] = await ethers.getSigners();
    kurator = _kurator;
    bukanKurator = _bukanKurator;
    penerima = _penerima;

    const ArsipFotoVersiFactory = await ethers.getContractFactory("ArsipFotoVersi");
    kontrak = await ArsipFotoVersiFactory.deploy(kurator.address);
    await kontrak.waitForDeployment();
  });

  it("Kasus 13: Event VersiDiterbitkan dipancarkan dengan argumen yang cocok", async function () {
    await expect(
      kontrak.connect(kurator).terbitkanVersi(
        penerima.address,
        validUri,
        validHash,
        0
      )
    )
      .to.emit(kontrak, "VersiDiterbitkan")
      .withArgs(1, 0, penerima.address, kurator.address, validHash, validUri);
  });

  it("Kasus 14: Revert tidak menyisakan perubahan state (Atomicity / State Integrity)", async function () {
    const nextIdAwal = await kontrak.nextId();
    expect(nextIdAwal).to.equal(1);
    expect(await kontrak.hashTerpakai(validHash)).to.be.false;

    // Transaksi gagal karena bukan kurator
    await expect(
      kontrak.connect(bukanKurator).terbitkanVersi(
        penerima.address,
        validUri,
        validHash,
        0
      )
    ).to.be.reverted;

    // Pastikan state tidak berubah sedikit pun
    expect(await kontrak.nextId()).to.equal(nextIdAwal);
    expect(await kontrak.hashTerpakai(validHash)).to.be.false;
  });
});

