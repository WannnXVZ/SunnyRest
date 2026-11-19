import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Download,
  Sparkles,
  CheckCircle2,
  RotateCw,
  ArrowRight,
  ArrowUpRight,
  Info,
  Loader2,
  X,
  Shield,
  AlertTriangle,
  ImageOff,
} from 'lucide-react';
import { useArchiveStore } from '../store/useArchiveStore';
import { NETWORKS } from '../config/networks';
import { computeFileSHA256, truncateIdentifier } from '../lib/hash';
import { fetchVersiOnChain, normalizeHexHash } from '../lib/contract';
import { resolveMediaUrl } from '../lib/api';
import { FooterDisclaimer } from '../components/FooterDisclaimer';

interface IntegrityCheckState {
  status: 'idle' | 'match_onchain' | 'match_local' | 'mismatch' | 'error';
  message: string;
  computedHash?: string;
  onChainHash?: string;
}

export const ArchiveDetailPage: React.FC = () => {
  const {
    selectedArchiveId,
    archives,
    setActivePage,
    requestPaidRestoration,
    restorationFeeEth,
    restorationFeeError,
    refreshRestorationFee,
    wallet,
  } = useArchiveStore();

  const archive = archives.find((a) => a.id === selectedArchiveId) || archives[0];
  const [isVerifying, setIsVerifying] = useState(false);
  const [integrityCheck, setIntegrityCheck] = useState<IntegrityCheckState>({
    status: 'idle',
    message: '',
  });
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreStage, setRestoreStage] = useState<
    'idle' | 'pinning_ipfs' | 'waiting_wallet' | 'waiting_confirmation' | 'enhancing'
  >('idle');
  const [restoredSuccessMsg, setRestoredSuccessMsg] = useState<string | null>(null);
  const [restoreErrorMsg, setRestoreErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    void refreshRestorationFee();
  }, [refreshRestorationFee, wallet.chainId]);

  useEffect(() => {
    setIntegrityCheck({ status: 'idle', message: '' });
  }, [archive?.id]);

  if (!archive) {
    return (
      <div className="p-12 text-center max-w-xl mx-auto space-y-4">
        <p className="text-sm font-mono text-ink-muted">Arsip tidak ditemukan atau daftar arsip masih kosong.</p>
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
    archive.versions.find((v) => v.versionType === 'original') || archive.versions[0];
  const derivativeVersion = archive.versions.find((v) => v.versionType === 'derivative');
  const isOriginalOnChain = Boolean(originalVersion?.onChainTokenId);
  const feeDisplay = restorationFeeEth ? `${restorationFeeEth} ETH` : 'Belum tersinkronisasi';
  const origImgSrc = originalVersion?.imageUrl ? resolveMediaUrl(originalVersion.imageUrl) : '';
  const derivImgSrc = derivativeVersion?.imageUrl ? resolveMediaUrl(derivativeVersion.imageUrl) : '';
  const activeNet = NETWORKS[wallet.chainId];

  const handleCreateRestoration = () => {
    setRestoreErrorMsg(null);
    if (derivativeVersion) {
      setRestoredSuccessMsg(
        'Versi restorasi Super-Resolution x4 sudah tersedia dan dapat dibandingkan berdampingan.'
      );
      return;
    }
    void refreshRestorationFee();
    setShowRestoreModal(true);
  };

  const handleConfirmPaidRestore = async () => {
    setIsRestoring(true);
    setRestoreErrorMsg(null);
    setRestoreStage('waiting_wallet');

    const res = await requestPaidRestoration(archive.id, (stage) => setRestoreStage(stage));
    setIsRestoring(false);
    setRestoreStage('idle');

    if (res.success) {
      setShowRestoreModal(false);
      setRestoredSuccessMsg(
        `Restorasi Super-Resolution x4 selesai! Request ID #${res.requestId} (${res.feeEth} ETH) tercatat di receipt ${truncateIdentifier(
          res.txHash || '',
          10,
          8
        )}. Kurator dapat menerbitkan versi turunan ini on-chain di halaman Peninjauan Kurator.`
      );
    } else {
      setRestoreErrorMsg(res.error || 'Pembayaran on-chain atau layanan SR gagal.');
    }
  };

  const handleVerifyAgain = async () => {
    if (!originalVersion) return;
    setIsVerifying(true);
    setIntegrityCheck({ status: 'idle', message: 'Mengunduh berkas dan menghitung SHA-256...' });

    try {
      const targetUrl = resolveMediaUrl(originalVersion.imageUrl);
      if (!targetUrl) {
        setIntegrityCheck({
          status: 'error',
          message: 'URL media tidak tersedia atau gateway IPFS belum menyediakan berkas ini.',
        });
        return;
      }

      const res = await fetch(targetUrl);
      if (!res.ok) {
        setIntegrityCheck({
          status: 'error',
          message: `Berkas media gagal diambil (HTTP ${res.status}). Pastikan gateway IPFS atau server backend berjalan.`,
        });
        return;
      }

      const blob = await res.blob();
      const computed = normalizeHexHash(await computeFileSHA256(blob));
      const localExpected = normalizeHexHash(originalVersion.fileHash);

      if (originalVersion.onChainTokenId) {
        const onChain = await fetchVersiOnChain(wallet.chainId, originalVersion.onChainTokenId);
        const chainHash = normalizeHexHash(onChain.fileHash);
        if (computed === chainHash) {
          setIntegrityCheck({
            status: 'match_onchain',
            message: `Terverifikasi: SHA-256 berkas (${truncateIdentifier(computed, 10, 8)}) cocok 100% dengan catatan smart contract Token #${originalVersion.onChainTokenId}.`,
            computedHash: computed,
            onChainHash: chainHash,
          });
        } else {
          setIntegrityCheck({
            status: 'mismatch',
            message: `PERINGATAN INTEGRITAS: SHA-256 berkas terhitung (${truncateIdentifier(computed, 10, 8)}) TIDAK cocok dengan hash kontrak (${truncateIdentifier(chainHash, 10, 8)})!`,
            computedHash: computed,
            onChainHash: chainHash,
          });
        }
      } else if (computed === localExpected) {
        setIntegrityCheck({
          status: 'match_local',
          message: `SHA-256 berkas (${truncateIdentifier(computed, 10, 8)}) cocok dengan arsip antrean backend (belum tercatat on-chain).`,
          computedHash: computed,
        });
      } else {
        setIntegrityCheck({
          status: 'mismatch',
          message: `PERINGATAN: SHA-256 berkas terhitung tidak cocok dengan metadata antrean (${truncateIdentifier(localExpected, 10, 8)})!`,
          computedHash: computed,
        });
      }
    } catch (err) {
      setIntegrityCheck({
        status: 'error',
        message:
          err instanceof Error
            ? `Verifikasi gagal: ${err.message}`
            : 'Gagal melakukan verifikasi ulang integritas berkas.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <button
          type="button"
          onClick={() => setActivePage('arsip')}
          className="inline-flex items-center gap-2 text-xs font-mono text-ink-muted hover:text-forest transition-colors py-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>
            Galeri arsip / <span className="capitalize">{archive.finalCategory}</span> / {archive.id}
          </span>
        </button>
      </div>

      {/* Header and Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1.5">
          <p className="text-[11px] font-mono font-medium tracking-wider text-ink-muted uppercase">
            ARSIP {archive.id} / {archive.finalCategory.toUpperCase()}
          </p>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-ink tracking-tight">
            {archive.title}
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted font-sans max-w-2xl">
            Satu sumber, jejak versi yang tetap utuh. Hasil restorasi AI menjadi versi turunan terpisah.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          {origImgSrc && (
            <a
              href={origImgSrc}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-btn bg-surface hover:bg-paper border border-border text-xs font-semibold text-ink shadow-subtle min-h-[38px] transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-ink-muted" />
              <span>Unduh asli</span>
            </a>
          )}

          <button
            type="button"
            onClick={handleCreateRestoration}
            disabled={!isOriginalOnChain && !derivativeVersion}
            title={
              !isOriginalOnChain
                ? 'Arsip harus memiliki Token ID on-chain sebelum dapat diajukan restorasi berbayar'
                : undefined
            }
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-btn text-xs font-semibold shadow-subtle min-h-[38px] transition-colors ${
              !isOriginalOnChain && !derivativeVersion
                ? 'bg-paper border border-border text-ink-muted cursor-not-allowed'
                : 'bg-gold hover:bg-gold-hover text-ink'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {derivativeVersion
                ? 'Restorasi x4 Tersedia'
                : !isOriginalOnChain
                ? 'Perlu Terbit On-Chain Dulu'
                : `Minta Restorasi x4 (${feeDisplay})`}
            </span>
          </button>
        </div>
      </div>

      {restoredSuccessMsg && (
        <div className="p-3.5 rounded-btn bg-sage border border-sage-border text-forest text-xs font-sans flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{restoredSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setRestoredSuccessMsg(null)}
            className="text-forest hover:text-forest-hover"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Side-by-Side Image Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface border border-border rounded-card overflow-hidden shadow-card flex flex-col justify-between">
          <div className="p-3.5 border-b border-border flex items-center justify-between text-xs font-mono">
            <span className="font-semibold text-ink">Foto asli</span>
            <span className="px-2 py-0.5 rounded-btn bg-paper border border-border text-ink-muted text-[11px]">
              Berkas sumber
            </span>
          </div>

          <div className="relative aspect-[4/3] bg-paper overflow-hidden flex items-center justify-center">
            {origImgSrc ? (
              <img
                src={origImgSrc}
                alt={archive.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center text-xs font-mono text-ink-muted p-6 space-y-2">
                <ImageOff className="w-6 h-6 mx-auto opacity-50" />
                <span>Media tidak ditemukan</span>
              </div>
            )}
          </div>

          <div className="p-3.5 border-t border-border bg-paper/50 flex items-center justify-between text-[11px] font-mono text-ink-muted">
            <span>{originalVersion?.dimensions || 'Versi sumber asli'}</span>
            <span>
              {originalVersion?.onChainTokenId
                ? `Token #${originalVersion.onChainTokenId}`
                : 'Belum dicatat on-chain'}
            </span>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-card overflow-hidden shadow-card flex flex-col justify-between">
          <div className="p-3.5 border-b border-border flex items-center justify-between text-xs font-mono">
            <span className="font-semibold text-ink">Restorasi Super-Resolution x4</span>
            <span className="px-2 py-0.5 rounded-btn bg-gold-light border border-gold-border text-ink text-[11px] font-medium">
              {derivativeVersion ? 'Hasil AI x4' : 'Belum diproses'}
            </span>
          </div>

          <div className="relative aspect-[4/3] bg-paper overflow-hidden flex items-center justify-center">
            {derivImgSrc ? (
              <img
                src={derivImgSrc}
                alt={`${archive.title} - Restorasi x4`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="p-6 text-center text-xs font-mono text-ink-muted space-y-2">
                <Sparkles className="w-6 h-6 mx-auto text-ink-muted/60" />
                <p>
                  {isOriginalOnChain
                    ? 'Klik "Minta Restorasi x4" untuk membayar biaya on-chain dan memproses Super-Resolution x4.'
                    : 'Terbitkan arsip ke smart contract terlebih dahulu untuk mengaktifkan permintaan restorasi berbayar.'}
                </p>
              </div>
            )}
          </div>

          <div className="p-3.5 border-t border-border bg-paper/50 flex items-center justify-between text-[11px] font-mono text-ink-muted">
            <span>{derivativeVersion?.methodLabel || 'Real-ESRGAN x4'}</span>
            <span>
              {derivativeVersion?.onChainTokenId
                ? `Token #${derivativeVersion.onChainTokenId}`
                : derivativeVersion?.requestId
                ? `Request #${derivativeVersion.requestId} (Menunggu terbit kurator)`
                : 'Belum ada versi turunan'}
            </span>
          </div>
        </div>
      </div>

      {/* Advisory Callout */}
      <div className="p-4 rounded-card bg-gold-light border border-gold-border space-y-1 text-ink">
        <div className="flex items-center gap-2 text-xs font-bold">
          <Info className="w-4 h-4 text-ink flex-shrink-0" />
          <span>Restorasi AI bukan bukti detail sejarah</span>
        </div>
        <p className="text-xs font-sans text-ink/80 leading-relaxed pl-6">
          Model Super-Resolution x4 merekonstruksi piksel secara statistik dan dapat membentuk detail baru. Berkas asli tetap disimpan; setiap restorasi yang didaftarkan menjadi token baru dengan parentId merujuk versi sumber.
        </p>
      </div>

      {/* 2-Column Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-surface border border-border rounded-card p-6 space-y-4 shadow-subtle">
            <h2 className="font-display font-bold text-base text-ink">
              Sumber &amp; hak penggunaan
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
              <div>
                <p className="text-ink-muted text-[11px] font-mono">Sumber</p>
                <p className="text-ink font-medium mt-0.5">{archive.source}</p>
              </div>

              <div>
                <p className="text-ink-muted text-[11px] font-mono">Kredit pencipta</p>
                <p className="text-ink font-medium mt-0.5">{archive.creator}</p>
              </div>

              <div>
                <p className="text-ink-muted text-[11px] font-mono">Lisensi yang dicantumkan</p>
                <p className="text-ink font-medium mt-0.5">{archive.licenseInfo}</p>
              </div>

              <div>
                <p className="text-ink-muted text-[11px] font-mono">Rujukan sumber</p>
                <p className="text-ink font-medium mt-0.5">
                  {archive.sourceRef || `Catatan koleksi ${archive.id}`}
                </p>
              </div>
            </div>

            <p className="text-[11px] font-mono text-ink-muted pt-3 border-t border-border/80">
              NFT membuktikan kepemilikan token versi on-chain, bukan kepemilikan hak cipta atau keabsahan fakta sejarah.
            </p>
          </div>

          <div className="bg-surface border border-border rounded-card p-6 space-y-4 shadow-subtle">
            <h2 className="font-display font-bold text-base text-ink">
              Identitas token asli
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
              <div>
                <p className="text-ink-muted text-[11px] font-mono">Status on-chain</p>
                <p className="text-ink font-mono font-medium mt-0.5">
                  {originalVersion?.onChainVerified ? 'Tercatat & terverifikasi' : 'Belum diterbitkan ke kontrak'}
                </p>
              </div>

              <div>
                <p className="text-ink-muted text-[11px] font-mono">Kategori final / kurator</p>
                <p className="text-ink font-medium mt-0.5 capitalize">{archive.finalCategory}</p>
              </div>

              <div>
                <p className="text-ink-muted text-[11px] font-mono">Jaringan / tokenId</p>
                <p className="text-ink font-mono mt-0.5">
                  {wallet.chainName} /{' '}
                  {originalVersion?.onChainTokenId ? `#${originalVersion.onChainTokenId}` : 'Belum ada'}
                </p>
              </div>

              <div>
                <p className="text-ink-muted text-[11px] font-mono">Pemilik (ownerOf)</p>
                <p className="text-ink font-mono mt-0.5 break-all">
                  {originalVersion?.ownerAddress
                    ? truncateIdentifier(originalVersion.ownerAddress, 6, 4)
                    : '-'}
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-btn text-xs font-mono font-medium ${
                  originalVersion?.onChainVerified
                    ? 'bg-sage border border-sage-border text-forest'
                    : 'bg-paper border border-border text-ink-muted'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  {originalVersion?.onChainVerified
                    ? 'Receipt on-chain valid'
                    : 'Menunggu penerbitan kurator'}
                </span>
              </span>

              {activeNet?.explorerUrl && originalVersion?.transactionHash && (
                <a
                  href={`${activeNet.explorerUrl}/tx/${originalVersion.transactionHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-mono text-forest hover:underline"
                >
                  <span>Lihat di Etherscan</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Verifikasi Integritas Nyata */}
        <div className="bg-surface border border-border rounded-card p-6 space-y-5 shadow-subtle flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-display font-bold text-base text-ink">
                  Verifikasi integritas
                </h2>
                <p className="text-xs text-ink-muted font-sans mt-0.5">
                  Berkas asli · re-hash SHA-256 langsung &amp; bandingkan dengan smart contract
                </p>
              </div>

              <button
                type="button"
                onClick={() => void handleVerifyAgain()}
                disabled={isVerifying}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-btn bg-surface hover:bg-paper border border-border text-xs font-mono text-ink shadow-subtle transition-colors"
              >
                <RotateCw className={`w-3.5 h-3.5 text-forest ${isVerifying ? 'animate-spin' : ''}`} />
                <span>Verifikasi ulang</span>
              </button>
            </div>

            {integrityCheck.status !== 'idle' && (
              <div
                className={`p-3 rounded-btn border text-xs font-mono leading-relaxed ${
                  integrityCheck.status === 'match_onchain' ||
                  integrityCheck.status === 'match_local'
                    ? 'bg-sage border-sage-border text-forest'
                    : integrityCheck.status === 'mismatch' || integrityCheck.status === 'error'
                    ? 'bg-status-dangerBg border-border text-status-danger'
                    : 'bg-paper border-border text-ink-muted'
                }`}
              >
                {integrityCheck.message}
              </div>
            )}

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3.5 rounded-btn bg-paper/80 border border-border space-y-1">
                <p className="text-[11px] text-ink-muted">SHA-256 berkas</p>
                <p className="text-ink text-[11px] break-all select-all font-mono leading-relaxed">
                  {originalVersion?.fileHash || '-'}
                </p>
              </div>

              {originalVersion?.transactionHash && (
                <div className="p-3.5 rounded-btn bg-paper/80 border border-border space-y-1">
                  <p className="text-[11px] text-ink-muted">Transaction Hash Minting</p>
                  <p className="text-ink text-[11px] break-all select-all font-mono leading-relaxed">
                    {originalVersion.transactionHash}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2 text-xs font-mono">
              <div>
                <p className="text-[11px] text-ink-muted">CID media / URI metadata IPFS</p>
                <p className="text-ink text-[11px] break-all select-all mt-0.5">
                  {originalVersion?.metadataUri ||
                    originalVersion?.ipfsCid ||
                    'Belum dipin ke IPFS (menunggu publikasi kurator)'}
                </p>
              </div>
            </div>
          </div>

          <p className="text-[11px] font-mono text-ink-muted pt-3 border-t border-border/80">
            Menekan "Verifikasi ulang" mengunduh byte gambar saat ini, menghitung SHA-256 secara langsung, lalu membandingkannya dengan `getVersi(tokenId).fileHash`.
          </p>
        </div>
      </div>

      {/* Bottom Section: Riwayat sumber & turunan */}
      <div className="space-y-4 pt-4 border-t border-border/80">
        <div>
          <h2 className="font-display font-bold text-lg text-ink">
            Riwayat sumber &amp; turunan
          </h2>
          <p className="text-xs text-ink-muted font-sans mt-0.5">
            Setiap versi memiliki identitas token, SHA-256, CID media, dan metadata sendiri.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="bg-surface border border-border rounded-card p-4 space-y-2 shadow-subtle">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-ink">
                {originalVersion?.onChainTokenId
                  ? `Asli / Token #${originalVersion.onChainTokenId}`
                  : 'Asli / Belum Tercatat'}
              </span>
              <span className="px-2 py-0.5 rounded-btn bg-paper border border-border text-ink-muted text-[10px]">
                Sumber
              </span>
            </div>
            <p className="text-xs text-ink-muted font-mono">parentId = 0</p>
            <p className="text-[11px] text-ink-muted font-mono">{originalVersion?.timestamp}</p>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setActivePage('verifikasi')}
                className="inline-flex items-center gap-1 text-xs font-mono text-forest hover:underline"
              >
                <span>Buka audit on-chain</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="hidden md:flex items-center justify-center text-ink-muted">
            <ArrowRight className="w-5 h-5 text-ink-muted" />
          </div>

          <div className="bg-surface border border-border rounded-card p-4 space-y-2 shadow-subtle">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-ink">
                {derivativeVersion
                  ? derivativeVersion.onChainTokenId
                    ? `Super-Resolution x4 / Token #${derivativeVersion.onChainTokenId}`
                    : 'Super-Resolution x4 / Menunggu Terbit'
                  : 'Belum ada versi restorasi'}
              </span>
              <span className="px-2 py-0.5 rounded-btn bg-gold-light border border-gold-border text-ink text-[10px] font-medium">
                Hasil AI x4
              </span>
            </div>
            <p className="text-xs text-ink-muted font-mono">
              {derivativeVersion
                ? `parentId = ${originalVersion?.onChainTokenId || '-'} · ${
                    derivativeVersion.requestId ? `Request #${derivativeVersion.requestId}` : 'Kurator'
                  }`
                : 'Belum diajukan'}
            </p>
            <p className="text-[11px] text-ink-muted font-mono">
              {derivativeVersion?.timestamp || '-'}
            </p>
          </div>
        </div>
      </div>

      {/* Paid AI Restoration Modal */}
      {showRestoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-card p-6 sm:p-8 max-w-lg w-full shadow-card space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-gold-light border border-gold-border flex items-center justify-center text-ink">
                  <Sparkles className="w-5 h-5 text-ink" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-ink">
                    Ajukan Restorasi AI (Super-Resolution x4)
                  </h3>
                  <p className="text-xs text-ink-muted font-sans">
                    Arsip: {archive.id} · Token Induk #{originalVersion?.onChainTokenId}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isRestoring}
                onClick={() => setShowRestoreModal(false)}
                className="p-1 rounded-btn text-ink-muted hover:text-ink hover:bg-paper"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {restorationFeeError && (
              <div className="p-3 rounded-btn bg-status-dangerBg border border-border text-status-danger text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{restorationFeeError}</span>
              </div>
            )}

            {restoreErrorMsg && (
              <div className="p-3 rounded-btn bg-status-dangerBg border border-border text-status-danger text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{restoreErrorMsg}</span>
              </div>
            )}

            <div className="p-4 rounded-btn bg-paper/80 border border-border space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">Jaringan Aktif:</span>
                <span className="text-ink font-semibold">
                  {wallet.chainName} ({wallet.chainId})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">Model Pralatih:</span>
                <span className="text-ink font-semibold">Real-ESRGAN x4</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-border/80">
                <span className="text-ink-muted">Biaya Kontrak (`biayaRestorasi`):</span>
                <span className="px-2 py-0.5 rounded bg-gold text-ink font-bold font-mono">
                  {feeDisplay}
                </span>
              </div>
            </div>

            {isRestoring && (
              <div className="p-3.5 rounded-btn bg-paper border border-border text-xs font-mono space-y-1.5">
                <p className={restoreStage === 'waiting_wallet' ? 'text-forest font-bold' : 'text-ink-muted'}>
                  1. Menunggu tanda tangan MetaMask untuk `ajukanRestorasi({originalVersion?.onChainTokenId})`
                </p>
                <p className={restoreStage === 'waiting_confirmation' ? 'text-forest font-bold' : 'text-ink-muted'}>
                  2. Menunggu konfirmasi receipt transaksi on-chain
                </p>
                <p className={restoreStage === 'enhancing' ? 'text-forest font-bold' : 'text-ink-muted'}>
                  3. Memanggil layanan AI `/enhance` (Super-Resolution x4)
                </p>
              </div>
            )}

            <div className="p-3.5 rounded-btn bg-gold-light/60 border border-gold-border text-xs text-ink/90 font-sans space-y-1">
              <p className="font-semibold flex items-center gap-1.5 text-ink">
                <Shield className="w-3.5 h-3.5" />
                <span>Alur On-Chain (Testnet / Lokal)</span>
              </p>
              <p className="leading-relaxed text-[11px]">
                Pembayaran {feeDisplay} dikirim ke kontrak melalui `ajukanRestorasi` (gas jaringan dibayar terpisah). Setelah receipt valid, AI memproses restorasi x4 dan kurator menerbitkan token turunan.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isRestoring}
                onClick={() => setShowRestoreModal(false)}
                className="px-4 py-2.5 rounded-btn bg-surface hover:bg-paper border border-border text-xs font-semibold text-ink transition-colors min-h-[40px]"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isRestoring || !restorationFeeEth}
                onClick={() => void handleConfirmPaidRestore()}
                className="px-5 py-2.5 rounded-btn bg-gold hover:bg-gold-hover text-ink text-xs font-bold shadow-subtle flex items-center gap-2 transition-colors min-h-[40px] disabled:opacity-50"
              >
                {isRestoring ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Bayar {feeDisplay} &amp; Restorasi</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <FooterDisclaimer />
    </div>
  );
};
