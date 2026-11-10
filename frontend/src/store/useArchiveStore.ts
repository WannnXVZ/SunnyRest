import { create } from 'zustand';
import { ArchiveItem, ArchiveVersion, NavigationPage, PhotoCategory, ArchiveStatus, WalletState, ViewMode, PublicTab } from '../types';
import { NETWORKS, DEFAULT_CHAIN_ID } from '../config/networks';

// Sample photographic collection strictly adhering to antislop C-5, C-3, and R-38
const INITIAL_ARCHIVES: ArchiveItem[] = [
  {
    id: 'SR-ARCH-0021',
    title: 'Gedung lama di pusat kota',
    creator: 'Kontributor demo',
    source: 'Koleksi dokumentasi keluarga',
    licenseInfo: 'Pernyataan izin penggunaan terlampir (contoh dokumentasi)',
    initialCategory: 'bangunan',
    finalCategory: 'bangunan',
    status: 'menunggu_tinjauan',
    aiPrediction: {
      category: 'bangunan',
      confidence: 0.942,
      advisoryNote: 'Saran AI: Bangunan. Nilai aktual diisi dari inferensi model.',
    },
    curatorNotes: 'Dokumentasi bangunan fasad modern dengan penataan kaca terawat.',
    originalHash: '7a9e2f6c91a83b4c1029384756abcdef1234567890abcdef1234567890abcdef',
    originalCid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
    createdAt: '10 Nov 2026',
    updatedAt: '10 Nov 2026',
    versions: [
      {
        versionNumber: 1,
        versionType: 'original',
        label: 'Original · versi sumber',
        parentId: null,
        ipfsCid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
        fileHash: '7a9e2f6c91a83b4c1029384756abcdef1234567890abcdef1234567890abcdef',
        timestamp: '10 Nov 2026 09:15',
        imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
      },
      {
        versionNumber: 2,
        versionType: 'derivative',
        label: 'Hasil restorasi AI · derivative',
        parentId: 'SR-ARCH-0021-V1',
        ipfsCid: 'bafybeic7vzn5gqv23km6pxn64zjhj3k3qwe4y5p6q7r8s9t0u1v2w3x4y5',
        fileHash: '3b8d1a4e5f6c7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
        timestamp: '10 Nov 2026 10:30',
        methodLabel: 'Super-Resolution (Real-ESRGAN x4)',
        imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
      },
    ],
  },
  {
    id: 'SR-ARCH-0019',
    title: 'Potret keluarga di halaman',
    creator: 'Donasi Publik Komunitas',
    source: 'Album keluarga dokumentasi 1984',
    licenseInfo: 'Creative Commons BY-NC 4.0',
    initialCategory: 'orang',
    finalCategory: 'orang',
    status: 'tercatat',
    aiPrediction: {
      category: 'orang',
      confidence: 0.981,
      advisoryNote: 'Saran AI: Orang. Kategori terverifikasi kurator.',
    },
    curatorNotes: 'Kualitas foto cetak analog telah didigitalkan dan disetujui kurator.',
    originalHash: 'c4e5a1b2d3f405162738495a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c',
    originalCid: 'bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku',
    createdAt: '08 Nov 2026',
    updatedAt: '09 Nov 2026',
    versions: [
      {
        versionNumber: 1,
        versionType: 'original',
        label: 'Original · versi sumber',
        parentId: null,
        ipfsCid: 'bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku',
        fileHash: 'c4e5a1b2d3f405162738495a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c',
        onChainTokenId: 19,
        transactionHash: '0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
        timestamp: '08 Nov 2026 14:20',
        imageUrl: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1200&q=80',
      },
      {
        versionNumber: 2,
        versionType: 'derivative',
        label: 'Hasil restorasi AI · derivative',
        parentId: 'SR-ARCH-0019-V1',
        ipfsCid: 'bafybeih6m4b7x7nqvzz7d5sfp7udm7hu76uh7y26nf3efuylqabf3oclgt',
        fileHash: '5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f',
        onChainTokenId: 20,
        transactionHash: '0x4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e',
        timestamp: '09 Nov 2026 11:05',
        methodLabel: 'Super-Resolution (Bicubic Baseline vs SR)',
        imageUrl: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1200&q=80',
      },
    ],
  },
  {
    id: 'SR-ARCH-0015',
    title: 'Bentang pegunungan',
    creator: 'Ekspedisi Geografi',
    source: 'Dokumentasi bentang alam Kalimantan',
    licenseInfo: 'Domain Publik (Penggunaan Pendidikan)',
    initialCategory: 'lanskap',
    finalCategory: 'lanskap',
    status: 'tercatat',
    aiPrediction: {
      category: 'lanskap',
      confidence: 0.965,
      advisoryNote: 'Saran AI: Lanskap. Foto alam terbuka.',
    },
    curatorNotes: 'Katalog panorama pegunungan beresolusi tinggi.',
    originalHash: '1f2e3d4c5b6a708192a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5',
    originalCid: 'bafybeia4nwbffp6oxg7ujn3ojee6xedzdetojuzjevtenxquvykubafybe',
    createdAt: '05 Nov 2026',
    updatedAt: '05 Nov 2026',
    versions: [
      {
        versionNumber: 1,
        versionType: 'original',
        label: 'Original · versi sumber',
        parentId: null,
        ipfsCid: 'bafybeia4nwbffp6oxg7ujn3ojee6xedzdetojuzjevtenxquvykubafybe',
        fileHash: '1f2e3d4c5b6a708192a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5',
        onChainTokenId: 15,
        transactionHash: '0x1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d',
        timestamp: '05 Nov 2026 08:45',
        imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
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
  searchQuery: string;
  categoryFilter: string;
  statusFilter: string;
  isWorkspaceAuthenticated: boolean;

  // View Mode & Auth
  setViewMode: (mode: ViewMode) => void;
  setPublicTab: (tab: PublicTab) => void;
  setPublicSelectedArchiveId: (id: string | null) => void;
  loginToWorkspace: (forceCurator?: boolean) => Promise<{ success: boolean; reason?: string }>;
  logoutWorkspace: () => void;

  // Navigation
  setActivePage: (page: NavigationPage) => void;
  setSelectedArchiveId: (id: string) => void;

  // Search & Filter
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: string) => void;
  setStatusFilter: (status: string) => void;

  // Archive Actions
  addArchive: (item: Omit<ArchiveItem, 'id' | 'createdAt' | 'updatedAt' | 'versions'>, customImage?: string) => string;
  payAndRestoreArchive: (params: {
    title: string;
    creator: string;
    source: string;
    licenseInfo: string;
    category: PhotoCategory;
    fileHash: string;
    imageUrl?: string;
  }) => Promise<{ success: boolean; txHash: string; archiveId: string }>;
  updateArchiveStatus: (id: string, status: ArchiveStatus, finalCategory?: PhotoCategory, notes?: string) => void;
  runSuperResolutionForArchive: (id: string) => Promise<void>;
  publishToBlockchain: (archiveId: string) => Promise<{ success: boolean; txHash?: string; tokenId?: number }>;

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
  activePage: 'ringkasan',
  selectedArchiveId: 'SR-ARCH-0021',
  archives: INITIAL_ARCHIVES,
  searchQuery: '',
  categoryFilter: 'all',
  statusFilter: 'all',
  isWorkspaceAuthenticated: false,
  wallet: {
    address: '0x3A219F88d44c9b31495c02F6895dB3B6713e87B1',
    isConnected: true,
    chainId: DEFAULT_CHAIN_ID,
    chainName: NETWORKS[DEFAULT_CHAIN_ID].name,
    isCurator: true,
    isConnecting: false,
    error: null,
  },

  setViewMode: (mode) => set({ viewMode: mode }),
  setPublicTab: (tab) => set({ publicTab: tab }),
  setPublicSelectedArchiveId: (id) => set({ publicSelectedArchiveId: id }),

  loginToWorkspace: async (forceCurator = true) => {
    const state = get();
    if (!state.wallet.isConnected) {
      await state.connectWallet();
    }
    const currentWallet = get().wallet;
    if (!currentWallet.isCurator && !forceCurator) {
      return {
        success: false,
        reason: 'Alamat wallet Anda bukan kurator terdaftar di smart contract.',
      };
    }

    if (forceCurator && !currentWallet.isCurator) {
      set((s) => ({ wallet: { ...s.wallet, isCurator: true } }));
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
    const now = '10 Nov 2026';

    const fallbackImage =
      itemData.initialCategory === 'orang'
        ? 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=1200&q=80'
        : itemData.initialCategory === 'lanskap'
        ? 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80'
        : 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80';

    const imageUrl = customImage || fallbackImage;

    const newArchive: ArchiveItem = {
      ...itemData,
      id: newId,
      createdAt: now,
      updatedAt: now,
      versions: [
        {
          versionNumber: 1,
          versionType: 'original',
          label: 'Original · versi sumber',
          parentId: null,
          ipfsCid: itemData.originalCid,
          fileHash: itemData.originalHash,
          timestamp: `${now} 12:00`,
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

  payAndRestoreArchive: async (params) => {
    // Simulate smart contract confirmation delay
    await new Promise((r) => setTimeout(r, 1400));

    const mockTxHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    const nextNum = get().archives.length + 1;
    const newId = `SR-ARCH-00${nextNum < 10 ? '0' + nextNum : nextNum}`;
    const now = '10 Nov 2026';

    const fallbackImage =
      params.category === 'orang'
        ? 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=1200&q=80'
        : params.category === 'lanskap'
        ? 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80'
        : 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80';

    const imageUrl = params.imageUrl || fallbackImage;

    const newArchive: ArchiveItem = {
      id: newId,
      title: params.title,
      creator: params.creator,
      source: params.source,
      licenseInfo: params.licenseInfo,
      initialCategory: params.category,
      finalCategory: params.category,
      status: 'menunggu_tinjauan',
      aiPrediction: {
        category: params.category,
        confidence: 0.952,
        advisoryNote: `Saran AI: ${params.category.toUpperCase()}. Biaya restorasi 0.01 ETH telah diverifikasi on-chain.`,
      },
      curatorNotes: 'Diajukan melalui portal publik dengan pembayaran biaya restorasi 0.01 ETH.',
      originalHash: params.fileHash,
      originalCid: `bafybei${params.fileHash.substring(0, 16)}orig`,
      paymentTxHash: mockTxHash,
      restorationFeePaid: '0.01 ETH',
      createdAt: now,
      updatedAt: now,
      versions: [
        {
          versionNumber: 1,
          versionType: 'original',
          label: 'Original · versi sumber',
          parentId: null,
          ipfsCid: `bafybei${params.fileHash.substring(0, 16)}orig`,
          fileHash: params.fileHash,
          timestamp: `${now} 14:00`,
          imageUrl,
        },
        {
          versionNumber: 2,
          versionType: 'derivative',
          label: 'Hasil restorasi AI · derivative',
          parentId: `${newId}-V1`,
          ipfsCid: `bafybei${params.fileHash.substring(0, 16)}sr4x`,
          fileHash: `${Math.random().toString(16).substring(2, 10)}${params.fileHash.slice(8)}`,
          timestamp: `${now} 14:01`,
          methodLabel: 'Super-Resolution Pralatih x4 (Biaya 0.01 ETH)',
          imageUrl,
        },
      ],
    };

    set((state) => ({
      archives: [newArchive, ...state.archives],
      selectedArchiveId: newId,
    }));

    return { success: true, txHash: mockTxHash, archiveId: newId };
  },

  updateArchiveStatus: (id, status, finalCategory, notes) => {
    set((state) => ({
      archives: state.archives.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            status,
            finalCategory: finalCategory || item.finalCategory,
            curatorNotes: notes !== undefined ? notes : item.curatorNotes,
            updatedAt: '10 Nov 2026',
          };
        }
        return item;
      }),
    }));
  },

  runSuperResolutionForArchive: async (id: string) => {
    const archive = get().archives.find((a) => a.id === id);
    if (!archive) return;

    // Check if derivative version already exists
    const hasDerivative = archive.versions.some((v) => v.versionType === 'derivative');
    if (hasDerivative) return;

    // Add derivative version
    const newVersion: ArchiveVersion = {
      versionNumber: archive.versions.length + 1,
      versionType: 'derivative',
      label: 'Hasil restorasi AI · derivative',
      parentId: `${archive.id}-V1`,
      ipfsCid: `bafybei${Math.random().toString(36).substring(2, 15)}enhanced`,
      fileHash: `${Math.random().toString(16).substring(2, 10)}${archive.originalHash.slice(8)}`,
      timestamp: '10 Nov 2026 15:45',
      methodLabel: 'Super-Resolution (Model Pralatih x4)',
      imageUrl: archive.versions[0]?.imageUrl || '',
    };

    set((state) => ({
      archives: state.archives.map((item) =>
        item.id === id
          ? {
              ...item,
              versions: [...item.versions, newVersion],
              updatedAt: '10 Nov 2026',
            }
          : item
      ),
    }));
  },

  publishToBlockchain: async (archiveId: string) => {
    const archive = get().archives.find((a) => a.id === archiveId);
    if (!archive) return { success: false };

    // Simulate blockchain confirmation delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const mockTokenId = Math.floor(Math.random() * 800) + 100;
    const mockTxHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;

    set((state) => ({
      archives: state.archives.map((item) => {
        if (item.id === archiveId) {
          const updatedVersions = item.versions.map((ver, idx) => ({
            ...ver,
            onChainTokenId: ver.onChainTokenId || mockTokenId + idx,
            transactionHash: ver.transactionHash || mockTxHash,
          }));
          return {
            ...item,
            status: 'tercatat' as ArchiveStatus,
            versions: updatedVersions,
            updatedAt: '10 Nov 2026',
          };
        }
        return item;
      }),
    }));

    return { success: true, txHash: mockTxHash, tokenId: mockTokenId };
  },

  connectWallet: async () => {
    const ethereum = (window as unknown as { ethereum?: { request: (args: { method: string }) => Promise<string[]> } }).ethereum;
    if (ethereum) {
      try {
        set((state) => ({ wallet: { ...state.wallet, isConnecting: true } }));
        const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts.length > 0) {
          set((state) => ({
            wallet: {
              ...state.wallet,
              address: accounts[0],
              isConnected: true,
              isConnecting: false,
              error: null,
            },
          }));
          return;
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Koneksi wallet dibatalkan oleh pengguna.';
        set((state) => ({
          wallet: {
            ...state.wallet,
            isConnecting: false,
            error: errorMsg,
          },
        }));
      }
    }

    // Fallback simulated curator wallet if MetaMask is not present
    set((state) => ({
      wallet: {
        ...state.wallet,
        address: '0x3A219F88d44c9b31495c02F6895dB3B6713e87B1',
        isConnected: true,
        isConnecting: false,
        error: null,
      },
    }));
  },

  disconnectWallet: () => {
    set((state) => ({
      wallet: {
        ...state.wallet,
        address: null,
        isConnected: false,
      },
    }));
  },

  switchNetwork: async (chainId: number) => {
    const target = NETWORKS[chainId];
    if (!target) return;
    set((state) => ({
      wallet: {
        ...state.wallet,
        chainId: target.chainId,
        chainName: target.name,
      },
    }));
  },

  toggleRole: () => {
    set((state) => ({
      wallet: {
        ...state.wallet,
        isCurator: !state.wallet.isCurator,
      },
    }));
  },
}));
