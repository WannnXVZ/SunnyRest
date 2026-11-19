import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  FileText,
  Info,
  Lock,
  Send,
  ShieldCheck,
  ImageOff,
  Loader2,
} from 'lucide-react';
import { useArchiveStore } from '../store/useArchiveStore';
import { PhotoCategory } from '../types';
import { resolveMediaUrl } from '../lib/api';
import { TxStage } from '../lib/contract';
import { FooterDisclaimer } from '../components/FooterDisclaimer';

const CATEGORIES: PhotoCategory[] = ['bangunan', 'lanskap', 'orang'];

export const CuratorReviewPage: React.FC = () => {
  const {
    archives,
    selectedArchiveId,
    setSelectedArchiveId,
    updateArchiveStatus,
    setActivePage,
    publishToBlockchain,
    wallet,
  } = useArchiveStore();

  const pendingArchives = archives.filter((a) => {
    const hasUnpublishedDerivative = a.versions.some(
      (v) => v.versionType === 'derivative' && !v.onChainTokenId
    );
    return (
      a.status === 'menunggu_tinjauan' ||
      a.status === 'perlu_koreksi' ||
      a.status === 'disetujui' ||
      hasUnpublishedDerivative
    );
  });

  const activeArchive =
    archives.find((a) => a.id === selectedArchiveId) ||
    pendingArchives[0] ||
    archives[0];

  const [curatorCategory, setCuratorCategory] = useState<PhotoCategory>(
    activeArchive?.finalCategory || 'bangunan'
  );
  const [decision, setDecision] = useState<'setujui' | 'tolak' | 'minta_koreksi'>(
    activeArchive?.status === 'disetujui' || activeArchive?.status === 'tercatat'
      ? 'setujui'
      : 'minta_koreksi'
  );
  const [notes, setNotes] = useState<string>(activeArchive?.curatorNotes || '');
  const [isSigning, setIsSigning] = useState(false);
  const [txStage, setTxStage] = useState<TxStage | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{
    type: 'success' | 'warning' | 'danger';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (activeArchive) {
      setCuratorCategory(activeArchive.finalCategory || 'bangunan');
      setDecision(
        activeArchive.status === 'disetujui' || activeArchive.status === 'tercatat'
          ? 'setujui'
          : activeArchive.status === 'ditolak'
          ? 'tolak'
          : 'minta_koreksi'
      );
      setNotes(activeArchive.curatorNotes || '');
      setFeedbackMsg(null);
    }
  }, [activeArchive?.id]);

  if (!activeArchive) {
    return (
      <div className="p-12 text-center max-w-xl mx-auto space-y-4">
        <p className="text-sm font-mono text-ink-muted">
          Tidak ada pengajuan atau versi yang menunggu peninjauan kurator.
        </p>
        <button
          type="button"
          onClick={() => setActivePage('arsip')}
          className="px-4 py-2 rounded-btn bg-gold text-ink text-xs font-semibold"
        >
          Kembali ke galeri
        </button>
      </div>
    );
  }

  const originalVersion =
    activeArchive.versions.find((v) => v.versionType === 'original') ||
    activeArchive.versions[0];
  const unpublishedDerivative = activeArchive.versions.find(
    (v) => v.versionType === 'derivative' && !v.onChainTokenId
  );
  const targetVersion =
    originalVersion && !originalVersion.onChainTokenId
      ? originalVersion
      : unpublishedDerivative || originalVersion;

  const isTargetAlreadyOnChain = Boolean(targetVersion?.onChainTokenId);
  const isApproved =
    activeArchive.status === 'disetujui' ||
    activeArchive.status === 'tercatat' ||
    Boolean(unpublishedDerivative);

  const handleDecisionSubmit = async () => {
    if (decision === 'setujui') {
      await updateArchiveStatus(activeArchive.id, 'disetujui', curatorCategory, notes);
      setFeedbackMsg({
        type: 'success',
        text: `Arsip ${activeArchive.id} telah disetujui. Langkah selanjutnya: pin media & metadata ke IPFS lalu tanda tangani publikasi on-chain.`,
      });
    } else if (decision === 'minta_koreksi') {
      await updateArchiveStatus(activeArchive.id, 'perlu_koreksi', curatorCategory, notes);
      setFeedbackMsg({
        type: 'warning',
        text: `Permintaan koreksi untuk arsip ${activeArchive.id} telah disimpan.`,
      });
    } else {
      await updateArchiveStatus(activeArchive.id, 'ditolak', curatorCategory, notes);
      setFeedbackMsg({
        type: 'danger',
        text: `Arsip ${activeArchive.id} telah ditolak oleh kurator.`,
      });
    }
  };

  const handleSignAndPublish = async () => {
    setIsSigning(true);
    setTxStage('pinning_ipfs');
    setFeedbackMsg(null);
    const res = await publishToBlockchain(activeArchive.id, (stage) =>
      setTxStage(stage)
    );
    setIsSigning(false);
    setTxStage(null);
    if (res.success) {
      setFeedbackMsg({
        type: 'success',
        text: `Berhasil dipin ke IPFS (${res.mediaCid}) dan dicatat on-chain dengan Token ID #${res.tokenId} (gasUsed: ${res.gasUsed}). Transaksi: ${res.txHash}`,
      });
    } else {
      setFeedbackMsg({
        type: 'danger',
        text: res.error || 'Pinning IPFS atau pencatatan transaksi on-chain gagal.',
      });
    }
  };

  const scoresMap = activeArchive.aiPrediction.scores;
  const imgSrc = targetVersion?.imageUrl ? resolveMediaUrl(targetVersion.imageUrl) : '';

  const stageLabel =
    txStage === 'pinning_ipfs'
      ? 'Mengunggah media & metadata ke IPFS...'
      : txStage === 'waiting_wallet'
      ? 'Menunggu tanda tangan MetaMask...'
      : txStage === 'waiting_confirmation'
      ? 'Menunggu konfirmasi blok blockchain...'
      : 'Mengirim transaksi...';

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pt-2">
        <div className="space-y-1.5">
          <p className="text-[11px] font-mono font-medium tracking-wider text-ink-muted uppercase">
            ANTREAN KURASI / PENGAJUAN {activeArchive.id}
          </p>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-ink tracking-tight">
            Keputusan tetap pada manusia.
          </h1>
          <p className="text-sm text-ink-muted font-sans max-w-2xl leading-relaxed">
            Periksa konteks, pastikan izin, tinjau saran AI, lalu tentukan kategori dan keputusan publikasi ke blockchain.
          </p>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setActivePage('arsip')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-btn bg-surface hover:bg-paper border border-border text-xs font-mono text-ink shadow-subtle transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-ink-muted" />
            <span>Kembali ke antrean</span>
          </button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 px-4 rounded-btn bg-paper/70 border border-border text-xs font-mono">
        <div className="flex items-center gap-2.5">
          <span className="px-2.5 py-0.5 rounded-btn bg-gold-light border border-gold-border text-ink font-semibold capitalize">
            {activeArchive.status.replace('_', ' ')}
          </span>
          <span className="text-ink-muted">Diajukan {activeArchive.createdAt}</span>
        </div>
        <span className="text-ink-muted">
          Wallet:{' '}
          {wallet.address
            ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`
            : 'Belum terhubung'}{' '}
          · {wallet.chainName}
        </span>
      </div>

      {/* Queue Selection Bar */}
      {pendingArchives.length > 0 && (
        <div className="bg-surface border border-border rounded-btn p-3 shadow-subtle space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="font-semibold text-ink">
              Daftar Arsip Aktif Kurasi ({pendingArchives.length} item):
            </span>
            <span className="text-ink-muted text-[11px]">Pilih untuk meninjau berkas</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {pendingArchives.map((item) => {
              const isSelected = item.id === activeArchive.id;
              const hasDerivPending = item.versions.some(
                (v) => v.versionType === 'derivative' && !v.onChainTokenId
              );
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedArchiveId(item.id);
                    setCuratorCategory(item.finalCategory);
                    setNotes(item.curatorNotes || '');
                    setFeedbackMsg(null);
                  }}
                  className={`px-3 py-1.5 rounded-btn text-xs font-mono transition-colors flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-gold text-ink font-bold shadow-subtle border border-gold-border'
                      : 'bg-paper hover:bg-paper-dark border border-border text-ink-muted'
                  }`}
                >
                  <span>{item.id}</span>
                  <span className="text-[10px] capitalize">
                    ({hasDerivPending ? 'SR x4 siap terbit' : item.finalCategory})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-btn text-xs font-sans border flex items-center justify-between break-all ${
            feedbackMsg.type === 'success'
              ? 'bg-sage border-sage-border text-forest'
              : feedbackMsg.type === 'warning'
              ? 'bg-gold-light border-gold-border text-ink'
              : 'bg-status-dangerBg border-border text-status-danger'
          }`}
        >
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* 2-Column Main Inspection Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-surface border border-border rounded-card overflow-hidden shadow-card">
            <div className="relative aspect-[16/10] bg-paper overflow-hidden flex items-center justify-center">
              {imgSrc ? (
                <img
                  src={imgSrc}
                  alt={activeArchive.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center text-xs font-mono text-ink-muted space-y-2">
                  <ImageOff className="w-8 h-8 mx-auto opacity-50" />
                  <span>Pratinjau media belum tersedia</span>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border bg-paper/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="font-display font-bold text-base text-ink">
                  {activeArchive.title}
                </p>
                <p className="text-[11px] font-mono text-ink-muted mt-0.5">
                  {targetVersion?.fileName || activeArchive.id}
                  {targetVersion?.dimensions ? ` · ${targetVersion.dimensions}` : ''}
                  {targetVersion?.fileSizeBytes
                    ? ` · ${(targetVersion.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB`
                    : ''}
                </p>
              </div>

              <span className="px-2.5 py-1 rounded-btn bg-surface border border-border text-xs font-mono text-ink self-start sm:self-auto shadow-subtle">
                {targetVersion?.versionType === 'derivative'
                  ? `Turunan SR · parentId = ${originalVersion?.onChainTokenId || '?'}`
                  : 'Asli · parentId = 0'}
              </span>
            </div>
          </div>

          {/* Provenance Card */}
          <div className="bg-surface border border-border rounded-card p-6 space-y-4 shadow-subtle">
            <h2 className="font-display font-bold text-base text-ink">
              Sumber, izin &amp; konteks
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
              <div>
                <p className="text-ink-muted text-[11px] font-mono">Sumber yang dicantumkan</p>
                <p className="text-ink font-medium mt-0.5">{activeArchive.source}</p>
              </div>

              <div>
                <p className="text-ink-muted text-[11px] font-mono">Lisensi yang diajukan</p>
                <p className="text-ink font-medium mt-0.5">{activeArchive.licenseInfo}</p>
              </div>

              <div>
                <p className="text-ink-muted text-[11px] font-mono">Rujukan sumber</p>
                <p className="text-ink font-medium mt-0.5">
                  {activeArchive.sourceRef || `Catatan koleksi ${activeArchive.id}`}
                </p>
              </div>

              <div>
                <p className="text-ink-muted text-[11px] font-mono">Kredit pencipta</p>
                <p className="text-ink font-medium mt-0.5">{activeArchive.creator}</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-btn bg-paper/60 border border-border text-xs font-mono">
              <div className="flex items-center gap-2 text-ink min-w-0">
                <FileText className="w-4 h-4 text-forest flex-shrink-0" />
                <span className="truncate">
                  {activeArchive.permissionAttachment || 'Tidak ada lampiran dokumen terpisah'}
                </span>
              </div>
              {imgSrc && (
                <a
                  href={imgSrc}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-forest hover:underline text-[11px] flex-shrink-0"
                >
                  <span>Buka berkas media</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {activeArchive.curatorNotes && (
              <p className="text-xs font-sans text-ink-muted leading-relaxed">
                Catatan: {activeArchive.curatorNotes}
              </p>
            )}
          </div>

          <div className="p-4 rounded-card bg-gold-light border border-gold-border space-y-1 text-ink">
            <div className="flex items-center gap-2 text-xs font-bold">
              <Info className="w-4 h-4 text-ink flex-shrink-0" />
              <span>Tinjauan izin wajib dilakukan kurator</span>
            </div>
            <p className="text-xs font-sans text-ink/80 leading-relaxed pl-6">
              Pastikan pemegang hak dan lisensi telah diverifikasi sebelum menandatangani publikasi token ke IPFS dan blockchain.
            </p>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Saran AI Dinamis */}
          <div className="bg-surface border border-border rounded-card p-5 space-y-4 shadow-subtle">
            <div>
              <h3 className="font-display font-bold text-base text-ink">
                Saran AI, bukan keputusan
              </h3>
              <p className="text-xs text-ink-muted font-sans mt-0.5">
                {activeArchive.aiPrediction.modelVersion
                  ? `Keluaran aktual model ${activeArchive.aiPrediction.modelVersion}`
                  : 'Informasi klasifikasi berkas'}
              </p>
            </div>

            {scoresMap ? (
              <div className="space-y-2.5 font-mono text-xs">
                {CATEGORIES.map((cat) => {
                  const score = Number(scoresMap[cat] ?? 0);
                  const pct = (score * 100).toFixed(1);
                  const isTop = activeArchive.aiPrediction.category === cat;
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className={`capitalize ${isTop ? 'font-bold text-ink' : 'text-ink-muted'}`}>
                          {cat}
                        </span>
                        <span className={isTop ? 'font-bold text-ink' : 'text-ink-muted'}>
                          {pct}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-paper overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isTop ? 'bg-gold' : 'bg-paper-dark'}`}
                          style={{ width: `${Math.min(100, Math.max(0, score * 100))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 rounded-btn bg-paper/70 border border-border text-xs font-mono text-ink-muted">
                {activeArchive.aiPrediction.confidence > 0 ? (
                  <span>
                    Prediksi: <strong className="capitalize text-ink">{activeArchive.aiPrediction.category}</strong> ({(activeArchive.aiPrediction.confidence * 100).toFixed(1)}%)
                  </span>
                ) : (
                  <span>Skor probabilitas AI tidak tersedia untuk pengajuan ini; gunakan penilaian manual kurator.</span>
                )}
              </div>
            )}

            <p className="text-[11px] font-sans text-ink-muted leading-relaxed pt-2 border-t border-border/80">
              {activeArchive.aiPrediction.advisoryNote || 'Tidak ada publikasi otomatis dari hasil klasifikasi AI.'}
            </p>
          </div>

          {/* Kategori Final */}
          <div className="bg-surface border border-border rounded-card p-5 space-y-3 shadow-subtle">
            <div>
              <h3 className="font-display font-bold text-base text-ink">Kategori final</h3>
              <p className="text-xs text-ink-muted font-sans mt-0.5">
                Pilihan manusia · wajib sebelum menyetujui
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              {(['orang', 'bangunan', 'lanskap'] as PhotoCategory[]).map((cat) => {
                const isSelected = curatorCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCuratorCategory(cat)}
                    className={`py-2 px-2.5 rounded-btn text-xs font-medium capitalize transition-all border flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? 'bg-gold-light border-gold text-ink font-bold shadow-subtle'
                        : 'bg-surface border-border text-ink-muted hover:bg-paper'
                    }`}
                  >
                    <span
                      className={`w-2.5 h-2.5 rounded-full border ${
                        isSelected ? 'border-forest bg-forest' : 'border-ink-muted'
                      }`}
                    />
                    <span>{cat}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Keputusan Tinjauan */}
          <div className="bg-surface border border-border rounded-card p-5 space-y-4 shadow-subtle">
            <div>
              <h3 className="font-display font-bold text-base text-ink">Keputusan tinjauan</h3>
              <p className="text-xs text-ink-muted font-sans mt-0.5">
                Status saat ini: <span className="font-mono capitalize">{activeArchive.status.replace('_', ' ')}</span>
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDecision('setujui')}
                className={`py-2 px-2 rounded-btn text-xs font-semibold transition-all border ${
                  decision === 'setujui'
                    ? 'bg-sage border-sage-border text-forest shadow-subtle'
                    : 'bg-surface border-border text-ink hover:bg-paper'
                }`}
              >
                Setujui
              </button>

              <button
                type="button"
                onClick={() => setDecision('tolak')}
                className={`py-2 px-2 rounded-btn text-xs font-semibold transition-all border ${
                  decision === 'tolak'
                    ? 'bg-status-dangerBg border-status-danger text-status-danger shadow-subtle'
                    : 'bg-surface border-border text-ink hover:bg-paper'
                }`}
              >
                Tolak
              </button>

              <button
                type="button"
                onClick={() => setDecision('minta_koreksi')}
                className={`py-2 px-2 rounded-btn text-xs font-semibold transition-all border ${
                  decision === 'minta_koreksi'
                    ? 'bg-gold border-gold-border text-ink font-bold shadow-subtle'
                    : 'bg-surface border-border text-ink hover:bg-paper'
                }`}
              >
                Minta koreksi
              </button>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="curator-notes" className="text-xs font-mono text-ink-muted">
                Catatan untuk kreator
              </label>
              <textarea
                id="curator-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tuliskan catatan evaluasi izin dan kualitas arsip..."
                className="w-full px-3 py-2 rounded-btn bg-surface border border-border text-xs text-ink focus:border-forest outline-none transition-colors leading-relaxed"
              />
            </div>

            <button
              type="button"
              onClick={() => void handleDecisionSubmit()}
              className="w-full py-2.5 px-4 rounded-btn bg-gold hover:bg-gold-hover text-ink text-xs font-bold shadow-subtle flex items-center justify-center gap-2 min-h-[42px] transition-colors"
            >
              <Send className="w-3.5 h-3.5 text-ink" />
              <span>
                {decision === 'setujui'
                  ? 'Simpan Persetujuan Kurator'
                  : decision === 'minta_koreksi'
                  ? 'Kirim Permintaan Koreksi'
                  : 'Kirim Penolakan Kurator'}
              </span>
            </button>
          </div>

          {/* Publikasi & Tanda Tangan */}
          <div className="bg-surface border border-border rounded-card p-5 space-y-3.5 shadow-subtle">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-base text-ink">
                  Pin IPFS &amp; tanda tangan kontrak
                </h3>
                <p className="text-xs text-ink-muted font-sans mt-0.5">
                  {isTargetAlreadyOnChain
                    ? `Semua versi telah tercatat (Token #${targetVersion?.onChainTokenId})`
                    : isApproved
                    ? unpublishedDerivative
                      ? `Siap menerbitkan Versi Turunan SR (Request #${unpublishedDerivative.requestId})`
                      : 'Siap di-pin ke IPFS dan dipublikasikan'
                    : 'Terkunci · menunggu persetujuan kurator'}
                </p>
              </div>
              {!isApproved && !isTargetAlreadyOnChain && <Lock className="w-4 h-4 text-ink-muted" />}
            </div>

            <p className="text-xs font-sans text-ink-muted leading-relaxed">
              Saat ditekan, backend akan mengunggah media &amp; metadata JSON ke IPFS, lalu MetaMask meminta tanda tangan transaksi `ArsipFotoVersi`.
            </p>

            <div className="space-y-1 text-xs font-mono">
              <p className="text-[11px] text-ink-muted">Penanda tangan aktif (CURATOR_ROLE)</p>
              <p className="text-ink font-medium break-all">
                {wallet.address || 'Hubungkan wallet kurator di MetaMask'}
              </p>
            </div>

            <button
              type="button"
              disabled={!isApproved || isTargetAlreadyOnChain || isSigning}
              onClick={() => void handleSignAndPublish()}
              className={`w-full py-2.5 px-4 rounded-btn text-xs font-semibold shadow-subtle flex items-center justify-center gap-2 min-h-[42px] transition-colors ${
                isApproved && !isTargetAlreadyOnChain
                  ? 'bg-forest hover:bg-forest-hover text-surface'
                  : 'bg-paper border border-border text-ink-muted cursor-not-allowed opacity-60'
              }`}
            >
              {isSigning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{stageLabel}</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>
                    {isTargetAlreadyOnChain
                      ? 'Sudah Tercatat On-Chain'
                      : unpublishedDerivative
                      ? 'Pin IPFS & Terbitkan Versi SR x4'
                      : 'Pin IPFS, Tanda Tangani & Terbitkan'}
                  </span>
                </>
              )}
            </button>

            <p className="text-[11px] font-mono text-ink-muted leading-relaxed">
              Transaksi belum dianggap sah sebelum receipt blok dikonfirmasi dan layanan IPFS mengembalikan CID nyata.
            </p>
          </div>
        </div>
      </div>

      <FooterDisclaimer />
    </div>
  );
};
