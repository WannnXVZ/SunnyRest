import {
  BrowserProvider,
  Contract,
  Interface,
  JsonRpcProvider,
  formatEther,
  keccak256,
  toUtf8Bytes,
} from 'ethers';
import ArsipFotoVersiABI from '../abi/ArsipFotoVersi.json';
import { NETWORKS } from '../config/networks';
import { getEthereumProvider } from './wallet';

export type TxStage = 'waiting_wallet' | 'waiting_confirmation';

const contractInterface = new Interface(ArsipFotoVersiABI);

export function normalizeBytes32Hash(hashHex: string): string {
  const clean = hashHex.trim().replace(/^0x/i, '');
  if (/^[0-9a-fA-F]{64}$/.test(clean)) {
    return `0x${clean.toLowerCase()}`;
  }
  return keccak256(toUtf8Bytes(hashHex));
}

export function getContractAddress(chainId: number): string {
  const net = NETWORKS[chainId];
  if (!net) {
    throw new Error(`Jaringan Chain ID ${chainId} tidak dikenali.`);
  }
  if (!net.contractAddress) {
    throw new Error(
      `Alamat kontrak untuk ${net.name} belum dikonfigurasi (deploy kontrak terlebih dahulu dan isi deployments).`
    );
  }
  return net.contractAddress;
}

export function getReadOnlyContract(chainId: number): Contract {
  const net = NETWORKS[chainId];
  const address = getContractAddress(chainId);
  const provider = new JsonRpcProvider(net.rpcUrl);
  return new Contract(address, ArsipFotoVersiABI, provider);
}

export async function getSignerContract(expectedChainId: number): Promise<{
  contract: Contract;
  signerAddress: string;
}> {
  const ethereum = getEthereumProvider();
  if (!ethereum) {
    throw new Error(
      'MetaMask tidak ditemukan. Hubungkan MetaMask untuk mengirim transaksi on-chain.'
    );
  }

  const address = getContractAddress(expectedChainId);
  const provider = new BrowserProvider(ethereum as never);
  const network = await provider.getNetwork();
  const activeChainId = Number(network.chainId);

  if (activeChainId !== expectedChainId) {
    const targetName = NETWORKS[expectedChainId]?.name || `Chain ${expectedChainId}`;
    throw new Error(
      `Jaringan MetaMask salah (aktif: ${activeChainId}, dibutuhkan: ${targetName} / ${expectedChainId}). Pindahkan jaringan terlebih dahulu.`
    );
  }

  const signer = await provider.getSigner();
  const signerAddress = await signer.getAddress();
  return {
    contract: new Contract(address, ArsipFotoVersiABI, signer),
    signerAddress,
  };
}

export function parseContractError(err: unknown): string {
  if (!err) return 'Terjadi kesalahan transaksi yang tidak diketahui.';

  const errObj = err as {
    code?: string | number;
    reason?: string;
    shortMessage?: string;
    message?: string;
    data?: string;
  };

  if (errObj.code === 'ACTION_REJECTED' || errObj.code === 4001) {
    return 'Transaksi dibatalkan oleh pengguna di MetaMask.';
  }
  if (errObj.code === 'INSUFFICIENT_FUNDS') {
    return 'Saldo ETH tidak mencukupi untuk membayar biaya layanan dan gas jaringan.';
  }

  // Decode custom Solidity error from revert data if present
  if (typeof errObj.data === 'string' && errObj.data.startsWith('0x')) {
    try {
      const parsed = contractInterface.parseError(errObj.data);
      if (parsed) {
        switch (parsed.name) {
          case 'BiayaTidakTepat':
            return `Nilai ETH dikirim (${formatEther(parsed.args[0])} ETH) tidak sama dengan biaya kontrak (${formatEther(parsed.args[1])} ETH).`;
          case 'ParentTidakTerdaftar':
            return `Token induk parentId #${parsed.args[0].toString()} belum terdaftar di smart contract.`;
          case 'HashSudahTerpakai':
            return 'Hash berkas SHA-256 sudah pernah diterbitkan sebelumnya (ditolak oleh aturan anti-duplikat).';
          case 'AccessControlUnauthorizedAccount':
            return `Alamat ${parsed.args[0]} tidak memiliki peran kurator (CURATOR_ROLE) pada kontrak.`;
          case 'PermintaanTidakDitemukan':
            return `Permintaan restorasi #${parsed.args[0].toString()} tidak ditemukan di kontrak.`;
          case 'PermintaanSudahSelesai':
            return `Permintaan restorasi #${parsed.args[0].toString()} sudah selesai digunakan sebelumnya.`;
          case 'UriKosong':
            return 'URI metadata IPFS tidak boleh kosong.';
          case 'AlamatPenerimaNol':
            return 'Alamat penerima token tidak boleh alamat nol.';
          default:
            return `Kontrak menolak transaksi (${parsed.name}).`;
        }
      }
    } catch {
      // Ignore parse failure, fallback below
    }
  }

  if (errObj.reason) return errObj.reason;
  if (errObj.shortMessage) return errObj.shortMessage;
  if (errObj.message) return errObj.message;
  return 'Transaksi blockchain gagal dieksekusi.';
}

