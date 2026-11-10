import React from 'react';
import { ArrowLeft, Sparkles, ShieldCheck } from 'lucide-react';
import { useArchiveStore } from '../store/useArchiveStore';
import { truncateIdentifier } from '../lib/hash';
import { FooterDisclaimer } from '../components/FooterDisclaimer';
import { StatusBadge } from '../components/StatusBadge';

export const ArchiveDetailPage: React.FC = () => {
  const { selectedArchiveId, archives, setActivePage } = useArchiveStore();

  const archive = archives.find((a) => a.id === selectedArchiveId) || archives[0];
  if (!archive) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-ink-muted">Arsip tidak ditemukan.</p>
        <button
          type="button"
          onClick={() => setActivePage('arsip')}
          className="mt-4 px-4 py-2 rounded-btn bg-forest text-surface text-xs font-semibold"
        >
          Kembali ke galeri
        </button>
      </div>
    );
  }

  const originalVersion = archive.versions.find((v) => v.versionType === 'original') || archive.versions[0];
  const derivativeVersion = archive.versions.find((v) => v.versionType === 'derivative');

  return (
    <div className="space-y-10">
      {/* Top Navigation */}
      <div>
        <button
          type="button"
          onClick={() => setActivePage('arsip')}
          className="inline-flex items-center gap-2 text-xs font-mono text-ink-muted hover:text-forest transition-colors py-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke galeri arsip</span>
        </button>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-btn bg-paper border border-border text-forest">
            {archive.id}
          </span>
          <StatusBadge status={archive.status} isDemo />
          <span className="text-xs font-mono text-ink-muted uppercase">
            Kategori: {archive.finalCategory}
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink">
          {archive.title}
        </h1>
        <p className="text-xs text-ink-muted font-mono">
          Kontributor: {archive.creator} · Sumber: {archive.source}
        </p>
      </div>

      {/* Detail dan riwayat versi */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-display font-bold text-ink">
            Detail dan riwayat versi · {archive.id}
          </h2>
          <span className="text-xs font-mono text-ink-muted">Contoh struktur data</span>
        </div>

        {/* Side-by-side Version Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Versi 01 · Original */}
          <div className="bg-surface border border-border rounded-card p-5 space-y-4 shadow-subtle">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold tracking-wider text-ink-muted uppercase">
                VERSI 01 · ORIGINAL
              </span>
              <span className="text-xs font-mono text-forest bg-sage px-2 py-0.5 rounded-btn">
                Sumber primer
              </span>
            </div>

            <div className="h-64 rounded-btn overflow-hidden bg-paper border border-border/80">
              <img
                src={originalVersion?.imageUrl}
                alt={archive.title}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-1">
              <p className="text-sm font-semibold text-ink">Foto sumber</p>
              <p className="text-xs font-mono text-ink-muted">
                parentId: null · hash asli tersimpan terpisah
              </p>
            </div>
          </div>

          {/* Versi 02 · Derivative */}
          <div className="bg-surface border border-border rounded-card p-5 space-y-4 shadow-subtle">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold tracking-wider text-ink-muted uppercase">
                VERSI 02 · DERIVATIVE
              </span>
              <span className="text-xs font-mono text-brass-text bg-brass-light border border-brass-border px-2 py-0.5 rounded-btn">
                Turunan AI
              </span>
            </div>

            <div className="h-64 rounded-btn overflow-hidden bg-paper border border-border/80 flex items-center justify-center">
              {derivativeVersion ? (
                <img
                  src={derivativeVersion.imageUrl}
                  alt={`Restorasi ${archive.title}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="p-6 text-center space-y-3">
                  <Sparkles className="w-8 h-8 text-brass mx-auto" />
                  <p className="text-sm font-medium text-ink">Belum ada versi restorasi AI</p>
                  <p className="text-xs text-ink-muted max-w-xs">
                    Arsip ini belum ditingkatkan resolusinya. Jalankan modul restorasi AI untuk membuat versi turunan.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActivePage('restorasi')}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-btn bg-forest hover:bg-forest-hover text-surface text-xs font-semibold"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Buka Restorasi AI</span>
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-sm font-semibold text-ink">Hasil restorasi AI</p>
              <p className="text-xs font-mono text-ink-muted">
                {derivativeVersion
                  ? `parentId: ${archive.id}-V1 · contoh relasi`
                  : 'Menunggu pemrosesan model SR'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Metadata dan Pemeriksaan */}
      <section className="space-y-4">
        <h2 className="text-xl font-display font-bold text-ink">Metadata dan pemeriksaan</h2>
        <div className="bg-surface border border-border rounded-card overflow-x-auto shadow-subtle">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-paper/50 font-mono text-ink-muted uppercase">
              <tr>
                <th className="py-3 px-4 font-medium w-1/4">FIELD</th>
                <th className="py-3 px-4 font-medium w-3/8">ORIGINAL</th>
                <th className="py-3 px-4 font-medium w-3/8">DERIVATIVE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70 font-mono">
              <tr>
                <td className="py-3 px-4 text-ink font-sans font-semibold">Token / version ID</td>
                <td className="py-3 px-4 text-ink-muted">
                  {originalVersion?.onChainTokenId ? `#${originalVersion.onChainTokenId}` : 'Belum tersedia'}
                </td>
                <td className="py-3 px-4 text-ink-muted">
                  {derivativeVersion?.onChainTokenId ? `#${derivativeVersion.onChainTokenId}` : 'Belum tersedia'}
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-ink font-sans font-semibold">Parent ID</td>
                <td className="py-3 px-4 text-ink-muted">null (akar arsip)</td>
                <td className="py-3 px-4 text-forest">
                  {derivativeVersion?.parentId || 'Merujuk versi original'}
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-ink font-sans font-semibold">Media IPFS CID</td>
                <td className="py-3 px-4 text-ink select-all">
                  {truncateIdentifier(originalVersion?.ipfsCid || '', 12, 10)}
                </td>
                <td className="py-3 px-4 text-ink select-all">
                  {derivativeVersion ? truncateIdentifier(derivativeVersion.ipfsCid, 12, 10) : 'Belum tersedia'}
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-ink font-sans font-semibold">SHA-256 file</td>
                <td className="py-3 px-4 text-ink select-all">
                  {truncateIdentifier(originalVersion?.fileHash || '', 12, 10)}
                </td>
                <td className="py-3 px-4 text-ink select-all">
                  {derivativeVersion ? truncateIdentifier(derivativeVersion.fileHash, 12, 10) : 'Belum dihitung'}
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-ink font-sans font-semibold">Status</td>
                <td className="py-3 px-4 font-sans text-forest font-medium">Original</td>
                <td className="py-3 px-4 font-sans text-brass-text font-medium">
                  {derivativeVersion ? 'Hasil restorasi AI' : 'Belum diproses'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Action shortcuts */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => setActivePage('verifikasi')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-btn bg-surface hover:bg-paper border border-border text-ink text-xs font-semibold transition-colors min-h-[44px]"
        >
          <ShieldCheck className="w-4 h-4 text-forest" />
          <span>Buka verifikasi blockchain</span>
        </button>
        <button
          type="button"
          onClick={() => setActivePage('restorasi')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-btn bg-forest hover:bg-forest-hover text-surface text-xs font-semibold transition-colors min-h-[44px]"
        >
          <Sparkles className="w-4 h-4" />
          <span>Buka di Restorasi AI</span>
        </button>
      </div>

      <FooterDisclaimer />
    </div>
  );
};
