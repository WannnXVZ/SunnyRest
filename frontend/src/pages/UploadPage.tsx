import React, { useState } from 'react';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Info,
  ArrowRight,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';
import { isAddress } from 'ethers';
import { useArchiveStore } from '../store/useArchiveStore';
import { computeFileSHA256 } from '../lib/hash';
import { predictPhotoCategory } from '../lib/api';
import { checkHashUsedOnChain, normalizeHexHash } from '../lib/contract';
import { PhotoCategory } from '../types';
import { FooterDisclaimer } from '../components/FooterDisclaimer';

const LICENSE_OPTIONS = [
  'CC BY 4.0',
  'CC0 1.0 (Domain Publik)',
  'CC BY-NC 4.0',
  'Izin tertulis terverifikasi',
];

export const UploadPage: React.FC = () => {
  const {
    submitArchive,
    setActivePage,
    setSelectedArchiveId,
    archives,
    wallet,
    viewMode,
  } = useArchiveStore();
  const isPublicMode = viewMode === 'public';

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<string>('');
  const [fileHash, setFileHash] = useState<string>('');
  const [isHashing, setIsHashing] = useState<boolean>(false);
  const [isDuplicate, setIsDuplicate] = useState<boolean>(false);
  const [duplicateReason, setDuplicateReason] = useState<string | null>(null);

  const [aiConfidence, setAiConfidence] = useState<number | null>(null);
  const [aiScores, setAiScores] = useState<Record<PhotoCategory, number> | undefined>(undefined);
  const [aiModelVersion, setAiModelVersion] = useState<string | undefined>(undefined);
  const [aiNote, setAiNote] = useState<string>('');

  const [title, setTitle] = useState('');
  const [source, setSource] = useState('');
  const [sourceRef, setSourceRef] = useState('');
  const [license, setLicense] = useState(LICENSE_OPTIONS[0]);
  const [creator, setCreator] = useState('');
  const [permissionAttachment, setPermissionAttachment] = useState('');
  const [contextNotes, setContextNotes] = useState('');
  const [customRecipient, setCustomRecipient] = useState('');
  const [category, setCategory] = useState<PhotoCategory>('bangunan');
  const [hasConsent, setHasConsent] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedArchiveId, setSubmittedArchiveId] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Format berkas harus berupa gambar (JPG, PNG, atau WebP).');
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setErrorMsg(null);
    setDuplicateReason(null);
    setIsDuplicate(false);
    setSelectedFile(file);
    setImageDimensions('');

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    const img = new Image();
    img.onload = () => {
      setImageDimensions(`${img.naturalWidth} × ${img.naturalHeight} px`);
    };
    img.src = objectUrl;

    setIsHashing(true);
    try {
      const hash = await computeFileSHA256(file);
      setFileHash(hash);

      const queueDuplicate = archives.some(
        (a) =>
          a.status !== 'ditolak' &&
          normalizeHexHash(a.originalHash) === normalizeHexHash(hash)
      );
      let onChainDuplicate = false;
      try {
        onChainDuplicate = await checkHashUsedOnChain(wallet.chainId, hash);
      } catch {
        // Lewati jika RPC belum aktif saat pra-unggah
      }

      if (queueDuplicate || onChainDuplicate) {
        setIsDuplicate(true);
        setDuplicateReason(
          onChainDuplicate
            ? 'Hash SHA-256 berkas ini sudah tercatat di smart contract (hashTerpakai == true).'
            : 'Hash SHA-256 berkas ini sudah terdaftar dalam antrean arsip.'
        );
      }

      try {
        const pred = await predictPhotoCategory(file);
        setCategory(pred.label);
        setAiConfidence(pred.confidence);
        setAiScores(pred.scores);
        setAiModelVersion(pred.model_version);
        setAiNote(
          `Saran AI (${pred.model_version}): ${pred.label.toUpperCase()} (${(
            pred.confidence * 100
          ).toFixed(1)}%). Keputusan final tetap pada kurator.`
        );
      } catch {
        setAiConfidence(null);
        setAiScores(undefined);
        setAiModelVersion(undefined);
        setAiNote(
          'Layanan inferensi AI tidak terjangkau; kurator atau pengunggah memilih kategori secara manual.'
        );
      }
    } catch {
      setErrorMsg('Gagal menghitung hash SHA-256 berkas.');
    } finally {
      setIsHashing(false);
    }
  };

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const doc = e.target.files?.[0];
    if (!doc) return;
    const kb = Math.max(1, Math.round(doc.size / 1024));
    setPermissionAttachment(`${doc.name} · ${kb} KB`);
  };

  const effectiveRecipient = customRecipient.trim() || wallet.address || '';
  const isRecipientValid =
    !effectiveRecipient || isAddress(effectiveRecipient);
  const hasRequiredFields = Boolean(
    title.trim() && source.trim() && sourceRef.trim() && creator.trim() && license.trim()
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile || !fileHash) {
      setErrorMsg('Harap pilih berkas gambar asli terlebih dahulu.');
      return;
    }
    if (!hasRequiredFields) {
      setErrorMsg('Semua kolom judul, sumber, rujukan, lisensi, dan pencipta wajib diisi.');
      return;
    }
    if (!hasConsent) {
      setErrorMsg('Pernyataan kepemilikan izin dan ketiadaan data sensitif wajib disetujui.');
      return;
    }
    if (isDuplicate) {
      setErrorMsg(duplicateReason || 'Berkas ini terdeteksi sebagai duplikat dari arsip yang sudah ada.');
      return;
    }
    if (!isRecipientValid) {
      setErrorMsg('Alamat wallet penerima tidak valid (harus format alamat EVM 0x...).');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const res = await submitArchive(selectedFile, {
      title: title.trim(),
      creator: creator.trim(),
      source: source.trim(),
      sourceRef: sourceRef.trim(),
      licenseInfo: license,
      permissionAttachment: permissionAttachment.trim() || undefined,
      recipientAddress: effectiveRecipient || undefined,
      initialCategory: category,
      finalCategory: category,
      status: 'menunggu_tinjauan',
      aiPrediction: {
        category,
        confidence: aiConfidence ?? 0,
        scores: aiScores,
        modelVersion: aiModelVersion,
        advisoryNote:
          aiNote ||
          `Kategori awal dipilih pengunggah: ${category.toUpperCase()}. Keputusan final tetap pada kurator.`,
      },
      curatorNotes: contextNotes.trim() || undefined,
      originalHash: fileHash,
      originalCid: '',
    });

    setIsSubmitting(false);
    if (!res.success || !res.archiveId) {
      setErrorMsg(res.error || 'Gagal menyimpan pengajuan ke server backend.');
      return;
    }

    setSelectedArchiveId(res.archiveId);
    setSubmittedArchiveId(res.archiveId);
  };

  const resetForm = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSubmittedArchiveId(null);
    setSelectedFile(null);
    setPreviewUrl(null);
    setImageDimensions('');
    setFileHash('');
    setIsDuplicate(false);
    setDuplicateReason(null);
    setAiConfidence(null);
    setAiScores(undefined);
    setAiModelVersion(undefined);
    setAiNote('');
    setTitle('');
    setSource('');
    setSourceRef('');
    setCreator('');
    setPermissionAttachment('');
    setContextNotes('');
    setCustomRecipient('');
    setHasConsent(false);
    setErrorMsg(null);
  };

  if (submittedArchiveId) {
    return (
      <div className="max-w-2xl mx-auto py-8 space-y-6">
        <div className="bg-surface border border-border rounded-card p-8 shadow-card text-center space-y-6">
          <div className="w-14 h-14 rounded-full bg-sage flex items-center justify-center text-forest mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="px-2.5 py-1 rounded-btn bg-gold-light border border-gold-border text-ink text-xs font-mono font-medium">
              Pengajuan Tersimpan di Antrean Backend
            </span>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink">
              Berkas Anda Masuk Antrean Kurasi
            </h1>
            <p className="text-xs sm:text-sm text-ink-muted font-sans max-w-lg mx-auto leading-relaxed">
              ID Arsip Anda adalah <span className="font-mono font-bold text-ink">{submittedArchiveId}</span>. Kurator berwenang akan memvalidasi bukti izin hak cipta, kelayakan arsip, serta menetapkan kategori final sebelum melakukan pinning ke IPFS dan menerbitkan token ERC-721.
            </p>
          </div>

          <div className="p-4 rounded-btn bg-paper/70 border border-border text-xs font-mono text-left space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-ink-muted">Judul Arsip:</span>
              <span className="font-bold text-ink">{title}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-muted">Kategori Diajukan:</span>
              <span className="capitalize text-ink">{category}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-muted">Status Pengajuan:</span>
              <span className="text-status-warning font-semibold">Menunggu Tinjauan Kurator</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-1 border-t border-border/80">
              <span className="text-ink-muted">Hash SHA-256:</span>
              <span className="text-[11px] select-all break-all text-ink">{fileHash}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {!isPublicMode ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedArchiveId(submittedArchiveId);
                  setActivePage('kurator');
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-btn bg-forest hover:bg-forest-hover text-surface text-xs font-bold shadow-subtle transition-colors min-h-[42px]"
              >
                Buka Peninjauan Kurator Sekarang
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSelectedArchiveId(submittedArchiveId);
                  setActivePage('detail');
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-btn bg-gold hover:bg-gold-hover text-ink text-xs font-bold shadow-subtle transition-colors min-h-[42px]"
              >
                Lihat Pratinjau Arsip
              </button>
            )}
            <button
              type="button"
              onClick={resetForm}
              className="w-full sm:w-auto px-5 py-2.5 rounded-btn bg-surface hover:bg-paper border border-border text-xs font-semibold text-ink transition-colors min-h-[42px]"
            >
              Unggah Foto Lain
            </button>
            <button
              type="button"
              onClick={() => setActivePage('arsip')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-btn bg-paper hover:bg-paper/80 border border-border text-xs font-mono text-ink-muted transition-colors min-h-[42px]"
            >
              Kembali ke Galeri
            </button>
          </div>
        </div>
        <FooterDisclaimer />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pt-2">
        <div className="space-y-1.5">
          <p className="text-[11px] font-mono font-medium tracking-wider text-ink-muted uppercase">
            {isPublicMode ? 'KONTRIBUTOR / PENGAJUAN ARSIP WARGA' : 'WORKSPACE / AKUISISI ARSIP INSTITUSI'}
          </p>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-ink tracking-tight">
            {isPublicMode ? 'Mulai dari sumber yang jelas.' : 'Unggah Koleksi Resmi Institusi.'}
          </h1>
          <p className="text-sm text-ink-muted font-sans max-w-2xl leading-relaxed">
            {isPublicMode
              ? 'Lengkapi berkas dan izin. Kurator meninjau setiap pengajuan sebelum dipin ke IPFS dan dicatat on-chain.'
              : 'Daftarkan berkas arsip bersejarah milik institusi atau mitra untuk masuk ke antrean kurasi dan pencatatan on-chain.'}
          </p>
        </div>

        <div className="self-start sm:self-auto">
          <span className="px-3 py-1 rounded-btn bg-paper border border-border text-xs font-mono text-ink-muted">
            {isPublicMode ? 'Pengajuan warga' : 'Jalur kurator'}
          </span>
        </div>
      </div>

      {/* Stepper Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 border-y border-border/80 text-xs font-mono">
        <div className="flex items-center gap-2 text-ink">
          <span className="font-semibold text-forest">01 Berkas &amp; metadata</span>
          <span className="text-ink-muted">→</span>
          <span className="text-ink-muted">02 Tinjauan kurator</span>
          <span className="text-ink-muted">→</span>
          <span className="text-ink-muted">03 Pin IPFS &amp; tanda tangan kontrak</span>
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
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Berkas Foto */}
          <div className="bg-surface border border-border rounded-card p-6 space-y-4 shadow-subtle">
            <div>
              <h2 className="font-display font-bold text-base text-ink">Berkas foto *</h2>
              <p className="text-xs text-ink-muted font-sans mt-0.5">
                JPG, PNG, atau WebP · Maksimal 10 MB · Berkas asli tanpa manipulasi
              </p>
            </div>

            <div className="flex items-center justify-between p-4 rounded-btn bg-paper/60 border border-border gap-4 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-16 h-14 rounded-btn bg-paper border border-border overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Pratinjau berkas"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-ink-muted/60" />
                  )}
                </div>
                <div className="space-y-1 min-w-0">
                  <p className="text-xs font-mono font-bold text-ink truncate">
                    {selectedFile ? selectedFile.name : 'Belum ada berkas dipilih'}
                  </p>
                  <p className="text-[11px] font-mono text-ink-muted">
                    {selectedFile
                      ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB${imageDimensions ? ` · ${imageDimensions}` : ''}`
                      : 'Pilih file gambar dari perangkat Anda untuk dihitung hash SHA-256'}
                  </p>
                  {selectedFile && !isHashing && fileHash && (
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                        isDuplicate
                          ? 'bg-status-dangerBg text-status-danger'
                          : 'bg-sage text-forest'
                      }`}
                    >
                      {isDuplicate ? 'Duplikat Terdeteksi' : 'SHA-256 & Pra-Analisis Siap'}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="photo-file-input"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-btn bg-surface hover:bg-paper border border-border text-xs font-mono text-ink shadow-subtle cursor-pointer transition-colors whitespace-nowrap"
                >
                  <Upload className="w-3.5 h-3.5 text-ink-muted" />
                  <span>{selectedFile ? 'Ganti berkas' : 'Pilih berkas foto'}</span>
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
                <span>Menghitung hash SHA-256 dan memanggil model klasifikasi AI...</span>
              </div>
            )}

            {duplicateReason && (
              <div className="p-3 rounded-btn bg-status-dangerBg border border-border text-status-danger text-xs font-mono">
                {duplicateReason}
              </div>
            )}

            {!isHashing && fileHash && (
              <div className="p-3 rounded-btn bg-paper/70 border border-border text-[11px] font-mono space-y-1">
                <span className="text-ink-muted">SHA-256 Berkas Terhitung:</span>
                <p className="text-ink break-all select-all">{fileHash}</p>
                {aiNote && <p className="text-forest pt-1">{aiNote}</p>}
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
                placeholder="Tuliskan judul deskriptif foto arsip"
                className="w-full px-3.5 py-2.5 rounded-btn bg-surface border border-border text-xs text-ink focus:border-forest outline-none transition-colors min-h-[40px]"
                required
              />
            </div>
          </div>

          {/* Section 2: Sumber & Izin */}
          <div className="bg-surface border border-border rounded-card p-6 space-y-4 shadow-subtle">
            <div>
              <h2 className="font-display font-bold text-base text-ink">Sumber &amp; izin</h2>
              <p className="text-xs text-ink-muted font-sans mt-0.5">
                Informasi provenance ini disimpan dalam metadata IPFS dan diperiksa kurator.
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
                placeholder="Misalnya: Arsip Keluarga / Dokumentasi Instansi Daerah"
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
                placeholder="Nomor inventaris, tautan sumber asli, atau nomor katalog"
                className="w-full px-3.5 py-2.5 rounded-btn bg-surface border border-border text-xs text-ink focus:border-forest outline-none transition-colors min-h-[40px]"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="upload-category" className="text-xs font-mono text-ink-muted">
                  Kategori foto *
                </label>
                <select
                  id="upload-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as PhotoCategory)}
                  className="w-full px-3.5 py-2.5 rounded-btn bg-surface border border-border text-xs text-ink focus:border-forest outline-none transition-colors min-h-[40px] capitalize"
                >
                  <option value="bangunan">Bangunan</option>
                  <option value="lanskap">Lanskap</option>
                  <option value="orang">Orang</option>
                </select>
              </div>

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
                  {LICENSE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
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
                  placeholder="Nama fotografer atau pemegang hak"
                  className="w-full px-3.5 py-2.5 rounded-btn bg-surface border border-border text-xs text-ink focus:border-forest outline-none transition-colors min-h-[40px]"
                  required
                />
              </div>
            </div>

            {/* Bukti Izin Attachment */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-ink-muted">
                Referensi / lampiran bukti izin (opsional)
              </label>
              <div className="flex items-center justify-between p-3 rounded-btn bg-paper/60 border border-border text-xs font-mono gap-2">
                <div className="flex items-center gap-2 text-ink min-w-0">
                  <FileText className="w-4 h-4 text-forest flex-shrink-0" />
                  <span className="truncate">
                    {permissionAttachment || 'Belum ada dokumen surat izin dipilih'}
                  </span>
                </div>
                <label
                  htmlFor="permission-doc-input"
                  className="text-forest hover:underline text-[11px] cursor-pointer flex-shrink-0"
                >
                  Pilih dokumen
                </label>
                <input
                  id="permission-doc-input"
                  type="file"
                  accept=".pdf,image/*"
                  onChange={handleAttachmentChange}
                  className="hidden"
                />
              </div>
              <p className="text-[11px] font-mono text-ink-muted">
                Kurator tetap memverifikasi keabsahan izin sebelum menerbitkan token.
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="upload-context" className="text-xs font-mono text-ink-muted">
                Catatan konteks &amp; deskripsi
              </label>
              <textarea
                id="upload-context"
                rows={3}
                value={contextNotes}
                onChange={(e) => setContextNotes(e.target.value)}
                placeholder="Jelaskan konteks foto, waktu pengambilan jika diketahui, atau keterangan tambahan untuk kurator."
                className="w-full px-3.5 py-2.5 rounded-btn bg-surface border border-border text-xs text-ink focus:border-forest outline-none transition-colors leading-relaxed"
              />
            </div>
          </div>

          {/* Section 3: Pemilik Token */}
          <div className="bg-surface border border-border rounded-card p-6 space-y-3 shadow-subtle">
            <div>
              <h2 className="font-display font-bold text-base text-ink">Pemilik token</h2>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="upload-wallet" className="text-xs font-mono text-ink-muted">
                Alamat wallet penerima token (opsional, default alamat penanda tangan saat mint)
              </label>
              <input
                id="upload-wallet"
                type="text"
                value={customRecipient}
                onChange={(e) => setCustomRecipient(e.target.value)}
                placeholder={
                  wallet.address || '0x... (kosongkan untuk memakai wallet terhubung atau wallet kurator)'
                }
                className="w-full px-3.5 py-2.5 rounded-btn bg-surface border border-border text-xs font-mono text-ink focus:border-forest outline-none"
              />
              {wallet.address && !customRecipient && (
                <p className="text-[11px] font-mono text-forest">
                  Wallet MetaMask aktif terdeteksi: {wallet.address}
                </p>
              )}
              {!isRecipientValid && (
                <p className="text-[11px] font-mono text-status-danger">
                  Format alamat EVM tidak valid.
                </p>
              )}
            </div>

            <p className="text-[11px] font-mono text-ink-muted">
              Jaringan aktif: {wallet.chainName} ({wallet.chainId}). Token asli akan memiliki parentId = 0.
            </p>
          </div>
        </div>

        {/* Right Column: Helper & Validation Panel */}
        <div className="space-y-6">
          <div className="p-4 rounded-card bg-gold-light border border-gold-border space-y-1 text-ink">
            <div className="flex items-center gap-2 text-xs font-bold">
              <Info className="w-4 h-4 text-ink flex-shrink-0" />
              <span>IPFS bersifat publik</span>
            </div>
            <p className="text-xs font-sans text-ink/80 leading-relaxed pl-6">
              Jangan unggah data pribadi, sensitif, atau berkas tanpa izin. Berkas hanya di-pin ke IPFS setelah disetujui kurator untuk diterbitkan.
            </p>
          </div>

          <div className="bg-surface border border-border rounded-card p-5 space-y-4 shadow-subtle">
            <h3 className="font-display font-bold text-base text-ink">Validasi pengajuan</h3>

            <div className="space-y-2.5 text-xs font-sans">
              <div className="flex items-center gap-2 text-ink">
                {selectedFile ? (
                  <CheckCircle2 className="w-4 h-4 text-forest flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-ink-muted flex-shrink-0" />
                )}
                <span>Berkas gambar dipilih &amp; format valid</span>
              </div>

              <div className="flex items-center gap-2 text-ink">
                {hasRequiredFields ? (
                  <CheckCircle2 className="w-4 h-4 text-forest flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-ink-muted flex-shrink-0" />
                )}
                <span>Judul, sumber, rujukan &amp; lisensi terisi</span>
              </div>

              <div className="flex items-center gap-2 text-ink">
                {fileHash && !isDuplicate ? (
                  <CheckCircle2 className="w-4 h-4 text-forest flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-ink-muted flex-shrink-0" />
                )}
                <span>SHA-256 unik (belum terdaftar/on-chain)</span>
              </div>

              <div className="flex items-center gap-2 text-ink">
                {hasConsent ? (
                  <CheckCircle2 className="w-4 h-4 text-forest flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-ink-muted flex-shrink-0" />
                )}
                <span>Pernyataan izin disetujui</span>
              </div>
            </div>

            <p className="text-[11px] font-mono text-ink-muted pt-3 border-t border-border/80 leading-relaxed">
              SHA-256 dihitung dari byte mentah berkas dan dicocokkan terhadap antrean serta `hashTerpakai` di smart contract.
            </p>
          </div>

          <div className="p-4 rounded-btn bg-paper/60 border border-border space-y-2">
            <label className="flex items-start gap-2.5 text-xs text-ink cursor-pointer">
              <input
                type="checkbox"
                checked={hasConsent}
                onChange={(e) => setHasConsent(e.target.checked)}
                className="mt-0.5 rounded border-border text-forest focus:ring-forest cursor-pointer"
              />
              <span className="leading-relaxed">
                Saya mencantumkan sumber dan izin yang sah serta tidak menyertakan data pribadi atau sensitif.
              </span>
            </label>
          </div>

          <div className="space-y-2">
            <button
              type="submit"
              disabled={isSubmitting || isHashing || !selectedFile || isDuplicate || !isRecipientValid}
              className="w-full py-3 px-4 rounded-btn bg-gold hover:bg-gold-hover text-ink text-xs font-bold shadow-subtle flex items-center justify-center gap-2 min-h-[44px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan pengajuan...</span>
                </>
              ) : (
                <>
                  <span>{isPublicMode ? 'Kirim ke antrean kurator' : 'Daftarkan arsip ke antrean'}</span>
                  <ArrowRight className="w-4 h-4 text-ink" />
                </>
              )}
            </button>

            <p className="text-[11px] font-mono text-ink-muted text-center leading-relaxed">
              Pengajuan disimpan persisten di backend antrean kurasi; pencetakan token dilakukan kurator setelah verifikasi izin.
            </p>
          </div>
        </div>
      </form>

      <FooterDisclaimer />
    </div>
  );
};
