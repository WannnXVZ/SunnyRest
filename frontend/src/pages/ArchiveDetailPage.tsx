import React, { useState } from 'react';
import { ArrowLeft, Download, Sparkles, CheckCircle2, RotateCw, ArrowRight, ArrowUpRight, Info } from 'lucide-react';
import { useArchiveStore } from '../store/useArchiveStore';
import { truncateIdentifier } from '../lib/hash';
import { FooterDisclaimer } from '../components/FooterDisclaimer';

export const ArchiveDetailPage: React.FC = () => {
  const { selectedArchiveId, archives, setActivePage, runSuperResolutionForArchive } = useArchiveStore();

  const archive = archives.find((a) => a.id === selectedArchiveId) || archives[0];
  const [isVerifying, setIsVerifying] = useState(false);

  if (!archive) {
    return (
      <div className="p-12 text-center max-w-xl mx-auto space-y-4">
        <p className="text-sm font-mono text-ink-muted">Arsip tidak ditemukan.</p>
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

  const originalVersion = archive.versions.find((v) => v.versionType === 'original') || archive.versions[0];
  const derivativeVersion = archive.versions.find((v) => v.versionType === 'derivative');

  const handleCreateRestoration = async () => {
    if (!derivativeVersion) {
      await runSuperResolutionForArchive(archive.id);
    }
  };

  const handleVerifyAgain = async () => {
    setIsVerifying(true);
    await new Promise((r) => setTimeout(r, 600));
    setIsVerifying(false);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Top Breadcrumb Navigation */}
      <div>
        <button
          type="button"
          onClick={() => setActivePage('arsip')}
          className="inline-flex items-center gap-2 text-xs font-mono text-ink-muted hover:text-forest transition-colors py-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Galeri arsip / <span className="capitalize">{archive.finalCategory}</span> / {archive.id}</span>
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
            Satu sumber, jejak versi yang tetap utuh. Lokasi & tahun tidak teridentifikasi.
          </p>
        </div>

        {/* Action Buttons Top Right */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <a
            href={originalVersion.imageUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-btn bg-surface hover:bg-paper border border-border text-xs font-semibold text-ink shadow-subtle min-h-[38px] transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-ink-muted" />
            <span>Unduh asli</span>
          </a>

          <button
            type="button"
            onClick={handleCreateRestoration}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-btn bg-gold hover:bg-gold-hover text-ink text-xs font-semibold shadow-subtle min-h-[38px] transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-ink" />
            <span>Buat restorasi x2</span>
          </button>
        </div>
      </div>

      {/* Side-by-Side Image Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Foto Asli */}
        <div className="bg-surface border border-border rounded-card overflow-hidden shadow-card flex flex-col justify-between">
          <div className="p-3.5 border-b border-border flex items-center justify-between text-xs font-mono">
            <span className="font-semibold text-ink">Foto asli</span>
            <span className="px-2 py-0.5 rounded-btn bg-paper border border-border text-ink-muted text-[11px]">
              Berkas sumber
            </span>
          </div>

          <div className="relative aspect-[4/3] bg-paper overflow-hidden flex items-center justify-center">
            <img
              src={originalVersion.imageUrl}
              alt={archive.title}
              className="w-full h-full object-cover grayscale contrast-110"
            />
          </div>

          <div className="p-3.5 border-t border-border bg-paper/50 flex items-center justify-between text-[11px] font-mono text-ink-muted">
            <span>1.000 × 1.200 px · JPG</span>
            <span>Token #{originalVersion.onChainTokenId || '104'} · Lokal</span>
          </div>
        </div>

        {/* Card 2: Restorasi x2 */}
        <div className="bg-surface border border-border rounded-card overflow-hidden shadow-card flex flex-col justify-between">
          <div className="p-3.5 border-b border-border flex items-center justify-between text-xs font-mono">
            <span className="font-semibold text-ink">Restorasi x2</span>
            <span className="px-2 py-0.5 rounded-btn bg-gold-light border border-gold-border text-ink text-[11px] font-medium">
              Hasil AI · simulasi
            </span>
          </div>

          <div className="relative aspect-[4/3] bg-paper overflow-hidden flex items-center justify-center">
            <img
              src={derivativeVersion?.imageUrl || originalVersion.imageUrl}
              alt={`${archive.title} - Restorasi`}
              className="w-full h-full object-cover contrast-125 brightness-105"
            />
          </div>

          <div className="p-3.5 border-t border-border bg-paper/50 flex items-center justify-between text-[11px] font-mono text-ink-muted">
            <span>3.200 × 2.400 px · pratinjau contoh</span>
            <span>Token #{derivativeVersion?.onChainTokenId || '105'} · Lokal</span>
          </div>
        </div>
      </div>

      {/* Yellow Advisory Callout Banner */}
      <div className="p-4 rounded-card bg-gold-light border border-gold-border space-y-1 text-ink">
        <div className="flex items-center gap-2 text-xs font-bold">
          <Info className="w-4 h-4 text-ink flex-shrink-0" />
          <span>Restorasi AI bukan bukti detail sejarah</span>
        </div>
        <p className="text-xs font-sans text-ink/80 leading-relaxed pl-6">
          Contoh pratinjau, bukan hasil pemrosesan nyata. Super-resolution x2 dapat membentuk detail baru. Berkas asli tetap disimpan; setiap restorasi yang didaftarkan menjadi token baru, bukan menimpa versi sebelumnya.
        </p>
      </div>

      {/* 2-Column Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Metadata & Token Identity */}
        <div className="space-y-6">
          {/* Card: Sumber & hak penggunaan */}
          <div className="bg-surface border border-border rounded-card p-6 space-y-4 shadow-subtle">
            <h2 className="font-display font-bold text-base text-ink">
              Sumber & hak penggunaan
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
                <p className="text-ink font-medium mt-0.5">Catatan koleksi {archive.id}</p>
              </div>
            </div>

            <p className="text-[11px] font-mono text-ink-muted pt-3 border-t border-border/80">
              Izin belum diverifikasi. Status kurasi dan pendaftaran hanya simulasi, bukan bukti hak penggunaan foto.
            </p>
          </div>

          {/* Card: Identitas token asli */}
          <div className="bg-surface border border-border rounded-card p-6 space-y-4 shadow-subtle">
            <h2 className="font-display font-bold text-base text-ink">
              Identitas token asli
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
              <div>
                <p className="text-ink-muted text-[11px] font-mono">Pemilik token</p>
                <p className="text-ink font-mono font-medium mt-0.5">
                  0x7A...91C2 · wallet contoh
                </p>
              </div>

              <div>
                <p className="text-ink-muted text-[11px] font-mono">Kategori final / kurator</p>
                <p className="text-ink font-medium mt-0.5 capitalize">
                  {archive.finalCategory} · keputusan demo
                </p>
              </div>

              <div>
                <p className="text-ink-muted text-[11px] font-mono">Jaringan / koleksi / tokenId</p>
                <p className="text-ink font-mono mt-0.5">
                  Lokal / SunnyRest-demo / {originalVersion.onChainTokenId || '104'}
                </p>
              </div>

              <div>
                <p className="text-ink-muted text-[11px] font-mono">Relasi sumber</p>
                <p className="text-ink font-mono mt-0.5">
                  parentId = 0 · versi asli
                </p>
              </div>
            </div>

            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-btn bg-sage border border-sage-border text-forest text-xs font-mono font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-forest" />
                <span>Terkonfirmasi · simulasi lokal</span>
              </span>
            </div>

            <p className="text-[11px] font-mono text-ink-muted pt-3 border-t border-border/80">
              Tidak ada kontrak atau bukti transaksi nyata. NFT membuktikan kepemilikan token, bukan hak cipta.
            </p>
          </div>
        </div>

        {/* Right Column: Verifikasi Integritas */}
        <div className="bg-surface border border-border rounded-card p-6 space-y-5 shadow-subtle flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-display font-bold text-base text-ink">
                  Verifikasi integritas
                </h2>
                <p className="text-xs text-ink-muted font-sans mt-0.5">
                  Berkas asli · perbandingan hash, bukan kesamaan CID
                </p>
              </div>

              <button
                type="button"
                onClick={handleVerifyAgain}
                disabled={isVerifying}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-btn bg-surface hover:bg-paper border border-border text-xs font-mono text-ink shadow-subtle transition-colors"
              >
                <RotateCw className={`w-3.5 h-3.5 text-forest ${isVerifying ? 'animate-spin' : ''}`} />
                <span>Verifikasi ulang</span>
              </button>
            </div>

            {/* Verification Status Pill */}
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-btn bg-sage border border-sage-border text-forest text-xs font-mono font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-forest" />
                <span>Hash cocok · simulasi</span>
              </span>
            </div>

            {/* Monospace Hash Boxes */}
            <div className="space-y-3 font-mono text-xs">
              <div className="p-3.5 rounded-btn bg-paper/80 border border-border space-y-1">
                <p className="text-[11px] text-ink-muted">
                  SHA-256 hitung ulang berkas · nilai contoh
                </p>
                <p className="text-ink text-[11px] break-all select-all font-mono leading-relaxed">
                  {originalVersion.fileHash}
                </p>
              </div>

              <div className="p-3.5 rounded-btn bg-paper/80 border border-border space-y-1">
                <p className="text-[11px] text-ink-muted">
                  SHA-256 catatan on-chain · nilai contoh
                </p>
                <p className="text-ink text-[11px] break-all select-all font-mono leading-relaxed">
                  {originalVersion.fileHash}
                </p>
              </div>
            </div>

            {/* CID and Metadata URI */}
            <div className="space-y-2 pt-2 text-xs font-mono">
              <div>
                <p className="text-[11px] text-ink-muted">CID media · alamat konten IPFS</p>
                <p className="text-ink text-[11px] break-all select-all mt-0.5">
                  {truncateIdentifier(originalVersion.ipfsCid, 12, 10)} (contoh, disingkat)
                </p>
              </div>

              <div>
                <p className="text-[11px] text-ink-muted">URI metadata · dokumen JSON token</p>
                <p className="text-ink text-[11px] break-all select-all mt-0.5">
                  ipfs://bafy...metadata/104.json (contoh)
                </p>
              </div>
            </div>
          </div>

          <p className="text-[11px] font-mono text-ink-muted pt-3 border-t border-border/80">
            Hash dihitung ulang dari berkas yang diambil lalu dibandingkan dengan catatan on-chain. CID media bukan SHA-256 mentah. Kecocokan tidak membuktikan sumber, izin, atau akurasi sejarah.
          </p>
        </div>
      </div>

      {/* Bottom Section: Riwayat sumber & turunan */}
      <div className="space-y-4 pt-4 border-t border-border/80">
        <div>
          <h2 className="font-display font-bold text-lg text-ink">
            Riwayat sumber & turunan
          </h2>
          <p className="text-xs text-ink-muted font-sans mt-0.5">
            Setiap versi memiliki identitas token, SHA-256, CID media, dan URI metadata sendiri.
          </p>
        </div>

        {/* Horizontal Version Cards with Flow Arrow */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-4">
          {/* Version 1: Sumber */}
          <div className="bg-surface border border-border rounded-card p-4 space-y-2 shadow-subtle">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-ink">Asli / Token #{originalVersion.onChainTokenId || '104'}</span>
              <span className="px-2 py-0.5 rounded-btn bg-paper border border-border text-ink-muted text-[10px]">
                Sumber
              </span>
            </div>
            <p className="text-xs text-ink-muted font-mono">
              parentId = 0 · 1.600 × 1.200 px
            </p>
            <p className="text-[11px] text-ink-muted font-mono">
              04 Nov 2026, 09.20 · Terkonfirmasi (simulasi)
            </p>
            <div className="pt-1">
              <span className="inline-flex items-center gap-1 text-xs font-mono text-forest hover:underline cursor-pointer">
                <span>Lihat identitas berkas</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* Flow Arrow */}
          <div className="hidden md:flex items-center justify-center text-ink-muted">
            <ArrowRight className="w-5 h-5 text-ink-muted" />
          </div>

          {/* Version 2: Hasil AI */}
          <div className="bg-surface border border-border rounded-card p-4 space-y-2 shadow-subtle">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-ink">Restorasi x2 / Token #{derivativeVersion?.onChainTokenId || '105'}</span>
              <span className="px-2 py-0.5 rounded-btn bg-gold-light border border-gold-border text-ink text-[10px] font-medium">
                Hasil AI
              </span>
            </div>
            <p className="text-xs text-ink-muted font-mono">
              parentId = 104 · 3.200 × 2.400 px
            </p>
            <p className="text-[11px] text-ink-muted font-mono">
              04 Nov 2026, 09.45 · Terkonfirmasi (simulasi)
            </p>
            <div className="pt-1">
              <span className="inline-flex items-center gap-1 text-xs font-mono text-forest hover:underline cursor-pointer">
                <span>Lihat identitas berkas</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>
      </div>

      <FooterDisclaimer />
    </div>
  );
};
