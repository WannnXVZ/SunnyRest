import React, { useState, useEffect } from 'react';
import {
  User,
  Upload,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  RotateCw,
  Eye,
  Lock,
  Globe,
  Wallet,
  Plus,
  Search,
  ImageOff,
} from 'lucide-react';
import { useArchiveStore } from '../store/useArchiveStore';
import { NETWORKS } from '../config/networks';
import { truncateIdentifier } from '../lib/hash';
import { resolveMediaUrl } from '../lib/api';
import { isArchiveOwnedBy, isArchivePrivate } from '../lib/ownership';
import { extractTransactionReceipts } from '../lib/receipts';
import { StatusBadge } from '../components/StatusBadge';
import { TransactionReceiptHistory } from '../components/TransactionReceiptHistory';
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
    restorationFeeEth,
    refreshRestorationFee,
    updateArchiveVisibility,
  } = useArchiveStore();

  const [activeTab, setActiveTab] = useState<'semua' | 'menunggu' | 'tercatat' | 'privat'>('semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [updatingVisId, setUpdatingVisId] = useState<string | null>(null);
  const [visErrorMsg, setVisErrorMsg] = useState<string | null>(null);

  const activeNet = NETWORKS[wallet.chainId];

  useEffect(() => {
    void refreshRestorationFee();
  }, [refreshRestorationFee, wallet.chainId]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const myArchives = archives.filter((item) => isArchiveOwnedBy(item, wallet.address));
  const myReceipts = extractTransactionReceipts(myArchives);

  const waitingCount = myArchives.filter(
    (a) => a.status === 'menunggu_tinjauan' || a.status === 'perlu_koreksi'
  ).length;
  const recordedCount = myArchives.filter((a) => a.status === 'tercatat').length;
  const privateCount = myArchives.filter((a) => isArchivePrivate(a)).length;

  const displayedArchives = myArchives.filter((item) => {
    if (activeTab === 'menunggu' && item.status !== 'menunggu_tinjauan' && item.status !== 'perlu_koreksi') {
      return false;
    }
    if (activeTab === 'tercatat' && item.status !== 'tercatat') {
      return false;
    }
    if (activeTab === 'privat' && !isArchivePrivate(item)) {
      return false;
    }

    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      item.title.toLowerCase().includes(q) ||
      item.id.toLowerCase().includes(q) ||
      item.finalCategory.toLowerCase().includes(q) ||
      item.source.toLowerCase().includes(q)
    );
  });

  const handleToggleVisibility = async (item: ArchiveItem) => {
    setVisErrorMsg(null);
    setUpdatingVisId(item.id);
    const nextVis = isArchivePrivate(item) ? 'public' : 'private';
    const res = await updateArchiveVisibility(item.id, nextVis);
    setUpdatingVisId(null);
    if (!res.success && res.error) {
      setVisErrorMsg(res.error);
    }
  };

  const openItemPage = (id: string, page: 'detail' | 'restorasi') => {
    setSelectedArchiveId(id);
    setActivePage(page);
  };

  return (
    <div className="space-y-8">
      {/* Header Editorial */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border/60 pb-5">
        <div className="space-y-2">
          <p className="text-[11px] font-mono font-medium tracking-wider text-ink-muted uppercase">
            PEMOHON / ARSIP &amp; BUKTI TRANSAKSI
          </p>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink tracking-tight">
            Koleksi Pengajuan &amp; Receipt Resmi.
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted font-sans max-w-2xl leading-relaxed">
            Atur visibilitas arsip kenangan pribadi, pantau hasil kurasi, dan simpan bukti transaksi blockchain khusus akun Anda.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => void syncArchives()}
            disabled={isSyncingArchives}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-btn bg-surface hover:bg-paper border border-border text-ink text-xs font-mono shadow-subtle min-h-[38px] transition-colors"
            title="Sinkronkan arsip dari backend dan smart contract"
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

      {visErrorMsg && (
        <div className="p-4 rounded-btn bg-status-dangerBg border border-border text-xs text-status-danger flex items-start gap-2 shadow-subtle">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed font-sans">{visErrorMsg}</p>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-ink-muted absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari judul, ID arsip, atau kategori..."
            aria-label="Cari pengajuan saya"
            className="w-full pl-10 pr-4 py-2.5 rounded-btn bg-surface border border-border text-xs text-ink placeholder:text-ink-muted focus:border-forest outline-none transition-colors min-h-[42px]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'semua', label: `Semua (${myArchives.length})` },
            { id: 'menunggu', label: `Menunggu Kurasi (${waitingCount})` },
            { id: 'tercatat', label: `Tercatat On-Chain (${recordedCount})` },
            { id: 'privat', label: `Privat (${privateCount})` },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as 'semua' | 'menunggu' | 'tercatat' | 'privat')}
                className={`px-3 py-1.5 rounded-btn text-xs font-mono transition-colors ${
                  isActive
                    ? 'bg-forest text-surface font-semibold shadow-subtle'
                    : 'bg-surface hover:bg-paper border border-border text-ink'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
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
              Hubungkan MetaMask untuk memuat daftar pengajuan milik Anda, mengatur status privat/publik, dan mengakses bukti transaksi resmi.
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
              Anda belum memiliki pengajuan arsip pada alamat wallet ini. Mulai unggah foto berizin atau foto kenangan pribadi untuk dikurasi.
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

      {/* Filtered Empty State */}
      {wallet.isConnected && myArchives.length > 0 && displayedArchives.length === 0 && (
        <div className="bg-surface border border-border rounded-card p-10 text-center space-y-3 shadow-subtle">
          <p className="text-xs font-mono text-ink-muted">
            Tidak ada pengajuan yang cocok dengan filter atau kata kunci pencarian.
          </p>
          <button
            type="button"
            onClick={() => {
              setActiveTab('semua');
              setSearchQuery('');
            }}
            className="px-4 py-2 rounded-btn bg-paper hover:bg-surface border border-border text-xs font-semibold text-ink"
          >
            Reset Filter
          </button>
        </div>
      )}

      {/* Submissions & Receipt Cards */}
      {wallet.isConnected && displayedArchives.length > 0 && (
        <div className="space-y-6">
          {displayedArchives.map((item) => {
            const v0 = item.versions.find((v) => v.versionType === 'original') || item.versions[0];
            const vDeriv = item.versions.find((v) => v.versionType === 'derivative');
            const isRecorded = item.status === 'tercatat' && Boolean(v0?.onChainTokenId);
            const isPrivate = isArchivePrivate(item);
            const isOnChainFallback = item.id.startsWith('ONCHAIN-');
            const imgSrc = v0?.imageUrl ? resolveMediaUrl(v0.imageUrl) : '';

            return (
              <div
                key={item.id}
                className="bg-surface border border-border rounded-card overflow-hidden shadow-subtle hover:border-forest/50 transition-colors"
              >
                {/* Card Top Strip */}
                <div className="px-5 py-3 bg-paper/50 border-b border-border flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-btn bg-surface border border-border text-[11px] font-mono font-bold text-forest">
                      {item.id}
                    </span>
                    <StatusBadge status={item.status} />
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-btn text-[11px] font-mono font-semibold ${
                        isPrivate
                          ? 'bg-ink text-surface'
                          : 'bg-surface border border-border text-ink-muted'
                      }`}
                    >
                      {isPrivate ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                      <span>{isPrivate ? 'Privat · Kenangan Pribadi' : 'Publik'}</span>
                    </span>
                  </div>

                  {!isOnChainFallback && (
                    <button
                      type="button"
                      disabled={updatingVisId === item.id}
                      onClick={() => void handleToggleVisibility(item)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-btn bg-surface hover:bg-paper border border-border text-[11px] font-mono text-ink transition-colors"
                      title={
                        isPrivate
                          ? 'Tampilkan foto ini di galeri publik setelah berstatus tercatat'
                          : 'Sembunyikan foto ini dari galeri publik (kenangan pribadi)'
                      }
                    >
                      {isPrivate ? <Globe className="w-3 h-3 text-forest" /> : <Lock className="w-3 h-3 text-ink-muted" />}
                      <span>
                        {updatingVisId === item.id
                          ? 'Menyimpan...'
                          : isPrivate
                          ? 'Jadikan Publik'
                          : 'Jadikan Privat'}
                      </span>
                    </button>
                  )}
                </div>

                {/* Card Body */}
                <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left: Thumbnail & Specs */}
                  <div className="lg:col-span-4 space-y-2.5">
                    <div className="aspect-[4/3] w-full rounded-btn overflow-hidden bg-paper border border-border flex items-center justify-center">
                      {imgSrc ? (
                        <img
                          src={imgSrc}
                          alt={item.title}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-xs font-mono text-ink-muted">
                          <ImageOff className="w-5 h-5 opacity-50" />
                          <span>Pratinjau gambar</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-ink-muted">
                      <span className="capitalize">Kategori: {item.finalCategory || item.initialCategory}</span>
                      <span>{v0?.dimensions || item.updatedAt}</span>
                    </div>
                  </div>

                  {/* Right: Details & Confidential Transaction Receipt */}
                  <div className="lg:col-span-8 space-y-4">
                    <div>
                      <h2 className="text-lg sm:text-xl font-display font-bold text-ink">{item.title}</h2>
                      <p className="text-xs font-mono text-ink-muted mt-0.5">
                        Kredit: {item.creator} · Sumber: {item.source} · Lisensi: {item.licenseInfo}
                      </p>
                    </div>

                    {/* Confidential Receipt Panel */}
                    <div className="p-4 rounded-btn bg-paper/60 border border-border space-y-3 font-mono text-xs">
                      <div className="flex items-center justify-between pb-2 border-b border-border/70">
                        <span className="font-sans font-semibold text-ink text-xs flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-forest" />
                          <span>BUKTI TRANSAKSI ON-CHAIN &amp; INTEGRITAS</span>
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-btn bg-sage border border-sage-border text-forest font-bold">
                          Khusus Pemilik
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                        <div className="space-y-0.5">
                          <span className="text-ink-muted font-sans text-[10px]">Token ID On-Chain</span>
                          <p className="text-ink font-semibold">
                            {v0?.onChainTokenId
                              ? `#${v0.onChainTokenId} · ${wallet.chainName}`
                              : 'Menunggu penerbitan kurator'}
                          </p>
                        </div>

                        <div className="space-y-0.5">
                          <span className="text-ink-muted font-sans text-[10px]">SHA-256 Berkas</span>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-ink truncate">
                              {truncateIdentifier(v0?.fileHash || item.originalHash, 8, 6)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(v0?.fileHash || item.originalHash, `hash-${item.id}`)}
                              className="text-ink-muted hover:text-forest p-0.5 flex-shrink-0"
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

                        <div className="space-y-0.5">
                          <span className="text-ink-muted font-sans text-[10px]">Tx Hash Minting (ERC-721)</span>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-ink truncate">
                              {v0?.transactionHash
                                ? truncateIdentifier(v0.transactionHash, 8, 6)
                                : 'Menunggu tanda tangan kurator'}
                            </span>
                            {v0?.transactionHash && (
                              <div className="flex items-center gap-1 flex-shrink-0">
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
                                    title="Lihat di Explorer"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-0.5">
                          <span className="text-ink-muted font-sans text-[10px]">
                            Tx Hash Bayar Restorasi ({restorationFeeEth || '0.01'} ETH)
                          </span>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-ink truncate">
                              {item.paymentTxHash
                                ? truncateIdentifier(item.paymentTxHash, 8, 6)
                                : 'Belum diajukan'}
                            </span>
                            {item.paymentTxHash && (
                              <div className="flex items-center gap-1 flex-shrink-0">
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
                                    title="Lihat di Explorer"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {vDeriv?.transactionHash && (
                          <div className="space-y-0.5 sm:col-span-2">
                            <span className="text-ink-muted font-sans text-[10px]">
                              Tx Hash Minting Turunan (SR x4{vDeriv.onChainTokenId ? ` · Token #${vDeriv.onChainTokenId}` : ''})
                            </span>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-ink truncate">
                                {truncateIdentifier(vDeriv.transactionHash, 10, 8)}
                              </span>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleCopy(vDeriv.transactionHash || '', `deriv-${item.id}`)}
                                  className="text-ink-muted hover:text-forest p-0.5"
                                  title="Salin Tx Hash Minting Turunan"
                                >
                                  {copiedKey === `deriv-${item.id}` ? (
                                    <Check className="w-3 h-3 text-forest" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                                {activeNet?.explorerUrl && vDeriv.transactionHash.startsWith('0x') && (
                                  <a
                                    href={`${activeNet.explorerUrl}/tx/${vDeriv.transactionHash}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-forest hover:underline"
                                    title="Lihat di Explorer"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {v0?.ipfsCid && (
                        <div className="pt-2 border-t border-border/70 flex items-center justify-between gap-2 text-[11px]">
                          <span className="text-ink-muted font-sans text-[10px]">IPFS Media CID</span>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-ink truncate">
                              {truncateIdentifier(v0.ipfsCid, 12, 8)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(v0.ipfsCid, `cid-${item.id}`)}
                              className="text-ink-muted hover:text-forest p-0.5 flex-shrink-0"
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

                    {item.curatorNotes && (
                      <div className="p-3 rounded-btn bg-paper border border-border text-xs text-ink-muted leading-relaxed">
                        <span className="font-semibold text-ink">Catatan Kurator:</span> {item.curatorNotes}
                      </div>
                    )}

                    {/* Action Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60">
                      <div className="flex flex-wrap items-center gap-2">
                        {isRecorded && !vDeriv && (
                          <button
                            type="button"
                            onClick={() => openItemPage(item.id, 'restorasi')}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-btn bg-forest hover:bg-forest-hover text-surface text-xs font-semibold shadow-subtle min-h-[38px] transition-colors"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Ajukan Restorasi AI ({restorationFeeEth || '0.01'} ETH)</span>
                          </button>
                        )}

                        {vDeriv && (
                          <>
                            <span className="px-3 py-1.5 rounded-btn bg-sage border border-sage-border text-xs font-semibold text-forest inline-flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-brass" />
                              <span>Versi Restorasi x4 Tersedia</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => openItemPage(item.id, 'restorasi')}
                              className="px-3 py-2 rounded-btn bg-paper hover:bg-surface border border-border text-xs font-semibold text-ink min-h-[38px] transition-colors"
                            >
                              Bandingkan di Restorasi AI
                            </button>
                          </>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => openItemPage(item.id, 'detail')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-btn bg-surface hover:bg-paper border border-border text-ink text-xs font-semibold shadow-subtle min-h-[38px] transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-ink-muted" />
                        <span>Buka Detail &amp; Riwayat Versi</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {wallet.isConnected && (
        <TransactionReceiptHistory
          receipts={myReceipts}
          chainId={wallet.chainId}
          defaultLimit={5}
          title="Riwayat lengkap bukti transaksi saya"
          subtitle="Pilih tampilan 5 transaksi terbaru atau tampilkan semua transaksi yang tercatat untuk akun wallet Anda."
          onSelectArchive={(id) => openItemPage(id, 'detail')}
        />
      )}

      <FooterDisclaimer />
    </div>
  );
};

export default ContributorDashboardPage;
