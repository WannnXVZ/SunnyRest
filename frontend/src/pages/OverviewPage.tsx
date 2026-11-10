import React from 'react';
import { Plus, ArrowRight } from 'lucide-react';
import { useArchiveStore } from '../store/useArchiveStore';
import { StatusBadge } from '../components/StatusBadge';
import { FooterDisclaimer } from '../components/FooterDisclaimer';

export const OverviewPage: React.FC = () => {
  const { setActivePage, setSelectedArchiveId, archives } = useArchiveStore();

  const totalArchives = archives.length;
  const pendingCount = archives.filter((a) => a.status === 'menunggu_tinjauan').length;
  const recordedCount = archives.filter((a) => a.status === 'tercatat').length;

  const steps = [
    { num: '1', title: 'Input foto + sumber dan izin', desc: 'Validasi format dan hash asli' },
    { num: '2', title: 'Inferensi CNN + confidence / hasil SR', desc: 'Hasil AI hanya saran, bukan bukti keaslian' },
    { num: '3', title: 'Tinjauan kurator', desc: 'Setujui, koreksi kategori, atau tolak' },
    { num: '4', title: 'Metadata final dan unggah IPFS', desc: 'Simpan original, derivative, metadata; dapat CID' },
    { num: '5', title: 'Tanda tangan wallet kurator', desc: 'MetaMask meminta persetujuan transaksi' },
    { num: '6', title: 'Validasi kontrak ERC-721 dan pencatatan versi', desc: 'Kurator sah, parent valid, duplikat ditolak' },
    { num: '7', title: 'Galeri, receipt, riwayat versi, verifikasi hash/CID', desc: 'Baca state dan receipt setelah konfirmasi' },
  ];

  return (
    <div className="space-y-10">
      {/* Hero Header */}
      <div className="space-y-4">
        <p className="text-xs font-mono font-medium tracking-wider text-ink-muted uppercase">
          SUNNYREST · ARSIP FOTO BERIZIN
        </p>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-ink leading-tight max-w-4xl">
          Pantau alur arsip dari unggahan sampai pencatatan versi. Keputusan publikasi tetap berada pada kurator.
        </h1>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => setActivePage('unggah')}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-btn bg-forest hover:bg-forest-hover text-surface text-sm font-semibold shadow-subtle transition-colors min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>Unggah foto berizin</span>
          </button>
          <button
            type="button"
            onClick={() => setActivePage('kurator')}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-btn bg-surface hover:bg-paper border border-border text-ink text-sm font-semibold transition-colors min-h-[44px]"
          >
            <span>Lihat antrean kurasi</span>
            <ArrowRight className="w-4 h-4 text-ink-muted" />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface border border-border rounded-card p-6 shadow-subtle">
          <p className="text-xs font-mono text-ink-muted">Total arsip</p>
          <p className="text-3xl font-display font-bold text-ink mt-2">
            {125 + totalArchives}
          </p>
          <p className="text-xs font-mono text-ink-muted mt-2">Semua versi · demo</p>
        </div>

        <div className="bg-surface border border-border rounded-card p-6 shadow-subtle">
          <p className="text-xs font-mono text-ink-muted">Menunggu tinjauan</p>
          <p className="text-3xl font-display font-bold text-ink mt-2">
            {11 + pendingCount}
          </p>
          <p className="text-xs font-mono text-status-warning mt-2">Perlu tindakan kurator</p>
        </div>

        <div className="bg-surface border border-border rounded-card p-6 shadow-subtle">
          <p className="text-xs font-mono text-ink-muted">Versi tercatat</p>
          <p className="text-3xl font-display font-bold text-ink mt-2">
            {84 + recordedCount}
          </p>
          <p className="text-xs font-mono text-ink-muted mt-2">Catatan demo</p>
        </div>
      </div>

      {/* Alur Kerja Arsip (7 Tahap PRD) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-display font-bold text-ink">Alur kerja arsip</h2>
          <span className="text-xs font-mono text-ink-muted">7 tahap PRD</span>
        </div>
        <div className="bg-surface border border-border rounded-card p-6 space-y-4 shadow-subtle">
          {steps.map((step) => (
            <div key={step.num} className="flex items-start gap-4">
              <span className="w-7 h-7 rounded-full bg-paper border border-border flex items-center justify-center text-xs font-mono font-semibold text-ink flex-shrink-0 mt-0.5">
                {step.num}
              </span>
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-ink">{step.title}</p>
                <p className="text-xs text-ink-muted leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Aktivitas Terbaru */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-display font-bold text-ink">Aktivitas terbaru</h2>
          <span className="text-xs font-mono text-ink-muted">Contoh data</span>
        </div>
        <div className="bg-surface border border-border rounded-card overflow-x-auto shadow-subtle">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-paper/50 text-[11px] font-mono text-ink-muted uppercase">
              <tr>
                <th className="py-3 px-4 font-medium">ID</th>
                <th className="py-3 px-4 font-medium">Aktivitas</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium">Pembaruan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70 text-xs">
              {archives.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => {
                    setSelectedArchiveId(item.id);
                    setActivePage('detail');
                  }}
                  className="hover:bg-paper/40 transition-colors cursor-pointer"
                >
                  <td className="py-3 px-4 font-mono font-medium text-forest">{item.id}</td>
                  <td className="py-3 px-4 text-ink font-medium">
                    Foto {item.finalCategory} · {item.title}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={item.status} isDemo />
                  </td>
                  <td className="py-3 px-4 font-mono text-ink-muted">{item.updatedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <FooterDisclaimer />
    </div>
  );
};
