import React, { useState } from 'react';
import { Check, Edit3, X } from 'lucide-react';
import { useArchiveStore } from '../store/useArchiveStore';
import { PhotoCategory } from '../types';
import { truncateIdentifier } from '../lib/hash';
import { FooterDisclaimer } from '../components/FooterDisclaimer';

export const CuratorReviewPage: React.FC = () => {
  const { archives, selectedArchiveId, setSelectedArchiveId, updateArchiveStatus, setActivePage } = useArchiveStore();

  const pendingArchives = archives.filter((a) => a.status === 'menunggu_tinjauan');
  const activeArchive =
    archives.find((a) => a.id === selectedArchiveId) ||
    pendingArchives[0] ||
    archives[0];

  const [curatorCategory, setCuratorCategory] = useState<PhotoCategory>(
    activeArchive?.finalCategory || 'bangunan'
  );
  const [notes, setNotes] = useState<string>(activeArchive?.curatorNotes || '');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'warning' | 'danger'; text: string } | null>(null);

  const originalVersion = activeArchive?.versions.find((v) => v.versionType === 'original') || activeArchive?.versions[0];

  const handleApprove = () => {
    if (!activeArchive) return;
    updateArchiveStatus(activeArchive.id, 'disetujui', curatorCategory, notes);
    setFeedbackMsg({
      type: 'success',
      text: `Arsip ${activeArchive.id} telah disetujui sebagai kategori '${curatorCategory.toUpperCase()}'. Siap untuk dipublikasikan ke blockchain.`,
    });
  };

  const handleRequestRevision = () => {
    if (!activeArchive) return;
    updateArchiveStatus(activeArchive.id, 'perlu_koreksi', curatorCategory, notes);
    setFeedbackMsg({
      type: 'warning',
      text: `Arsip ${activeArchive.id} ditandai memerlukan koreksi oleh kurator.`,
    });
  };

  const handleReject = () => {
    if (!activeArchive) return;
    updateArchiveStatus(activeArchive.id, 'ditolak', curatorCategory, notes);
    setFeedbackMsg({
      type: 'danger',
      text: `Arsip ${activeArchive.id} telah ditolak oleh kurator.`,
    });
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="space-y-3">
        <p className="text-xs font-mono font-medium tracking-wider text-ink-muted uppercase">
          SUNNYREST · ARSIP FOTO BERIZIN
        </p>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-ink leading-tight max-w-4xl">
          Kurator menilai hasil AI, menentukan kategori final, dan memutuskan apakah versi layak diterbitkan.
        </h1>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="px-2.5 py-1 rounded-btn bg-status-warningBg border border-border text-xs font-mono text-status-warning font-medium">
            {pendingArchives.length} menunggu tinjauan · demo
          </span>
          <span className="px-2.5 py-1 rounded-btn bg-sage border border-sage-border text-xs font-mono text-forest font-medium">
            AI hanya rekomendasi
          </span>
        </div>
      </div>

      {feedbackMsg && (
        <div
          className={`p-4 rounded-btn text-xs font-medium border flex items-center justify-between ${
            feedbackMsg.type === 'success'
              ? 'bg-sage border-sage-border text-forest'
              : feedbackMsg.type === 'warning'
              ? 'bg-status-warningBg border-border text-status-warning'
              : 'bg-status-dangerBg border-border text-status-danger'
          }`}
        >
          <span>{feedbackMsg.text}</span>
          {feedbackMsg.type === 'success' && (
            <button
              type="button"
              onClick={() => setActivePage('verifikasi')}
              className="underline font-semibold ml-4"
            >
              Lanjut ke Verifikasi & Publikasi
            </button>
          )}
        </div>
      )}

      {/* Main Review Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Left: Arsip Yang Ditinjau */}
        <div className="bg-surface border border-border rounded-card p-6 space-y-4 shadow-subtle">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono font-semibold tracking-wider text-ink-muted uppercase">
              ARSIP YANG DITINJAU
            </h2>
            {archives.length > 1 && (
              <select
                value={activeArchive?.id}
                onChange={(e) => {
                  setSelectedArchiveId(e.target.value);
                  const selected = archives.find((a) => a.id === e.target.value);
                  if (selected) {
                    setCuratorCategory(selected.finalCategory);
                    setNotes(selected.curatorNotes || '');
                  }
                  setFeedbackMsg(null);
                }}
                className="text-xs font-mono border border-border rounded-btn px-2 py-1 bg-paper text-ink"
              >
                {archives.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.id} ({a.status})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Photo container */}
          <div className="h-64 rounded-btn overflow-hidden bg-paper border border-border/80">
            <img
              src={originalVersion?.imageUrl}
              alt={activeArchive?.title}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-display font-bold text-ink">{activeArchive?.title}</h3>
            <p className="text-xs font-mono text-ink-muted">
              {activeArchive?.id} · {activeArchive?.creator}
            </p>
          </div>

          {/* Informasi Sumber */}
          <div className="pt-3 border-t border-border/80 space-y-1 text-xs font-mono text-ink-muted">
            <p className="font-sans font-semibold text-ink text-sm pb-1">Informasi sumber</p>
            <p>Sumber: {activeArchive?.source}</p>
            <p>Izin: {activeArchive?.licenseInfo}</p>
            <p className="select-all break-all">
              SHA-256: {truncateIdentifier(activeArchive?.originalHash || '', 14, 10)}
            </p>
          </div>
        </div>

        {/* Right: Saran Model AI & Curator Decision */}
        <div className="bg-surface border border-border rounded-card p-6 space-y-5 shadow-subtle">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono font-semibold tracking-wider text-ink-muted uppercase">
              SARAN MODEL AI
            </h2>
            <span className="text-[10px] font-mono bg-sage text-forest px-2 py-0.5 rounded-btn">
              Saran AI
            </span>
          </div>

          {/* AI Category */}
          <div className="space-y-1">
            <p className="text-xs font-mono text-ink-muted">Prediksi kategori</p>
            <p className="text-3xl font-display font-bold text-ink capitalize">
              {activeArchive?.aiPrediction.category}
            </p>
            <p className="text-xs font-mono text-ink-muted">
              Confidence: {((activeArchive?.aiPrediction.confidence || 0.94) * 100).toFixed(1)}% (menunggu inferensi aktual)
            </p>
          </div>

          {/* Curator Category Dropdown */}
          <div className="space-y-1.5">
            <label htmlFor="curator-cat-input" className="text-xs font-mono text-ink-muted">
              Kategori final oleh kurator
            </label>
            <select
              id="curator-cat-input"
              value={curatorCategory}
              onChange={(e) => setCuratorCategory(e.target.value as PhotoCategory)}
              className="w-full px-3.5 py-2.5 rounded-btn bg-surface border border-border text-xs text-ink focus:border-forest outline-none min-h-[44px]"
            >
              <option value="bangunan">Bangunan</option>
              <option value="orang">Orang</option>
              <option value="lanskap">Lanskap</option>
            </select>
          </div>

          {/* Curator Notes */}
          <div className="space-y-1.5">
            <label htmlFor="curator-notes-input" className="text-xs font-mono text-ink-muted">
              Catatan kurator
            </label>
            <textarea
              id="curator-notes-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan alasan persetujuan, koreksi, atau penolakan"
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-btn bg-surface border border-border text-xs text-ink placeholder:text-ink-muted focus:border-forest outline-none resize-none"
            />
          </div>

          {/* Advisory Notice */}
          <div className="p-3.5 rounded-btn bg-sage/60 border border-sage-border text-xs text-sage-text leading-relaxed">
            Keputusan final ditentukan kurator, bukan skor confidence AI. Jika dikoreksi, simpan kategori final dan jejak koreksi.
          </div>

          {/* Action Buttons Row */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleApprove}
              className="flex-1 py-3 px-4 rounded-btn bg-forest hover:bg-forest-hover text-surface text-xs font-semibold shadow-subtle transition-colors flex items-center justify-center gap-1.5 min-h-[44px]"
            >
              <Check className="w-4 h-4" />
              <span>Setujui</span>
            </button>
            <button
              type="button"
              onClick={handleRequestRevision}
              className="py-3 px-4 rounded-btn bg-surface hover:bg-paper border border-border text-ink text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 min-h-[44px]"
            >
              <Edit3 className="w-3.5 h-3.5 text-ink-muted" />
              <span>Minta koreksi</span>
            </button>
            <button
              type="button"
              onClick={handleReject}
              className="py-3 px-4 rounded-btn bg-surface hover:bg-status-dangerBg border border-border hover:border-status-danger text-status-danger text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 min-h-[44px]"
            >
              <X className="w-3.5 h-3.5" />
              <span>Tolak</span>
            </button>
          </div>
        </div>
      </div>

      {/* Aturan Sebelum Publikasi */}
      <section className="space-y-4">
        <h2 className="text-xl font-display font-bold text-ink">Aturan sebelum publikasi</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-surface border border-border rounded-card p-5 space-y-1.5 shadow-subtle">
            <p className="text-xs font-display font-bold text-ink">Persetujuan kurator</p>
            <p className="text-xs text-ink-muted leading-relaxed">
              Hanya kurator terdaftar dapat menerbitkan versi ke kontrak blockchain.
            </p>
          </div>

          <div className="bg-surface border border-border rounded-card p-5 space-y-1.5 shadow-subtle">
            <p className="text-xs font-display font-bold text-ink">Parent terdaftar</p>
            <p className="text-xs text-ink-muted leading-relaxed">
              Versi turunan wajib merujuk parent yang sudah tercatat pada jaringan.
            </p>
          </div>

          <div className="bg-surface border border-border rounded-card p-5 space-y-1.5 shadow-subtle">
            <p className="text-xs font-display font-bold text-ink">Duplikat ditolak</p>
            <p className="text-xs text-ink-muted leading-relaxed">
              Hash dan versi duplikat ditolak; versi lama tidak ditimpa oleh restorasi baru.
            </p>
          </div>
        </div>
      </section>

      <FooterDisclaimer />
    </div>
  );
};
