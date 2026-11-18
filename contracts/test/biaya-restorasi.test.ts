import { expect } from "chai";
import { ethers } from "hardhat";
import { ArsipFotoVersi } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("Uji Biaya Restorasi 0,01 ETH & Keamanan Penarikan", function () {
  let kontrak: ArsipFotoVersi;
  let admin: HardhatEthersSigner;
  let kurator: HardhatEthersSigner;
  let pemohon: HardhatEthersSigner;
  let pemohon2: HardhatEthersSigner;
  let tujuanDana: HardhatEthersSigner;

  const biayaAwal = ethers.parseEther("0.01");
  const uriAsli = "ipfs://QmOriginalPhotoRoot123";
  const hashAsli = ethers.keccak256(ethers.toUtf8Bytes("foto-asli-restorasi.jpg"));
  const uriRestorasi = "ipfs://QmRestoredPhotoSRx4_123";
  const hashRestorasi = ethers.keccak256(ethers.toUtf8Bytes("foto-sr-x4.png"));
  const uriRestorasi2 = "ipfs://QmRestoredPhotoSRx4_456";
  const hashRestorasi2 = ethers.keccak256(ethers.toUtf8Bytes("foto-sr-x4-2.png"));

  beforeEach(async function () {
    [admin, kurator, pemohon, pemohon2, tujuanDana] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("ArsipFotoVersi");
    kontrak = await Factory.deploy(kurator.address);
    await kontrak.waitForDeployment();

    // Terbitkan versi asli (tokenId = 1) sebagai prasyarat pengajuan restorasi
    await kontrak.connect(kurator).terbitkanVersi(pemohon.address, uriAsli, hashAsli, 0);
  });

  it("Kasus 1: Ajukan dengan 0,01 ETH untuk parent terdaftar berhasil", async function () {
    const kontrakAddr = await kontrak.getAddress();
    const saldoSebelum = await ethers.provider.getBalance(kontrakAddr);

    await kontrak.connect(pemohon).ajukanRestorasi(1, { value: biayaAwal });

    const saldoSesudah = await ethers.provider.getBalance(kontrakAddr);
    expect(saldoSesudah - saldoSebelum).to.equal(biayaAwal);
    expect(await kontrak.nextRequestId()).to.equal(2);
    expect(await kontrak.danaTertahan()).to.equal(biayaAwal);

    const req = await kontrak.getPermintaan(1);
    expect(req.pemohon).to.equal(pemohon.address);
    expect(req.parentId).to.equal(1);
    expect(req.jumlah).to.equal(biayaAwal);
    expect(req.selesai).to.be.false;
  });

  it("Kasus 2: Kirim kurang dari biaya ditolak (BiayaTidakTepat) dan saldo tidak berubah", async function () {
    const kurang = ethers.parseEther("0.005");
    const kontrakAddr = await kontrak.getAddress();

    await expect(
      kontrak.connect(pemohon).ajukanRestorasi(1, { value: kurang })
    )
      .to.be.revertedWithCustomError(kontrak, "BiayaTidakTepat")
      .withArgs(kurang, biayaAwal);

    expect(await ethers.provider.getBalance(kontrakAddr)).to.equal(0);
    expect(await kontrak.nextRequestId()).to.equal(1);
  });

  it("Kasus 3: Kirim lebih dari biaya ditolak (BiayaTidakTepat) dan saldo tidak berubah", async function () {
    const lebih = ethers.parseEther("0.02");
    const kontrakAddr = await kontrak.getAddress();

    await expect(
      kontrak.connect(pemohon).ajukanRestorasi(1, { value: lebih })
    )
      .to.be.revertedWithCustomError(kontrak, "BiayaTidakTepat")
      .withArgs(lebih, biayaAwal);

    expect(await ethers.provider.getBalance(kontrakAddr)).to.equal(0);
    expect(await kontrak.nextRequestId()).to.equal(1);
  });

  it("Kasus 4: parentId 0 atau belum terdaftar ditolak (ParentTidakTerdaftar)", async function () {
    await expect(
      kontrak.connect(pemohon).ajukanRestorasi(0, { value: biayaAwal })
    )
      .to.be.revertedWithCustomError(kontrak, "ParentTidakTerdaftar")
      .withArgs(0);

    await expect(
      kontrak.connect(pemohon).ajukanRestorasi(999, { value: biayaAwal })
    )
      .to.be.revertedWithCustomError(kontrak, "ParentTidakTerdaftar")
      .withArgs(999);
  });

  it("Kasus 5: Event RestorasiDiajukan cocok dengan getPermintaan", async function () {
    await expect(kontrak.connect(pemohon).ajukanRestorasi(1, { value: biayaAwal }))
      .to.emit(kontrak, "RestorasiDiajukan")
      .withArgs(1, 1, pemohon.address, biayaAwal);

    const req = await kontrak.getPermintaan(1);
    expect(req.pemohon).to.equal(pemohon.address);
    expect(req.parentId).to.equal(1);
    expect(req.jumlah).to.equal(biayaAwal);

    await expect(kontrak.getPermintaan(0)).to.be.revertedWithCustomError(
      kontrak,
      "PermintaanTidakDitemukan"
    );
    await expect(kontrak.getPermintaan(2)).to.be.revertedWithCustomError(
      kontrak,
      "PermintaanTidakDitemukan"
    );
  });

  it("Kasus 6: Dua pengajuan berurutan menghasilkan requestId 1 lalu 2 dengan data terpisah", async function () {
    await kontrak.connect(pemohon).ajukanRestorasi(1, { value: biayaAwal });
    await kontrak.connect(pemohon2).ajukanRestorasi(1, { value: biayaAwal });

    const req1 = await kontrak.getPermintaan(1);
    const req2 = await kontrak.getPermintaan(2);

    expect(req1.pemohon).to.equal(pemohon.address);
    expect(req2.pemohon).to.equal(pemohon2.address);
    expect(await kontrak.nextRequestId()).to.equal(3);
    expect(await kontrak.danaTertahan()).to.equal(biayaAwal * 2n);
  });

  it("Kasus 7: aturBiaya oleh admin mengubah biaya, emit BiayaDiubah, dan berlaku untuk pengajuan berikutnya", async function () {
    const biayaBaru = ethers.parseEther("0.025");

    await expect(kontrak.connect(admin).aturBiaya(biayaBaru))
      .to.emit(kontrak, "BiayaDiubah")
      .withArgs(biayaAwal, biayaBaru);

    expect(await kontrak.biayaRestorasi()).to.equal(biayaBaru);

    // Biaya lama ditolak
    await expect(
      kontrak.connect(pemohon).ajukanRestorasi(1, { value: biayaAwal })
    ).to.be.revertedWithCustomError(kontrak, "BiayaTidakTepat");

    // Biaya baru berhasil
    await expect(kontrak.connect(pemohon).ajukanRestorasi(1, { value: biayaBaru })).to.not.be.reverted;
  });

  it("Kasus 8: aturBiaya oleh non-admin ditolak", async function () {
    await expect(
      kontrak.connect(pemohon).aturBiaya(ethers.parseEther("0.05"))
    ).to.be.revertedWithCustomError(kontrak, "AccessControlUnauthorizedAccount");
  });

  it("Kasus 9: tarikBiaya oleh admin memindahkan saldo selesai ke tujuan dan reset saldo kontrak ke 0", async function () {
    const kontrakAddr = await kontrak.getAddress();
    await kontrak.connect(pemohon).ajukanRestorasi(1, { value: biayaAwal });

    // Selama permintaan belum selesai, dana tertahan tidak dapat ditarik
    await expect(
      kontrak.connect(admin).tarikBiaya(tujuanDana.address)
    ).to.be.revertedWithCustomError(kontrak, "SaldoKosong");

    // Kurator menyelesaikan permintaan
    await kontrak.connect(kurator).terbitkanVersiRestorasi(pemohon.address, uriRestorasi, hashRestorasi, 1);

    const tujuanSebelum = await ethers.provider.getBalance(tujuanDana.address);
    await expect(kontrak.connect(admin).tarikBiaya(tujuanDana.address))
      .to.emit(kontrak, "BiayaDitarik")
      .withArgs(tujuanDana.address, biayaAwal);

    const tujuanSesudah = await ethers.provider.getBalance(tujuanDana.address);
    expect(tujuanSesudah - tujuanSebelum).to.equal(biayaAwal);
    expect(await ethers.provider.getBalance(kontrakAddr)).to.equal(0);
  });

  it("Kasus 10: tarikBiaya oleh non-admin ditolak dan saldo kontrak tetap", async function () {
    const kontrakAddr = await kontrak.getAddress();
    await kontrak.connect(pemohon).ajukanRestorasi(1, { value: biayaAwal });
    await kontrak.connect(kurator).terbitkanVersiRestorasi(pemohon.address, uriRestorasi, hashRestorasi, 1);

    await expect(
      kontrak.connect(pemohon).tarikBiaya(pemohon.address)
    ).to.be.revertedWithCustomError(kontrak, "AccessControlUnauthorizedAccount");

    expect(await ethers.provider.getBalance(kontrakAddr)).to.equal(biayaAwal);
  });

  it("Kasus 11: tarikBiaya saat saldo 0 atau tujuan alamat nol ditolak", async function () {
    await expect(
      kontrak.connect(admin).tarikBiaya(ethers.ZeroAddress)
    ).to.be.revertedWithCustomError(kontrak, "TujuanNol");

    await expect(
      kontrak.connect(admin).tarikBiaya(tujuanDana.address)
    ).to.be.revertedWithCustomError(kontrak, "SaldoKosong");
  });

  it("Kasus 12: Kirim ETH langsung ke kontrak ditolak (tidak ada receive/fallback)", async function () {
    const kontrakAddr = await kontrak.getAddress();
    await expect(
      pemohon.sendTransaction({
        to: kontrakAddr,
        value: biayaAwal,
      })
    ).to.be.reverted;
  });

  it("Kasus 13: Serangan reentrancy saat tarikBiaya hanya berhasil satu kali penarikan", async function () {
    const PenyerangFactory = await ethers.getContractFactory("PenyerangReentrancy");
    const penyerang = await PenyerangFactory.deploy(await kontrak.getAddress());
    await penyerang.waitForDeployment();
    const penyerangAddr = await penyerang.getAddress();

    // Ajukan 2 permintaan lalu selesaikan agar saldo kontrak 0.02 ETH siap ditarik
    await kontrak.connect(pemohon).ajukanRestorasi(1, { value: biayaAwal });
    await kontrak.connect(pemohon2).ajukanRestorasi(1, { value: biayaAwal });
    await kontrak.connect(kurator).terbitkanVersiRestorasi(pemohon.address, uriRestorasi, hashRestorasi, 1);
    await kontrak.connect(kurator).terbitkanVersiRestorasi(pemohon2.address, uriRestorasi2, hashRestorasi2, 2);

    // Beri DEFAULT_ADMIN_ROLE ke penyerang atau admin memanggil tarikBiaya(penyerangAddr)
    const adminRole = await kontrak.DEFAULT_ADMIN_ROLE();
    await kontrak.connect(admin).grantRole(adminRole, penyerangAddr);

    await penyerang.mulaiSerangTarikBiaya();

    // Penyerang hanya menerima sekali (0.02 ETH), percobaan masuk ulang ditolak ReentrancyGuard
    expect(await penyerang.jumlahSerangan()).to.equal(1);
    expect(await ethers.provider.getBalance(penyerangAddr)).to.equal(biayaAwal * 2n);
    expect(await ethers.provider.getBalance(await kontrak.getAddress())).to.equal(0);
  });

  it("Kasus 14: terbitkanVersiRestorasi menerbitkan token turunan dengan parentId dari permintaan dan menandai selesai", async function () {
    await kontrak.connect(pemohon).ajukanRestorasi(1, { value: biayaAwal });

    await expect(
      kontrak.connect(kurator).terbitkanVersiRestorasi(pemohon.address, uriRestorasi, hashRestorasi, 1)
    )
      .to.emit(kontrak, "RestorasiSelesai")
      .withArgs(1, 2);

    const versiTurunan = await kontrak.getVersi(2);
    expect(versiTurunan.parentId).to.equal(1);
    expect(versiTurunan.fileHash).to.equal(hashRestorasi);
    expect(await kontrak.ownerOf(2)).to.equal(pemohon.address);
    expect(await kontrak.tokenURI(2)).to.equal(uriRestorasi);

    const req = await kontrak.getPermintaan(1);
    expect(req.selesai).to.be.true;
    expect(await kontrak.danaTertahan()).to.equal(0);
  });

  it("Kasus 15: Permintaan yang sama dipakai dua kali, tidak ditemukan, atau dipanggil non-kurator ditolak", async function () {
    await kontrak.connect(pemohon).ajukanRestorasi(1, { value: biayaAwal });

    // Non-kurator ditolak
    await expect(
      kontrak.connect(pemohon).terbitkanVersiRestorasi(pemohon.address, uriRestorasi, hashRestorasi, 1)
    ).to.be.revertedWithCustomError(kontrak, "AccessControlUnauthorizedAccount");

    // RequestId tidak ditemukan
    await expect(
      kontrak.connect(kurator).terbitkanVersiRestorasi(pemohon.address, uriRestorasi, hashRestorasi, 0)
    ).to.be.revertedWithCustomError(kontrak, "PermintaanTidakDitemukan");
    await expect(
      kontrak.connect(kurator).terbitkanVersiRestorasi(pemohon.address, uriRestorasi, hashRestorasi, 99)
    ).to.be.revertedWithCustomError(kontrak, "PermintaanTidakDitemukan");

    // Pemakaian pertama sukses
    await kontrak.connect(kurator).terbitkanVersiRestorasi(pemohon.address, uriRestorasi, hashRestorasi, 1);

    // Pemakaian kedua pada requestId sama wajib revert
    await expect(
      kontrak.connect(kurator).terbitkanVersiRestorasi(pemohon.address, uriRestorasi2, hashRestorasi2, 1)
    ).to.be.revertedWithCustomError(kontrak, "PermintaanSudahSelesai");
  });

  it("Kasus Tambahan: kembalikanBiaya oleh admin mengembalikan dana pemohon jika proses gagal sebelum selesai", async function () {
    await kontrak.connect(pemohon).ajukanRestorasi(1, { value: biayaAwal });

    const saldoPemohonSebelum = await ethers.provider.getBalance(pemohon.address);
    await expect(kontrak.connect(admin).kembalikanBiaya(1))
      .to.emit(kontrak, "BiayaDikembalikan")
      .withArgs(1, pemohon.address, biayaAwal);

    const saldoPemohonSesudah = await ethers.provider.getBalance(pemohon.address);
    expect(saldoPemohonSesudah - saldoPemohonSebelum).to.equal(biayaAwal);
    expect(await kontrak.danaTertahan()).to.equal(0);
    expect((await kontrak.getPermintaan(1)).selesai).to.be.true;

    // Tidak bisa refund dua kali atau dipakai terbitkanVersiRestorasi
    await expect(kontrak.connect(admin).kembalikanBiaya(1)).to.be.revertedWithCustomError(
      kontrak,
      "PermintaanSudahSelesai"
    );
    await expect(kontrak.connect(admin).kembalikanBiaya(0)).to.be.revertedWithCustomError(
      kontrak,
      "PermintaanTidakDitemukan"
    );
    await expect(kontrak.connect(admin).kembalikanBiaya(99)).to.be.revertedWithCustomError(
      kontrak,
      "PermintaanTidakDitemukan"
    );
    await expect(
      kontrak.connect(pemohon).kembalikanBiaya(1)
    ).to.be.revertedWithCustomError(kontrak, "AccessControlUnauthorizedAccount");
  });

  it("Kasus Tambahan: TransferGagal saat tarikBiaya atau kembalikanBiaya ke penerima yang menolak ETH", async function () {
    const PenolakFactory = await ethers.getContractFactory("PenerimaMenolakETH");
    const penolak = await PenolakFactory.deploy(await kontrak.getAddress());
    await penolak.waitForDeployment();
    const penolakAddr = await penolak.getAddress();

    await penolak.ajukanLaluTolakRefund(1, { value: biayaAwal });

    await expect(kontrak.connect(admin).kembalikanBiaya(1)).to.be.revertedWithCustomError(
      kontrak,
      "TransferGagal"
    );

    // Selesaikan request lalu coba tarikBiaya ke kontrak penolak
    await kontrak.connect(kurator).terbitkanVersiRestorasi(pemohon.address, uriRestorasi, hashRestorasi, 1);
    await expect(kontrak.connect(admin).tarikBiaya(penolakAddr)).to.be.revertedWithCustomError(
      kontrak,
      "TransferGagal"
    );
  });
});
