import { create } from 'zustand';
import {
  ArchiveItem,
  ArchiveStatus,
  ArchiveVersion,
  NavigationPage,
  PhotoCategory,
  PublicTab,
  ViewMode,
  WalletState,
} from '../types';
import { DEFAULT_CHAIN_ID, NETWORKS } from '../config/networks';
import {
  connectMetaMaskWallet,
  getPassiveWalletState,
  subscribeWalletEvents,
  switchOrAddEthereumNetwork,
} from '../lib/wallet';
import {
  OnChainTokenRecord,
  TxStage,
  fetchAllOnChainVersions,
  fetchIsCurator,
  fetchRestorationFee,
  normalizeHexHash,
  publishVersionOnChain,
  submitRestorationRequest,
} from '../lib/contract';
import {
  createSubmissionOnServer,
  enhancePhotoWithSR,
  fetchSubmissions,
  patchSubmissionOnServer,
  resolveMediaUrl,
  uploadDerivativeFileOnServer,
} from '../lib/api';
import {
  fetchIpfsJson,
  pinFileToIpfs,
  pinMetadataToIpfs,
  resolveIpfsUrl,
} from '../lib/ipfs';
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

function formatUnixTimestamp(epochSec: number): string {
  if (!epochSec) return formatCurrentTimestamp();
  return new Date(epochSec * 1000).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatUnixDate(epochSec: number): string {
  if (!epochSec) return formatCurrentDate();
  return new Date(epochSec * 1000).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function normalizeCategory(raw: unknown): PhotoCategory {
  if (raw === 'orang' || raw === 'bangunan' || raw === 'lanskap') {
    return raw;
  }
  return 'bangunan';
}

function extractCidFromUri(uri: string): string {
  if (!uri) return '';
  return uri.startsWith('ipfs://') ? uri.slice('ipfs://'.length) : uri;
}

interface IpfsArchiveMetadata {
  name?: string;
  title?: string;
  description?: string;
  image?: string;
  category_final?: string;
  ai_category?: string;
  ai_confidence?: number;
  ai_scores?: Record<PhotoCategory, number>;
  ai_model_version?: string;
  creator?: string;
  source?: string;
  source_ref?: string;
  license?: string;
  method?: string;
  request_id?: number | null;
}

function normalizeSubmissionMediaUrls(item: ArchiveItem): ArchiveItem {
  return {
    ...item,
    versions: item.versions.map((ver) => ({
      ...ver,
      imageUrl: resolveMediaUrl(ver.imageUrl),
    })),
  };
}

export type RestorationStage = 'idle' | TxStage | 'enhancing';

export interface RestorationActionResult {
  success: boolean;
  error?: string;
  warning?: string;
  txHash?: string;
  requestId?: number;
  feeEth?: string;
  newVersion?: ArchiveVersion;
}

async function runEnhanceAndPersist(
  archive: ArchiveItem,
  originalVer: ArchiveVersion,
  requestId: number,
  paymentTxHash: string,
  restorationFeePaid: string | undefined,
  feeEth: string | undefined,
  replaceExistingDerivative: boolean,
  onStage: (stage: TxStage | 'enhancing') => void,
  setState: (partial: Partial<ArchiveStore> | ((state: ArchiveStore) => Partial<ArchiveStore>)) => void
): Promise<RestorationActionResult> {
  onStage('enhancing');
  const srResult = await enhancePhotoWithSR(originalVer.imageUrl, requestId);
  const srHash = await computeFileSHA256(srResult.blob);

  let storedSrUrl = srResult.imageUrl;
  let storedDimensions: string | undefined;
  let uploadWarning: string | undefined;

  if (!archive.id.startsWith('ONCHAIN-')) {
    try {
      const uploaded = await uploadDerivativeFileOnServer(
        archive.id,
        srResult.blob,
        `${archive.id}_sr_x${srResult.scale}.png`
      );
      storedSrUrl = uploaded.url;
      storedDimensions = uploaded.dimensions;
    } catch (err) {
      uploadWarning =
        err instanceof Error
          ? `Hasil SR selesai di sesi browser tetapi gagal disimpan ke disk backend (${err.message}).`
          : 'Hasil SR selesai di sesi browser tetapi gagal disimpan ke disk backend.';
    }
  }

  const nowDate = formatCurrentDate();
  const nowTs = formatCurrentTimestamp();
  const existingDerivative = archive.versions.find(
    (v) => v.versionType === 'derivative'
  );

  const rawDerivativeVersion: ArchiveVersion = {
    versionNumber:
      replaceExistingDerivative && existingDerivative
        ? existingDerivative.versionNumber
        : archive.versions.length + 1,
    versionType: 'derivative',
    label: `Super-Resolution x${srResult.scale} (Menunggu Terbit On-Chain)`,
    parentId: String(originalVer.onChainTokenId),
    ipfsCid: '',
    fileHash: srHash,
    requestId,
    transactionHash: paymentTxHash,
    onChainVerified: false,
    fileName: `${archive.id}_sr_x${srResult.scale}.png`,
    fileSizeBytes: srResult.blob.size,
    dimensions: storedDimensions,
    timestamp: nowTs,
    methodLabel: `${srResult.method} x${srResult.scale} (${srResult.modelVersion}${srResult.isMock ? ' · mock' : ''})`,
    modelVersion: srResult.modelVersion,
    imageUrl: storedSrUrl,
  };

  const hydratedVersion: ArchiveVersion = {
    ...rawDerivativeVersion,
    imageUrl: resolveMediaUrl(storedSrUrl),
  };

  const mergeVersions = (vers: ArchiveVersion[], useHydrated: boolean) => {
    const nextVer = useHydrated ? hydratedVersion : rawDerivativeVersion;
    if (replaceExistingDerivative && existingDerivative) {
      return vers.map((v) =>
        v.versionType === 'derivative' && !v.onChainTokenId ? nextVer : v
      );
    }
    return [...vers, nextVer];
  };

  const updatedVersionsRaw = mergeVersions(archive.versions, false);
  const updatedVersionsHydrated = mergeVersions(archive.versions, true);

  setState((state) => ({
    archives: state.archives.map((item) =>
      item.id === archive.id
        ? {
            ...item,
            paymentTxHash: paymentTxHash || item.paymentTxHash,
            restorationFeePaid: restorationFeePaid || item.restorationFeePaid,
            versions: updatedVersionsHydrated,
            updatedAt: nowDate,
          }
        : item
    ),
  }));

  if (!archive.id.startsWith('ONCHAIN-')) {
    try {
      await patchSubmissionOnServer(archive.id, {
        paymentTxHash: paymentTxHash || archive.paymentTxHash,
        restorationFeePaid: restorationFeePaid || archive.restorationFeePaid,
        versions: updatedVersionsRaw,
        updatedAt: nowDate,
      });
    } catch (err) {
      const patchErr =
        err instanceof Error ? err.message : 'Gagal memperbarui metadata pengajuan.';
      uploadWarning = uploadWarning ? `${uploadWarning} ${patchErr}` : patchErr;
    }
  }

  return {
    success: true,
    warning: uploadWarning,
    txHash: paymentTxHash,
    requestId,
    feeEth,
    newVersion: hydratedVersion,
  };
}

interface ArchiveStore {
  viewMode: ViewMode;
  publicTab: PublicTab;
  publicSelectedArchiveId: string | null;
  activePage: NavigationPage;
  selectedArchiveId: string;
  archives: ArchiveItem[];
  isSyncingArchives: boolean;
  syncError: string | null;
  restoringArchiveId: string | null;
  restorationStage: RestorationStage;
  wallet: WalletState;
  restorationFeeEth: string | null;
  restorationFeeError: string | null;
  searchQuery: string;
  categoryFilter: string;
  statusFilter: string;
  isWorkspaceAuthenticated: boolean;

  setViewMode: (mode: ViewMode) => void;
  setPublicTab: (tab: PublicTab) => void;
  setPublicSelectedArchiveId: (id: string | null) => void;
  loginToWorkspace: () => Promise<{ success: boolean; reason?: string }>;
  logoutWorkspace: () => void;

  setActivePage: (page: NavigationPage) => void;
  setSelectedArchiveId: (id: string) => void;

  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: string) => void;
  setStatusFilter: (status: string) => void;

  syncArchives: () => Promise<void>;
  refreshRestorationFee: () => Promise<void>;
  initWalletSync: () => () => void;

  submitArchive: (
    file: File,
    item: Omit<ArchiveItem, 'id' | 'createdAt' | 'updatedAt' | 'versions'>
  ) => Promise<{ success: boolean; archiveId?: string; error?: string }>;

  updateArchiveStatus: (
    id: string,
    status: ArchiveStatus,
    finalCategory?: PhotoCategory,
    notes?: string
  ) => Promise<void>;

  updateArchiveVisibility: (
    id: string,
    visibility: 'public' | 'private'
  ) => Promise<{ success: boolean; error?: string }>;

  requestPaidRestoration: (
    id: string,
    onStage?: (stage: TxStage | 'enhancing') => void
  ) => Promise<RestorationActionResult>;

  retryEnhanceWithExistingRequest: (
    id: string,
    onStage?: (stage: TxStage | 'enhancing') => void
  ) => Promise<RestorationActionResult>;

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
    mediaCid?: string;
    metadataUri?: string;
  }>;

  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchNetwork: (chainId: number) => Promise<void>;
}

