import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [admin, pemohon, penerimaTransfer, tujuanDana] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const chainId = network.chainId.toString();

  const Factory = await ethers.getContractFactory("ArsipFotoVersi");
  const deployTx = await Factory.getDeployTransaction(admin.address);
  const kontrak = await Factory.deploy(admin.address);
  await kontrak.waitForDeployment();
  const deployReceipt = await kontrak.deploymentTransaction()?.wait();
  const contractAddress = await kontrak.getAddress();

  // 1. Terbitkan versi asli (parentId = 0) -> tokenId = 1
  const hashAsli = ethers.keccak256(ethers.toUtf8Bytes("contoh-arsip-asli-v1.jpg"));
  const uriAsli = "ipfs://bafybeidraftasli0001/metadata.json";
  const txMintAsli = await kontrak
    .connect(admin)
    .terbitkanVersi(pemohon.address, uriAsli, hashAsli, 0);
  const rMintAsli = await txMintAsli.wait();

  // 2. Pemohon mengajukan restorasi berbayar (0,01 ETH) untuk tokenId = 1 -> requestId = 1
  const biaya = await kontrak.biayaRestorasi();
  const txAjukan = await kontrak
    .connect(pemohon)
    .ajukanRestorasi(1, { value: biaya });
  const rAjukan = await txAjukan.wait();
  const saldoSetelahAjukan = await ethers.provider.getBalance(contractAddress);

  // 3. Kurator menerbitkan versi turunan dari requestId = 1 -> tokenId = 2 (parentId = 1)
  const hashSR = ethers.keccak256(ethers.toUtf8Bytes("contoh-arsip-sr-x4-v2.png"));
  const uriSR = "ipfs://bafybeidraftsrx40002/metadata.json";
  const txMintSR = await kontrak
    .connect(admin)
    .terbitkanVersiRestorasi(pemohon.address, uriSR, hashSR, 1);
  const rMintSR = await txMintSR.wait();

  // 4. Transfer token #1 sesuai standar ERC-721
  const txTransfer = await kontrak
    .connect(pemohon)
    .transferFrom(pemohon.address, penerimaTransfer.address, 1);
  const rTransfer = await txTransfer.wait();

  // 5. Admin menarik biaya restorasi selesai
  const txTarik = await kontrak.connect(admin).tarikBiaya(tujuanDana.address);
  const rTarik = await txTarik.wait();
  const saldoAkhir = await ethers.provider.getBalance(contractAddress);

  const output = {
    networkName: network.name,
    chainId,
    contractAddress,
    deployer: admin.address,
    capturedAt: new Date().toISOString(),
    biayaRestorasiEth: ethers.formatEther(biaya),
    transactions: {
      deploy: {
        txHash: deployReceipt?.hash,
        blockNumber: deployReceipt?.blockNumber,
        gasUsed: deployReceipt?.gasUsed.toString(),
        initDataLengthBytes: (deployTx.data.length - 2) / 2,
      },
      terbitkanVersi_asli: {
        tokenId: 1,
        parentId: 0,
        to: pemohon.address,
        fileHash: hashAsli,
        uri: uriAsli,
        txHash: rMintAsli?.hash,
        blockNumber: rMintAsli?.blockNumber,
        gasUsed: rMintAsli?.gasUsed.toString(),
      },
      ajukanRestorasi: {
        requestId: 1,
        parentId: 1,
        pemohon: pemohon.address,
        valueEth: ethers.formatEther(biaya),
        contractBalanceAfterEth: ethers.formatEther(saldoSetelahAjukan),
        txHash: rAjukan?.hash,
        blockNumber: rAjukan?.blockNumber,
        gasUsed: rAjukan?.gasUsed.toString(),
      },
      terbitkanVersiRestorasi_turunan: {
        tokenId: 2,
        parentId: 1,
        requestId: 1,
        to: pemohon.address,
        fileHash: hashSR,
        uri: uriSR,
        txHash: rMintSR?.hash,
        blockNumber: rMintSR?.blockNumber,
        gasUsed: rMintSR?.gasUsed.toString(),
      },
      transferFrom: {
        tokenId: 1,
        from: pemohon.address,
        to: penerimaTransfer.address,
        newOwner: await kontrak.ownerOf(1),
        txHash: rTransfer?.hash,
        blockNumber: rTransfer?.blockNumber,
        gasUsed: rTransfer?.gasUsed.toString(),
      },
      tarikBiaya: {
        tujuan: tujuanDana.address,
        contractBalanceAfterEth: ethers.formatEther(saldoAkhir),
        txHash: rTarik?.hash,
        blockNumber: rTarik?.blockNumber,
        gasUsed: rTarik?.gasUsed.toString(),
      },
    },
  };

  const outPath =
    process.env.RECEIPT_OUT_PATH ||
    path.join(__dirname, "../reports/receipt_lokal.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`Local receipts captured at: ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
