import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("Mengekspor ABI kontrak untuk frontend...");

  const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts/ArsipFotoVersi.sol/ArsipFotoVersi.json"
  );

  if (!fs.existsSync(artifactPath)) {
    throw new Error(
      "Artifact belum ditemukan. Jalankan 'npx hardhat compile' terlebih dahulu!"
    );
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const abi = artifact.abi;

  // 1. Simpan ABI di folder contracts/deployments/
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(deploymentsDir, "ArsipFotoVersiABI.json"),
    JSON.stringify(abi, null, 2)
  );

  // 2. Simpan ABI ke frontend/src/abi/
  const frontendAbiDir = path.join(__dirname, "../../frontend/src/abi");
  if (!fs.existsSync(frontendAbiDir)) {
    fs.mkdirSync(frontendAbiDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(frontendAbiDir, "ArsipFotoVersi.json"),
    JSON.stringify(abi, null, 2)
  );

  console.log("ABI berhasil diekspor ke:");
  console.log(" - contracts/deployments/ArsipFotoVersiABI.json");
  console.log(" - frontend/src/abi/ArsipFotoVersi.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

