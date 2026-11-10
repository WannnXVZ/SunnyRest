export interface NetworkConfig {
  chainId: number;
  hexChainId: string;
  name: string;
  rpcUrl: string;
  isTestnet: boolean;
  contractAddress: string;
}

export const NETWORKS: Record<number, NetworkConfig> = {
  31337: {
    chainId: 31337,
    hexChainId: '0x7a69',
    name: 'Hardhat Localhost',
    rpcUrl: 'http://127.0.0.1:8545',
    isTestnet: true,
    contractAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  },
  11155111: {
    chainId: 11155111,
    hexChainId: '0xaa36a7',
    name: 'Ethereum Sepolia',
    rpcUrl: 'https://rpc.sepolia.org',
    isTestnet: true,
    contractAddress: '0x71C0a5e84860D4F07441995874400E7F550F8e3c',
  },
};

export const DEFAULT_CHAIN_ID = 11155111; // Sepolia target from design mockup

