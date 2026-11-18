import { create } from 'zustand';
import {
  ArchiveItem,
  ArchiveVersion,
  NavigationPage,
  PhotoCategory,
  ArchiveStatus,
  WalletState,
  ViewMode,
  PublicTab,
} from '../types';
import { NETWORKS, DEFAULT_CHAIN_ID } from '../config/networks';
import {
  connectMetaMaskWallet,
  getPassiveWalletState,
  subscribeWalletEvents,
  switchOrAddEthereumNetwork,
} from '../lib/wallet';
import {
  TxStage,
  fetchIsCurator,
  fetchRestorationFee,
  publishVersionOnChain,
  submitRestorationRequest,
} from '../lib/contract';
import { enhancePhotoWithSR } from '../lib/api';
import { uploadMetadataToIpfs } from '../lib/ipfs';
import { computeFileSHA256 } from '../lib/hash';

function formatCurrentDate(): string {
  return new Date().toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatCurrentTimestamp(): string {
  return new Date().toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Katalog contoh awal menggunakan aset lokal berlisensi dari dataset proyek (bukan URL eksternal).
// Status awal ditandai jelas sebagai data contoh lokal sebelum diterbitkan ke node aktif.
const INITIAL_ARCHIVES: ArchiveItem[] = [
  {
    id: 'SR-0105',
    title: 'Bangunan Kolonial Arsip KITLV',
    creator: 'Koleksi KITLV / Wikimedia Commons',
    source: 'Dokumentasi arsip berlisensi terbuka',
    licenseInfo: 'Public Domain / CC BY 4.0 (sampel katalog)',
    initialCategory: 'bangunan',
    finalCategory: 'bangunan',
    status: 'menunggu_tinjauan',
    aiPrediction: {
      category: 'bangunan',
      confidence: 0.91,
      advisoryNote: 'Saran AI contoh: Bangunan. Menunggu penetapan dan tanda tangan kurator.',
    },
    curatorNotes: 'Sampel foto arsip menunggu peninjauan kurator dan pencatatan on-chain.',
    originalHash: '4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a',
    originalCid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
    createdAt: '05 Nov 2026',
    updatedAt: '05 Nov 2026',
    versions: [
      {
        versionNumber: 1,
        versionType: 'original',
        label: 'Asli / Draf Katalog',
        parentId: null,
        ipfsCid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
        fileHash: '4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a',
        onChainVerified: false,
        timestamp: '05 Nov 2026, 11.00',
        imageUrl: '/samples/bangunan_kitlv.jpg',
      },
    ],
  },
  {
    id: 'SR-0104',
    title: 'Fasad Gedung Klasik',
    creator: 'Dataset Intel Image Classification',
    source: 'Koleksi arsitektur contoh (CC0)',
    licenseInfo: 'CC0 / Kaggle Open Data (sampel)',
    initialCategory: 'bangunan',
    finalCategory: 'bangunan',
    status: 'disetujui',
    aiPrediction: {
      category: 'bangunan',
      confidence: 0.94,
      advisoryNote: 'Saran AI contoh: Bangunan. Siap diterbitkan ke kontrak oleh kurator.',
    },
    curatorNotes: 'Sampel bangunan siap dicatat on-chain melalui Workspace Kurator.',
    originalHash: '9f2a8c7b4d1e6f0853a92c8d7b6e1f402c5a9e8b0d3f61744a6c2e9d8b7051fa',
    originalCid: 'bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku',
    createdAt: '04 Nov 2026',
    updatedAt: '04 Nov 2026',
    versions: [
      {
        versionNumber: 1,
        versionType: 'original',
        label: 'Asli / Siap Mint',
        parentId: null,
        ipfsCid: 'bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku',
        fileHash: '9f2a8c7b4d1e6f0853a92c8d7b6e1f402c5a9e8b0d3f61744a6c2e9d8b7051fa',
        onChainVerified: false,
        timestamp: '04 Nov 2026, 09.20',
        imageUrl: '/samples/bangunan_contoh.jpg',
      },
    ],
  },
  {
    id: 'SR-0103',
    title: 'Bentang Pegunungan Terbuka',
    creator: 'Dataset Intel Image Classification',
    source: 'Koleksi lanskap contoh (CC0)',
    licenseInfo: 'CC0 / Kaggle Open Data (sampel)',
    initialCategory: 'lanskap',
    finalCategory: 'lanskap',
    status: 'menunggu_tinjauan',
    aiPrediction: {
      category: 'lanskap',
      confidence: 0.89,
      advisoryNote: 'Saran AI contoh: Lanskap. Keputusan tetap pada kurator.',
    },
    curatorNotes: 'Sampel lanskap dari dataset uji.',
    originalHash: '7a9e2f6c91a83b4c1029384756abcdef1234567890abcdef1234567890abcdef',
    originalCid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
    createdAt: '03 Nov 2026',
    updatedAt: '03 Nov 2026',
    versions: [
      {
        versionNumber: 1,
        versionType: 'original',
        label: 'Asli / Draf Katalog',
        parentId: null,
        ipfsCid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
        fileHash: '7a9e2f6c91a83b4c1029384756abcdef1234567890abcdef1234567890abcdef',
        onChainVerified: false,
        timestamp: '03 Nov 2026, 08.15',
        imageUrl: '/samples/lanskap_contoh.jpg',
      },
    ],
  },
  {
    id: 'SR-0102',
    title: 'Aktivitas Warga Ruang Terbuka',
    creator: 'Dataset COCO Person (CC BY 4.0)',
    source: 'Koleksi orang contoh',
    licenseInfo: 'CC BY 4.0 (sampel)',
    initialCategory: 'orang',
    finalCategory: 'orang',
    status: 'menunggu_tinjauan',
    aiPrediction: {
      category: 'orang',
      confidence: 0.92,
      advisoryNote: 'Saran AI contoh: Orang. Keputusan tetap pada kurator.',
    },
    curatorNotes: 'Sampel kategori orang untuk demonstrasi kurasi.',
    originalHash: 'c4e5a1b2d3f405162738495a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c',
    originalCid: 'bafybeia4nwbffp6oxg7ujn3ojee6xedzdetojuzjevtenxquvykubafybe',
    createdAt: '02 Nov 2026',
    updatedAt: '02 Nov 2026',
    versions: [
      {
        versionNumber: 1,
        versionType: 'original',
        label: 'Asli / Draf Katalog',
        parentId: null,
        ipfsCid: 'bafybeia4nwbffp6oxg7ujn3ojee6xedzdetojuzjevtenxquvykubafybe',
        fileHash: 'c4e5a1b2d3f405162738495a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c',
        onChainVerified: false,
        timestamp: '02 Nov 2026, 14.30',
        imageUrl: '/samples/orang_contoh.jpg',
      },
    ],
  },
];

interface ArchiveStore {
  viewMode: ViewMode;
  publicTab: PublicTab;
  publicSelectedArchiveId: string | null;
  activePage: NavigationPage;
  selectedArchiveId: string;
  archives: ArchiveItem[];
  wallet: WalletState;
  restorationFeeEth: string | null;
  restorationFeeError: string | null;
  searchQuery: string;
  categoryFilter: string;
  statusFilter: string;
  isWorkspaceAuthenticated: boolean;

  // View Mode & Auth
  setViewMode: (mode: ViewMode) => void;
  setPublicTab: (tab: PublicTab) => void;
  setPublicSelectedArchiveId: (id: string | null) => void;
  loginToWorkspace: () => Promise<{ success: boolean; reason?: string }>;
  logoutWorkspace: () => void;

  // Navigation
  setActivePage: (page: NavigationPage) => void;
  setSelectedArchiveId: (id: string) => void;

  // Search & Filter
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: string) => void;
  setStatusFilter: (status: string) => void;

  // On-chain & Archive Actions
  refreshRestorationFee: () => Promise<void>;
  initWalletSync: () => () => void;
  addArchive: (
    item: Omit<ArchiveItem, 'id' | 'createdAt' | 'updatedAt' | 'versions'>,
    customImage?: string
  ) => string;
  updateArchiveStatus: (
    id: string,
    status: ArchiveStatus,
    finalCategory?: PhotoCategory,
    notes?: string
  ) => void;
  requestPaidRestoration: (
    id: string,
    onStage?: (stage: TxStage | 'enhancing') => void
  ) => Promise<{
    success: boolean;
    error?: string;
    txHash?: string;
    requestId?: number;
    feeEth?: string;
    newVersion?: ArchiveVersion;
  }>;
  runSuperResolutionForArchive: (
    id: string
  ) => Promise<{
    success: boolean;
    alreadyExists?: boolean;
    error?: string;
    txHash?: string;
    requestId?: number;
    newVersion?: ArchiveVersion;
  }>;
  publishToBlockchain: (
    archiveId: string,
    onStage?: (stage: TxStage) => void
  ) => Promise<{
    success: boolean;
    error?: string;
    txHash?: string;
    tokenId?: number;
    gasUsed?: string;
  }>;

  // Wallet
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchNetwork: (chainId: number) => Promise<void>;
  toggleRole: () => void;
}

export const useArchiveStore = create<ArchiveStore>((set, get) => ({
  viewMode: 'public',
  publicTab: 'semua',
  publicSelectedArchiveId: null,
  activePage: 'arsip',
  selectedArchiveId: 'SR-0104',
  archives: INITIAL_ARCHIVES,
  restorationFeeEth: null,
  restorationFeeError: null,
  searchQuery: '',
  categoryFilter: 'all',
  statusFilter: 'all',
  isWorkspaceAuthenticated: false,
  wallet: {
    address: null,
    isConnected: false,
    chainId: DEFAULT_CHAIN_ID,
    chainName: NETWORKS[DEFAULT_CHAIN_ID].name,
    isCurator: false,
    isConnecting: false,
    error: null,
  },

  setViewMode: (mode) => set({ viewMode: mode }),
  setPublicTab: (tab) => set({ publicTab: tab }),
  setPublicSelectedArchiveId: (id) => set({ publicSelectedArchiveId: id }),

  refreshRestorationFee: async () => {
    const chainId = get().wallet.chainId;
    try {
      const { eth } = await fetchRestorationFee(chainId);
      set({ restorationFeeEth: eth, restorationFeeError: null });
    } catch (err) {
      set({
        restorationFeeEth: null,
        restorationFeeError:
          err instanceof Error ? err.message : 'Gagal membaca biaya dari smart contract.',
      });
    }
  },

  initWalletSync: () => {
    void get().refreshRestorationFee();

    void (async () => {
      const passive = await getPassiveWalletState();
      if (passive.address) {
        const activeChain = passive.chainId || get().wallet.chainId;
        const net = NETWORKS[activeChain];
        let isCurator = false;
        try {
          if (net?.contractAddress) {
            isCurator = await fetchIsCurator(activeChain, passive.address);
          }
        } catch {
          isCurator = false;
        }
        set((s) => ({
          wallet: {
            ...s.wallet,
            address: passive.address,
            isConnected: true,
            chainId: activeChain,
            chainName: net ? net.name : `Chain #${activeChain}`,
            isCurator,
            error: null,
          },
        }));
      }
    })();

    return subscribeWalletEvents(
      async (accounts) => {
        if (!accounts || accounts.length === 0) {
          set((s) => ({
            isWorkspaceAuthenticated: false,
            wallet: {
              ...s.wallet,
              address: null,
              isConnected: false,
              isCurator: false,
            },
          }));
          return;
        }
        const addr = accounts[0];
        const chainId = get().wallet.chainId;
        let isCurator = false;
        try {
          isCurator = await fetchIsCurator(chainId, addr);
        } catch {
          isCurator = false;
        }
        set((s) => ({
          wallet: {
            ...s.wallet,
            address: addr,
            isConnected: true,
            isCurator,
            error: null,
          },
        }));
      },
      async (newChainId) => {
        const net = NETWORKS[newChainId];
        const addr = get().wallet.address;
        let isCurator = false;
        if (addr && net?.contractAddress) {
          try {
            isCurator = await fetchIsCurator(newChainId, addr);
          } catch {
            isCurator = false;
          }
        }
        set((s) => ({
          wallet: {
            ...s.wallet,
            chainId: newChainId,
            chainName: net ? net.name : `Jaringan Tidak Didukung (${newChainId})`,
            isCurator,
            error: net ? null : `Jaringan Chain ID ${newChainId} tidak didukung oleh aplikasi.`,
          },
        }));
        void get().refreshRestorationFee();
      }
    );
  },

  loginToWorkspace: async () => {
    const state = get();
    if (!state.wallet.isConnected) {
      await state.connectWallet();
    }
    const currentWallet = get().wallet;
    if (!currentWallet.isConnected || !currentWallet.address) {
      return {
        success: false,
        reason: currentWallet.error || 'Wallet belum terhubung.',
      };
    }

    try {
      const curatorOnChain = await fetchIsCurator(
        currentWallet.chainId,
        currentWallet.address
      );
      set((s) => ({ wallet: { ...s.wallet, isCurator: curatorOnChain } }));
      if (!curatorOnChain) {
        return {
          success: false,
          reason:
            'Alamat wallet Anda tidak memiliki CURATOR_ROLE pada smart contract di jaringan aktif.',
        };
      }
    } catch (err) {
      return {
        success: false,
        reason:
          err instanceof Error
            ? err.message
            : 'Gagal memverifikasi CURATOR_ROLE di smart contract.',
      };
    }

    set({ isWorkspaceAuthenticated: true, viewMode: 'workspace' });
    return { success: true };
  },

  logoutWorkspace: () => {
    set({ isWorkspaceAuthenticated: false, viewMode: 'public' });
  },

  setActivePage: (page) => set({ activePage: page }),
  setSelectedArchiveId: (id) => set({ selectedArchiveId: id }),

  setSearchQuery: (query) => set({ searchQuery: query }),
  setCategoryFilter: (category) => set({ categoryFilter: category }),
  setStatusFilter: (status) => set({ statusFilter: status }),

  addArchive: (itemData, customImage) => {
    const nextNum = get().archives.length + 1;
    const newId = `SR-ARCH-00${nextNum < 10 ? '0' + nextNum : nextNum}`;
    const nowDate = formatCurrentDate();
    const nowTs = formatCurrentTimestamp();

    const fallbackImage =
      itemData.initialCategory === 'orang'
        ? '/samples/orang_contoh.jpg'
        : itemData.initialCategory === 'lanskap'
        ? '/samples/lanskap_contoh.jpg'
        : '/samples/bangunan_contoh.jpg';

    const imageUrl = customImage || fallbackImage;

    const newArchive: ArchiveItem = {
      ...itemData,
      id: newId,
      createdAt: nowDate,
      updatedAt: nowDate,
      versions: [
        {
          versionNumber: 1,
          versionType: 'original',
          label: 'Original · versi sumber',
          parentId: null,
          ipfsCid: itemData.originalCid,
          fileHash: itemData.originalHash,
          onChainVerified: false,
          timestamp: nowTs,
          imageUrl,
        },
      ],
    };

    set((state) => ({
      archives: [newArchive, ...state.archives],
      selectedArchiveId: newId,
    }));

    return newId;
  },

  updateArchiveStatus: (id, status, finalCategory, notes) => {
    const nowDate = formatCurrentDate();
    set((state) => ({
      archives: state.archives.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            status,
            finalCategory: finalCategory || item.finalCategory,
            curatorNotes: notes !== undefined ? notes : item.curatorNotes,
            updatedAt: nowDate,
          };
        }
        return item;
      }),
    }));
  },

  requestPaidRestoration: async (id, onStage) => {
    const archive = get().archives.find((a) => a.id === id);
    if (!archive) return { success: false, error: 'Arsip tidak ditemukan.' };

    const originalVer =
      archive.versions.find((v) => v.versionType === 'original') ||
      archive.versions[0];

    if (!originalVer?.onChainTokenId) {
      return {
        success: false,
        error:
          'Arsip ini belum tercatat on-chain (belum punya Token ID). Kurator wajib menerbitkan versi asli terlebih dahulu sebelum restorasi berbayar dapat diajukan.',
      };
    }

    const hasDerivative = archive.versions.some(
      (v) => v.versionType === 'derivative'
    );
    if (hasDerivative) {
      return {
        success: false,
        error: 'Versi restorasi untuk arsip ini sudah tersedia.',
      };
    }

    try {
      const chainId = get().wallet.chainId;

      // 1. Kirim transaksi pembayaran ajukanRestorasi(parentId) ke kontrak & tunggu receipt
      const payResult = await submitRestorationRequest(
        chainId,
        originalVer.onChainTokenId,
        (stage) => onStage?.(stage)
      );

      // 2. Setelah receipt sukses, jalankan /enhance pada backend dengan request_id
      onStage?.('enhancing');
      const srResult = await enhancePhotoWithSR(
        originalVer.imageUrl,
        payResult.requestId
      );

      // 3. Hitung SHA-256 berkas hasil SR secara nyata
      const srHash = await computeFileSHA256(srResult.blob);
      const nowDate = formatCurrentDate();
      const nowTs = formatCurrentTimestamp();

      const newVersion: ArchiveVersion = {
        versionNumber: archive.versions.length + 1,
        versionType: 'derivative',
        label: `Super-Resolution x${srResult.scale} (Draf Menunggu Terbit)`,
        parentId: String(originalVer.onChainTokenId),
        ipfsCid: `bafybeisr${srHash.slice(0, 24)}`,
        fileHash: srHash,
        requestId: payResult.requestId,
        transactionHash: payResult.txHash,
        onChainVerified: false,
        timestamp: nowTs,
        methodLabel: `${srResult.method} x${srResult.scale} (${srResult.modelVersion}${srResult.isMock ? ' · mock' : ''})`,
        modelVersion: srResult.modelVersion,
        imageUrl: srResult.imageUrl,
      };

      set((state) => ({
        archives: state.archives.map((item) =>
          item.id === id
            ? {
                ...item,
                paymentTxHash: payResult.txHash,
                restorationFeePaid: `${payResult.feeEth} ETH`,
                versions: [...item.versions, newVersion],
                updatedAt: nowDate,
              }
            : item
        ),
      }));

      return {
        success: true,
        txHash: payResult.txHash,
        requestId: payResult.requestId,
        feeEth: payResult.feeEth,
        newVersion,
      };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Gagal memproses pembayaran on-chain atau layanan SR.',
      };
    }
  },

  runSuperResolutionForArchive: async (id: string) => {
    const archive = get().archives.find((a) => a.id === id);
    if (!archive) return { success: false, error: 'Arsip tidak ditemukan.' };
    const hasDerivative = archive.versions.some(
      (v) => v.versionType === 'derivative'
    );
    if (hasDerivative) return { success: false, alreadyExists: true };

    const res = await get().requestPaidRestoration(id);
    return {
      success: res.success,
      error: res.error,
      txHash: res.txHash,
      requestId: res.requestId,
      newVersion: res.newVersion,
    };
  },

  publishToBlockchain: async (archiveId, onStage) => {
    const archive = get().archives.find((a) => a.id === archiveId);
    if (!archive) return { success: false, error: 'Arsip tidak ditemukan.' };

    const versionToPublish =
      archive.versions.find((v) => !v.onChainTokenId) || archive.versions[0];
    if (!versionToPublish) {
      return { success: false, error: 'Tidak ada versi berkas untuk diterbitkan.' };
    }

    try {
      const chainId = get().wallet.chainId;
      const isDerivative = versionToPublish.versionType === 'derivative';
      const originalVer = archive.versions.find(
        (v) => v.versionType === 'original'
      );
      const numericParentId = isDerivative
        ? originalVer?.onChainTokenId || Number(versionToPublish.parentId || 0)
        : 0;

      // 1. Unggah metadata ke IPFS (atau draft URI jika daemon IPFS belum aktif)
      const metadataPayload = {
        name: `${archive.title} (${versionToPublish.label})`,
        description: archive.curatorNotes || archive.source,
        image: `ipfs://${versionToPublish.ipfsCid}`,
        category_final: archive.finalCategory,
        ai_category: archive.aiPrediction.category,
        ai_confidence: archive.aiPrediction.confidence,
        creator: archive.creator,
        source: archive.source,
        license: archive.licenseInfo,
        file_hash_sha256: versionToPublish.fileHash,
        parent_id: numericParentId,
        request_id: versionToPublish.requestId || null,
        method: versionToPublish.methodLabel || null,
      };
      const ipfsRes = await uploadMetadataToIpfs(
        metadataPayload,
        versionToPublish.fileHash
      );

      // 2. Panggil kontrak ArsipFotoVersi (terbitkanVersi atau terbitkanVersiRestorasi)
      const txRes = await publishVersionOnChain({
        chainId,
        uri: ipfsRes.metadataUri,
        fileHash: versionToPublish.fileHash,
        parentId: numericParentId,
        requestId: versionToPublish.requestId,
        onStage,
      });

      const nowDate = formatCurrentDate();
      set((state) => ({
        archives: state.archives.map((item) => {
          if (item.id !== archiveId) return item;
          const updatedVersions = item.versions.map((ver) =>
            ver.versionNumber === versionToPublish.versionNumber
              ? {
                  ...ver,
                  label:
                    ver.versionType === 'original'
                      ? `Asli / Token #${txRes.tokenId}`
                      : `Super-Resolution x4 / Token #${txRes.tokenId}`,
                  onChainTokenId: txRes.tokenId,
                  transactionHash: txRes.txHash,
                  metadataUri: ipfsRes.metadataUri,
                  ipfsCid: ipfsRes.cid,
                  onChainVerified: true,
                }
              : ver
          );
          return {
            ...item,
            status: 'tercatat' as ArchiveStatus,
            versions: updatedVersions,
            updatedAt: nowDate,
          };
        }),
      }));

      return {
        success: true,
        txHash: txRes.txHash,
        tokenId: txRes.tokenId,
        gasUsed: txRes.gasUsed,
      };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Gagal menerbitkan token ke smart contract.',
      };
    }
  },

  connectWallet: async () => {
    set((state) => ({
      wallet: { ...state.wallet, isConnecting: true, error: null },
    }));
    try {
      const { address, chainId } = await connectMetaMaskWallet();
      const net = NETWORKS[chainId];
      let isCurator = false;
      try {
        if (net?.contractAddress) {
          isCurator = await fetchIsCurator(chainId, address);
        }
      } catch {
        isCurator = false;
      }

      set((state) => ({
        wallet: {
          ...state.wallet,
          address,
          isConnected: true,
          chainId,
          chainName: net ? net.name : `Chain #${chainId}`,
          isCurator,
          isConnecting: false,
          error: net
            ? null
            : `Jaringan Chain ID ${chainId} tidak didukung. Pilih Hardhat Localhost atau Sepolia.`,
        },
      }));
      void get().refreshRestorationFee();
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : 'Koneksi wallet dibatalkan oleh pengguna.';
      set((state) => ({
        wallet: {
          ...state.wallet,
          isConnected: false,
          address: null,
          isCurator: false,
          isConnecting: false,
          error: errorMsg,
        },
      }));
    }
  },

  disconnectWallet: () => {
    set((state) => ({
      isWorkspaceAuthenticated: false,
      wallet: {
        ...state.wallet,
        address: null,
        isConnected: false,
        isCurator: false,
        error: null,
      },
    }));
  },

  switchNetwork: async (chainId: number) => {
    const target = NETWORKS[chainId];
    if (!target) return;

    try {
      if (get().wallet.isConnected) {
        await switchOrAddEthereumNetwork(chainId);
      }
      set((state) => ({
        wallet: {
          ...state.wallet,
          chainId: target.chainId,
          chainName: target.name,
          error: null,
        },
      }));
      void get().refreshRestorationFee();
    } catch (err) {
      set((state) => ({
        wallet: {
          ...state.wallet,
          error:
            err instanceof Error ? err.message : 'Gagal beralih jaringan wallet.',
        },
      }));
    }
  },

  toggleRole: () => {
    // Tetap hormati status on-chain saat wallet terhubung; hanya info UI jika belum terhubung
    if (get().wallet.isConnected) return;
    set((state) => ({
      wallet: {
        ...state.wallet,
        isCurator: !state.wallet.isCurator,
      },
    }));
  },
}));
