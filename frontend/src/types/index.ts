export type PhotoCategory = 'orang' | 'bangunan' | 'lanskap';

export type ArchiveStatus =
  | 'belum_diterbitkan'
  | 'menunggu_tinjauan'
  | 'disetujui'
  | 'ditolak'
  | 'perlu_koreksi'
  | 'tercatat';

export interface ArchiveVersion {
  versionNumber: number;
  versionType: 'original' | 'derivative';
  label: string;
  parentId: string | null;
  ipfsCid: string;
  fileHash: string;
  onChainTokenId?: number;
  transactionHash?: string;
  timestamp: string;
  methodLabel?: string;
  imageUrl: string;
}

export interface ArchiveItem {
  id: string;
  title: string;
  creator: string;
  source: string;
  licenseInfo: string;
  initialCategory: PhotoCategory;
  finalCategory: PhotoCategory;
  status: ArchiveStatus;
  aiPrediction: {
    category: PhotoCategory;
    confidence: number;
    advisoryNote: string;
  };
  curatorNotes?: string;
  originalHash: string;
  originalCid: string;
  paymentTxHash?: string;
  restorationFeePaid?: string;
  versions: ArchiveVersion[];
  createdAt: string;
  updatedAt: string;
}

export type NavigationPage =
  | 'ringkasan'
  | 'arsip'
  | 'detail'
  | 'unggah'
  | 'restorasi'
  | 'kurator'
  | 'verifikasi'
  | 'pengaturan';

export type ViewMode = 'public' | 'login' | 'workspace';
export type PublicTab = 'semua' | 'unggah_restorasi' | 'restorasi' | 'verifikasi';

export interface WalletState {
  address: string | null;
  isConnected: boolean;
  chainId: number;
  chainName: string;
  isCurator: boolean;
  isConnecting: boolean;
  error?: string | null;
}