export async function fetchRestorationFee(chainId: number): Promise<{
  wei: bigint;
  eth: string;
}> {
  const contract = getReadOnlyContract(chainId);
  const wei = (await contract.biayaRestorasi()) as bigint;
  return { wei, eth: formatEther(wei) };
}

export async function fetchIsCurator(
  chainId: number,
  account: string
): Promise<boolean> {
  const contract = getReadOnlyContract(chainId);
  const role = (await contract.CURATOR_ROLE()) as string;
  return (await contract.hasRole(role, account)) as boolean;
}

export async function fetchPermintaan(chainId: number, requestId: number) {
  const contract = getReadOnlyContract(chainId);
  const res = await contract.getPermintaan(requestId);
  return {
    pemohon: res.pemohon as string,
    parentId: Number(res.parentId),
    jumlahEth: formatEther(res.jumlah as bigint),
    diajukanPada: Number(res.diajukanPada),
    selesai: Boolean(res.selesai),
  };
}

export async function fetchVersiOnChain(chainId: number, tokenId: number) {
  const contract = getReadOnlyContract(chainId);
  const [versi, owner, uri] = await Promise.all([
    contract.getVersi(tokenId),
    contract.ownerOf(tokenId),
    contract.tokenURI(tokenId),
  ]);
  return {
    parentId: Number(versi.parentId),
    fileHash: versi.fileHash as string,
    publisher: versi.publisher as string,
    publishedAt: Number(versi.publishedAt),
    owner: owner as string,
    tokenUri: uri as string,
  };
}

export async function submitRestorationRequest(
  chainId: number,
  parentId: number,
  onStage?: (stage: TxStage) => void
): Promise<{
  txHash: string;
  requestId: number;
  feeEth: string;
  gasUsed: string;
}> {
  try {
    const { contract } = await getSignerContract(chainId);
    const feeWei = (await contract.biayaRestorasi()) as bigint;

    onStage?.('waiting_wallet');
    const tx = await contract.ajukanRestorasi(parentId, { value: feeWei });

    onStage?.('waiting_confirmation');
    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) {
      throw new Error('Transaksi pembayaran restorasi gagal dikonfirmasi.');
    }

    let requestId = 0;
    for (const log of receipt.logs) {
      try {
        const parsed = contract.interface.parseLog(log);
        if (parsed?.name === 'RestorasiDiajukan') {
          requestId = Number(parsed.args.requestId);
          break;
        }
      } catch {
        // Not an event from this contract
      }
    }

    if (!requestId) {
      throw new Error('Receipt diterima tetapi event RestorasiDiajukan tidak ditemukan.');
    }

    return {
      txHash: receipt.hash,
      requestId,
      feeEth: formatEther(feeWei),
      gasUsed: receipt.gasUsed ? receipt.gasUsed.toString() : '0',
    };
  } catch (err) {
    throw new Error(parseContractError(err));
  }
}

export async function publishVersionOnChain(params: {
  chainId: number;
  to?: string;
  uri: string;
  fileHash: string;
  parentId?: number;
  requestId?: number;
  onStage?: (stage: TxStage) => void;
}): Promise<{
  txHash: string;
  tokenId: number;
  gasUsed: string;
  publisher: string;
}> {
  try {
    const { contract, signerAddress } = await getSignerContract(params.chainId);
    const recipient = params.to || signerAddress;
    const hashBytes32 = normalizeBytes32Hash(params.fileHash);

    params.onStage?.('waiting_wallet');
    const tx =
      params.requestId && params.requestId > 0
        ? await contract.terbitkanVersiRestorasi(
            recipient,
            params.uri,
            hashBytes32,
            params.requestId
          )
        : await contract.terbitkanVersi(
            recipient,
            params.uri,
            hashBytes32,
            params.parentId ?? 0
          );

    params.onStage?.('waiting_confirmation');
    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) {
      throw new Error('Transaksi penerbitan token gagal dikonfirmasi.');
    }

    let tokenId = 0;
    for (const log of receipt.logs) {
      try {
        const parsed = contract.interface.parseLog(log);
        if (parsed?.name === 'VersiDiterbitkan') {
          tokenId = Number(parsed.args.tokenId);
          break;
        }
      } catch {
        // Ignore unrelated log
      }
    }

    return {
      txHash: receipt.hash,
      tokenId,
      gasUsed: receipt.gasUsed ? receipt.gasUsed.toString() : '0',
      publisher: signerAddress,
    };
  } catch (err) {
    throw new Error(parseContractError(err));
  }
}
