import React, { useState } from 'react';
import { Search, ShieldCheck, Loader2, ArrowUpRight, Lock } from 'lucide-react';
import { useArchiveStore } from '../store/useArchiveStore';
import { NETWORKS } from '../config/networks';
import {
  OnChainTokenRecord,
  checkHashUsedOnChain,
  fetchVersiOnChain,
  normalizeHexHash,
} from '../lib/contract';
import { truncateIdentifier } from '../lib/hash';
import { FooterDisclaimer } from '../components/FooterDisclaimer';

export const VerificationPage: React.FC = () => {
  const {
    archives,
    selectedArchiveId,
    setSelectedArchiveId,
    wallet,
    connectWallet,
    publishToBlockchain,
    viewMode,
    isWorkspaceAuthenticated,
  } = useArchiveStore();
  const isPublicMode = viewMode === 'public';

  const [searchInput, setSearchInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [directTokenRecord, setDirectTokenRecord] = useState<OnChainTokenRecord | null>(null);
  const [hashOnChainStatus, setHashOnChainStatus] = useState<{
    hash: string;
    used: boolean;
  } | null>(null);
  const [searchFeedback, setSearchFeedback] = useState<string | null>(null);

  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStep, setPublishStep] = useState<number>(1);
  const [txReceipt, setTxReceipt] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  const trimmedQuery = searchInput.trim().toLowerCase();
  const matchedArchive =
    archives.find(
      (a) =>
        a.id.toLowerCase() === trimmedQuery ||
        normalizeHexHash(a.originalHash) === normalizeHexHash(trimmedQuery) ||
        a.versions.some(
          (v) =>
            v.transactionHash?.toLowerCase() === trimmedQuery ||
            (trimmedQuery.replace(/^#/, '').match(/^\d+$/) &&
              v.onChainTokenId === Number(trimmedQuery.replace(/^#/, '')))
        )
    ) ||
    archives.find((a) => a.id === selectedArchiveId) ||
    archives[0];

  const activeArchive = matchedArchive;
  const originalVersion =
    activeArchive?.versions.find((v) => v.versionType === 'original') ||
    activeArchive?.versions[0];
  const isRecorded = Boolean(directTokenRecord || activeArchive?.status === 'tercatat');
  const activeNet = NETWORKS[wallet.chainId];

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = searchInput.trim();
    if (!raw) return;

    setIsSearching(true);
    setDirectTokenRecord(null);
    setHashOnChainStatus(null);
    setSearchFeedback(null);

    const lower = raw.toLowerCase();
    const localFound = archives.find(
      (a) =>
        a.id.toLowerCase() === lower ||
        normalizeHexHash(a.originalHash) === normalizeHexHash(lower) ||
        a.versions.some(
          (v) =>
            v.transactionHash?.toLowerCase() === lower ||
            (lower.replace(/^#/, '').match(/^\d+$/) &&
              v.onChainTokenId === Number(lower.replace(/^#/, '')))
        )
    );
    if (localFound) {
      setSelectedArchiveId(localFound.id);
    }

    // Jika input angka Token ID (mis. "1" atau "#1"), kueri langsung ke smart contract
    const tokenNumMatch = raw.match(/^#?(\d+)$/);
    if (tokenNumMatch) {
      const tokenId = Number(tokenNumMatch[1]);
      if (tokenId > 0) {
        try {
          const rec = await fetchVersiOnChain(wallet.chainId, tokenId);
          setDirectTokenRecord(rec);
          setSearchFeedback(
            `Token #${tokenId} ditemukan langsung di kontrak ${activeNet?.name || wallet.chainId}.`
          );
        } catch (err) {
          setSearchFeedback(
            err instanceof Error
              ? `Gagal membaca Token #${tokenId} dari kontrak: ${err.message}`
              : `Token #${tokenId} belum terdaftar pada kontrak.`
          );
        }
      }
      setIsSearching(false);
      return;
    }

    // Jika input hash SHA-256 (64 hex), periksa ke mapping hashTerpakai di kontrak
    const hexClean = normalizeHexHash(raw);
    if (/^[0-9a-f]{64}$/.test(hexClean)) {
      try {
        const used = await checkHashUsedOnChain(wallet.chainId, hexClean);
        setHashOnChainStatus({ hash: hexClean, used });
        setSearchFeedback(
          used
            ? `Hash SHA-256 ${truncateIdentifier(hexClean, 10, 8)} tercatat TERPAKAI on-chain (hashTerpakai == true).`
            : `Hash SHA-256 ${truncateIdentifier(hexClean, 10, 8)} belum pernah dicatat on-chain.`
        );
      } catch (err) {
        setSearchFeedback(
          err instanceof Error
            ? `Gagal mengecek hash ke kontrak: ${err.message}`
            : 'RPC blockchain tidak dapat dijangkau.'
        );
      }
      setIsSearching(false);
      return;
    }

    if (!localFound) {
      setSearchFeedback('Tidak ditemukan arsip yang cocok pada antrean ataupun state tersinkronisasi.');
    }
    setIsSearching(false);
  };

  const handlePublish = async () => {
    if (!activeArchive) return;
    setIsPublishing(true);
    setPublishError(null);
    setPublishStep(1);

    const res = await publishToBlockchain(activeArchive.id, (stage) => {
      if (stage === 'pinning_ipfs' || stage === 'waiting_wallet') setPublishStep(1);
      if (stage === 'waiting_confirmation') setPublishStep(2);
    });

    setIsPublishing(false);
    if (res.success) {
      setPublishStep(3);
      setTxReceipt(res.txHash || null);
    } else {
      setPublishError(res.error || 'Transaksi on-chain ditolak atau gagal.');
    }
  };

  const displayedTokenId = directTokenRecord
    ? `#${directTokenRecord.tokenId}`
    : originalVersion?.onChainTokenId
    ? `#${originalVersion.onChainTokenId}`
    : 'Belum tersedia';

  const displayedParentId = directTokenRecord
    ? directTokenRecord.parentId === 0
      ? '0 (Versi Original)'
      : `#${directTokenRecord.parentId}`
    : originalVersion?.parentId ?? '0 (Versi Original)';

  const displayedOwner = directTokenRecord
    ? directTokenRecord.owner
    : originalVersion?.ownerAddress || (isRecorded ? activeArchive?.recipientAddress : '') || 'Belum tersedia';

  const displayedPublisher = directTokenRecord
    ? `${truncateIdentifier(directTokenRecord.publisher, 6, 4)} · ${new Date(
        directTokenRecord.publishedAt * 1000
      ).toLocaleString('id-ID')}`
    : originalVersion?.publisherAddress
    ? `${truncateIdentifier(originalVersion.publisherAddress, 6, 4)} · ${originalVersion.timestamp}`
    : isRecorded
    ? activeArchive?.updatedAt || 'Tercatat'
    : 'Belum tersedia';

  const displayedMetadataUri = directTokenRecord
    ? directTokenRecord.tokenUri
    : originalVersion?.metadataUri || 'Belum dipin ke IPFS';

  const displayedMediaCid =
    originalVersion?.mediaCid || originalVersion?.ipfsCid || 'Belum dipin ke IPFS';

  const displayedHash = directTokenRecord
    ? normalizeHexHash(directTokenRecord.fileHash)
    : originalVersion?.fileHash || 'Belum tersedia';

  const displayedTxHash =
    originalVersion?.transactionHash || txReceipt || 'Belum tersedia';

  const userAddrLower = wallet.address ? wallet.address.toLowerCase() : '';
  const ownerAddrLower = (
    directTokenRecord?.owner ||
    originalVersion?.ownerAddress ||
    activeArchive?.recipientAddress ||
    ''
  ).toLowerCase();
  const isAuthorized =
    !isPublicMode ||
    wallet.isCurator ||
    Boolean(userAddrLower && ownerAddrLower && userAddrLower === ownerAddrLower);

  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <p className="text-xs font-mono font-medium tracking-wider text-ink-muted uppercase">
          {isPublicMode ? 'PORTAL PUBLIK · VERIFIKASI TERBUKA' : 'WORKSPACE · AUDIT ON-CHAIN & NODE'}
        </p>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-ink leading-tight max-w-4xl">
          {isPublicMode
            ? 'Verifikasi integritas hash SHA-256 berkas dan pencatatan token on-chain.'
            : 'Periksa state kontrak, kepemilikan token, receipt transaksi, metadata IPFS, dan integritas berkas.'}
        </h1>
      </div>

      {/* Search Bar */}
      <form onSubmit={(e) => void handleSearch(e)} className="bg-surface border border-border rounded-card p-4 space-y-2 shadow-subtle">
        <label htmlFor="tx-search-input" className="text-[11px] font-mono text-ink-muted uppercase tracking-wider">
          CARI ARSIP / TOKEN ID ON-CHAIN (#1) / SHA-256 / TRANSACTION HASH
        </label>
        <div className="flex gap-2">
          <input
            id="tx-search-input"
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Masukkan ID arsip (SR-0001), Token ID (#1), hash SHA-256 (64 hex), atau txHash..."
            className="flex-1 px-3.5 py-2.5 rounded-btn bg-paper/60 border border-border text-xs text-ink focus:border-forest outline-none min-h-[44px]"
          />
          <button
            type="submit"
            disabled={isSearching}
            className="px-5 py-2.5 rounded-btn bg-forest hover:bg-forest-hover text-surface text-xs font-semibold shadow-subtle min-h-[44px] flex items-center gap-1.5"
          >
            {isSearching ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Search className="w-3.5 h-3.5" />
            )}
            <span>Verifikasi</span>
          </button>
        </div>

        {searchFeedback && (
          <div
            className={`mt-2 p-2.5 rounded-btn text-xs font-mono border ${
              hashOnChainStatus && !hashOnChainStatus.used
                ? 'bg-status-warningBg border-border text-status-warning'
                : 'bg-sage border-sage-border text-forest'
            }`}
          >
            {searchFeedback}
          </div>
        )}
      </form>

      {/* Top 3 Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface border border-border rounded-card p-5 space-y-1.5 shadow-subtle">
          <p className="text-[11px] font-mono text-ink-muted">Jaringan terpilih</p>
          <p className="text-2xl font-display font-bold text-ink">{wallet.chainName}</p>
          <p className="text-[11px] font-mono text-ink-muted">
            Chain ID: {wallet.chainId} · {activeNet?.contractAddress ? truncateIdentifier(activeNet.contractAddress, 6, 4) : 'Belum dikonfigurasi'}
          </p>
        </div>

        <div className="bg-surface border border-border rounded-card p-5 space-y-2 shadow-subtle">
          <p className="text-[11px] font-mono text-ink-muted">Wallet aktif</p>
          <p className="text-sm font-mono font-medium text-ink select-all break-all">
            {wallet.address ? truncateIdentifier(wallet.address, 8, 6) : 'Belum terhubung'}
          </p>
          <button
            type="button"
            onClick={connectWallet}
            className="text-xs font-semibold text-forest underline hover:text-forest-hover text-left"
          >
            {wallet.isConnected ? 'Sinkronkan ulang wallet' : 'Hubungkan MetaMask'}
          </button>
        </div>

        <div className="bg-surface border border-border rounded-card p-5 space-y-1.5 shadow-subtle">
          <p className="text-[11px] font-mono text-ink-muted">Status objek diverifikasi</p>
          <p className="text-2xl font-display font-bold text-ink">
            {isRecorded ? 'Tercatat' : activeArchive ? 'Belum diterbitkan' : 'Siap Kueri'}
          </p>
          <p className="text-[11px] font-mono text-ink-muted">
            {isRecorded
              ? 'Receipt / state on-chain terkonfirmasi'
              : activeArchive
              ? 'Menunggu kurasi & publikasi'
              : 'Masukkan Token ID atau SHA-256'}
          </p>
        </div>
      </div>

      {/* Status Transaksi Stepper */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-display font-bold text-ink">Status transaksi</h2>
          <span className="text-xs font-mono text-ink-muted">Sukses hanya setelah receipt sukses</span>
        </div>

        <div className="bg-surface border border-border rounded-card p-6 space-y-6 shadow-subtle">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-semibold flex-shrink-0 mt-0.5 ${
                  isRecorded || (isPublishing && publishStep > 1)
                    ? 'bg-sage text-forest'
                    : isPublishing && publishStep === 1
                    ? 'bg-forest text-surface'
                    : 'bg-paper text-ink-muted border border-border'
                }`}
              >
                1
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">Pin IPFS &amp; tanda tangan</p>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Media &amp; metadata dipin lalu MetaMask meminta persetujuan kurator.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-semibold flex-shrink-0 mt-0.5 ${
                  isRecorded || (isPublishing && publishStep > 2)
                    ? 'bg-sage text-forest'
                    : isPublishing && publishStep === 2
                    ? 'bg-forest text-surface'
                    : 'bg-paper text-ink-muted border border-border'
                }`}
              >
                2
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">Menunggu konfirmasi</p>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Transaksi telah dikirim dan menunggu receipt blok.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-semibold flex-shrink-0 mt-0.5 ${
                  isRecorded
                    ? 'bg-sage text-forest'
                    : 'bg-paper text-ink-muted border border-border'
                }`}
              >
                3
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">Tercatat / Gagal</p>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Status ditentukan berdasarkan receipt dan state smart contract.
                </p>
              </div>
            </div>
          </div>

          {activeArchive && !isRecorded && (
            <div className="pt-4 border-t border-border/80 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-ink">
                  Arsip aktif: {activeArchive.id} ({activeArchive.title})
                </p>
                <p className="text-xs text-ink-muted">
                  Status: {activeArchive.status}.{' '}
                  {isPublicMode
                    ? 'Verifikasi publik membaca catatan kriptografis terbuka.'
                    : 'Pin metadata ke IPFS dan cetak token versi ERC-721.'}
                </p>
              </div>
              {!isPublicMode && isWorkspaceAuthenticated ? (
                <button
                  type="button"
                  disabled={isPublishing}
                  onClick={() => void handlePublish()}
                  className="px-5 py-2.5 rounded-btn bg-forest hover:bg-forest-hover text-surface text-xs font-semibold shadow-subtle min-h-[44px] flex items-center gap-2"
                >
                  {isPublishing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Memproses IPFS &amp; blockchain...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Pin IPFS &amp; Publikasikan</span>
                    </>
                  )}
                </button>
              ) : (
                <span className="px-3 py-1.5 rounded-btn bg-paper border border-border text-xs font-mono text-ink-muted">
                  Audit Terbuka · Minting dilakukan melalui Workspace Kurator
                </span>
              )}
            </div>
          )}

          {publishError && (
            <div className="p-3.5 rounded-btn bg-status-dangerBg border border-border text-xs text-status-danger leading-relaxed">
              {publishError}
            </div>
          )}

          <div className="p-3.5 rounded-btn bg-status-warningBg border border-border text-xs text-status-warning leading-relaxed">
            Tangani akun berganti, jaringan salah, wallet ditolak, transaksi gagal, dan akun tidak memiliki peran kurator. Jangan menganggap CID atau prediksi AI sebagai bukti keaslian.
          </div>
        </div>
      </section>

      {/* Detail Versi dan Receipt */}
      <section className="space-y-4">
        <h2 className="text-xl font-display font-bold text-ink">Detail versi dan receipt</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div className="bg-surface border border-border rounded-card p-6 space-y-4 shadow-subtle">
            <h3 className="text-xs font-mono font-semibold tracking-wider text-ink-muted uppercase">
              ERC-721 · TOKEN PER VERSI
            </h3>

            <div className="space-y-3 font-mono text-xs">
              <div className="space-y-1">
                <span className="text-ink-muted font-sans">Token ID</span>
                <div className="p-2.5 rounded-btn bg-paper border border-border text-ink">
                  {displayedTokenId}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-ink-muted font-sans">Parent ID</span>
                <div className="p-2.5 rounded-btn bg-paper border border-border text-ink">
                  {displayedParentId}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-ink-muted font-sans">Pemilik token (ownerOf)</span>
                <div className="p-2.5 rounded-btn bg-paper border border-border text-ink select-all break-all">
                  {displayedOwner}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-ink-muted font-sans">Penerbit (publisher) / waktu</span>
                <div className="p-2.5 rounded-btn bg-paper border border-border text-ink">
                  {displayedPublisher}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-card p-6 space-y-4 shadow-subtle">
            <h3 className="text-xs font-mono font-semibold tracking-wider text-ink-muted uppercase">
              IPFS DAN INTEGRITAS
            </h3>

            <div className="space-y-3 font-mono text-xs">
              <div className="space-y-1">
                <span className="text-ink-muted font-sans">Metadata URI (`tokenURI`)</span>
                <div className="p-2.5 rounded-btn bg-paper border border-border text-ink select-all break-all">
                  {displayedMetadataUri}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-ink-muted font-sans">Media CID</span>
                <div className="p-2.5 rounded-btn bg-paper border border-border text-ink select-all break-all">
                  {displayedMediaCid}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-ink-muted font-sans">SHA-256 file</span>
                <div className="p-2.5 rounded-btn bg-paper border border-border text-ink select-all break-all">
                  {displayedHash}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-ink-muted font-sans">Transaction hash / receipt</span>
                  {isAuthorized ? (
                    activeNet?.explorerUrl &&
                    displayedTxHash.startsWith('0x') && (
                      <a
                        href={`${activeNet.explorerUrl}/tx/${displayedTxHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-forest hover:underline"
                      >
                        <span>Explorer</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </a>
                    )
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-status-warning bg-status-warningBg px-2 py-0.5 rounded-btn">
                      <Lock className="w-2.5 h-2.5" />
                      <span>Diproteksi</span>
                    </span>
                  )}
                </div>
                <div className="p-2.5 rounded-btn bg-paper border border-border text-ink select-all break-all">
                  {isAuthorized
                    ? displayedTxHash
                    : displayedTxHash.startsWith('0x')
                    ? `${displayedTxHash.slice(0, 10)}... [Diproteksi · Hanya Pemilik Token / Kurator]`
                    : displayedTxHash}
                </div>
                {!isAuthorized && displayedTxHash.startsWith('0x') && (
                  <p className="text-[10px] font-mono text-ink-muted leading-relaxed pt-0.5">
                    🔒 Bukti transaksi on-chain dirahasiakan untuk privasi pengunggah. Hubungkan wallet pemilik token atau masuk sebagai kurator untuk melihat receipt lengkap.
                  </p>
                )}
                {isAuthorized && displayedTxHash.startsWith('0x') && isPublicMode && (
                  <p className="text-[10px] font-mono text-forest leading-relaxed pt-0.5">
                    🔓 Akses Terverifikasi: Anda terhubung sebagai {wallet.isCurator ? 'Kurator Resmi' : 'Pemilik Token Sah'}. Bukti transaksi lengkap dibuka.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-ink-muted font-mono pt-1">
          CID mengidentifikasi konten IPFS; SHA-256 adalah hash berkas yang dicatat permanen pada struct Versi di smart contract.
        </p>
      </section>

      <FooterDisclaimer />
    </div>
  );
};
