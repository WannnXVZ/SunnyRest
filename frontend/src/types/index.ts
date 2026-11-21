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
  mediaCid?: string;
  metadataUri?: string;
  fileHash: string;
  onChainTokenId?: number;
  transactionHash?: string;
  requestId?: number;
  onChainVerified?: boolean;
  ownerAddress?: string;
  publisherAddress?: string;
  fileName?: string;
  fileSizeBytes?: number;
  dimensions?: string;
  timestamp: string;
  methodLabel?: string;
  modelVersion?: string;
  imageUrl: string;
}

export interface ArchiveItem {
  id: string;
  title: string;
  creator: string;
  source: string;
  sourceRef?: string;
  licenseInfo: string;
  permissionAttachment?: string;
  recipientAddress?: string;
  chainId?: number;
  initialCategory: PhotoCategory;
  finalCategory: PhotoCategory;
  status: ArchiveStatus;
  aiPrediction: {
    category: PhotoCategory;
    confidence: number;
    scores?: Record<PhotoCategory, number>;
    modelVersion?: string;
    advisoryNote: string;
  };
  curatorNotes?: string;
  originalHash: string;
  originalCid: string;
  paymentTxHash?: string;
  restorationFeePaid?: string;
  visibility?: 'public' | 'private';
  isPrivate?: boolean;
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
  | 'pengaturan'
  | 'pemohon';

export type ViewMode = 'public' | 'login' | 'workspace' | 'contributor';
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
