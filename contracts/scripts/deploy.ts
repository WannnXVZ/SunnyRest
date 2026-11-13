import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("==========================================");
  console.log("Deploying ArsipFotoVersi with deployer:", deployer.address);

  // Deploy kontrak dengan initialCurator = deployer
  const ArsipFotoVersi = await ethers.getContractFactory("ArsipFotoVersi");
  const kontrak = await ArsipFotoVersi.deploy(deployer.address);
  await kontrak.waitForDeployment();

  const contractAddress = await kontrak.getAddress();
  const network = await ethers.provider.getNetwork();
  const chainId = network.chainId.toString();

  console.log(`Contract deployed to: ${contractAddress} on chainId: ${chainId}`);
  console.log("==========================================");

  // Simpan data deployment ke folder deployments/
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentData = {
    contractAddress,
    chainId,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
  };

  const fileName = network.name === "sepolia" ? "sepolia.json" : "localhost.json";
  fs.writeFileSync(
    path.join(deploymentsDir, fileName),
    JSON.stringify(deploymentData, null, 2)
  );

  console.log(`Deployment metadata saved to deployments/${fileName}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

