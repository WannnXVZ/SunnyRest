export interface NetworkConfig {
  chainId: number;
  hexChainId: string;
  name: string;
  rpcUrl: string;
  isTestnet: boolean;
  contractAddress: string;
  explorerUrl?: string;
}

const LOCAL_CONTRACT =
  import.meta.env.VITE_CONTRACT_ADDRESS_LOCAL ||
  '0x5FbDB2315678afecb367f032d93F642f64180aa3';

const SEPOLIA_CONTRACT = import.meta.env.VITE_CONTRACT_ADDRESS_SEPOLIA || '';

export const NETWORKS: Record<number, NetworkConfig> = {
  31337: {
    chainId: 31337,
    hexChainId: '0x7a69',
    name: 'Hardhat Localhost',
    rpcUrl: import.meta.env.VITE_LOCAL_RPC_URL || 'http://127.0.0.1:8545',
    isTestnet: true,
    contractAddress: LOCAL_CONTRACT,
  },
  11155111: {
    chainId: 11155111,
    hexChainId: '0xaa36a7',
    name: 'Ethereum Sepolia',
    rpcUrl: import.meta.env.VITE_SEPOLIA_RPC_URL || 'https://rpc.sepolia.org',
    isTestnet: true,
    contractAddress: SEPOLIA_CONTRACT,
    explorerUrl: 'https://sepolia.etherscan.io',
  },
};

const envChain = Number(import.meta.env.VITE_CHAIN_ID);
export const DEFAULT_CHAIN_ID =
  envChain && NETWORKS[envChain] ? envChain : 31337;
