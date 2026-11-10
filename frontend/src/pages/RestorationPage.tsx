import React, { useState } from 'react';
import { Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { useArchiveStore } from '../store/useArchiveStore';
import { PhotoCategory } from '../types';
import { FooterDisclaimer } from '../components/FooterDisclaimer';

export const RestorationPage: React.FC = () => {
  const { archives, selectedArchiveId, setSelectedArchiveId, runSuperResolutionForArchive, updateArchiveStatus } =
    useArchiveStore();

  const selectedArchive = archives.find((a) => a.id === selectedArchiveId) || archives[0];
  const [isRunningSR, setIsRunningSR] = useState(false);
  const [manualCategory, setManualCategory] = useState<PhotoCategory>(selectedArchive?.finalCategory || 'bangunan');

  const originalVersion = selectedArchive?.versions.find((v) => v.versionType === 'original') || selectedArchive?.versions[0];
  const derivativeVersion = selectedArchive?.versions.find((v) => v.versionType === 'derivative');

  const handleRunSR = async () => {
    if (!selectedArchive) return;
    setIsRunningSR(true);
    await new Promise((resolve) => setTimeout(resolve, 1800));
    await runSuperResolutionForArchive(selectedArchive.id);
    setIsRunningSR(false);
  };

  const handleCategoryCorrection = (cat: PhotoCategory) => {
    setManualCategory(cat);
    if (selectedArchive) {
      updateArchiveStatus(selectedArchive.id, selectedArchive.status, cat);
    }
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="space-y-3">
        <p className="text-xs font-mono font-medium tracking-wider text-ink-muted uppercase">
          SUNNYREST · ARSIP FOTO BERIZIN
        </p>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-ink leading-tight max-w-4xl">
          Lihat prediksi kategori dari CNN dan hasil super-resolution sebagai versi turunan. Keluaran AI bukan bukti keaslian atau fakta sejarah.
        </h1>
      </div>

      {/* Main Analysis Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Left: Input Analisis */}
        <div className="bg-surface border border-border rounded-card p-6 space-y-4 shadow-subtle">
          <h2 className="text-xs font-mono font-semibold tracking-wider text-ink-muted uppercase">
            INPUT ANALISIS
          </h2>

          <div className="space-y-1.5">
            <label htmlFor="archive-picker" className="text-xs font-mono text-ink-muted">
              Pilih arsip hasil unggah
            </label>
            <select
              id="archive-picker"
              value={selectedArchive?.id}
              onChange={(e) => {
                setSelectedArchiveId(e.target.value);
                const item = archives.find((a) => a.id === e.target.value);
                if (item) setManualCategory(item.finalCategory);
              }}
              className="w-full px-3.5 py-2.5 rounded-btn bg-surface border border-border text-xs text-ink focus:border-forest outline-none min-h-[44px]"
            >
              {archives.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.id} · {a.title}
                </option>
              ))}
            </select>
          </div>

          {/* Photo container */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ink">Foto asli</span>
              <span className="text-[10px] font-mono bg-paper border border-border px-2 py-0.5 rounded-btn text-ink-muted">
                Original · tidak ditimpa
              </span>
            </div>
            <div className="h-56 rounded-btn overflow-hidden bg-paper border border-border/80">
              <img
                src={originalVersion?.imageUrl}
                alt={selectedArchive?.title}
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-[11px] font-mono text-ink-muted">Berkas sumber · contoh visual</p>
          </div>

          <div className="p-3.5 rounded-btn bg-brass-light border border-brass-border text-xs text-brass-text leading-relaxed">
            Hasil restorasi AI disimpan sebagai versi turunan yang terpisah. Foto sumber tetap dipertahankan.
          </div>
        </div>

        {/* Right: Saran Model AI */}
        <div className="bg-surface border border-border rounded-card p-6 space-y-5 shadow-subtle">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono font-semibold tracking-wider text-ink-muted uppercase">
              SARAN MODEL AI · CONTOH TAMPILAN
            </h2>
            <span className="text-[10px] font-mono bg-sage text-forest px-2 py-0.5 rounded-btn">
              Saran AI
            </span>
          </div>

          {/* Prediction display */}
          <div className="space-y-1">
            <p className="text-xs font-mono text-ink-muted">Kategori prediksi</p>
            <p className="text-3xl font-display font-bold text-ink capitalize">
              {selectedArchive?.aiPrediction.category}
            </p>
            <p className="text-xs font-mono text-ink-muted">
              Confidence: {(selectedArchive ? selectedArchive.aiPrediction.confidence * 100 : 94).toFixed(1)}% · nilai aktual diisi dari inferensi model.
            </p>
          </div>

          {/* Manual Correction */}
          <div className="space-y-1.5">
            <label htmlFor="manual-cat-select" className="text-xs font-mono text-ink-muted">
              Kategori final (koreksi manual)
            </label>
            <select
              id="manual-cat-select"
              value={manualCategory}
              onChange={(e) => handleCategoryCorrection(e.target.value as PhotoCategory)}
              className="w-full px-3.5 py-2.5 rounded-btn bg-surface border border-border text-xs text-ink focus:border-forest outline-none min-h-[44px]"
            >
              <option value="bangunan">Bangunan</option>
              <option value="orang">Orang</option>
              <option value="lanskap">Lanskap</option>
            </select>
          </div>

          {/* Model Status */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-ink-muted">Status model</label>
            <div className="p-2.5 rounded-btn bg-paper border border-border text-xs font-mono text-ink">
              Layanan inferensi aktif · model transfer learning siap
            </div>
          </div>

          {/* Super-Resolution Trigger */}
          <div className="pt-3 border-t border-border/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-display font-bold text-ink">Super-resolution</p>
                <p className="text-xs text-ink-muted">Model pralatih x4 untuk restorasi visual</p>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-btn bg-paper border border-border text-ink-muted">
                {derivativeVersion ? 'Sudah dijalankan' : 'Belum dijalankan'}
              </span>
            </div>

            <button
              type="button"
              disabled={isRunningSR || !!derivativeVersion}
              onClick={handleRunSR}
              className={`w-full py-2.5 px-4 rounded-btn text-xs font-semibold flex items-center justify-center gap-2 min-h-[44px] transition-colors ${
                derivativeVersion
                  ? 'bg-paper text-ink-muted border border-border cursor-not-allowed'
                  : 'bg-forest hover:bg-forest-hover text-surface shadow-subtle'
              }`}
            >
              {isRunningSR ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memproses restorasi super-resolution...</span>
                </>
              ) : derivativeVersion ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-forest" />
                  <span>Versi turunan telah dibuat</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Jalankan model SR pralatih</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Perbandingan Versi */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-display font-bold text-ink">Perbandingan versi</h2>
          <span className="text-xs font-mono text-ink-muted">
            Preview ilustratif · bukan hasil model
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Original */}
          <div className="bg-surface border border-border rounded-card p-5 space-y-3 shadow-subtle">
            <div className="h-60 rounded-btn overflow-hidden bg-paper border border-border/80">
              <img
                src={originalVersion?.imageUrl}
                alt="Foto sumber"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">Original · versi sumber</p>
              <p className="text-xs text-ink-muted font-mono">Foto input resolusi asli tanpa manipulasi.</p>
            </div>
          </div>

          {/* Derivative */}
          <div className="bg-surface border border-border rounded-card p-5 space-y-3 shadow-subtle">
            <div className="h-60 rounded-btn overflow-hidden bg-paper border border-border/80 flex items-center justify-center">
              {derivativeVersion ? (
                <img
                  src={derivativeVersion.imageUrl}
                  alt="Hasil restorasi AI"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="p-4 text-center text-xs text-ink-muted font-mono">
                  Tekan "Jalankan model SR pralatih" di atas untuk menghasilkan versi turunan.
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">Hasil restorasi AI · derivative</p>
              <p className="text-xs text-ink-muted font-mono">
                Kualitas tidak boleh diklaim tanpa hasil evaluasi model.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Catatan Evaluasi Restorasi */}
      <section className="space-y-2">
        <h2 className="text-sm font-display font-bold text-ink">Catatan evaluasi restorasi</h2>
        <div className="p-4 rounded-card bg-surface border border-border text-xs text-ink-muted font-mono leading-relaxed">
          PSNR/SSIM hanya ditampilkan jika tersedia pasangan LR/HR yang sah dan selaras. Jika tidak, gunakan penilaian kualitatif dengan rubrik.
        </div>
      </section>

      <FooterDisclaimer />
    </div>
  );
};