export const useArchiveStore = create<ArchiveStore>((set, get) => ({
  viewMode: 'public',
  publicTab: 'semua',
  publicSelectedArchiveId: null,
  activePage: 'arsip',
  selectedArchiveId: '',
  archives: [],
  isSyncingArchives: false,
  syncError: null,
  restoringArchiveId: null,
  restorationStage: 'idle',
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

  syncArchives: async () => {
    set({ isSyncingArchives: true, syncError: null });
    const chainId = get().wallet.chainId;
    const errors: string[] = [];

    let offChainItems: ArchiveItem[] = [];
    try {
      offChainItems = await fetchSubmissions();
    } catch (err) {
      errors.push(
        err instanceof Error
          ? `Antrean backend tidak dapat dimuat (${err.message}).`
          : 'Antrean backend tidak dapat dimuat.'
      );
    }

    let onChainTokens: OnChainTokenRecord[] = [];
    try {
      if (NETWORKS[chainId]?.contractAddress) {
        onChainTokens = await fetchAllOnChainVersions(chainId);
      }
    } catch (err) {
      errors.push(
        err instanceof Error
          ? `RPC blockchain ${NETWORKS[chainId]?.name || chainId} tidak terjangkau (${err.message}).`
          : 'RPC blockchain tidak terjangkau.'
      );
    }

    const tokenById = new Map<number, OnChainTokenRecord>();
    const tokenByHash = new Map<string, OnChainTokenRecord>();
    for (const tok of onChainTokens) {
      tokenById.set(tok.tokenId, tok);
      tokenByHash.set(normalizeHexHash(tok.fileHash), tok);
    }

    const matchedTokenIds = new Set<number>();

    const mergedOffChain = offChainItems.map((rawItem) => {
      const item = normalizeSubmissionMediaUrls(rawItem);
      const updatedVersions = item.versions.map((ver) => {
        const matchedTok =
          (ver.onChainTokenId ? tokenById.get(ver.onChainTokenId) : undefined) ||
          tokenByHash.get(normalizeHexHash(ver.fileHash));

        if (!matchedTok) return ver;
        matchedTokenIds.add(matchedTok.tokenId);

        return {
          ...ver,
          onChainTokenId: matchedTok.tokenId,
          onChainVerified: true,
          ownerAddress: matchedTok.owner,
          publisherAddress: matchedTok.publisher,
          metadataUri: ver.metadataUri || matchedTok.tokenUri,
          ipfsCid: ver.ipfsCid || extractCidFromUri(matchedTok.tokenUri),
          label:
            ver.versionType === 'original'
              ? `Asli / Token #${matchedTok.tokenId}`
              : `Super-Resolution x4 / Token #${matchedTok.tokenId}`,
        };
      });

      const origVer =
        updatedVersions.find((v) => v.versionType === 'original') || updatedVersions[0];

      // Pasangkan token turunan on-chain yang merujuk parentId token asli bila belum ada di array
      if (origVer?.onChainTokenId) {
        for (const tok of onChainTokens) {
          if (tok.parentId === origVer.onChainTokenId && !matchedTokenIds.has(tok.tokenId)) {
            matchedTokenIds.add(tok.tokenId);
            updatedVersions.push({
              versionNumber: updatedVersions.length + 1,
              versionType: 'derivative',
              label: `Super-Resolution x4 / Token #${tok.tokenId}`,
              parentId: String(tok.parentId),
              ipfsCid: extractCidFromUri(tok.tokenUri),
              metadataUri: tok.tokenUri,
              fileHash: normalizeHexHash(tok.fileHash),
              onChainTokenId: tok.tokenId,
              onChainVerified: true,
              ownerAddress: tok.owner,
              publisherAddress: tok.publisher,
              timestamp: formatUnixTimestamp(tok.publishedAt),
              methodLabel: 'Real-ESRGAN x4',
              imageUrl: origVer.imageUrl,
            });
          }
        }
      }

      const origOnChain = Boolean(origVer?.onChainTokenId);
      return {
        ...item,
        status: origOnChain ? ('tercatat' as ArchiveStatus) : item.status,
        versions: updatedVersions,
      };
    });

    // Rekonstruksi arsip murni on-chain (mis. saat membuka dari browser lain atau jaringan Sepolia)
    const remainingOriginals = onChainTokens.filter(
      (tok) => tok.parentId === 0 && !matchedTokenIds.has(tok.tokenId)
    );

    const reconstructedOnChain = await Promise.all(
      remainingOriginals.map(async (origTok) => {
        const meta = await fetchIpfsJson<IpfsArchiveMetadata>(origTok.tokenUri);
        const children = onChainTokens.filter(
          (c) => c.parentId === origTok.tokenId && !matchedTokenIds.has(c.tokenId)
        );

        const origMediaUri = meta?.image ? resolveIpfsUrl(meta.image) : '';
        const versions: ArchiveVersion[] = [
          {
            versionNumber: 1,
            versionType: 'original',
            label: `Asli / Token #${origTok.tokenId}`,
            parentId: null,
            ipfsCid: meta?.image ? extractCidFromUri(meta.image) : extractCidFromUri(origTok.tokenUri),
            mediaCid: meta?.image ? extractCidFromUri(meta.image) : undefined,
            metadataUri: origTok.tokenUri,
            fileHash: normalizeHexHash(origTok.fileHash),
            onChainTokenId: origTok.tokenId,
            onChainVerified: true,
            ownerAddress: origTok.owner,
            publisherAddress: origTok.publisher,
            timestamp: formatUnixTimestamp(origTok.publishedAt),
            imageUrl: origMediaUri,
          },
        ];

        for (const child of children) {
          const childMeta = await fetchIpfsJson<IpfsArchiveMetadata>(child.tokenUri);
          const childMediaUri = childMeta?.image ? resolveIpfsUrl(childMeta.image) : '';
          versions.push({
            versionNumber: versions.length + 1,
            versionType: 'derivative',
            label: `Super-Resolution x4 / Token #${child.tokenId}`,
            parentId: String(child.parentId),
            ipfsCid: childMeta?.image ? extractCidFromUri(childMeta.image) : extractCidFromUri(child.tokenUri),
            mediaCid: childMeta?.image ? extractCidFromUri(childMeta.image) : undefined,
            metadataUri: child.tokenUri,
            fileHash: normalizeHexHash(child.fileHash),
            onChainTokenId: child.tokenId,
            requestId: childMeta?.request_id ?? undefined,
            onChainVerified: true,
            ownerAddress: child.owner,
            publisherAddress: child.publisher,
            timestamp: formatUnixTimestamp(child.publishedAt),
            methodLabel: childMeta?.method || 'Real-ESRGAN x4',
            imageUrl: childMediaUri || origMediaUri,
          });
        }

        const finalCat = normalizeCategory(meta?.category_final);
        const aiCat = normalizeCategory(meta?.ai_category || finalCat);
        const rawTitle = meta?.name || meta?.title || `Token On-Chain #${origTok.tokenId}`;
        const cleanTitle = rawTitle.replace(/\s*\(Original.*\)$/i, '').replace(/\s*\(Asli.*\)$/i, '');

        return {
          id: `ONCHAIN-${origTok.tokenId}`,
          title: cleanTitle,
          creator: meta?.creator || origTok.publisher,
          source: meta?.source || `Smart Contract Token #${origTok.tokenId}`,
          sourceRef: meta?.source_ref,
          licenseInfo: meta?.license || 'Lihat metadata tokenURI',
          chainId,
          initialCategory: aiCat,
          finalCategory: finalCat,
          status: 'tercatat' as ArchiveStatus,
          aiPrediction: {
            category: aiCat,
            confidence: typeof meta?.ai_confidence === 'number' ? meta.ai_confidence : 0,
            scores: meta?.ai_scores,
            modelVersion: meta?.ai_model_version,
            advisoryNote: meta?.description || `Tercatat on-chain pada Token #${origTok.tokenId}.`,
          },
          curatorNotes: meta?.description,
          originalHash: normalizeHexHash(origTok.fileHash),
          originalCid: meta?.image ? extractCidFromUri(meta.image) : extractCidFromUri(origTok.tokenUri),
          versions,
          createdAt: formatUnixDate(origTok.publishedAt),
          updatedAt: formatUnixDate(origTok.publishedAt),
        } satisfies ArchiveItem;
      })
    );

    const combined = [...mergedOffChain, ...reconstructedOnChain];
    const currentSelected = get().selectedArchiveId;
    const stillExists = combined.some((a) => a.id === currentSelected);

    set({
      archives: combined,
      selectedArchiveId: stillExists ? currentSelected : combined[0]?.id || '',
      isSyncingArchives: false,
      syncError: errors.length > 0 ? errors.join(' ') : null,
    });
  },

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
    void get().syncArchives();

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
        const chainChanged = activeChain !== get().wallet.chainId;
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
        if (chainChanged) {
          void get().refreshRestorationFee();
          void get().syncArchives();
        }
      }
    })();

    return subscribeWalletEvents(
      async (accounts) => {
        if (!accounts || accounts.length === 0) {
          set((s) => ({
            isWorkspaceAuthenticated: false,
            viewMode:
              s.viewMode === 'workspace' || s.viewMode === 'contributor' ? 'public' : s.viewMode,
            activePage:
              s.viewMode === 'workspace' || s.viewMode === 'contributor' ? 'arsip' : s.activePage,
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
        set((s) => {
          const nextWorkspaceAuth = s.isWorkspaceAuthenticated && isCurator;
          const downgradedToContributor = s.viewMode === 'workspace' && !isCurator;
          return {
            isWorkspaceAuthenticated: nextWorkspaceAuth,
            viewMode: downgradedToContributor ? 'contributor' : s.viewMode,
            activePage: downgradedToContributor ? 'ringkasan' : s.activePage,
            wallet: {
              ...s.wallet,
              address: addr,
              isConnected: true,
              isCurator,
              error: null,
            },
          };
        });
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
        set((s) => {
          const nextWorkspaceAuth = s.isWorkspaceAuthenticated && isCurator;
          const leaveWorkspace = s.viewMode === 'workspace' && !isCurator;
          return {
            isWorkspaceAuthenticated: nextWorkspaceAuth,
            viewMode: leaveWorkspace ? 'public' : s.viewMode,
            activePage: leaveWorkspace ? 'arsip' : s.activePage,
            wallet: {
              ...s.wallet,
              chainId: newChainId,
              chainName: net ? net.name : `Jaringan Tidak Didukung (${newChainId})`,
              isCurator,
              error: net ? null : `Jaringan Chain ID ${newChainId} tidak didukung oleh aplikasi.`,
            },
          };
        });
        void get().refreshRestorationFee();
        void get().syncArchives();
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
    void get().syncArchives();
    return { success: true };
  },

  logoutWorkspace: () => {
    set({ isWorkspaceAuthenticated: false, viewMode: 'public', activePage: 'arsip' });
  },

  setActivePage: (page) => set({ activePage: page }),
  setSelectedArchiveId: (id) => set({ selectedArchiveId: id }),

  setSearchQuery: (query) => set({ searchQuery: query }),
  setCategoryFilter: (category) => set({ categoryFilter: category }),
  setStatusFilter: (status) => set({ statusFilter: status }),

  submitArchive: async (file, itemData) => {
    const nowDate = formatCurrentDate();
    const nowTs = formatCurrentTimestamp();

    const payload: Omit<ArchiveItem, 'id'> = {
      ...itemData,
      chainId: get().wallet.chainId,
      createdAt: nowDate,
      updatedAt: nowDate,
      versions: [
        {
          versionNumber: 1,
          versionType: 'original',
          label: 'Original · versi sumber',
          parentId: null,
          ipfsCid: '',
          fileHash: itemData.originalHash,
          onChainVerified: false,
          fileName: file.name,
          fileSizeBytes: file.size,
          timestamp: nowTs,
          imageUrl: '',
        },
      ],
    };

    try {
      const saved = await createSubmissionOnServer(file, payload);
      const hydrated = normalizeSubmissionMediaUrls(saved);
      set((state) => ({
        archives: [hydrated, ...state.archives.filter((a) => a.id !== hydrated.id)],
        selectedArchiveId: hydrated.id,
      }));
      return { success: true, archiveId: hydrated.id };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Gagal menyimpan pengajuan ke antrean backend.',
      };
    }
  },

  updateArchiveStatus: async (id, status, finalCategory, notes) => {
    const nowDate = formatCurrentDate();
    const target = get().archives.find((a) => a.id === id);
    const nextFinalCategory = finalCategory || target?.finalCategory || 'bangunan';
    const nextNotes = notes !== undefined ? notes : target?.curatorNotes;

    set((state) => ({
      archives: state.archives.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            status,
            finalCategory: nextFinalCategory,
            curatorNotes: nextNotes,
            updatedAt: nowDate,
          };
        }
        return item;
      }),
    }));

    if (!id.startsWith('ONCHAIN-')) {
      try {
        await patchSubmissionOnServer(id, {
          status,
          finalCategory: nextFinalCategory,
          curatorNotes: nextNotes,
          updatedAt: nowDate,
        });
      } catch {
        // Optimistic update tetap terjaga di state saat sesi berlangsung
      }
    }
  },

  updateArchiveVisibility: async (id, visibility) => {
    if (id.startsWith('ONCHAIN-')) {
      return {
        success: false,
        error:
          'Arsip hasil sinkronisasi on-chain langsung tanpa antrean backend tidak dapat diubah visibilitas katalognya.',
      };
    }

    const nowDate = formatCurrentDate();
    const isPrivate = visibility === 'private';

    try {
      const saved = await patchSubmissionOnServer(id, {
        visibility,
        isPrivate,
        updatedAt: nowDate,
      });

      const persistedPrivate = saved.visibility === 'private' || Boolean(saved.isPrivate);
      const persistedMatches =
        saved.visibility === visibility && persistedPrivate === isPrivate;
      if (!persistedMatches) {
        return {
          success: false,
          error:
            'Server backend belum menyimpan perubahan visibilitas. Silakan restart server backend (uvicorn) agar pembaruan PATCHABLE_FIELDS aktif.',
        };
      }

      set((state) => ({
        archives: state.archives.map((item) =>
          item.id === id
            ? {
                ...item,
                visibility: saved.visibility,
                isPrivate: Boolean(saved.isPrivate),
                updatedAt: saved.updatedAt || nowDate,
              }
            : item
        ),
      }));
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Gagal memperbarui visibilitas arsip di backend.',
      };
    }
  },

  requestPaidRestoration: async (id, onStage) => {
    const activeJobId = get().restoringArchiveId;
    if (activeJobId) {
      return {
        success: false,
        error: `Proses restorasi untuk arsip ${activeJobId} masih berjalan. Tunggu hingga selesai sebelum memulai transaksi baru.`,
      };
    }

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

    set({ restoringArchiveId: id, restorationStage: 'waiting_wallet' });
    const updateStage = (stage: TxStage | 'enhancing') => {
      set({ restorationStage: stage });
      onStage?.(stage);
    };

    try {
      const chainId = get().wallet.chainId;

      // 1. Kirim transaksi pembayaran ajukanRestorasi(parentId) ke kontrak & tunggu receipt
      const payResult = await submitRestorationRequest(
        chainId,
        originalVer.onChainTokenId,
        updateStage
      );

      // 2. Jalankan /enhance, hitung SHA-256, simpan ke backend storage, & perbarui state
      return await runEnhanceAndPersist(
        archive,
        originalVer,
        payResult.requestId,
        payResult.txHash,
        `${payResult.feeEth} ETH`,
        payResult.feeEth,
        false,
        updateStage,
        set
      );
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Gagal memproses pembayaran on-chain atau layanan SR.',
      };
    } finally {
      set({ restoringArchiveId: null, restorationStage: 'idle' });
    }
  },

  retryEnhanceWithExistingRequest: async (id, onStage) => {
    const activeJobId = get().restoringArchiveId;
    if (activeJobId) {
      return {
        success: false,
        error: `Proses restorasi untuk arsip ${activeJobId} masih berjalan. Tunggu hingga selesai.`,
      };
    }

    const archive = get().archives.find((a) => a.id === id);
    if (!archive) return { success: false, error: 'Arsip tidak ditemukan.' };

    const originalVer =
      archive.versions.find((v) => v.versionType === 'original') ||
      archive.versions[0];
    const derivativeVer = archive.versions.find(
      (v) => v.versionType === 'derivative'
    );

    if (!originalVer?.onChainTokenId) {
      return { success: false, error: 'Versi asli belum tercatat on-chain.' };
    }
    if (!derivativeVer?.requestId) {
      return { success: false, error: 'Tidak ditemukan Request ID pembayaran yang belum terbit.' };
    }
    if (derivativeVer.onChainTokenId) {
      return { success: false, error: 'Versi turunan ini sudah tercatat on-chain.' };
    }

    set({ restoringArchiveId: id, restorationStage: 'enhancing' });
    const updateStage = (stage: TxStage | 'enhancing') => {
      set({ restorationStage: stage });
      onStage?.(stage);
    };

    try {
      return await runEnhanceAndPersist(
        archive,
        originalVer,
        derivativeVer.requestId,
        derivativeVer.transactionHash || archive.paymentTxHash || '',
        archive.restorationFeePaid,
        undefined,
        true,
        updateStage,
        set
      );
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Gagal memproses ulang layanan SR dengan Request ID yang ada.',
      };
    } finally {
      set({ restoringArchiveId: null, restorationStage: 'idle' });
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

    const originalVer = archive.versions.find((v) => v.versionType === 'original');
    const unpublishedOriginal = originalVer && !originalVer.onChainTokenId ? originalVer : undefined;
    const unpublishedDerivative = archive.versions.find(
      (v) => v.versionType === 'derivative' && !v.onChainTokenId
    );

    const versionToPublish = unpublishedOriginal || unpublishedDerivative;
    if (!versionToPublish) {
      return {
        success: false,
        error: 'Semua versi berkas pada arsip ini sudah tercatat on-chain.',
      };
    }

    try {
      const chainId = get().wallet.chainId;
      const isDerivative = versionToPublish.versionType === 'derivative';
      const numericParentId = isDerivative
        ? originalVer?.onChainTokenId || Number(versionToPublish.parentId || 0)
        : 0;

      // 1. Pin berkas foto (original/SR PNG) ke IPFS melalui proxy backend
      onStage?.('pinning_ipfs');
      const mediaFetchUrl = resolveMediaUrl(versionToPublish.imageUrl);
      const mediaRes = await fetch(mediaFetchUrl);
      if (!mediaRes.ok) {
        throw new Error('Gagal membaca berkas media sumber untuk diunggah ke IPFS.');
      }
      const mediaBlob = await mediaRes.blob();
      const mediaFilename =
        versionToPublish.fileName ||
        `${archive.id}_${isDerivative ? 'sr_x4' : 'original'}.png`;
      const mediaPin = await pinFileToIpfs(mediaBlob, mediaFilename);

      // 2. Pin metadata.json yang merujuk media URI IPFS nyata
      const metadataPayload = {
        name: `${archive.title} (${isDerivative ? 'Super-Resolution x4' : 'Original'})`,
        title: archive.title,
        description: archive.curatorNotes || archive.source,
        image: mediaPin.uri,
        category_final: archive.finalCategory,
        ai_category: archive.aiPrediction.category,
        ai_confidence: archive.aiPrediction.confidence,
        ai_scores: archive.aiPrediction.scores || null,
        ai_model_version: archive.aiPrediction.modelVersion || null,
        creator: archive.creator,
        source: archive.source,
        source_ref: archive.sourceRef || null,
        license: archive.licenseInfo,
        file_hash_sha256: versionToPublish.fileHash,
        parent_id: numericParentId,
        request_id: versionToPublish.requestId || null,
        method: versionToPublish.methodLabel || null,
      };
      const metaPin = await pinMetadataToIpfs(
        metadataPayload,
        `${archive.id}_v${versionToPublish.versionNumber}_metadata.json`
      );

      // 3. Panggil kontrak ArsipFotoVersi (terbitkanVersi atau terbitkanVersiRestorasi)
      const txRes = await publishVersionOnChain({
        chainId,
        to: archive.recipientAddress || undefined,
        uri: metaPin.uri,
        fileHash: versionToPublish.fileHash,
        parentId: numericParentId,
        requestId: versionToPublish.requestId,
        onStage,
      });

      const nowDate = formatCurrentDate();
      const ipfsResolvedUrl = resolveIpfsUrl(mediaPin.uri);

      const updateVersionsForStorage = (vers: ArchiveVersion[], useResolvedUrl: boolean) =>
        vers.map((ver) =>
          ver.versionNumber === versionToPublish.versionNumber
            ? {
                ...ver,
                label:
                  ver.versionType === 'original'
                    ? `Asli / Token #${txRes.tokenId}`
                    : `Super-Resolution x4 / Token #${txRes.tokenId}`,
                onChainTokenId: txRes.tokenId,
                transactionHash: txRes.txHash,
                metadataUri: metaPin.uri,
                mediaCid: mediaPin.cid,
                ipfsCid: mediaPin.cid,
                ownerAddress: txRes.recipient,
                publisherAddress: txRes.publisher,
                onChainVerified: true,
                imageUrl: useResolvedUrl ? ipfsResolvedUrl : mediaPin.uri,
              }
            : ver
        );

      const newOriginalCid = !isDerivative ? mediaPin.cid : archive.originalCid;

      set((state) => ({
        archives: state.archives.map((item) => {
          if (item.id !== archiveId) return item;
          return {
            ...item,
            status: 'tercatat' as ArchiveStatus,
            originalCid: newOriginalCid,
            chainId,
            versions: updateVersionsForStorage(item.versions, true),
            updatedAt: nowDate,
          };
        }),
      }));

      if (!archiveId.startsWith('ONCHAIN-')) {
        try {
          await patchSubmissionOnServer(archiveId, {
            status: 'tercatat',
            originalCid: newOriginalCid,
            chainId,
            versions: updateVersionsForStorage(archive.versions, false),
            updatedAt: nowDate,
          });
        } catch {
          // State on-chain tetap tersinkronisasi dari smart contract
        }
      }

      return {
        success: true,
        txHash: txRes.txHash,
        tokenId: txRes.tokenId,
        gasUsed: txRes.gasUsed,
        mediaCid: mediaPin.cid,
        metadataUri: metaPin.uri,
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
      void get().syncArchives();
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
      viewMode:
        state.viewMode === 'workspace' || state.viewMode === 'contributor'
          ? 'public'
          : state.viewMode,
      activePage:
        state.viewMode === 'workspace' || state.viewMode === 'contributor'
          ? 'arsip'
          : state.activePage,
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
      void get().syncArchives();
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
}));
