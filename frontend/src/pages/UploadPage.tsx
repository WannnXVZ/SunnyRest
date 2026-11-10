import React, { useState } from 'react';
import { Upload, AlertTriangle } from 'lucide-react';
import { useArchiveStore } from '../store/useArchiveStore';
import { computeFileSHA256, truncateIdentifier } from '../lib/hash';
import { PhotoCategory } from '../types';
import { FooterDisclaimer } from '../components/FooterDisclaimer';

export const UploadPage: React.FC = () => {
  const { addArchive, setActivePage, setSelectedArchiveId, archives } = useArchiveStore();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileHash, setFileHash] = useState<string>('');
  const [isHashing, setIsHashing] = useState<boolean>(false);
  const [isDuplicate, setIsDuplicate] = useState<boolean>(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [creator, setCreator] = useState('');
  const [source, setSource] = useState('');
  const [licenseInfo, setLicenseInfo] = useState('');
  const [initialCategory, setInitialCategory] = useState<PhotoCategory>('bangunan');
  const [hasConsent, setHasConsent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Format berkas harus berupa gambar (JPG, PNG, WebP).');
      return;
    }

    setErrorMsg(null);
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Compute Web Crypto SHA-256 live in browser
    setIsHashing(true);
    try {
      const hash = await computeFileSHA256(file);
      setFileHash(hash);

      // Duplicate check against existing archives
      const duplicateFound = archives.some((a) => a.originalHash.toLowerCase() === hash.toLowerCase());
      setIsDuplicate(duplicateFound);
    } catch {
      setErrorMsg('Gagal menghitung SHA-256 berkas.');
    } finally {
      setIsHashing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile || !fileHash) {
      setErrorMsg('Harap pilih berkas foto terlebih dahulu.');
      return;
    }
    if (!title.trim() || !creator.trim() || !source.trim() || !licenseInfo.trim()) {
      setErrorMsg('Semua kolom provenance dan izin wajib diisi.');
      return;
    }
    if (!hasConsent) {
      setErrorMsg('Pernyataan kepemilikan izin wajib disetujui.');
      return;
    }
    if (isDuplicate) {
      setErrorMsg('Berkas ini terdeteksi sebagai duplikat dari arsip yang sudah ada.');
      return;
    }

    // Determine simulated AI prediction confidence
    const confidence = 0.94;
    const advisoryNote = `Saran AI: ${initialCategory.toUpperCase()}. Silakan tinjau dan koreksi jika diperlukan.`;
    const mockCid = `bafybei${fileHash.substring(0, 16)}auto`;

    const newArchiveId = addArchive(
      {
        title: title.trim(),
        creator: creator.trim(),
        source: source.trim(),
        licenseInfo: licenseInfo.trim(),
        initialCategory,
        finalCategory: initialCategory,
        status: 'menunggu_tinjauan',
        aiPrediction: {
          category: initialCategory,
          confidence,
          advisoryNote,
        },
        originalHash: fileHash,
        originalCid: mockCid,
      },
      previewUrl || undefined
    );

    setSelectedArchiveId(newArchiveId);
    setActivePage('kurator');
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="space-y-3">
        <p className="text-xs font-mono font-medium tracking-wider text-ink-muted uppercase">
          SUNNYREST · ARSIP FOTO BERIZIN
        </p>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-ink leading-tight max-w-4xl">
          Masukkan foto, sumber, pemilik, dan izin penggunaan. Foto asli akan dipertahankan sebagai versi sumber.
        </h1>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-btn bg-status-dangerBg border border-border text-status-danger text-xs font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* 01 · BERKAS FOTO */}
          <div className="bg-surface border border-border rounded-card p-6 space-y-5 shadow-subtle">
            <h2 className="text-xs font-mono font-semibold tracking-wider text-ink-muted uppercase">
              01 · BERKAS FOTO
            </h2>

            {/* Upload Area */}
            <div className="relative border-2 border-dashed border-border rounded-card p-6 text-center space-y-3 hover:border-forest transition-colors bg-paper/30">
              {previewUrl ? (
                <div className="space-y-3">
                  <div className="h-44 rounded-btn overflow-hidden bg-paper">
                    <img src={previewUrl} alt="Preview unggahan" className="w-full h-full object-cover" />
                  </div>
                  <p className="text-xs font-mono text-ink-muted">
                    {selectedFile?.name} ({(selectedFile ? selectedFile.size / 1024 / 1024 : 0).toFixed(2)} MB)
                  </p>
                </div>
              ) : (
                <div className="space-y-2 py-4">
                  <Upload className="w-8 h-8 text-forest mx-auto" />
                  <p className="text-sm font-semibold text-ink">Pilih foto untuk diunggah</p>
                  <p className="text-xs text-ink-muted leading-relaxed">
                    Format gambar yang diizinkan (JPG, PNG) · batas ukuran mengikuti konfigurasi sistem
                  </p>
                </div>
              )}

              <label
                htmlFor="photo-upload"
                className="inline-block mt-2 px-4 py-2 rounded-btn bg-surface border border-border text-xs font-semibold text-ink hover:border-forest transition-colors cursor-pointer"
              >
                {previewUrl ? 'Ganti berkas' : 'Pilih berkas'}
              </label>
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="sr-only"
              />
            </div>

            {/* Category Option */}
            <div className="space-y-1.5">
              <label htmlFor="cat-select" className="text-xs font-mono text-ink-muted">
                Kategori awal (opsional)
              </label>
              <select
                id="cat-select"
                value={initialCategory}
                onChange={(e) => setInitialCategory(e.target.value as PhotoCategory)}
                className="w-full px-3.5 py-2.5 rounded-btn bg-surface border border-border text-xs text-ink focus:border-forest outline-none transition-colors min-h-[44px]"
              >
                <option value="bangunan">Bangunan</option>
                <option value="orang">Orang</option>
                <option value="lanskap">Lanskap</option>
              </select>
            </div>

            {/* Advisory Callout */}
            <div className="p-3.5 rounded-btn bg-sage/60 border border-sage-border text-xs text-sage-text leading-relaxed">
              Sistem akan memvalidasi format, menghitung SHA-256 berkas asli, dan memeriksa duplikasi sebelum inferensi.
            </div>
          </div>

          {/* 02 · PROVENANCE DAN IZIN */}
          <div className="bg-surface border border-border rounded-card p-6 space-y-5 shadow-subtle">
            <h2 className="text-xs font-mono font-semibold tracking-wider text-ink-muted uppercase">
              02 · PROVENANCE DAN IZIN
            </h2>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="title-input" className="text-xs font-mono text-ink-muted">
                  Judul foto
                </label>
                <input
                  id="title-input"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Gedung lama di pusat kota"
                  className="w-full px-3.5 py-2.5 rounded-btn bg-surface border border-border text-xs text-ink placeholder:text-ink-muted focus:border-forest outline-none min-h-[44px]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="creator-input" className="text-xs font-mono text-ink-muted">
                  Nama pembuat / pemilik
                </label>
                <input
                  id="creator-input"
                  type="text"
                  value={creator}
                  onChange={(e) => setCreator(e.target.value)}
                  placeholder="Nama kontributor atau pemilik yang sah"
                  className="w-full px-3.5 py-2.5 rounded-btn bg-surface border border-border text-xs text-ink placeholder:text-ink-muted focus:border-forest outline-none min-h-[44px]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="source-input" className="text-xs font-mono text-ink-muted">
                  Sumber foto
                </label>
                <input
                  id="source-input"
                  type="text"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="Asal foto, koleksi, atau dokumentasi"
                  className="w-full px-3.5 py-2.5 rounded-btn bg-surface border border-border text-xs text-ink placeholder:text-ink-muted focus:border-forest outline-none min-h-[44px]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="license-input" className="text-xs font-mono text-ink-muted">
                  Informasi izin
                </label>
                <textarea
                  id="license-input"
                  value={licenseInfo}
                  onChange={(e) => setLicenseInfo(e.target.value)}
                  placeholder="Jelaskan izin penggunaan dan bukti persetujuan"
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-btn bg-surface border border-border text-xs text-ink placeholder:text-ink-muted focus:border-forest outline-none resize-none"
                  required
                />
              </div>

              {/* Consent Checkbox */}
              <div className="flex items-start gap-2.5 pt-1">
                <input
                  id="consent-check"
                  type="checkbox"
                  checked={hasConsent}
                  onChange={(e) => setHasConsent(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded text-forest focus:ring-forest border-border"
                />
                <label htmlFor="consent-check" className="text-xs text-ink-muted leading-relaxed cursor-pointer">
                  Saya menyatakan memiliki izin untuk mengunggah dan memproses foto ini.
                </label>
              </div>

              <button
                type="submit"
                disabled={!selectedFile || isHashing || isDuplicate}
                className="w-full py-3 rounded-btn bg-forest hover:bg-forest-hover text-surface text-xs font-semibold shadow-subtle transition-colors min-h-[44px]"
              >
                Validasi dan lanjutkan
              </button>
            </div>
          </div>
        </div>

        {/* Status Validasi Berkas */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-display font-bold text-ink">Status validasi berkas</h2>
            <span className="text-xs font-mono text-ink-muted">
              {selectedFile ? 'Pemeriksaan aktif' : 'Menunggu input'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Format Card */}
            <div className="bg-surface border border-border rounded-card p-5 space-y-1.5 shadow-subtle">
              <p className="text-[11px] font-mono text-ink-muted">Format</p>
              <p className="text-sm font-semibold text-ink">
                {selectedFile ? `Valid (${selectedFile.type})` : 'Belum diperiksa'}
              </p>
              <p className="text-[11px] text-ink-muted">Validasi tipe dan ukuran berkas.</p>
            </div>

            {/* SHA-256 Card */}
            <div className="bg-surface border border-border rounded-card p-5 space-y-1.5 shadow-subtle">
              <p className="text-[11px] font-mono text-ink-muted">SHA-256 asli</p>
              <p className="text-xs font-mono text-ink font-medium select-all break-all">
                {isHashing ? 'Menghitung hash...' : fileHash ? truncateIdentifier(fileHash, 10, 8) : 'Belum dihitung'}
              </p>
              <p className="text-[11px] text-ink-muted">Hash dihitung setelah berkas dipilih.</p>
            </div>

            {/* Deteksi Duplikasi Card */}
            <div className="bg-surface border border-border rounded-card p-5 space-y-1.5 shadow-subtle">
              <p className="text-[11px] font-mono text-ink-muted">Deteksi duplikasi</p>
              <p className="text-sm font-semibold text-ink">
                {!fileHash
                  ? 'Belum diperiksa'
                  : isDuplicate
                  ? 'Duplikat ditemukan'
                  : 'Bebas duplikasi'}
              </p>
              <p className="text-[11px] text-ink-muted">Duplikat ditolak oleh aturan sistem/kontrak.</p>
            </div>
          </div>
        </section>
      </form>

      <FooterDisclaimer />
    </div>
  );
};
