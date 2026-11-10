import React, { useState } from 'react';
import { Upload, FileText, CheckCircle2, Info, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { useArchiveStore } from '../store/useArchiveStore';
import { computeFileSHA256 } from '../lib/hash';
import { PhotoCategory } from '../types';
import { FooterDisclaimer } from '../components/FooterDisclaimer';

export const UploadPage: React.FC = () => {
  const { addArchive, setActivePage, setSelectedArchiveId, archives, wallet } = useArchiveStore();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileHash, setFileHash] = useState<string>('');
  const [isHashing, setIsHashing] = useState<boolean>(false);
  const [isDuplicate, setIsDuplicate] = useState<boolean>(false);

  // Form Fields matching Image 2
  const [title, setTitle] = useState('Stasiun di ujung kota');
  const [source, setSource] = useState('Koleksi arsitektur contoh · berkas ilustrasi SunnyRest');
  const [sourceRef, setSourceRef] = useState('Catatan koleksi SR-0104 / dokumen sumber contoh');
  const [license, setLicense] = useState('CC BY 4.0 (contoh)');
  const [creator, setCreator] = useState('Kreator demo SunnyRest');
  const [permissionAttachment, setPermissionAttachment] = useState('pernyataan_izin_contoh.pdf · 124 KB');
  const [contextNotes, setContextNotes] = useState(
    'Ilustrasi arsitektur stasiun. Lokasi dan tahun tidak diidentifikasi; bukan dokumentasi sejarah.'
  );
  const [category, setCategory] = useState<PhotoCategory>('bangunan');
  const [hasConsent, setHasConsent] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Format berkas harus berupa gambar (JPG atau PNG).');
      return;
    }

    setErrorMsg(null);
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    setIsHashing(true);
    try {
      const hash = await computeFileSHA256(file);
      setFileHash(hash);
      const duplicateFound = archives.some((a) => a.originalHash.toLowerCase() === hash.toLowerCase());
      setIsDuplicate(duplicateFound);
    } catch {
      setErrorMsg('Gagal menghitung SHA-256 berkas.');
    } finally {
      setIsHashing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasConsent) {
      setErrorMsg('Pernyataan kepemilikan izin dan ketiadaan data sensitif wajib disetujui.');
      return;
    }

    if (isDuplicate) {
      setErrorMsg('Berkas ini terdeteksi sebagai duplikat dari arsip yang sudah ada.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const hashToUse = fileHash || '9f2a8c7b4d1e6f0853a92c8d7b6e1f402c5a9e8b0d3f61744a6c2e9d8b7051fa';
    const mockCid = `bafybei${hashToUse.substring(0, 16)}upload`;

    const newId = addArchive(
      {
        title: title.trim() || 'Stasiun di ujung kota',
        creator: creator.trim() || 'Kreator demo SunnyRest',
        source: source.trim() || 'Koleksi arsitektur contoh',
        licenseInfo: license,
        initialCategory: category,
        finalCategory: category,
        status: 'menunggu_tinjauan',
        aiPrediction: {
          category,
          confidence: 0.94,
          advisoryNote: `Saran AI: ${category.toUpperCase()} (94%). Keputusan tetap pada kurator.`,
        },
        curatorNotes: contextNotes,
        originalHash: hashToUse,
        originalCid: mockCid,
      },
      previewUrl || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80'
    );

    setSelectedArchiveId(newId);
    setActivePage('kurator');
    setIsSubmitting(false);
  };

  const recipientWallet = wallet.address
    ? `${wallet.address.slice(0, 4)}...${wallet.address.slice(-4)} · wallet kreator (contoh)`
    : '0x7A...91C2 · wallet kreator (contoh)';

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pt-2">
        <div className="space-y-1.5">
          <p className="text-[11px] font-mono font-medium tracking-wider text-ink-muted uppercase">
            KREATOR / PENGAJUAN BARU
          </p>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-ink tracking-tight">
            Mulai dari sumber yang jelas.
          </h1>
          <p className="text-sm text-ink-muted font-sans max-w-2xl leading-relaxed">
            Lengkapi berkas dan izin. Kurator meninjau setiap pengajuan sebelum publikasi.
          </p>
        </div>

        <div className="self-start sm:self-auto">
          <span className="px-3 py-1 rounded-btn bg-paper border border-border text-xs font-mono text-ink-muted">
            Draf · belum dikirim
          </span>
        </div>
      </div>

      {/* Stepper Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 border-y border-border/80 text-xs font-mono">
        <div className="flex items-center gap-2 text-ink">
          <span className="font-semibold text-forest">01 Berkas & metadata</span>
          <span className="text-ink-muted">→</span>
          <span className="text-ink-muted">02 Tinjauan kurator</span>
          <span className="text-ink-muted">→</span>
          <span className="text-ink-muted">03 Tanda tangan & publikasi</span>
        </div>
        <span className="text-ink-muted text-[11px]">* Wajib diisi</span>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-btn bg-status-dangerBg border border-border text-status-danger text-xs font-sans">
          {errorMsg}
        </div>
      )}

      {/* 2-Column Main Form and Validation Panel */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Form Cards (Span 2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Berkas Foto */}
          <div className="bg-surface border border-border rounded-card p-6 space-y-4 shadow-subtle">
            <div>
              <h2 className="font-display font-bold text-base text-ink">
                Berkas foto
              </h2>
              <p className="text-xs text-ink-muted font-sans mt-0.5">
                JPG atau PNG · Maksimal 20 MB · Berkas asli tanpa restorasi
              </p>
            </div>

            {/* Thumbnail Preview and File Info or Upload Box */}
            <div className="flex items-center justify-between p-4 rounded-btn bg-paper/60 border border-border gap-4 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-16 h-14 rounded-btn bg-paper border border-border overflow-hidden flex-shrink-0 flex items-center justify-center">
                  <img
                    src={previewUrl || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=300&q=80'}
                    alt="Pratinjau berkas"
                    className="w-full h-full object-cover grayscale"
                  />
                </div>
                <div className="space-y-1 min-w-0">
                  <p className="text-xs font-mono font-bold text-ink truncate">
                    {selectedFile ? selectedFile.name : 'stasiun_asli.jpg'}
                  </p>
                  <p className="text-[11px] font-mono text-ink-muted">
                    {selectedFile
                      ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB · Berkas siap`
                      : '2,8 MB · 1.600 × 1.200 piksel'}
                  </p>
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-sage text-forest font-semibold">
                    Berkas siap · simulasi
                  </span>
                </div>
              </div>

              <div>
                <label
                  htmlFor="photo-file-input"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-btn bg-surface hover:bg-paper border border-border text-xs font-mono text-ink shadow-subtle cursor-pointer transition-colors whitespace-nowrap"
                >
                  <Upload className="w-3.5 h-3.5 text-ink-muted" />
                  <span>Ganti berkas</span>
                </label>
                <input
                  id="photo-file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>

            {isHashing && (
              <div className="flex items-center gap-2 text-xs font-mono text-ink-muted">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-forest" />
                <span>Menghitung hash SHA-256 berkas...</span>
              </div>
            )}

            <div className="space-y-1.5 pt-1">
              <label htmlFor="upload-title" className="text-xs font-mono text-ink-muted">
                Judul arsip *
              </label>
              <input
                id="upload-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Stasiun di ujung kota"
                className="w-full px-3.5 py-2.5 rounded-btn bg-surface border border-border text-xs text-ink focus:border-forest outline-none transition-colors min-h-[40px]"
                required
              />
            </div>
          </div>

          {/* Section 2: Sumber & Izin */}
          <div className="bg-surface border border-border rounded-card p-6 space-y-4 shadow-subtle">
            <div>
              <h2 className="font-display font-bold text-base text-ink">
                Sumber & izin
              </h2>
              <p className="text-xs text-ink-muted font-sans mt-0.5">
                Informasi ini menyertai arsip dan diperiksa oleh kurator.
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="upload-source" className="text-xs font-mono text-ink-muted">
                Sumber / koleksi *
              </label>
              <input
                id="upload-source"
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="Koleksi arsitektur contoh · berkas ilustrasi SunnyRest"
                className="w-full px-3.5 py-2.5 rounded-btn bg-surface border border-border text-xs text-ink focus:border-forest outline-none transition-colors min-h-[40px]"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="upload-source-ref" className="text-xs font-mono text-ink-muted">
                Rujukan sumber *
              </label>
              <input
                id="upload-source-ref"
                type="text"
                value={sourceRef}
                onChange={(e) => setSourceRef(e.target.value)}
                placeholder="Catatan koleksi SR-0104 / dokumen sumber contoh"
                className="w-full px-3.5 py-2.5 rounded-btn bg-surface border border-border text-xs text-ink focus:border-forest outline-none transition-colors min-h-[40px]"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="upload-license" className="text-xs font-mono text-ink-muted">
                  Lisensi yang diajukan *
                </label>
                <select
                  id="upload-license"
                  value={license}
                  onChange={(e) => setLicense(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-btn bg-surface border border-border text-xs text-ink focus:border-forest outline-none transition-colors min-h-[40px]"
                >
                  <option value="CC BY 4.0 (contoh)">CC BY 4.0 (contoh)</option>
                  <option value="CC0 1.0 (Domain Publik)">CC0 1.0 (Domain Publik)</option>
                  <option value="CC BY-NC 4.0">CC BY-NC 4.0</option>
                  <option value="Izin tertulis terverifikasi">Izin tertulis terverifikasi</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="upload-creator" className="text-xs font-mono text-ink-muted">
                  Kredit pencipta *
                </label>
                <input
                  id="upload-creator"
                  type="text"
                  value={creator}
                  onChange={(e) => setCreator(e.target.value)}
                  placeholder="Kreator demo SunnyRest"
                  className="w-full px-3.5 py-2.5 rounded-btn bg-surface border border-border text-xs text-ink focus:border-forest outline-none transition-colors min-h-[40px]"
                  required
                />
              </div>
            </div>

            {/* Bukti Izin Attachment Box */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-ink-muted">
                Bukti izin / pernyataan hak *
              </label>
              <div className="flex items-center justify-between p-3 rounded-btn bg-paper/60 border border-border text-xs font-mono">
                <div className="flex items-center gap-2 text-ink">
                  <FileText className="w-4 h-4 text-forest" />
                  <span>{permissionAttachment}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPermissionAttachment('pernyataan_izin_baru.pdf · 140 KB')}
                  className="text-forest hover:underline text-[11px]"
                >
                  Ganti
                </button>
              </div>
              <p className="text-[11px] font-mono text-ink-muted">
                Lampiran contoh, belum diverifikasi. Memilih lisensi bukan bukti izin.
              </p>
            </div>

            {/* Context Notes */}
            <div className="space-y-1.5">
              <label htmlFor="upload-context" className="text-xs font-mono text-ink-muted">
                Catatan konteks
              </label>
              <textarea
                id="upload-context"
                rows={3}
                value={contextNotes}
                onChange={(e) => setContextNotes(e.target.value)}
                placeholder="Ilustrasi arsitektur stasiun. Lokasi dan tahun tidak diidentifikasi; bukan dokumentasi sejarah."
                className="w-full px-3.5 py-2.5 rounded-btn bg-surface border border-border text-xs text-ink focus:border-forest outline-none transition-colors leading-relaxed"
              />
            </div>
          </div>

          {/* Section 3: Pemilik Token */}
          <div className="bg-surface border border-border rounded-card p-6 space-y-3 shadow-subtle">
            <div>
              <h2 className="font-display font-bold text-base text-ink">
                Pemilik token
              </h2>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="upload-wallet" className="text-xs font-mono text-ink-muted">
                Wallet penerima token *
              </label>
              <input
                id="upload-wallet"
                type="text"
                readOnly
                value={recipientWallet}
                className="w-full px-3.5 py-2.5 rounded-btn bg-paper/50 border border-border text-xs font-mono text-ink cursor-default"
              />
            </div>

            <p className="text-[11px] font-mono text-ink-muted">
              Jaringan Lokal · akun contoh, bukan alamat tujuan transaksi nyata.
            </p>
            <p className="text-[11px] font-mono text-ink-muted">
              Token asli akan memiliki parentId = 0. Kepemilikan token tidak memindahkan hak cipta.
            </p>
          </div>
        </div>

        {/* Right Column: Helper & Validation Panel (Span 1) */}
        <div className="space-y-6">
          {/* IPFS Warning Callout */}
          <div className="p-4 rounded-card bg-gold-light border border-gold-border space-y-1 text-ink">
            <div className="flex items-center gap-2 text-xs font-bold">
              <Info className="w-4 h-4 text-ink flex-shrink-0" />
              <span>IPFS bersifat publik</span>
            </div>
            <p className="text-xs font-sans text-ink/80 leading-relaxed pl-6">
              Jangan unggah data pribadi, sensitif, atau berkas tanpa izin. Konten yang tersebar di IPFS tidak selalu dapat ditarik kembali.
            </p>
          </div>

          {/* Card: Saran Klasifikasi AI */}
          <div className="bg-surface border border-border rounded-card p-5 space-y-4 shadow-subtle">
            <div>
              <h3 className="font-display font-bold text-base text-ink">
                Saran klasifikasi AI
              </h3>
              <p className="text-xs text-ink-muted font-sans mt-0.5">
                Hasil contoh · bukan keputusan publikasi
              </p>
            </div>

            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-btn bg-gold-light border border-gold-border text-ink text-xs font-mono font-medium capitalize">
                Saran: {category}
              </span>
              <button
                type="button"
                onClick={() => setCategory(category === 'bangunan' ? 'lanskap' : category === 'lanskap' ? 'orang' : 'bangunan')}
                className="text-[11px] font-mono text-ink-muted hover:text-forest flex items-center gap-1"
                title="Beralih simulasi kelas"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Simulasi</span>
              </button>
            </div>

            {/* Confidence Bar Chart */}
            <div className="space-y-2.5 font-mono text-xs">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className={category === 'bangunan' ? 'font-bold text-ink' : 'text-ink-muted'}>Bangunan</span>
                  <span className={category === 'bangunan' ? 'font-bold text-ink' : 'text-ink-muted'}>
                    {category === 'bangunan' ? '94%' : '4%'}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-paper overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${category === 'bangunan' ? 'bg-gold' : 'bg-paper-dark'}`}
                    style={{ width: category === 'bangunan' ? '94%' : '4%' }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className={category === 'lanskap' ? 'font-bold text-ink' : 'text-ink-muted'}>Lanskap</span>
                  <span className={category === 'lanskap' ? 'font-bold text-ink' : 'text-ink-muted'}>
                    {category === 'lanskap' ? '91%' : '5%'}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-paper overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${category === 'lanskap' ? 'bg-gold' : 'bg-paper-dark'}`}
                    style={{ width: category === 'lanskap' ? '91%' : '5%' }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className={category === 'orang' ? 'font-bold text-ink' : 'text-ink-muted'}>Orang</span>
                  <span className={category === 'orang' ? 'font-bold text-ink' : 'text-ink-muted'}>
                    {category === 'orang' ? '96%' : '1%'}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-paper overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${category === 'orang' ? 'bg-gold' : 'bg-paper-dark'}`}
                    style={{ width: category === 'orang' ? '96%' : '1%' }}
                  />
                </div>
              </div>
            </div>

            <p className="text-[11px] font-sans text-ink-muted leading-relaxed pt-2 border-t border-border/80">
              AI hanya memberi saran tiga kelas. Kategori final dan keputusan tetap pada kurator.
            </p>
          </div>

          {/* Card: Validasi Pengajuan */}
          <div className="bg-surface border border-border rounded-card p-5 space-y-4 shadow-subtle">
            <h3 className="font-display font-bold text-base text-ink">
              Validasi pengajuan
            </h3>

            <div className="space-y-2.5 text-xs font-sans">
              <div className="flex items-center gap-2 text-ink">
                <CheckCircle2 className="w-4 h-4 text-forest flex-shrink-0" />
                <span>Format & ukuran sesuai</span>
              </div>

              <div className="flex items-center gap-2 text-ink">
                <CheckCircle2 className="w-4 h-4 text-forest flex-shrink-0" />
                <span>Sumber, lisensi & lampiran terisi</span>
              </div>

              <div className="flex items-center gap-2 text-ink">
                <CheckCircle2 className="w-4 h-4 text-forest flex-shrink-0" />
                <span>Wallet pemilik dicantumkan</span>
              </div>

              <div className="flex items-center gap-2 text-ink">
                <CheckCircle2 className="w-4 h-4 text-forest flex-shrink-0" />
                <span>Hash unik pada indeks demo</span>
              </div>
            </div>

            <p className="text-[11px] font-mono text-ink-muted pt-3 border-t border-border/80 leading-relaxed">
              SHA-256 dihitung dari berkas. Hash duplikat ditolak. Pemeriksaan contoh ini tidak membuktikan keabsahan izin.
            </p>
          </div>

          {/* Consent Checkbox */}
          <div className="p-4 rounded-btn bg-paper/60 border border-border space-y-2">
            <label className="flex items-start gap-2.5 text-xs text-ink cursor-pointer">
              <input
                type="checkbox"
                checked={hasConsent}
                onChange={(e) => setHasConsent(e.target.checked)}
                className="mt-0.5 rounded border-border text-forest focus:ring-forest cursor-pointer"
              />
              <span className="leading-relaxed">
                Saya mencantumkan sumber dan izin serta tidak menyertakan data pribadi atau sensitif.
              </span>
            </label>
          </div>

          {/* Submit Action Button */}
          <div className="space-y-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-btn bg-gold hover:bg-gold-hover text-ink text-xs font-bold shadow-subtle flex items-center justify-center gap-2 min-h-[44px] transition-colors"
            >
              <span>Kirim ke kurator</span>
              <ArrowRight className="w-4 h-4 text-ink" />
            </button>

            <p className="text-[11px] font-mono text-ink-muted text-center leading-relaxed">
              Belum ada token atau transaksi. Pengiriman ini hanya menempatkan pengajuan dalam antrean demo.
            </p>
          </div>
        </div>
      </form>

      <FooterDisclaimer />
    </div>
  );
};
