import React, { useState } from 'react';
import {
  Search,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Eye,
  ExternalLink,
  Upload,
  AlertTriangle,
  Loader2,
  Lock,
  Wallet,
} from 'lucide-react';
import { useArchiveStore } from '../store/useArchiveStore';
import { PhotoCategory, ArchiveItem } from '../types';
import { PublicArchiveModal } from '../components/PublicArchiveModal';
import { computeFileSHA256, truncateIdentifier } from '../lib/hash';
import { predictPhotoCategory, resolveMediaUrl } from '../lib/api';
import { normalizeHexHash } from '../lib/contract';

export const PublicPortalPage: React.FC = () => {
  const {
    archives,
    publicTab,
    setPublicTab,
    setViewMode,
    submitArchive,
    restorationFeeEth,
    wallet,
  } = useArchiveStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [modalArchive, setModalArchive] = useState<ArchiveItem | null>(null);

  const [verifyInput, setVerifyInput] = useState('');
  const [verificationResult, setVerificationResult] = useState<ArchiveItem | null>(null);
  const [hasSearchedVerify, setHasSearchedVerify] = useState(false);

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadHash, setUploadHash] = useState<string>('');
  const [isHashing, setIsHashing] = useState<boolean>(false);
  const [isDuplicate, setIsDuplicate] = useState<boolean>(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCreator, setUploadCreator] = useState('');
  const [uploadSource, setUploadSource] = useState('');
  const [uploadLicense, setUploadLicense] = useState('');
  const [uploadCategory, setUploadCategory] = useState<PhotoCategory>('bangunan');
  const [uploadConsent, setUploadConsent] = useState(false);
  const [isProcessingRestoration, setIsProcessingRestoration] = useState(false);
  const [restorationStep, setRestorationStep] = useState<number>(1);
  const [restorationSuccess, setRestorationSuccess] = useState<{ archiveId: string; statusNote: string } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const publicArchives = archives.filter((item) => {
    if (item.status !== 'tercatat') return false;
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.creator.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' || item.finalCategory === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const restoredArchives = archives.filter((a) =>
    a.versions.some((v) => v.versionType === 'derivative')
  );
  const onChainTokenCount = archives.reduce(
    (acc, item) => acc + item.versions.filter((v) => Boolean(v.onChainTokenId)).length,
    0
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Berkas harus berupa gambar (JPG, PNG, WebP).');
      return;
    }

    setUploadError(null);
    setUploadFile(file);
    const url = URL.createObjectURL(file);
    setUploadPreview(url);

    setIsHashing(true);
    try {
      const hash = await computeFileSHA256(file);
      setUploadHash(hash);
      const duplicateFound = archives.some(
        (a) =>
          a.status !== 'ditolak' &&
          normalizeHexHash(a.originalHash) === normalizeHexHash(hash)
      );
      setIsDuplicate(duplicateFound);
    } catch {
      setUploadError('Gagal menghitung hash SHA-256 berkas.');
    } finally {
      setIsHashing(false);
    }
  };

  const handlePayAndRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);

    if (!uploadFile || !uploadHash) {
      setUploadError('Harap pilih berkas foto terlebih dahulu.');
      return;
    }
    if (!uploadTitle.trim() || !uploadCreator.trim() || !uploadSource.trim() || !uploadLicense.trim()) {
      setUploadError('Semua kolom identitas dan perizinan wajib diisi.');
      return;
    }
    if (!uploadConsent) {
      setUploadError('Pernyataan kepemilikan izin foto wajib disetujui.');
      return;
    }
    if (isDuplicate) {
      setUploadError('Foto ini sudah terdaftar sebelumnya dalam registri arsip.');
      return;
    }

    setIsProcessingRestoration(true);
    setRestorationStep(1);

    let aiCat: PhotoCategory = uploadCategory;
    let aiConf = 0;
    let aiScores: Record<PhotoCategory, number> | undefined;
    let aiModelVersion: string | undefined;
    let aiNote = `Kategori awal dipilih pengunggah: ${uploadCategory.toUpperCase()}.`;
    try {
      const pred = await predictPhotoCategory(uploadFile);
      aiCat = pred.label;
      aiConf = pred.confidence;
      aiScores = pred.scores;
      aiModelVersion = pred.model_version;
      aiNote = `Saran AI (${pred.model_version}): ${pred.label.toUpperCase()} (${(
        pred.confidence * 100
      ).toFixed(1)}%). Menunggu tinjauan kurator.`;
    } catch {
      // Fallback ke kategori manual bila backend AI tidak aktif
    }

    setRestorationStep(2);
    const res = await submitArchive(uploadFile, {
      title: uploadTitle.trim(),
      creator: uploadCreator.trim(),
      source: uploadSource.trim(),
      licenseInfo: uploadLicense.trim(),
      initialCategory: aiCat,
      finalCategory: uploadCategory,
      status: 'menunggu_tinjauan',
      aiPrediction: {
        category: aiCat,
        confidence: aiConf,
        scores: aiScores,
        modelVersion: aiModelVersion,
        advisoryNote: aiNote,
      },
      curatorNotes: 'Diajukan melalui portal publik, menunggu peninjauan dan penerbitan kurator.',
      originalHash: uploadHash,
      originalCid: '',
    });

    setIsProcessingRestoration(false);
    if (!res.success || !res.archiveId) {
      setUploadError(res.error || 'Gagal mengirim pengajuan ke server.');
      return;
    }

    setRestorationStep(3);
    setRestorationSuccess({
      archiveId: res.archiveId,
      statusNote: 'Tersimpan di antrean kurasi backend (menunggu peninjauan & minting on-chain)',
    });
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setHasSearchedVerify(true);
    const query = verifyInput.trim().toLowerCase();
    if (!query) {
      setVerificationResult(null);
      return;
    }

    const match = archives.find(
      (a) =>
        a.id.toLowerCase() === query ||
        normalizeHexHash(a.originalHash).includes(normalizeHexHash(query)) ||
        a.originalCid.toLowerCase().includes(query) ||
        a.versions.some(
          (v) =>
            normalizeHexHash(v.fileHash).includes(normalizeHexHash(query)) ||
            v.ipfsCid.toLowerCase().includes(query) ||
            v.transactionHash?.toLowerCase().includes(query)
        )
    );
    setVerificationResult(match || null);
  };

  const openVerifierWithHash = (hash: string) => {
    setPublicTab('verifikasi');
    setVerifyInput(hash);
    const match = archives.find(
      (a) =>
        normalizeHexHash(a.originalHash) === normalizeHexHash(hash) ||
        a.versions.some((v) => normalizeHexHash(v.fileHash) === normalizeHexHash(hash))
    );
    setVerificationResult(match || null);
    setHasSearchedVerify(true);
  };

  return (
    <div className="space-y-12 pb-16">
      <section className="bg-gradient-to-b from-paper-light to-paper pt-12 pb-10 border-b border-border/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-btn bg-surface border border-border text-xs font-mono text-forest mx-auto">
            <span>PORTAL PUBLIK</span>
            <span>·</span>
            <span>PRESERVASI &amp; RESTORASI FOTO TERBUKA</span>
          </div>

          <div className="space-y-4 max-w-4xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-ink leading-[1.15]">
              Arsip visual berizin, restorasi kecerdasan buatan, dan bukti keaslian versi berbasis blockchain.
            </h1>
            <p className="text-sm md:text-base text-ink-muted leading-relaxed font-sans max-w-3xl mx-auto">
              Menelusuri warisan fotografi dengan preservasi sumber asli, peningkatan kualitas visual berlabel hasil AI, serta integritas riwayat perubahan yang tercatat secara terdesentralisasi melalui smart contract ERC-721.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 max-w-3xl w-full mx-auto">
            <div className="bg-surface border border-border rounded-card p-5 shadow-subtle text-center flex flex-col items-center justify-center">
              <p className="text-xs font-mono text-ink-muted">Total Arsip Tercatat</p>
              <p className="text-2xl font-display font-bold text-ink mt-1">
                {publicArchives.length} Foto
              </p>
              <p className="text-[11px] font-mono text-forest mt-1">Berizin &amp; terverifikasi</p>
            </div>

            <div className="bg-surface border border-border rounded-card p-5 shadow-subtle text-center flex flex-col items-center justify-center">
              <p className="text-xs font-mono text-ink-muted">Versi Direstorasi AI</p>
              <p className="text-2xl font-display font-bold text-ink mt-1">
                {restoredArchives.length} Versi
              </p>
              <p className="text-[11px] font-mono text-brass-text mt-1">Model Real-ESRGAN x4</p>
            </div>

            <div className="bg-surface border border-border rounded-card p-5 shadow-subtle text-center flex flex-col items-center justify-center">
              <p className="text-xs font-mono text-ink-muted">Token On-Chain Tercatat</p>
              <p className="text-2xl font-display font-bold text-ink mt-1">
                {onChainTokenCount} Token
              </p>
              <p className="text-[11px] font-mono text-forest mt-1">{wallet.chainName}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {publicTab === 'semua' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-2 border-b border-border/80">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono text-ink-muted mr-1">Kategori:</span>
                {[
                  { id: 'all', label: 'Semua' },
                  { id: 'orang', label: 'Orang' },
                  { id: 'bangunan', label: 'Bangunan' },
                  { id: 'lanskap', label: 'Lanskap' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3.5 py-1.5 rounded-btn text-xs font-semibold transition-colors min-h-[36px] ${
                      selectedCategory === cat.id
                        ? 'bg-forest text-surface'
                        : 'bg-surface border border-border text-ink hover:border-forest'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-ink-muted absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari foto, ID, atau kontributor..."
                  className="w-full pl-9 pr-3.5 py-2 rounded-btn bg-surface border border-border text-xs text-ink focus:border-forest outline-none min-h-[40px]"
                />
              </div>
            </div>

            {publicArchives.length === 0 ? (
              <div className="bg-surface border border-border rounded-card p-10 text-center text-xs font-mono text-ink-muted">
                Belum ada arsip yang diterbitkan on-chain di jaringan {wallet.chainName}.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {publicArchives.map((item) => {
                  const originalVer =
                    item.versions.find((v) => v.versionType === 'original') || item.versions[0];
                  const hasDerivative = item.versions.some((v) => v.versionType === 'derivative');

                  return (
                    <div
                      key={item.id}
                      onClick={() => setModalArchive(item)}
                      className="bg-surface border border-border rounded-card overflow-hidden shadow-subtle hover:border-forest transition-all flex flex-col justify-between group cursor-pointer"
                    >
                      <div>
                        <div className="relative h-56 bg-paper overflow-hidden">
                          <img
                            src={originalVer?.imageUrl ? resolveMediaUrl(originalVer.imageUrl) : ''}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                            <span className="px-2 py-0.5 rounded-btn bg-surface/90 backdrop-blur-sm text-[10px] font-mono font-bold uppercase tracking-wider text-ink shadow-subtle">
                              {item.finalCategory}
                            </span>
                            {hasDerivative && (
                              <span className="px-2 py-0.5 rounded-btn bg-brass-light/95 border border-brass-border text-[10px] font-mono font-bold text-brass-text shadow-subtle flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-brass" />
                                <span>Direstorasi AI</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="p-5 space-y-2">
                          <h3 className="text-lg font-display font-semibold text-ink group-hover:text-forest transition-colors line-clamp-1">
                            {item.title}
                          </h3>
                          <p className="text-xs text-ink-muted font-sans line-clamp-1">
                            {item.creator} · {item.source}
                          </p>
                          <p className="text-[11px] font-mono text-ink-muted">
                            ID: {item.id} · {item.versions.length} versi tercatat
                          </p>
                        </div>
                      </div>

                      <div className="p-5 pt-0 flex items-center justify-between border-t border-border/50">
                        <span className="text-[11px] font-mono text-forest font-medium flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>On-Chain Verified</span>
                        </span>
                        <span className="text-xs font-semibold text-forest flex items-center gap-1 opacity-90 group-hover:opacity-100">
                          <span>Lihat detail</span>
                          <Eye className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {publicTab === 'unggah_restorasi' && (
          <div className="space-y-8 max-w-4xl mx-auto">
            <div className="space-y-2 text-center">
              <span className="px-3 py-1 rounded-btn bg-brass-light border border-brass-border text-xs font-mono font-bold text-brass-text">
                Pengajuan Arsip Baru · Restorasi Berbayar (
                {restorationFeeEth ? `${restorationFeeEth} ETH` : 'Sesuai Kontrak'}) Setelah Terbit
              </span>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-ink">
                Unggah Foto Berizin ke Antrean Kurasi
              </h2>
              <p className="text-xs md:text-sm text-ink-muted max-w-2xl mx-auto leading-relaxed">
                Foto baru diajukan terlebih dahulu untuk ditinjau kurator, dipin ke IPFS, dan dicatat on-chain. Setelah memiliki Token ID on-chain, pemohon dapat mengajukan restorasi berbayar melalui halaman Detail Arsip.
              </p>
            </div>

            {uploadError && (
              <div className="p-4 rounded-btn bg-status-dangerBg border border-border text-status-danger text-xs font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {restorationSuccess ? (
              <div className="bg-surface border border-sage-border rounded-card p-8 space-y-6 text-center shadow-subtle animate-in fade-in">
                <div className="w-12 h-12 rounded-full bg-sage text-forest flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div className="space-y-2 max-w-md mx-auto">
                  <h3 className="text-xl font-display font-bold text-ink">
                    Pengajuan Arsip Berhasil Dicatat di Antrean!
                  </h3>
                  <p className="text-xs text-ink-muted leading-relaxed font-sans">
                    Arsip baru telah disimpan dan menunggu peninjauan kurator untuk dipin ke IPFS serta dicatat on-chain.
                  </p>
                </div>

                <div className="p-4 rounded-btn bg-paper/80 border border-border max-w-lg mx-auto text-left font-mono text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-ink-muted">ID Arsip Baru:</span>
                    <span className="font-bold text-forest">{restorationSuccess.archiveId}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-ink-muted">Status Antrean:</span>
                    <p className="text-[11px] text-ink select-all break-all">{restorationSuccess.statusNote}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const item = archives.find((a) => a.id === restorationSuccess.archiveId);
                      if (item) setModalArchive(item);
                    }}
                    className="px-5 py-2.5 rounded-btn bg-forest hover:bg-forest-hover text-surface text-xs font-semibold shadow-subtle min-h-[44px]"
                  >
                    Lihat Pratinjau Arsip
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRestorationSuccess(null);
                      setUploadFile(null);
                      setUploadPreview(null);
                      setUploadHash('');
                    }}
                    className="px-5 py-2.5 rounded-btn bg-surface hover:bg-paper border border-border text-ink text-xs font-semibold min-h-[44px]"
                  >
                    Unggah Foto Lainnya
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={(e) => void handlePayAndRestore(e)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  <div className="bg-surface border border-border rounded-card p-6 space-y-4 shadow-subtle">
                    <h3 className="text-xs font-mono font-semibold tracking-wider text-ink-muted uppercase">
                      01 · BERKAS FOTO ASLI
                    </h3>

                    <div className="border-2 border-dashed border-border rounded-card p-6 text-center space-y-3 bg-paper/30 hover:border-forest transition-colors">
                      {uploadPreview ? (
                        <div className="space-y-2">
                          <div className="h-44 rounded-btn overflow-hidden bg-paper">
                            <img src={uploadPreview} alt="Preview Unggahan" className="w-full h-full object-cover" />
                          </div>
                          <p className="text-xs font-mono text-ink-muted">
                            {uploadFile?.name} ({(uploadFile ? uploadFile.size / 1024 / 1024 : 0).toFixed(2)} MB)
                          </p>
                        </div>
                      ) : (
                        <div className="py-4 space-y-2">
                          <Upload className="w-8 h-8 text-forest mx-auto" />
                          <p className="text-sm font-semibold text-ink">Pilih foto arsip</p>
                          <p className="text-xs text-ink-muted">Format gambar JPG/PNG resolusi awal</p>
                        </div>
                      )}

                      <label
                        htmlFor="public-file-input"
                        className="inline-block px-4 py-2 rounded-btn bg-surface border border-border text-xs font-semibold text-ink hover:border-forest cursor-pointer transition-colors"
                      >
                        {uploadPreview ? 'Ganti berkas' : 'Pilih berkas foto'}
                      </label>
                      <input
                        id="public-file-input"
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="sr-only"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="pub-cat-select" className="text-xs font-mono text-ink-muted">
                        Kategori Foto
                      </label>
                      <select
                        id="pub-cat-select"
                        value={uploadCategory}
                        onChange={(e) => setUploadCategory(e.target.value as PhotoCategory)}
                        className="w-full px-3.5 py-2.5 rounded-btn bg-surface border border-border text-xs text-ink focus:border-forest outline-none min-h-[44px]"
                      >
                        <option value="bangunan">Bangunan</option>
                        <option value="orang">Orang</option>
                        <option value="lanskap">Lanskap</option>
                      </select>
                    </div>

                    {isHashing && (
                      <div className="p-3 rounded-btn bg-paper/80 border border-border text-xs font-mono flex items-center gap-2 text-ink-muted">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-forest" />
                        <span>Menghitung hash SHA-256 berkas...</span>
                      </div>
                    )}

                    {!isHashing && uploadHash && (
                      <div className="p-3 rounded-btn bg-paper/80 border border-border text-xs font-mono space-y-1">
                        <span className="text-ink-muted">SHA-256 Otomatis Dihitung:</span>
                        <p className="text-[11px] text-ink select-all break-all">{uploadHash}</p>
                      </div>
                    )}
                  </div>

                  <div className="bg-surface border border-border rounded-card p-6 space-y-4 shadow-subtle">
                    <h3 className="text-xs font-mono font-semibold tracking-wider text-ink-muted uppercase">
                      02 · PROVENANCE &amp; PERIZINAN
                    </h3>

                    <div className="space-y-1.5">
                      <label htmlFor="pub-title-input" className="text-xs font-mono text-ink-muted">
                        Judul foto
                      </label>
                      <input
                        id="pub-title-input"
                        type="text"
                        value={uploadTitle}
                        onChange={(e) => setUploadTitle(e.target.value)}
                        placeholder="Tuliskan judul foto arsip"
                        className="w-full px-3.5 py-2.5 rounded-btn bg-surface border border-border text-xs text-ink focus:border-forest outline-none min-h-[44px]"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="pub-creator-input" className="text-xs font-mono text-ink-muted">
                        Nama pembuat / pemilik hak
                      </label>
                      <input
                        id="pub-creator-input"
                        type="text"
                        value={uploadCreator}
                        onChange={(e) => setUploadCreator(e.target.value)}
                        placeholder="Nama pemilik atau kontributor"
                        className="w-full px-3.5 py-2.5 rounded-btn bg-surface border border-border text-xs text-ink focus:border-forest outline-none min-h-[44px]"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="pub-source-input" className="text-xs font-mono text-ink-muted">
                        Sumber foto
                      </label>
                      <input
                        id="pub-source-input"
                        type="text"
                        value={uploadSource}
                        onChange={(e) => setUploadSource(e.target.value)}
                        placeholder="Koleksi pribadi atau dokumentasi instansi"
                        className="w-full px-3.5 py-2.5 rounded-btn bg-surface border border-border text-xs text-ink focus:border-forest outline-none min-h-[44px]"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="pub-license-input" className="text-xs font-mono text-ink-muted">
                        Informasi izin penggunaan
                      </label>
                      <textarea
                        id="pub-license-input"
                        value={uploadLicense}
                        onChange={(e) => setUploadLicense(e.target.value)}
                        placeholder="Jelaskan bukti izin atau lisensi (misal: CC BY 4.0, Domain Publik)"
                        rows={2}
                        className="w-full px-3.5 py-2.5 rounded-btn bg-surface border border-border text-xs text-ink focus:border-forest outline-none resize-none"
                        required
                      />
                    </div>

                    <div className="flex items-start gap-2 pt-1">
                      <input
                        id="pub-consent-check"
                        type="checkbox"
                        checked={uploadConsent}
                        onChange={(e) => setUploadConsent(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded text-forest focus:ring-forest border-border"
                      />
                      <label htmlFor="pub-consent-check" className="text-xs text-ink-muted leading-relaxed cursor-pointer font-sans">
                        Saya menyatakan memiliki izin sah untuk mengunggah dan memproses foto ini.
                      </label>
                    </div>
                  </div>
                </div>

                <div className="bg-surface border border-border rounded-card p-6 space-y-4 shadow-subtle">
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-border">
                    <div className="space-y-0.5">
                      <h3 className="text-base font-display font-bold text-ink">
                        Praklasifikasi AI &amp; Pengiriman Pengajuan
                      </h3>
                      <p className="text-xs text-ink-muted font-sans">
                        Foto diperiksa hash SHA-256 dan diklasifikasi AI sebelum masuk tinjauan kurator.
                      </p>
                    </div>
                  </div>

                  {isProcessingRestoration && (
                    <div className="p-4 rounded-btn bg-paper border border-border space-y-3 font-mono text-xs">
                      <div className="flex items-center gap-2 font-sans font-semibold text-ink">
                        <Loader2 className="w-4 h-4 animate-spin text-forest" />
                        <span>Memproses Pengajuan:</span>
                      </div>
                      <div className="space-y-1.5 pl-6">
                        <p className={restorationStep >= 1 ? 'text-forest font-semibold' : 'text-ink-muted'}>
                          1. Memanggil layanan klasifikasi AI (/predict)
                        </p>
                        <p className={restorationStep >= 2 ? 'text-forest font-semibold' : 'text-ink-muted'}>
                          2. Menyimpan pengajuan persisten ke antrean backend
                        </p>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isProcessingRestoration || !uploadFile || isDuplicate}
                    className="w-full py-3.5 px-6 rounded-btn bg-forest hover:bg-forest-hover text-surface text-sm font-semibold shadow-subtle flex items-center justify-center gap-2 min-h-[48px] transition-colors disabled:opacity-50"
                  >
                    {isProcessingRestoration ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sedang Memproses...</span>
                      </>
                    ) : (
                      <>
                        <Wallet className="w-4 h-4" />
                        <span>Ajukan Foto ke Antrean Kurasi</span>
                      </>
                    )}
                  </button>

                  <p className="text-center text-[11px] font-mono text-ink-muted">
                    Pembayaran restorasi on-chain ({restorationFeeEth ? `${restorationFeeEth} ETH` : 'sesuai kontrak'}) dilakukan setelah foto memiliki Token ID on-chain.
                  </p>
                </div>
              </form>
            )}
          </div>
        )}

        {publicTab === 'restorasi' && (
          <div className="space-y-8">
            <div className="space-y-2">
              <h2 className="text-2xl font-display font-bold text-ink">
                Etalase Restorasi AI &amp; Peningkatan Resolusi
              </h2>
              <p className="text-xs md:text-sm text-ink-muted max-w-3xl leading-relaxed">
                Menampilkan perbandingan foto sumber beresolusi rendah terhadap keluaran model super-resolution terlatih. Setiap hasil olahan tetap mempertahankan foto asli secara terpisah dalam silsilah versi.
              </p>
            </div>

            {restoredArchives.length === 0 ? (
              <div className="bg-surface border border-border rounded-card p-10 text-center text-xs font-mono text-ink-muted">
                Belum ada arsip yang memiliki versi restorasi AI pada jaringan {wallet.chainName}.
              </div>
            ) : (
              <div className="space-y-8">
                {restoredArchives.map((archive) => {
                  const originalVer =
                    archive.versions.find((v) => v.versionType === 'original') || archive.versions[0];
                  const derivativeVer = archive.versions.find((v) => v.versionType === 'derivative');

                  return (
                    <div
                      key={archive.id}
                      className="bg-surface border border-border rounded-card p-6 space-y-6 shadow-subtle"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border/80">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-forest px-2 py-0.5 rounded-btn bg-sage">
                              {archive.id}
                            </span>
                            <span className="text-xs font-mono text-ink-muted capitalize">
                              Kategori: {archive.finalCategory}
                            </span>
                            {archive.restorationFeePaid && (
                              <span className="text-[10px] font-mono bg-brass-light border border-brass-border text-brass-text px-2 py-0.5 rounded-btn font-bold">
                                Biaya: {archive.restorationFeePaid}
                              </span>
                            )}
                          </div>
                          <h3 className="text-xl font-display font-bold text-ink mt-1">
                            {archive.title}
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setModalArchive(archive)}
                          className="px-4 py-2 rounded-btn bg-paper hover:bg-sage border border-border text-xs font-semibold text-ink flex items-center gap-1.5"
                        >
                          <span>Buka Riwayat Lengkap</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-semibold text-ink uppercase">
                              01 · Foto Sumber (Original)
                            </span>
                            <span className="text-[10px] font-mono text-ink-muted bg-paper px-2 py-0.5 rounded-btn">
                              Resolusi Dasar
                            </span>
                          </div>
                          <div className="h-72 rounded-btn overflow-hidden bg-paper border border-border">
                            <img
                              src={originalVer?.imageUrl ? resolveMediaUrl(originalVer.imageUrl) : ''}
                              alt="Foto Asli"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <p className="text-[11px] font-mono text-ink-muted">
                            Hash asli: {truncateIdentifier(originalVer?.fileHash || '', 12, 8)}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-semibold text-forest uppercase flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-brass" />
                              <span>02 · Hasil Restorasi AI (Super-Resolution)</span>
                            </span>
                            <span className="text-[10px] font-mono text-brass-text bg-brass-light border border-brass-border px-2 py-0.5 rounded-btn">
                              Real-ESRGAN x4
                            </span>
                          </div>
                          <div className="h-72 rounded-btn overflow-hidden bg-paper border border-border">
                            <img
                              src={derivativeVer?.imageUrl ? resolveMediaUrl(derivativeVer.imageUrl) : ''}
                              alt="Foto Restorasi"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <p className="text-[11px] font-mono text-ink-muted">
                            Hash turunan: {truncateIdentifier(derivativeVer?.fileHash || '', 12, 8)} · Parent:{' '}
                            {derivativeVer?.parentId || originalVer?.onChainTokenId || '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {publicTab === 'verifikasi' && (
          <div className="space-y-8 max-w-4xl mx-auto">
            <div className="space-y-2 text-center">
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-ink">
                Mesin Verifikasi Keaslian Terbuka
              </h2>
              <p className="text-xs md:text-sm text-ink-muted max-w-2xl mx-auto leading-relaxed">
                Masukkan hash berkas SHA-256, Content Identifier (CID) IPFS, atau ID arsip untuk memeriksa apakah foto tercatat pada kontrak ERC-721 dan memastikan integritasnya belum pernah dimanipulasi.
              </p>
            </div>

            <form onSubmit={handleVerify} className="bg-surface border border-border rounded-card p-6 space-y-4 shadow-subtle">
              <label htmlFor="public-verify-input" className="text-xs font-mono text-ink-muted">
                KATA KUNCI PEMERIKSAAN (SHA-256 / CID / ID ARSIP)
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  id="public-verify-input"
                  type="text"
                  value={verifyInput}
                  onChange={(e) => setVerifyInput(e.target.value)}
                  placeholder="Masukkan ID arsip, CID IPFS, atau hash SHA-256..."
                  className="flex-1 px-4 py-3 rounded-btn bg-paper/60 border border-border text-xs text-ink focus:border-forest outline-none min-h-[44px]"
                />
                <button
                  type="submit"
                  className="px-6 py-3 rounded-btn bg-forest hover:bg-forest-hover text-surface text-xs font-semibold shadow-subtle flex items-center justify-center gap-2 min-h-[44px]"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Cek Integritas</span>
                </button>
              </div>

              {archives.length > 0 && (
                <div className="pt-2 flex flex-wrap items-center gap-2 text-xs font-mono text-ink-muted">
                  <span>Arsip terdaftar:</span>
                  {archives.slice(0, 3).map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        setVerifyInput(a.id);
                        setVerificationResult(a);
                        setHasSearchedVerify(true);
                      }}
                      className="px-2.5 py-1 rounded-btn bg-paper hover:bg-sage border border-border text-ink"
                    >
                      {a.id}
                    </button>
                  ))}
                </div>
              )}
            </form>

            {hasSearchedVerify && (
              <div className="animate-in fade-in duration-200">
                {verificationResult ? (
                  <div className="bg-surface border border-sage-border rounded-card p-6 space-y-5 shadow-subtle">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-sage flex items-center justify-center text-forest">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-display font-bold text-ink">
                          Arsip Valid &amp; Ditemukan di Registri
                        </h3>
                        <p className="text-xs font-mono text-ink-muted">
                          Identitas dan hash berkas cocok dengan catatan sistem/kontrak.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono pt-2 border-t border-border">
                      <div className="space-y-1">
                        <span className="text-ink-muted font-sans">Judul Arsip:</span>
                        <p className="font-semibold text-ink">{verificationResult.title}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-ink-muted font-sans">Status Kurator:</span>
                        <p className="text-forest font-semibold capitalize">{verificationResult.status}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-ink-muted font-sans">SHA-256 Asli:</span>
                        <p className="text-ink select-all break-all">{verificationResult.originalHash}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-ink-muted font-sans">IPFS CID:</span>
                        <p className="text-ink select-all break-all">
                          {verificationResult.originalCid || 'Belum dipin ke IPFS'}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setModalArchive(verificationResult)}
                        className="px-4 py-2 rounded-btn bg-forest text-surface text-xs font-semibold"
                      >
                        Lihat Arsip Lengkap
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-surface border border-border rounded-card p-8 text-center space-y-2 shadow-subtle">
                    <p className="text-sm font-semibold text-status-danger">
                      Data tidak ditemukan dalam registri arsip.
                    </p>
                    <p className="text-xs text-ink-muted max-w-sm mx-auto">
                      Hash atau ID yang Anda masukkan tidak cocok dengan catatan versi publik saat ini.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <section className="bg-paper border border-border rounded-card p-8 text-center space-y-4">
          <h2 className="text-2xl font-display font-bold text-ink">
            Pintu Masuk Kurator &amp; Verifikator Resmi
          </h2>
          <p className="text-xs md:text-sm text-ink-muted max-w-xl mx-auto leading-relaxed font-sans">
            Kurator terdaftar dapat masuk ke panel kerja privat menggunakan dompet kripto MetaMask untuk menyetujui foto antrean dan menandatangani pencatatan versi resmi ke smart contract.
          </p>
          <button
            type="button"
            onClick={() => setViewMode('login')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-btn bg-forest hover:bg-forest-hover text-surface text-xs font-semibold shadow-subtle transition-colors min-h-[44px]"
          >
            <Lock className="w-4 h-4" />
            <span>Masuk ke Workspace Kurasi</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </section>
      </div>

      <footer className="mt-16 pt-8 pb-12 border-t border-border bg-surface text-xs text-ink-muted font-mono leading-relaxed">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-ink font-sans">
              SunnyRest · Proyek Terpadu AI dan Blockchain (P5)
            </p>
            <p>D4 Teknik Informatika Multimedia · Politeknik Negeri Samarinda · 2026</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setViewMode('login')}
              className="text-forest underline hover:text-forest-hover font-semibold"
            >
              Gerbang Kurator (Login Wallet)
            </button>
          </div>
        </div>
      </footer>

      <PublicArchiveModal
        archive={modalArchive}
        onClose={() => setModalArchive(null)}
        onOpenVerifier={openVerifierWithHash}
      />
    </div>
  );
};
