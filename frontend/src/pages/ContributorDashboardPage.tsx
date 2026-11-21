import React, { useState, useEffect } from 'react';
import {
  User,
  Upload,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Eye,
  Lock,
  Globe,
  Wallet,
  Plus,
} from 'lucide-react';
import { useArchiveStore } from '../store/useArchiveStore';
import { NETWORKS } from '../config/networks';
import { truncateIdentifier } from '../lib/hash';
import { resolveMediaUrl } from '../lib/api';
import { FooterDisclaimer } from '../components/FooterDisclaimer';
import { ArchiveItem } from '../types';

export const ContributorDashboardPage: React.FC = () => {
  const {
    archives,
    wallet,
    connectWallet,
    setActivePage,
    setSelectedArchiveId,
    syncArchives,
    isSyncingArchives,
    requestPaidRestoration,
    restorationFeeEth,
    refreshRestorationFee,
  } = useArchiveStore();

  const [activeTab, setActiveTab] = useState<'semua' | 'menunggu' | 'tercatat' | 'privat'>('semua');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);
  const [restoringItemId, setRestoringItemId] = useState<string | null>(null);

  const activeNet = NETWORKS[wallet.chainId];

  useEffect(() => {
    void refreshRestorationFee();
  }, [refreshRestorationFee, wallet.chainId]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Filter archives belonging to this wallet (either uploader/recipient or creator address match)
  const userAddressLower = wallet.address ? wallet.address.toLowerCase() : '';
  const myArchives = archives.filter((item) => {
    if (!userAddressLower) return false;
    const recipient = (item.recipientAddress || '').toLowerCase();
    const origOwner = (item.versions[0]?.ownerAddress || '').toLowerCase();
    return recipient === userAddressLower || origOwner === userAddressLower;
  });

  const waitingCount = myArchives.filter(
    (a) => a.status === 'menunggu_tinjauan' || a.status === 'perlu_koreksi'
  ).length;
  const recordedCount = myArchives.filter((a) => a.status === 'tercatat').length;
  const privateCount = myArchives.filter(
    (a) => a.visibility === 'private' || a.isPrivate
  ).length;

  const displayedArchives = myArchives.filter((item) => {
    if (activeTab === 'menunggu') {
      return item.status === 'menunggu_tinjauan' || item.status === 'perlu_koreksi';
    }
    if (activeTab === 'tercatat') {
      return item.status === 'tercatat';
    }
    if (activeTab === 'privat') {
      return item.visibility === 'private' || item.isPrivate;
    }
    return true;
  });

  const handleRestoreClick = async (item: ArchiveItem) => {
    setActionErrorMsg(null);
    setActionSuccessMsg(null);
    setRestoringItemId(item.id);

    try {
      const res = await requestPaidRestoration(item.id);
      if (res.success) {
        setActionSuccessMsg(
          `Pembayaran 0.01 ETH berhasil & model Real-ESRGAN x4 selesai! Versi restorasi turunan telah ditambahkan ke arsip ${item.id}.`
        );
      } else {
        setActionErrorMsg(res.error || 'Gagal memproses restorasi.');
      }
    } catch (err) {
      setActionErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan sistem.');
    } finally {
      setRestoringItemId(null);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-1 border-b border-border/60 pb-5">
        <div className="space-y-1">
          <p className="text-[11px] font-mono font-medium tracking-wider text-ink-muted uppercase">
            PORTAL KONTRIBUTOR / PEMOHON
          </p>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink tracking-tight">
            Dashboard Pemohon
          </h1>
          <p className="text-xs text-ink-muted font-sans max-w-2xl leading-relaxed">
            Pantau status verifikasi pengajuan foto Anda, kelola arsip pribadi, dan simpan bukti transaksi blockchain resmi secara aman.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => void syncArchives()}
            disabled={isSyncingArchives}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-btn bg-surface hover:bg-paper border border-border text-ink text-xs font-mono shadow-subtle min-h-[38px] transition-colors"
            title="Sinkronkan data arsip"
          >
            <RotateCw className={`w-3.5 h-3.5 text-forest ${isSyncingArchives ? 'animate-spin' : ''}`} />
            <span>{isSyncingArchives ? 'Sinkronisasi...' : 'Sinkronkan'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePage('unggah')}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-btn bg-forest hover:bg-forest-hover text-surface text-xs font-semibold shadow-subtle min-h-[38px] transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Unggah Foto Baru</span>
          </button>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="p-4 rounded-btn bg-sage border border-sage-border text-xs text-forest flex items-start gap-2 shadow-subtle">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed font-sans">{actionSuccessMsg}</p>
        </div>
      )}

      {actionErrorMsg && (
        <div className="p-4 rounded-btn bg-status-dangerBg border border-border text-xs text-status-danger flex items-start gap-2 shadow-subtle">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed font-sans">{actionErrorMsg}</p>
        </div>
      )}

      {/* Wallet Status & Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Wallet Profile Card */}
        <div className="bg-surface border border-border rounded-card p-5 space-y-2 shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-ink-muted">Akun Pemohon</span>
            <span className="w-2 h-2 rounded-full bg-forest animate-pulse" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-mono font-bold text-ink break-all select-all">
              {wallet.address ? truncateIdentifier(wallet.address, 6, 6) : 'Belum terhubung'}
            </p>
            <p className="text-[11px] font-mono text-ink-muted">
              {wallet.chainName} ({wallet.chainId})
            </p>
          </div>
          {wallet.address && (
            <button
              type="button"
              onClick={() => handleCopy(wallet.address || '', 'wallet')}
              className="inline-flex items-center gap-1 text-[11px] font-mono text-forest hover:underline"
            >
              {copiedKey === 'wallet' ? <Check className="w-3 h-3 text-forest" /> : <Copy className="w-3 h-3" />}
              <span>{copiedKey === 'wallet' ? 'Disalin' : 'Salin alamat'}</span>
            </button>
          )}
        </div>

        {/* Stat 1: Total Pengajuan */}
        <div className="bg-surface border border-border rounded-card p-5 space-y-1 shadow-subtle">
          <p className="text-[11px] font-mono text-ink-muted">Total Pengajuan Saya</p>
          <p className="text-3xl font-display font-bold text-ink">{myArchives.length}</p>
          <p className="text-[11px] font-mono text-ink-muted">Tercatat di server backend</p>
        </div>

        {/* Stat 2: Menunggu Kurasi */}
        <div className="bg-surface border border-border rounded-card p-5 space-y-1 shadow-subtle">
          <p className="text-[11px] font-mono text-ink-muted">Menunggu Kurasi</p>
          <p className="text-3xl font-display font-bold text-status-warning">{waitingCount}</p>
          <p className="text-[11px] font-mono text-ink-muted">Dalam antrean kurator</p>
        </div>

        {/* Stat 3: Tercatat On-Chain */}
        <div className="bg-surface border border-border rounded-card p-5 space-y-1 shadow-subtle">
          <p className="text-[11px] font-mono text-ink-muted">Tercatat On-Chain</p>
          <p className="text-3xl font-display font-bold text-forest">{recordedCount}</p>
          <p className="text-[11px] font-mono text-ink-muted">Token ERC-721 aktif</p>
        </div>
      </div>

      {/* Tabs Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('semua')}
            className={`px-3 py-1.5 rounded-btn text-xs font-mono transition-colors ${
              activeTab === 'semua'
                ? 'bg-forest text-surface font-semibold shadow-subtle'
                : 'bg-surface hover:bg-paper border border-border text-ink'
            }`}
          >
            Semua ({myArchives.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('menunggu')}
            className={`px-3 py-1.5 rounded-btn text-xs font-mono transition-colors ${
              activeTab === 'menunggu'
                ? 'bg-forest text-surface font-semibold shadow-subtle'
                : 'bg-surface hover:bg-paper border border-border text-ink'
            }`}
          >
            Menunggu Kurasi ({waitingCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tercatat')}
            className={`px-3 py-1.5 rounded-btn text-xs font-mono transition-colors ${
              activeTab === 'tercatat'
                ? 'bg-forest text-surface font-semibold shadow-subtle'
                : 'bg-surface hover:bg-paper border border-border text-ink'
            }`}
          >
            Tercatat On-Chain ({recordedCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('privat')}
            className={`px-3 py-1.5 rounded-btn text-xs font-mono transition-colors ${
              activeTab === 'privat'
                ? 'bg-forest text-surface font-semibold shadow-subtle'
                : 'bg-surface hover:bg-paper border border-border text-ink'
            }`}
          >
            Kenangan Pribadi ({privateCount})
          </button>
        </div>

        <p className="text-xs font-mono text-ink-muted">
          Menampilkan {displayedArchives.length} dari {myArchives.length} pengajuan
        </p>
      </div>

      {/* Not Connected State */}
      {!wallet.isConnected && (
        <div className="bg-surface border border-border rounded-card p-10 max-w-lg mx-auto text-center space-y-4 my-8 shadow-card">
          <div className="w-12 h-12 rounded-full bg-forest/10 text-forest flex items-center justify-center mx-auto">
            <Wallet className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-display font-bold text-ink">Hubungkan Wallet Pemohon</h2>
            <p className="text-xs text-ink-muted leading-relaxed">
              Hubungkan MetaMask untuk melihat daftar foto yang Anda ajukan, mengakses tanda bukti transaksi resmi, dan meminta restorasi foto pribadi.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void connectWallet()}
            className="px-6 py-2.5 rounded-btn bg-forest hover:bg-forest-hover text-surface text-xs font-bold shadow-subtle transition-colors"
          >
            Hubungkan MetaMask Sekarang
          </button>
        </div>
      )}

      {/* Empty Submissions State */}
      {wallet.isConnected && myArchives.length === 0 && (
        <div className="bg-surface border border-border rounded-card p-12 text-center space-y-4 my-6 shadow-subtle">
          <div className="w-14 h-14 rounded-full bg-paper border border-border text-ink-muted flex items-center justify-center mx-auto">
            <User className="w-7 h-7 stroke-[1.5]" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-lg font-display font-bold text-ink">Belum Ada Pengajuan Foto</h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              Anda belum pernah mengajukan arsip foto menggunakan alamat wallet ini. Anda dapat mengunggah foto arsip sejarah maupun foto kenangan keluarga pribadi.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setActivePage('unggah')}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-btn bg-gold hover:bg-gold-hover text-ink text-xs font-bold shadow-subtle transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span>Unggah Foto Pertama Anda</span>
            </button>
          </div>
        </div>
      )}

      {/* Submissions List */}
      {wallet.isConnected && displayedArchives.length > 0 && (
        <div className="space-y-6">
          {displayedArchives.map((item) => {
            const v0 = item.versions.find((v) => v.versionType === 'original') || item.versions[0];
            const vDeriv = item.versions.find((v) => v.versionType === 'derivative');
            const isRecorded = item.status === 'tercatat' && Boolean(v0?.onChainTokenId);
            const isPrivate = item.visibility === 'private' || item.isPrivate;
            const imgSrc = v0?.imageUrl ? resolveMediaUrl(v0.imageUrl) : '';

            return (
              <div
                key={item.id}
                className="bg-surface border border-border rounded-card overflow-hidden shadow-subtle hover:border-forest/40 transition-colors"
              >
                <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Image Preview */}
                  <div className="lg:col-span-4 space-y-3">
                    <div className="h-56 w-full rounded-btn overflow-hidden bg-paper border border-border relative flex items-center justify-center">
                      {imgSrc ? (
                        <img
                          src={imgSrc}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-mono text-ink-muted">Pratinjau gambar</span>
                      )}

                      {/* Status Overlay Badge */}
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-btn text-[10px] font-mono font-bold uppercase bg-surface/90 border border-border shadow-subtle">
                          {item.id}
                        </span>
                        {isPrivate ? (
                          <span className="px-2 py-0.5 rounded-btn text-[10px] font-mono font-bold bg-ink text-surface flex items-center gap-1 shadow-subtle">
                            <Lock className="w-2.5 h-2.5" />
                            <span>Privat</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-btn text-[10px] font-mono font-bold bg-forest text-surface flex items-center gap-1 shadow-subtle">
                            <Globe className="w-2.5 h-2.5" />
                            <span>Publik</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono text-ink-muted">
                      <span>Kategori: {item.finalCategory || item.initialCategory}</span>
                      <span>{v0?.dimensions || ''}</span>
                    </div>
                  </div>

                  {/* Middle & Right Column: Details, Status, & Transaction Receipts */}
                  <div className="lg:col-span-8 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h2 className="text-xl font-display font-bold text-ink">{item.title}</h2>
                          <p className="text-xs font-mono text-ink-muted">
                            Kredit: {item.creator} · Sumber: {item.source} · Lisensi: {item.licenseInfo}
                          </p>
                        </div>

                        <span
                          className={`px-3 py-1 rounded-btn text-xs font-mono font-bold ${
                            isRecorded
                              ? 'bg-sage text-forest'
                              : item.status === 'perlu_koreksi'
                              ? 'bg-status-warningBg text-status-warning'
                              : 'bg-paper border border-border text-ink'
                          }`}
                        >
                          {isRecorded
                            ? `Tercatat di Sepolia · Token #${v0?.onChainTokenId}`
                            : item.status === 'perlu_koreksi'
                            ? 'Perlu Koreksi Kurator'
                            : 'Menunggu Kurasi'}
                        </span>
                      </div>

                      {/* Official Transaction Receipts Box (Private & Exclusive to Pemohon) */}
                      <div className="p-4 rounded-btn bg-paper/70 border border-border/80 space-y-3 font-mono text-xs">
                        <div className="flex items-center justify-between pb-1.5 border-b border-border/60">
                          <span className="font-sans font-semibold text-ink text-xs flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-forest" />
                            <span>Bukti Transaksi Resmi (Hanya Pemilik)</span>
                          </span>
                          <span className="text-[10px] text-forest font-bold">Terotentikasi Wallet</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                          {/* Token ID */}
                          <div className="space-y-0.5">
                            <span className="text-ink-muted font-sans text-[10px]">Token ID On-Chain:</span>
                            <p className="text-ink font-bold">
                              {v0?.onChainTokenId ? `#${v0.onChainTokenId}` : 'Belum diterbitkan'}
                            </p>
                          </div>

                          {/* SHA-256 File */}
                          <div className="space-y-0.5">
                            <span className="text-ink-muted font-sans text-[10px]">SHA-256 Berkas:</span>
                            <div className="flex items-center justify-between">
                              <span className="text-ink truncate max-w-[150px]">
                                {truncateIdentifier(v0?.fileHash || item.originalHash, 8, 6)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(v0?.fileHash || item.originalHash, `hash-${item.id}`)}
                                className="text-ink-muted hover:text-forest p-0.5"
                                title="Salin hash SHA-256"
                              >
                                {copiedKey === `hash-${item.id}` ? (
                                  <Check className="w-3 h-3 text-forest" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Minting Tx Hash */}
                          <div className="space-y-0.5">
                            <span className="text-ink-muted font-sans text-[10px]">Tx Hash Minting ERC-721:</span>
                            <div className="flex items-center justify-between">
                              <span className="text-ink truncate max-w-[150px]">
                                {v0?.transactionHash
                                  ? truncateIdentifier(v0.transactionHash, 8, 6)
                                  : 'Menunggu tanda tangan kurator'}
                              </span>
                              {v0?.transactionHash && (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(v0.transactionHash || '', `mint-${item.id}`)}
                                    className="text-ink-muted hover:text-forest p-0.5"
                                    title="Salin Tx Hash Minting"
                                  >
                                    {copiedKey === `mint-${item.id}` ? (
                                      <Check className="w-3 h-3 text-forest" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                  {activeNet?.explorerUrl && v0.transactionHash.startsWith('0x') && (
                                    <a
                                      href={`${activeNet.explorerUrl}/tx/${v0.transactionHash}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-forest hover:underline"
                                      title="Buka di Sepolia Etherscan"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Restoration Payment Tx Hash */}
                          <div className="space-y-0.5">
                            <span className="text-ink-muted font-sans text-[10px]">Tx Hash Bayar Restorasi (0.01 ETH):</span>
                            <div className="flex items-center justify-between">
                              <span className="text-ink truncate max-w-[150px]">
                                {item.paymentTxHash
                                  ? truncateIdentifier(item.paymentTxHash, 8, 6)
                                  : 'Belum ada pembayaran restorasi'}
                              </span>
                              {item.paymentTxHash && (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(item.paymentTxHash || '', `pay-${item.id}`)}
                                    className="text-ink-muted hover:text-forest p-0.5"
                                    title="Salin Tx Hash Restorasi"
                                  >
                                    {copiedKey === `pay-${item.id}` ? (
                                      <Check className="w-3 h-3 text-forest" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                  {activeNet?.explorerUrl && item.paymentTxHash.startsWith('0x') && (
                                    <a
                                      href={`${activeNet.explorerUrl}/tx/${item.paymentTxHash}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-forest hover:underline"
                                      title="Buka di Sepolia Etherscan"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* IPFS CID Reference */}
                        {v0?.ipfsCid && (
                          <div className="pt-1.5 border-t border-border/60 flex items-center justify-between text-[11px]">
                            <span className="text-ink-muted font-sans text-[10px]">IPFS Media CID:</span>
                            <div className="flex items-center gap-2">
                              <span className="text-ink truncate max-w-[200px]">
                                {truncateIdentifier(v0.ipfsCid, 12, 8)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(v0.ipfsCid, `cid-${item.id}`)}
                                className="text-ink-muted hover:text-forest p-0.5"
                                title="Salin IPFS CID"
                              >
                                {copiedKey === `cid-${item.id}` ? (
                                  <Check className="w-3 h-3 text-forest" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Curator Notes if any */}
                      {item.curatorNotes && (
                        <div className="p-3 rounded-btn bg-paper border border-border text-xs text-ink-muted leading-relaxed">
                          <span className="font-semibold text-ink">Catatan Kurator:</span> {item.curatorNotes}
                        </div>
                      )}
                    </div>

                    {/* Action Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60">
                      <div className="flex items-center gap-2">
                        {isRecorded && !vDeriv && (
                          <button
                            type="button"
                            disabled={restoringItemId === item.id}
                            onClick={() => void handleRestoreClick(item)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-btn bg-forest hover:bg-forest-hover text-surface text-xs font-semibold shadow-subtle min-h-[38px] transition-colors"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>
                              {restoringItemId === item.id
                                ? 'Memproses Restorasi...'
                                : `Ajukan Restorasi AI (${restorationFeeEth || '0.01'} ETH)`}
                            </span>
                          </button>
                        )}

                        {vDeriv && (
                          <span className="px-3 py-1.5 rounded-btn bg-sage border border-sage-border text-xs font-semibold text-forest flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-brass" />
                            <span>Versi Restorasi x4 Selesai</span>
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedArchiveId(item.id);
                          setActivePage('detail');
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-btn bg-surface hover:bg-paper border border-border text-ink text-xs font-semibold shadow-subtle min-h-[38px] transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-ink-muted" />
                        <span>Buka Detail Lengkap</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <FooterDisclaimer />
    </div>
  );
};

export default ContributorDashboardPage;
