import {
  BrowserProvider,
  Contract,
  Interface,
  JsonRpcProvider,
  formatEther,
  isAddress,
  keccak256,
  toUtf8Bytes,
} from 'ethers';
import ArsipFotoVersiABI from '../abi/ArsipFotoVersi.json';
import { NETWORKS } from '../config/networks';
import { getEthereumProvider } from './wallet';

export type TxStage = 'pinning_ipfs' | 'waiting_wallet' | 'waiting_confirmation';

export interface OnChainTokenRecord {
  tokenId: number;
  parentId: number;
  fileHash: string;
  publisher: string;
  publishedAt: number;
  owner: string;
  tokenUri: string;
}

export interface OnChainTxReceiptRecord {
  txHash: string;
  status: 'success' | 'reverted';
  blockNumber: number;
  from: string;
  to: string | null;
  gasUsed: string;
  matchesActiveContract: boolean;
  activeContractAddress: string;
  eventName?: string;
  tokenId?: number;
  parentId?: number;
  requestId?: number;
}

const contractInterface = new Interface(ArsipFotoVersiABI);

export function normalizeHexHash(hashHex: string): string {
  return (hashHex || '').trim().replace(/^0x/i, '').toLowerCase();
}

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
      `Alamat kontrak untuk ${net.name} belum dikonfigurasi (deploy kontrak terlebih dahulu dan isi alamat di .env).`
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

export async function checkHashUsedOnChain(
  chainId: number,
  fileHash: string
): Promise<boolean> {
  const contract = getReadOnlyContract(chainId);
  const bytes32Hash = normalizeBytes32Hash(fileHash);
  return Boolean(await contract.hashTerpakai(bytes32Hash));
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

export async function fetchVersiOnChain(
  chainId: number,
  tokenId: number
): Promise<OnChainTokenRecord> {
  const contract = getReadOnlyContract(chainId);
  const [versi, owner, uri] = await Promise.all([
    contract.getVersi(tokenId),
    contract.ownerOf(tokenId),
    contract.tokenURI(tokenId),
  ]);
  return {
    tokenId,
    parentId: Number(versi.parentId),
    fileHash: versi.fileHash as string,
    publisher: versi.publisher as string,
    publishedAt: Number(versi.publishedAt),
    owner: owner as string,
    tokenUri: uri as string,
  };
}

export async function fetchAllOnChainVersions(
  chainId: number
): Promise<OnChainTokenRecord[]> {
  const net = NETWORKS[chainId];
  if (!net || !net.contractAddress) return [];

  const contract = getReadOnlyContract(chainId);
  const nextId = Number(await contract.nextId());
  if (!Number.isFinite(nextId) || nextId <= 1) {
    return [];
  }

  const tokenIds = Array.from({ length: nextId - 1 }, (_, i) => i + 1);
  const records: OnChainTokenRecord[] = [];
  const batchSize = 8;

  for (let i = 0; i < tokenIds.length; i += batchSize) {
    const slice = tokenIds.slice(i, i + batchSize);
    const settled = await Promise.allSettled(
      slice.map(async (tid) => {
        const [versi, owner, uri] = await Promise.all([
          contract.getVersi(tid),
          contract.ownerOf(tid),
          contract.tokenURI(tid),
        ]);
        return {
          tokenId: tid,
          parentId: Number(versi.parentId),
          fileHash: versi.fileHash as string,
          publisher: versi.publisher as string,
          publishedAt: Number(versi.publishedAt),
          owner: owner as string,
          tokenUri: uri as string,
        } satisfies OnChainTokenRecord;
      })
    );
    for (const item of settled) {
      if (item.status === 'fulfilled') {
        records.push(item.value);
      }
    }
  }

  return records;
}

export async function fetchTransactionReceiptOnChain(
  chainId: number,
  txHash: string
): Promise<OnChainTxReceiptRecord | null> {
  const net = NETWORKS[chainId];
  if (!net || !net.rpcUrl) {
    throw new Error(`RPC untuk Chain ID ${chainId} tidak tersedia.`);
  }

  const clean = (txHash || '').trim().replace(/^0x/i, '').toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(clean)) {
    return null;
  }

  const normalizedHash = `0x${clean}`;
  const provider = new JsonRpcProvider(net.rpcUrl);
  const receipt = await provider.getTransactionReceipt(normalizedHash);
  if (!receipt) {
    return null;
  }

  const activeContractAddress = net.contractAddress || '';
  const matchesActiveContract = Boolean(
    receipt.to &&
      activeContractAddress &&
      receipt.to.toLowerCase() === activeContractAddress.toLowerCase()
  );

  let eventName: string | undefined;
  let tokenId: number | undefined;
  let parentId: number | undefined;
  let requestId: number | undefined;

  for (const log of receipt.logs) {
    try {
      const parsed = contractInterface.parseLog({
        topics: [...log.topics],
        data: log.data,
      });
      if (!parsed) continue;
      if (parsed.name === 'VersiDiterbitkan') {
        eventName = 'VersiDiterbitkan';
        tokenId = Number(parsed.args.tokenId ?? parsed.args[0]);
        parentId = Number(parsed.args.parentId ?? parsed.args[1]);
        break;
      }
      if (parsed.name === 'RestorasiDiajukan') {
        eventName = 'RestorasiDiajukan';
        requestId = Number(parsed.args.requestId ?? parsed.args[0]);
        parentId = Number(parsed.args.parentId ?? parsed.args[1]);
      }
    } catch {
      // Abaikan log dari kontrak/event lain
    }
  }

  return {
    txHash: receipt.hash,
    status: receipt.status === 1 ? 'success' : 'reverted',
    blockNumber: receipt.blockNumber,
    from: receipt.from,
    to: receipt.to,
    gasUsed: receipt.gasUsed.toString(),
    matchesActiveContract,
    activeContractAddress,
    eventName,
    tokenId,
    parentId,
    requestId,
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
  recipient: string;
}> {
  try {
    const { contract, signerAddress } = await getSignerContract(params.chainId);
    const candidateTo = params.to?.trim();
    const recipient = candidateTo && isAddress(candidateTo) ? candidateTo : signerAddress;
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
      recipient,
    };
  } catch (err) {
    throw new Error(parseContractError(err));
  }
}
