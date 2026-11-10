import React, { useState } from 'react';
import { Search, ShieldCheck, Loader2 } from 'lucide-react';
import { useArchiveStore } from '../store/useArchiveStore';
import { truncateIdentifier } from '../lib/hash';
import { FooterDisclaimer } from '../components/FooterDisclaimer';

export const VerificationPage: React.FC = () => {
  const { archives, selectedArchiveId, setSelectedArchiveId, wallet, connectWallet, publishToBlockchain } =
    useArchiveStore();

  const [searchInput, setSearchInput] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStep, setPublishStep] = useState<number>(1);
  const [txReceipt, setTxReceipt] = useState<string | null>(null);

  const activeArchive =
    archives.find(
      (a) =>
        a.id.toLowerCase() === searchInput.trim().toLowerCase() ||
        a.originalHash.toLowerCase() === searchInput.trim().toLowerCase() ||
        a.versions.some((v) => v.transactionHash?.toLowerCase() === searchInput.trim().toLowerCase())
    ) ||
    archives.find((a) => a.id === selectedArchiveId) ||
    archives[0];

  const originalVersion = activeArchive?.versions.find((v) => v.versionType === 'original') || activeArchive?.versions[0];
  const isRecorded = activeArchive?.status === 'tercatat';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    const found = archives.find(
      (a) =>
        a.id.toLowerCase() === searchInput.trim().toLowerCase() ||
        a.originalHash.toLowerCase() === searchInput.trim().toLowerCase() ||
        a.versions.some((v) => v.transactionHash?.toLowerCase() === searchInput.trim().toLowerCase())
    );
    if (found) {
      setSelectedArchiveId(found.id);
    }
  };

  const handlePublish = async () => {
    if (!activeArchive) return;
    setIsPublishing(true);
    setPublishStep(1);

    // Step 1: Wallet signature request
    await new Promise((r) => setTimeout(r, 900));
    setPublishStep(2);

    // Step 2: Contract mining & confirmation
    await new Promise((r) => setTimeout(r, 1200));

    // Step 3: Receipt generated
    const res = await publishToBlockchain(activeArchive.id);
    setPublishStep(3);
    setTxReceipt(res.txHash || null);
    setIsPublishing(false);
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="space-y-3">
        <p className="text-xs font-mono font-medium tracking-wider text-ink-muted uppercase">
          SUNNYREST · ARSIP FOTO BERIZIN
        </p>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-ink leading-tight max-w-4xl">
          Periksa state kontrak, kepemilikan token, receipt transaksi, metadata IPFS, dan integritas berkas.
        </h1>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="bg-surface border border-border rounded-card p-4 space-y-2 shadow-subtle">
        <label htmlFor="tx-search-input" className="text-[11px] font-mono text-ink-muted uppercase tracking-wider">
          CARI ARSIP / TOKEN / TRANSACTION HASH
        </label>
        <div className="flex gap-2">
          <input
            id="tx-search-input"
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Masukkan ID arsip, token ID, atau hash transaksi..."
            className="flex-1 px-3.5 py-2.5 rounded-btn bg-paper/60 border border-border text-xs text-ink focus:border-forest outline-none min-h-[44px]"
          />
          <button
            type="submit"
            className="px-5 py-2.5 rounded-btn bg-forest hover:bg-forest-hover text-surface text-xs font-semibold shadow-subtle min-h-[44px] flex items-center gap-1.5"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Verifikasi</span>
          </button>
        </div>
      </form>

      {/* Top 3 Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Jaringan Terpilih */}
        <div className="bg-surface border border-border rounded-card p-5 space-y-1.5 shadow-subtle">
          <p className="text-[11px] font-mono text-ink-muted">Jaringan terpilih</p>
          <p className="text-2xl font-display font-bold text-ink">{wallet.chainName}</p>
          <p className="text-[11px] font-mono text-ink-muted">
            Chain ID: {wallet.chainId} · RPC aktif
          </p>
        </div>

        {/* Wallet Kurator */}
        <div className="bg-surface border border-border rounded-card p-5 space-y-2 shadow-subtle">
          <p className="text-[11px] font-mono text-ink-muted">Wallet kurator</p>
          <p className="text-sm font-mono font-medium text-ink select-all break-all">
            {wallet.address ? truncateIdentifier(wallet.address, 8, 6) : 'Belum terhubung'}
          </p>
          <button
            type="button"
            onClick={connectWallet}
            className="text-xs font-semibold text-forest underline hover:text-forest-hover text-left"
          >
            {wallet.isConnected ? 'Ganti akun wallet' : 'Hubungkan MetaMask'}
          </button>
        </div>

        {/* Status Transaksi */}
        <div className="bg-surface border border-border rounded-card p-5 space-y-1.5 shadow-subtle">
          <p className="text-[11px] font-mono text-ink-muted">Status transaksi</p>
          <p className="text-2xl font-display font-bold text-ink">
            {isRecorded ? 'Tercatat' : 'Belum diterbitkan'}
          </p>
          <p className="text-[11px] font-mono text-ink-muted">
            {isRecorded ? 'Receipt konfirmasi valid' : 'Menunggu kurasi & publikasi'}
          </p>
        </div>
      </div>

      {/* Status Transaksi Stepper */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-display font-bold text-ink">Status transaksi</h2>
          <span className="text-xs font-mono text-ink-muted">Sukses hanya setelah receipt sukses</span>
        </div>

        <div className="bg-surface border border-border rounded-card p-6 space-y-6 shadow-subtle">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="flex items-start gap-3">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-semibold flex-shrink-0 mt-0.5 ${
                  isRecorded || (isPublishing && publishStep > 1)
                    ? 'bg-sage text-forest'
                    : isPublishing && publishStep === 1
                    ? 'bg-forest text-surface'
                    : 'bg-paper text-ink-muted border border-border'
                }`}
              >
                1
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">Menunggu tanda tangan</p>
                <p className="text-xs text-ink-muted leading-relaxed">
                  MetaMask meminta persetujuan kurator.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-semibold flex-shrink-0 mt-0.5 ${
                  isRecorded || (isPublishing && publishStep > 2)
                    ? 'bg-sage text-forest'
                    : isPublishing && publishStep === 2
                    ? 'bg-forest text-surface'
                    : 'bg-paper text-ink-muted border border-border'
                }`}
              >
                2
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">Menunggu konfirmasi</p>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Transaksi telah dikirim dan menunggu receipt.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-semibold flex-shrink-0 mt-0.5 ${
                  isRecorded
                    ? 'bg-sage text-forest'
                    : 'bg-paper text-ink-muted border border-border'
                }`}
              >
                3
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">Tercatat / Gagal</p>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Tentukan status berdasarkan receipt dan state kontrak, bukan respons tombol.
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Publish Trigger if archive not yet recorded */}
          {!isRecorded && (
            <div className="pt-4 border-t border-border/80 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-ink">
                  Arsip aktif: {activeArchive?.id} ({activeArchive?.title})
                </p>
                <p className="text-xs text-ink-muted">
                  Status: {activeArchive?.status}. Publikasikan metadata dan cetak token versi ERC-721.
                </p>
              </div>
              <button
                type="button"
                disabled={isPublishing}
                onClick={handlePublish}
                className="px-5 py-2.5 rounded-btn bg-forest hover:bg-forest-hover text-surface text-xs font-semibold shadow-subtle min-h-[44px] flex items-center gap-2"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memproses transaksi di blockchain...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Publikasikan ke Blockchain</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Trust Boundary Advisory Callout */}
          <div className="p-3.5 rounded-btn bg-status-warningBg border border-border text-xs text-status-warning leading-relaxed">
            Tangani akun berganti, jaringan salah, wallet ditolak, transaksi gagal, dan akun tidak memiliki peran kurator. Jangan menganggap CID atau prediksi AI sebagai bukti keaslian.
          </div>
        </div>
      </section>

      {/* Detail Versi dan Receipt */}
      <section className="space-y-4">
        <h2 className="text-xl font-display font-bold text-ink">Detail versi dan receipt</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* ERC-721 TOKEN PER VERSI */}
          <div className="bg-surface border border-border rounded-card p-6 space-y-4 shadow-subtle">
            <h3 className="text-xs font-mono font-semibold tracking-wider text-ink-muted uppercase">
              ERC-721 · TOKEN PER VERSI
            </h3>

            <div className="space-y-3 font-mono text-xs">
              <div className="space-y-1">
                <span className="text-ink-muted font-sans">Token ID</span>
                <div className="p-2.5 rounded-btn bg-paper border border-border text-ink">
                  {originalVersion?.onChainTokenId ? `#${originalVersion.onChainTokenId}` : 'Belum tersedia'}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-ink-muted font-sans">Parent ID</span>
                <div className="p-2.5 rounded-btn bg-paper border border-border text-ink">
                  {originalVersion?.parentId || 'Versi original / null untuk original'}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-ink-muted font-sans">Pemilik token</span>
                <div className="p-2.5 rounded-btn bg-paper border border-border text-ink select-all break-all">
                  {isRecorded && wallet.address ? wallet.address : 'Belum diverifikasi'}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-ink-muted font-sans">Penerbit / waktu</span>
                <div className="p-2.5 rounded-btn bg-paper border border-border text-ink">
                  {isRecorded ? `${wallet.address ? truncateIdentifier(wallet.address, 6, 4) : 'Kurator'} · ${activeArchive?.updatedAt}` : 'Belum tersedia'}
                </div>
              </div>
            </div>
          </div>

          {/* IPFS DAN INTEGRITAS */}
          <div className="bg-surface border border-border rounded-card p-6 space-y-4 shadow-subtle">
            <h3 className="text-xs font-mono font-semibold tracking-wider text-ink-muted uppercase">
              IPFS DAN INTEGRITAS
            </h3>

            <div className="space-y-3 font-mono text-xs">
              <div className="space-y-1">
                <span className="text-ink-muted font-sans">Metadata URI / CID</span>
                <div className="p-2.5 rounded-btn bg-paper border border-border text-ink select-all break-all">
                  {activeArchive?.originalCid || 'Belum tersedia'}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-ink-muted font-sans">Media CID</span>
                <div className="p-2.5 rounded-btn bg-paper border border-border text-ink select-all break-all">
                  {originalVersion?.ipfsCid || 'Belum tersedia'}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-ink-muted font-sans">SHA-256 file</span>
                <div className="p-2.5 rounded-btn bg-paper border border-border text-ink select-all break-all">
                  {originalVersion?.fileHash || 'Belum dihitung'}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-ink-muted font-sans">Transaction hash / receipt</span>
                <div className="p-2.5 rounded-btn bg-paper border border-border text-ink select-all break-all">
                  {originalVersion?.transactionHash || txReceipt || 'Belum tersedia'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-ink-muted font-mono pt-1">
          CID mengidentifikasi konten IPFS; SHA-256 adalah hash berkas yang diverifikasi ulang saat diambil.
        </p>
      </section>

      <FooterDisclaimer />
    </div>
  );
};
