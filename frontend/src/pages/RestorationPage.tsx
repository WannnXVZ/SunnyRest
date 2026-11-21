import React, { useEffect, useState } from 'react';
import { Sparkles, Loader2, CheckCircle2, ImageOff } from 'lucide-react';
import { useArchiveStore } from '../store/useArchiveStore';
import { BackendHealth, checkBackendHealth, resolveMediaUrl } from '../lib/api';
import { PhotoCategory } from '../types';
import { FooterDisclaimer } from '../components/FooterDisclaimer';

export const RestorationPage: React.FC = () => {
  const {
    archives,
    selectedArchiveId,
    setSelectedArchiveId,
    setActivePage,
    requestPaidRestoration,
    retryEnhanceWithExistingRequest,
    restoringArchiveId,
    restorationStage,
    updateArchiveStatus,
    restorationFeeEth,
  } = useArchiveStore();

  const selectedArchive = archives.find((a) => a.id === selectedArchiveId) || archives[0];
  const [srError, setSrError] = useState<string | null>(null);
  const [srNotice, setSrNotice] = useState<string | null>(null);
  const [manualCategory, setManualCategory] = useState<PhotoCategory>(
    selectedArchive?.finalCategory || 'bangunan'
  );
  const [backendHealth, setBackendHealth] = useState<BackendHealth | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedArchive) {
      setManualCategory(selectedArchive.finalCategory);
    }
  }, [selectedArchive?.id, selectedArchive?.finalCategory]);

  useEffect(() => {
    void (async () => {
      try {
        const h = await checkBackendHealth();
        setBackendHealth(h);
        setHealthError(null);
      } catch (err) {
        setHealthError(
          err instanceof Error ? err.message : 'Layanan backend AI tidak dapat dijangkau.'
        );
      }
    })();
  }, []);

  if (!selectedArchive) {
    return (
      <div className="space-y-8">
        <div className="space-y-3">
          <p className="text-xs font-mono font-medium tracking-wider text-ink-muted uppercase">
            SUNNYREST · ANALISIS &amp; RESTORASI AI
          </p>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink">
            Belum ada arsip untuk dianalisis atau direstorasi.
          </h1>
        </div>
        <div className="bg-surface border border-border rounded-card p-10 text-center space-y-4">
          <p className="text-xs font-mono text-ink-muted">
            Unggah arsip baru terlebih dahulu dan terbitkan ke kontrak sebelum mengajukan Super-Resolution x4 berbayar.
          </p>
          <button
            type="button"
            onClick={() => setActivePage('unggah')}
            className="px-4 py-2 rounded-btn bg-gold hover:bg-gold-hover text-ink text-xs font-semibold"
          >
            Buka Halaman Unggah
          </button>
        </div>
        <FooterDisclaimer />
      </div>
    );
  }

  const originalVersion =
    selectedArchive.versions.find((v) => v.versionType === 'original') ||
    selectedArchive.versions[0];
  const derivativeVersion = selectedArchive.versions.find(
    (v) => v.versionType === 'derivative'
  );

  const origImgSrc = originalVersion?.imageUrl ? resolveMediaUrl(originalVersion.imageUrl) : '';
  const derivImgSrc = derivativeVersion?.imageUrl ? resolveMediaUrl(derivativeVersion.imageUrl) : '';
  const isRunningSR = restoringArchiveId === selectedArchive.id;
  const isBusyAnother = Boolean(restoringArchiveId && restoringArchiveId !== selectedArchive.id);
  const needsPersistenceRecovery = Boolean(
    derivativeVersion?.requestId &&
      !derivativeVersion.onChainTokenId &&
      derivativeVersion.imageUrl.startsWith('blob:')
  );

  const stageText =
    restorationStage === 'waiting_wallet'
      ? 'Menunggu tanda tangan MetaMask...'
      : restorationStage === 'waiting_confirmation'
      ? 'Menunggu konfirmasi transaksi on-chain...'
      : restorationStage === 'enhancing'
      ? 'Menjalankan Super-Resolution x4 di backend...'
      : 'Memproses transaksi & super-resolution...';

  const handleRunSR = async () => {
    setSrError(null);
    setSrNotice(null);
    const res = await requestPaidRestoration(selectedArchive.id);
    if (!res.success && res.error) {
      setSrError(res.error);
    } else if (res.warning) {
      setSrNotice(res.warning);
    }
  };

  const handleRetryExistingRequest = async () => {
    setSrError(null);
    setSrNotice(null);
    const res = await retryEnhanceWithExistingRequest(selectedArchive.id);
    if (!res.success && res.error) {
      setSrError(res.error);
    } else if (res.warning) {
      setSrNotice(res.warning);
    } else if (res.success) {
      setSrNotice(
        `Berhasil diproses ulang memakai Request #${res.requestId} dan tersimpan permanen di backend.`
      );
    }
  };

  const handleCategoryCorrection = async (cat: PhotoCategory) => {
    setManualCategory(cat);
    await updateArchiveStatus(selectedArchive.id, selectedArchive.status, cat);
  };

  return (
    <div className="space-y-10">
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
              Pilih arsip terdaftar
            </label>
            <select
              id="archive-picker"
              value={selectedArchive.id}
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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ink">Foto asli</span>
              <span className="text-[10px] font-mono bg-paper border border-border px-2 py-0.5 rounded-btn text-ink-muted">
                Original · tidak ditimpa
              </span>
            </div>
            <div className="h-56 rounded-btn overflow-hidden bg-paper border border-border/80 flex items-center justify-center">
              {origImgSrc ? (
                <img
                  src={origImgSrc}
                  alt={selectedArchive.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-xs font-mono text-ink-muted flex flex-col items-center gap-1">
                  <ImageOff className="w-5 h-5 opacity-50" />
                  <span>Media belum tersedia</span>
                </div>
              )}
            </div>
            <p className="text-[11px] font-mono text-ink-muted">
              {originalVersion?.fileName || selectedArchive.id}
              {originalVersion?.dimensions ? ` · ${originalVersion.dimensions}` : ''}
            </p>
          </div>

          <div className="p-3.5 rounded-btn bg-brass-light border border-brass-border text-xs text-brass-text leading-relaxed">
            Hasil restorasi AI disimpan sebagai versi turunan yang terpisah. Foto sumber tetap dipertahankan.
          </div>
        </div>

        {/* Right: Saran Model AI */}
        <div className="bg-surface border border-border rounded-card p-6 space-y-5 shadow-subtle">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono font-semibold tracking-wider text-ink-muted uppercase">
              SARAN MODEL AI
            </h2>
            <span className="text-[10px] font-mono bg-sage text-forest px-2 py-0.5 rounded-btn">
              Saran AI
            </span>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-mono text-ink-muted">Kategori prediksi</p>
            <p className="text-3xl font-display font-bold text-ink capitalize">
              {selectedArchive.aiPrediction.scores
                ? (['bangunan', 'lanskap', 'orang'] as PhotoCategory[]).reduce(
                    (best, cat) =>
                      Number(selectedArchive.aiPrediction.scores?.[cat] ?? 0) >
                      Number(selectedArchive.aiPrediction.scores?.[best] ?? 0)
                        ? cat
                        : best,
                    'bangunan'
                  )
                : selectedArchive.aiPrediction.category}
            </p>
            <p className="text-xs font-mono text-ink-muted">
              {selectedArchive.aiPrediction.confidence > 0
                ? `Confidence: ${(selectedArchive.aiPrediction.confidence * 100).toFixed(1)}% (${
                    selectedArchive.aiPrediction.modelVersion || 'CNN'
                  })`
                : 'Skor confidence tidak tersedia (kategori dipilih manual).'}
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="manual-cat-select" className="text-xs font-mono text-ink-muted">
              Kategori final (koreksi manual kurator)
            </label>
            <select
              id="manual-cat-select"
              value={manualCategory}
              onChange={(e) => void handleCategoryCorrection(e.target.value as PhotoCategory)}
              className="w-full px-3.5 py-2.5 rounded-btn bg-surface border border-border text-xs text-ink focus:border-forest outline-none min-h-[44px]"
            >
              <option value="bangunan">Bangunan</option>
              <option value="orang">Orang</option>
              <option value="lanskap">Lanskap</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-ink-muted">Status layanan backend AI</label>
            <div className="p-2.5 rounded-btn bg-paper border border-border text-xs font-mono text-ink">
              {healthError
                ? `Offline: ${healthError}`
                : backendHealth
                ? `Status: ${backendHealth.status.toUpperCase()} · Classifier: ${
                    backendHealth.classifier_loaded ? 'Aktif' : 'Tidak'
                  } · SR x4: ${backendHealth.sr_loaded ? 'Aktif' : 'Tidak'}`
                : 'Memeriksa /health backend...'}
            </div>
          </div>

          {/* Super-Resolution Trigger */}
          <div className="pt-3 border-t border-border/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-display font-bold text-ink">Super-resolution</p>
                <p className="text-xs text-ink-muted">
                  Model Real-ESRGAN x4 (
                  {restorationFeeEth
                    ? `Biaya kontrak ${restorationFeeEth} ETH`
                    : 'Menunggu sinkronisasi kontrak'}
                  )
                </p>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-btn bg-paper border border-border text-ink-muted">
                {derivativeVersion ? 'Sudah dijalankan' : 'Belum dijalankan'}
              </span>
            </div>

            {srError && (
              <div className="p-3 rounded-btn bg-status-dangerBg border border-border text-xs text-status-danger">
                {srError}
              </div>
            )}

            {srNotice && (
              <div className="p-3 rounded-btn bg-gold-light border border-gold-border text-xs text-ink">
                {srNotice}
              </div>
            )}

            {isBusyAnother && (
              <div className="p-3 rounded-btn bg-paper border border-border text-xs font-mono text-ink-muted">
                Sedang memproses restorasi untuk arsip {restoringArchiveId}...
              </div>
            )}

            {needsPersistenceRecovery ? (
              <div className="space-y-2.5">
                <div className="p-3 rounded-btn bg-status-warningBg border border-border text-xs text-status-warning leading-relaxed">
                  Berkas SR x4 sebelumnya belum tersimpan permanen di disk server (`blob:` sementara). Gunakan ulang Request #{derivativeVersion?.requestId} yang sudah dibayar — tanpa bayar ETH lagi.
                </div>
                <button
                  type="button"
                  disabled={isRunningSR || isBusyAnother}
                  onClick={() => void handleRetryExistingRequest()}
                  className="w-full py-2.5 px-4 rounded-btn text-xs font-semibold flex items-center justify-center gap-2 min-h-[44px] transition-colors bg-gold hover:bg-gold-hover text-ink shadow-subtle disabled:opacity-50"
                >
                  {isRunningSR ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{stageText}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>
                        Proses &amp; Simpan Ulang SR (Pakai Request #{derivativeVersion?.requestId}, Gratis)
                      </span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={isRunningSR || isBusyAnother || !!derivativeVersion}
                onClick={() => void handleRunSR()}
                className={`w-full py-2.5 px-4 rounded-btn text-xs font-semibold flex items-center justify-center gap-2 min-h-[44px] transition-colors ${
                  derivativeVersion && !isRunningSR
                    ? 'bg-paper text-ink-muted border border-border cursor-not-allowed'
                    : 'bg-forest hover:bg-forest-hover text-surface shadow-subtle disabled:opacity-60'
                }`}
              >
                {isRunningSR ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{stageText}</span>
                  </>
                ) : derivativeVersion ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-forest" />
                    <span>Versi turunan telah dibuat</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Bayar &amp; Jalankan Model SR x4</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Perbandingan Versi */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-display font-bold text-ink">Perbandingan versi</h2>
          <span className="text-xs font-mono text-ink-muted">
            {derivativeVersion
              ? `Output aktual: ${derivativeVersion.methodLabel || 'Real-ESRGAN x4'}`
              : 'Menunggu pemrosesan Super-Resolution x4'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-surface border border-border rounded-card p-5 space-y-3 shadow-subtle">
            <div className="h-60 rounded-btn overflow-hidden bg-paper border border-border/80 flex items-center justify-center">
              {origImgSrc ? (
                <img
                  src={origImgSrc}
                  alt="Foto sumber"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs font-mono text-ink-muted">Media tidak tersedia</span>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">Original · versi sumber</p>
              <p className="text-xs text-ink-muted font-mono">Foto input resolusi asli tanpa manipulasi.</p>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-card p-5 space-y-3 shadow-subtle">
            <div className="h-60 rounded-btn overflow-hidden bg-paper border border-border/80 flex items-center justify-center">
              {derivImgSrc ? (
                <img
                  src={derivImgSrc}
                  alt="Hasil restorasi AI"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="p-4 text-center text-xs text-ink-muted font-mono">
                  Tekan &quot;Bayar &amp; Jalankan Model SR x4&quot; di atas untuk menghasilkan versi turunan.
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">Hasil restorasi AI · derivative</p>
              <p className="text-xs text-ink-muted font-mono">
                Kualitas tidak boleh diklaim tanpa hasil evaluasi model terukur.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-display font-bold text-ink">Catatan evaluasi restorasi</h2>
        <div className="p-4 rounded-card bg-surface border border-border text-xs text-ink-muted font-mono leading-relaxed">
          PSNR/SSIM hanya ditampilkan pada hasil evaluasi yang memiliki pasangan citra LR/HR ground-truth yang selaras.
        </div>
      </section>

      <FooterDisclaimer />
    </div>
  );
};
