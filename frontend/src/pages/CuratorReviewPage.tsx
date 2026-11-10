import React, { useState } from 'react';
import { ArrowLeft, ArrowUpRight, FileText, Info, Lock, Send, ShieldCheck } from 'lucide-react';
import { useArchiveStore } from '../store/useArchiveStore';
import { PhotoCategory } from '../types';
import { FooterDisclaimer } from '../components/FooterDisclaimer';

export const CuratorReviewPage: React.FC = () => {
  const { archives, selectedArchiveId, updateArchiveStatus, setActivePage, publishToBlockchain, wallet } = useArchiveStore();

  const pendingArchives = archives.filter((a) => a.status === 'menunggu_tinjauan' || a.status === 'perlu_koreksi');
  const activeArchive =
    archives.find((a) => a.id === selectedArchiveId) ||
    pendingArchives[0] ||
    archives[0];

  const [curatorCategory, setCuratorCategory] = useState<PhotoCategory>(
    activeArchive?.finalCategory || 'bangunan'
  );
  const [decision, setDecision] = useState<'setujui' | 'tolak' | 'minta_koreksi'>('minta_koreksi');
  const [notes, setNotes] = useState<string>(
    'Mohon lampirkan bukti izin dari pemegang hak. Pernyataan contoh belum cukup untuk publikasi.'
  );
  const [isSigning, setIsSigning] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'warning' | 'danger'; text: string } | null>(null);

  if (!activeArchive) {
    return (
      <div className="p-12 text-center max-w-xl mx-auto space-y-4">
        <p className="text-sm font-mono text-ink-muted">Tidak ada pengajuan dalam antrean kurasi.</p>
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

  const originalVersion = activeArchive.versions.find((v) => v.versionType === 'original') || activeArchive.versions[0];

  const handleDecisionSubmit = () => {
    if (decision === 'setujui') {
      updateArchiveStatus(activeArchive.id, 'disetujui', curatorCategory, notes);
      setFeedbackMsg({
        type: 'success',
        text: `Arsip ${activeArchive.id} telah disetujui. Langkah selanjutnya: tanda tangani dan ajukan publikasi on-chain.`,
      });
    } else if (decision === 'minta_koreksi') {
      updateArchiveStatus(activeArchive.id, 'perlu_koreksi', curatorCategory, notes);
      setFeedbackMsg({
        type: 'warning',
        text: `Permintaan koreksi untuk arsip ${activeArchive.id} telah dicatat dalam antrean.`,
      });
    } else {
      updateArchiveStatus(activeArchive.id, 'ditolak', curatorCategory, notes);
      setFeedbackMsg({
        type: 'danger',
        text: `Arsip ${activeArchive.id} telah ditolak oleh kurator.`,
      });
    }
  };

  const handleSignAndPublish = async () => {
    setIsSigning(true);
    const res = await publishToBlockchain(activeArchive.id);
    setIsSigning(false);
    if (res.success) {
      setFeedbackMsg({
        type: 'success',
        text: `Arsip ${activeArchive.id} berhasil dicatatkan on-chain dengan Token ID #${res.tokenId}. Transaksi: ${res.txHash?.substring(0, 16)}...`,
      });
    }
  };

  const isApproved = activeArchive.status === 'disetujui' || activeArchive.status === 'tercatat';

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Breadcrumb & Return to Queue */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pt-2">
        <div className="space-y-1.5">
          <p className="text-[11px] font-mono font-medium tracking-wider text-ink-muted uppercase">
            ANTREAN KURASI / PENGAJUAN {activeArchive.id}
          </p>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-ink tracking-tight">
            Keputusan tetap pada manusia.
          </h1>
          <p className="text-sm text-ink-muted font-sans max-w-2xl leading-relaxed">
            Periksa konteks, pastikan izin, lalu tentukan kategori dan keputusan akhir.
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
          <span className="text-ink-muted">
            Diajukan {activeArchive.createdAt} · tanggal contoh
          </span>
        </div>
        <span className="text-ink-muted">
          Kreator {wallet.address ? `${wallet.address.slice(0, 4)}...${wallet.address.slice(-4)}` : '0x7A...91C2'} · Lokal
        </span>
      </div>

      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-btn text-xs font-sans border flex items-center justify-between ${
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
        {/* Left Column (Span 3): Large Photo Preview and Provenance */}
        <div className="lg:col-span-3 space-y-6">
          {/* Large Photo Preview Card */}
          <div className="bg-surface border border-border rounded-card overflow-hidden shadow-card">
            <div className="relative aspect-[16/10] bg-paper overflow-hidden flex items-center justify-center">
              <img
                src={originalVersion.imageUrl}
                alt={activeArchive.title}
                className="w-full h-full object-cover grayscale contrast-110"
              />
            </div>

            <div className="p-4 border-t border-border bg-paper/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="font-display font-bold text-base text-ink">
                  {activeArchive.title}
                </p>
                <p className="text-[11px] font-mono text-ink-muted mt-0.5">
                  stasiun_asli.jpg · 1.600 × 1.200 px · 2,8 MB
                </p>
              </div>

              <span className="px-2.5 py-1 rounded-btn bg-surface border border-border text-xs font-mono text-ink self-start sm:self-auto shadow-subtle">
                Asli · parentId = 0
              </span>
            </div>
          </div>

          {/* Card: Sumber, Izin & Konteks */}
          <div className="bg-surface border border-border rounded-card p-6 space-y-4 shadow-subtle">
            <h2 className="font-display font-bold text-base text-ink">
              Sumber, izin & konteks
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
                <p className="text-ink font-medium mt-0.5">Catatan koleksi {activeArchive.id}</p>
              </div>

              <div>
                <p className="text-ink-muted text-[11px] font-mono">Kredit pencipta</p>
                <p className="text-ink font-medium mt-0.5">{activeArchive.creator}</p>
              </div>
            </div>

            {/* Document Attachment Preview */}
            <div className="flex items-center justify-between p-3 rounded-btn bg-paper/60 border border-border text-xs font-mono">
              <div className="flex items-center gap-2 text-ink">
                <FileText className="w-4 h-4 text-forest" />
                <span>pernyataan_izin_contoh.pdf · 124 KB</span>
              </div>
              <a
                href={originalVersion.imageUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-forest hover:underline text-[11px]"
              >
                <span>Buka lampiran</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>

            <p className="text-xs font-sans text-ink-muted leading-relaxed">
              Catatan kreator: {activeArchive.curatorNotes || 'Ilustrasi arsitektur stasiun. Lokasi dan tahun tidak diidentifikasi; bukan dokumentasi sejarah.'}
            </p>
          </div>

          {/* Warning Alert: Tinjauan Izin Wajib Dilakukan */}
          <div className="p-4 rounded-card bg-gold-light border border-gold-border space-y-1 text-ink">
            <div className="flex items-center gap-2 text-xs font-bold">
              <Info className="w-4 h-4 text-ink flex-shrink-0" />
              <span>Tinjauan izin wajib dilakukan</span>
            </div>
            <p className="text-xs font-sans text-ink/80 leading-relaxed pl-6">
              Lampiran dan lisensi di sini hanya contoh, bukan bukti izin nyata. Publikasi nyata harus diblokir sampai sumber serta hak penggunaan terverifikasi.
            </p>
          </div>
        </div>

        {/* Right Column (Span 2): AI Assistant, Human Decision, Sign & Publish */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Saran AI, Bukan Keputusan */}
          <div className="bg-surface border border-border rounded-card p-5 space-y-4 shadow-subtle">
            <div>
              <h3 className="font-display font-bold text-base text-ink">
                Saran AI, bukan keputusan
              </h3>
              <p className="text-xs text-ink-muted font-sans mt-0.5">
                Skor contoh untuk membantu peninjauan
              </p>
            </div>

            {/* Bar Chart */}
            <div className="space-y-2.5 font-mono text-xs">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-ink">Bangunan</span>
                  <span className="font-bold text-ink">94%</span>
                </div>
                <div className="h-2 rounded-full bg-paper overflow-hidden">
                  <div className="h-full rounded-full bg-gold" style={{ width: '94%' }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-ink-muted">Lanskap</span>
                  <span className="text-ink-muted">5%</span>
                </div>
                <div className="h-2 rounded-full bg-paper overflow-hidden">
                  <div className="h-full rounded-full bg-paper-dark" style={{ width: '5%' }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-ink-muted">Orang</span>
                  <span className="text-ink-muted">1%</span>
                </div>
                <div className="h-2 rounded-full bg-paper overflow-hidden">
                  <div className="h-full rounded-full bg-paper-dark" style={{ width: '1%' }} />
                </div>
              </div>
            </div>

            <p className="text-[11px] font-sans text-ink-muted leading-relaxed pt-2 border-t border-border/80">
              Tidak ada publikasi otomatis dari hasil klasifikasi.
            </p>
          </div>

          {/* Card: Kategori Final */}
          <div className="bg-surface border border-border rounded-card p-5 space-y-3 shadow-subtle">
            <div>
              <h3 className="font-display font-bold text-base text-ink">
                Kategori final
              </h3>
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
                    <span className={`w-2.5 h-2.5 rounded-full border ${isSelected ? 'border-forest bg-forest' : 'border-ink-muted'}`} />
                    <span>{cat}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card: Keputusan Tinjauan */}
          <div className="bg-surface border border-border rounded-card p-5 space-y-4 shadow-subtle">
            <div>
              <h3 className="font-display font-bold text-base text-ink">
                Keputusan tinjauan
              </h3>
              <p className="text-xs text-ink-muted font-sans mt-0.5">
                Keputusan contoh belum dikirim
              </p>
            </div>

            {/* 3 Decision Buttons */}
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

            {/* Catatan untuk Kreator */}
            <div className="space-y-1.5">
              <label htmlFor="curator-notes" className="text-xs font-mono text-ink-muted">
                Catatan untuk kreator *
              </label>
              <textarea
                id="curator-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tuliskan catatan evaluasi kurator..."
                className="w-full px-3 py-2 rounded-btn bg-surface border border-border text-xs text-ink focus:border-forest outline-none transition-colors leading-relaxed"
              />
            </div>

            {/* Submit Decision Button */}
            <button
              type="button"
              onClick={handleDecisionSubmit}
              className="w-full py-2.5 px-4 rounded-btn bg-gold hover:bg-gold-hover text-ink text-xs font-bold shadow-subtle flex items-center justify-center gap-2 min-h-[42px] transition-colors"
            >
              <Send className="w-3.5 h-3.5 text-ink" />
              <span>
                {decision === 'setujui'
                  ? 'Simpan Persetujuan Kurator'
                  : decision === 'minta_koreksi'
                  ? 'Kirim permintaan koreksi'
                  : 'Kirim Penolakan Kurator'}
              </span>
            </button>
          </div>

          {/* Card: Publikasi & Tanda Tangan */}
          <div className="bg-surface border border-border rounded-card p-5 space-y-3.5 shadow-subtle">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-base text-ink">
                  Publikasi & tanda tangan
                </h3>
                <p className="text-xs text-ink-muted font-sans mt-0.5">
                  {isApproved ? 'Siap dipublikasikan' : 'Terkunci · menunggu persetujuan'}
                </p>
              </div>
              {!isApproved && <Lock className="w-4 h-4 text-ink-muted" />}
            </div>

            <p className="text-xs font-sans text-ink-muted leading-relaxed">
              Setelah disetujui, publikasi memerlukan tanda tangan wallet kurator. Belum ada token yang dicetak.
            </p>

            <div className="space-y-1 text-xs font-mono">
              <p className="text-[11px] text-ink-muted">Penanda tangan yang diperlukan</p>
              <p className="text-ink font-medium">0xC4...82A1 · Kurator (akun contoh)</p>
            </div>

            <button
              type="button"
              disabled={!isApproved || isSigning}
              onClick={handleSignAndPublish}
              className={`w-full py-2.5 px-4 rounded-btn text-xs font-semibold shadow-subtle flex items-center justify-center gap-2 min-h-[42px] transition-colors ${
                isApproved
                  ? 'bg-forest hover:bg-forest-hover text-surface'
                  : 'bg-paper border border-border text-ink-muted cursor-not-allowed opacity-60'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isSigning ? 'Mengirim transaksi...' : 'Tanda tangani & ajukan publikasi'}</span>
            </button>

            <p className="text-[11px] font-mono text-ink-muted leading-relaxed">
              Transaksi belum dikirim. Saat menunggu konfirmasi, arsip belum terbit. Jika gagal, token tidak dianggap tercatat.
            </p>
          </div>
        </div>
      </div>

      <FooterDisclaimer />
    </div>
  );
};
