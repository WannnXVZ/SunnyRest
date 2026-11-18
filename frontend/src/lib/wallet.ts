import { NETWORKS } from '../config/networks';

export interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
}

export function getEthereumProvider(): EthereumProvider | null {
  if (typeof window === 'undefined') return null;
  const eth = (window as unknown as { ethereum?: EthereumProvider }).ethereum;
  return eth || null;
}

export async function connectMetaMaskWallet(): Promise<{
  address: string;
  chainId: number;
}> {
  const ethereum = getEthereumProvider();
  if (!ethereum) {
    throw new Error(
      'MetaMask tidak terdeteksi di browser. Pasang ekstensi MetaMask untuk menandatangani transaksi.'
    );
  }

  try {
    const accounts = (await ethereum.request({
      method: 'eth_requestAccounts',
    })) as string[];
    if (!accounts || accounts.length === 0) {
      throw new Error('Tidak ada akun wallet yang dipilih.');
    }

    const hexChain = (await ethereum.request({
      method: 'eth_chainId',
    })) as string;

    return {
      address: accounts[0],
      chainId: parseInt(hexChain, 16),
    };
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code;
    if (code === 4001) {
      throw new Error('Permintaan koneksi wallet ditolak oleh pengguna di MetaMask.');
    }
    throw err instanceof Error
      ? err
      : new Error('Gagal menghubungkan wallet MetaMask.');
  }
}

export async function getPassiveWalletState(): Promise<{
  address: string | null;
  chainId: number | null;
}> {
  const ethereum = getEthereumProvider();
  if (!ethereum) return { address: null, chainId: null };

  try {
    const accounts = (await ethereum.request({
      method: 'eth_accounts',
    })) as string[];
    const hexChain = (await ethereum.request({
      method: 'eth_chainId',
    })) as string;
    return {
      address: accounts?.[0] || null,
      chainId: hexChain ? parseInt(hexChain, 16) : null,
    };
  } catch {
    return { address: null, chainId: null };
  }
}

export async function switchOrAddEthereumNetwork(targetChainId: number): Promise<void> {
  const ethereum = getEthereumProvider();
  const net = NETWORKS[targetChainId];
  if (!net) {
    throw new Error(`Jaringan dengan Chain ID ${targetChainId} tidak didukung.`);
  }
  if (!ethereum) {
    throw new Error('MetaMask tidak tersedia untuk mengganti jaringan.');
  }

  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: net.hexChainId }],
    });
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code;
    if (code === 4902) {
      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: net.hexChainId,
            chainName: net.name,
            rpcUrls: [net.rpcUrl],
            nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
            ...(net.explorerUrl ? { blockExplorerUrls: [net.explorerUrl] } : {}),
          },
        ],
      });
      return;
    }
    if (code === 4001) {
      throw new Error('Perpindahan jaringan dibatalkan oleh pengguna.');
    }
    throw err instanceof Error ? err : new Error('Gagal berpindah jaringan di MetaMask.');
  }
}

export function subscribeWalletEvents(
  onAccountsChanged: (accounts: string[]) => void,
  onChainChanged: (chainId: number) => void
): () => void {
  const ethereum = getEthereumProvider();
  if (!ethereum?.on || !ethereum?.removeListener) {
    return () => {};
  }

  const handleAccounts = (accs: unknown) => {
    onAccountsChanged(Array.isArray(accs) ? (accs as string[]) : []);
  };
  const handleChain = (hexId: unknown) => {
    if (typeof hexId === 'string') {
      onChainChanged(parseInt(hexId, 16));
    }
  };

  ethereum.on('accountsChanged', handleAccounts);
  ethereum.on('chainChanged', handleChain);

  return () => {
    ethereum.removeListener?.('accountsChanged', handleAccounts);
    ethereum.removeListener?.('chainChanged', handleChain);
  };
}
