import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { useArchiveStore } from '../store/useArchiveStore';
import { truncateIdentifier } from '../lib/hash';
import { FooterDisclaimer } from '../components/FooterDisclaimer';

export const SettingsPage: React.FC = () => {
  const { wallet, connectWallet, disconnectWallet, toggleRole } = useArchiveStore();

  const [displayName, setDisplayName] = useState('Pengguna SunnyRest');
  const [email, setEmail] = useState('pengguna@example.test');
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedNotice('Profil berhasil diperbarui.');
    setTimeout(() => setSavedNotice(null), 3000);
  };

  const handleSavePrefs = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedNotice('Preferensi antarmuka disimpan.');
    setTimeout(() => setSavedNotice(null), 3000);
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="space-y-3">
        <p className="text-xs font-mono font-medium tracking-wider text-ink-muted uppercase">
          SUNNYREST · ARSIP FOTO BERIZIN
        </p>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-ink leading-tight max-w-4xl">
          Kelola profil dan preferensi antarmuka. Pengaturan tidak mengubah aturan akses yang ditegakkan oleh kontrak.
        </h1>
      </div>

      {savedNotice && (
        <div className="p-3.5 rounded-btn bg-sage border border-sage-border text-forest text-xs font-medium flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{savedNotice}</span>
        </div>
      )}

      {/* Profile & Interface Preferences (2 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Left: Profil */}
        <form onSubmit={handleSaveProfile} className="bg-surface border border-border rounded-card p-6 space-y-4 shadow-subtle">
          <h2 className="text-xs font-mono font-semibold tracking-wider text-ink-muted uppercase">
            PROFIL
          </h2>

          <div className="space-y-1.5">
            <label htmlFor="display-name-input" className="text-xs font-mono text-ink-muted">
              Nama tampilan
            </label>
            <input
              id="display-name-input"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-btn bg-surface border border-border text-xs text-ink focus:border-forest outline-none min-h-[44px]"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email-input" className="text-xs font-mono text-ink-muted">
              Email
            </label>
            <input
              id="email-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-btn bg-surface border border-border text-xs text-ink focus:border-forest outline-none min-h-[44px]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-ink-muted">Peran saat ini</label>
            <div className="p-2.5 rounded-btn bg-paper border border-border text-xs font-mono text-ink flex items-center justify-between">
              <span>{wallet.isCurator ? 'Kurator terdaftar' : 'Kontributor (umum)'}</span>
              <button
                type="button"
                onClick={toggleRole}
                className="text-[11px] text-forest underline hover:text-forest-hover"
              >
                Ubah simulasi peran
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="py-2.5 px-4 rounded-btn bg-forest hover:bg-forest-hover text-surface text-xs font-semibold shadow-subtle min-h-[44px] transition-colors"
          >
            Simpan profil
          </button>
        </form>

        {/* Right: Preferensi Antarmuka */}
        <form onSubmit={handleSavePrefs} className="bg-surface border border-border rounded-card p-6 space-y-4 shadow-subtle">
          <h2 className="text-xs font-mono font-semibold tracking-wider text-ink-muted uppercase">
            PREFERENSI ANTARMUKA
          </h2>

          <div className="space-y-1.5">
            <label htmlFor="lang-select" className="text-xs font-mono text-ink-muted">
              Bahasa
            </label>
            <select
              id="lang-select"
              defaultValue="id"
              className="w-full px-3.5 py-2.5 rounded-btn bg-surface border border-border text-xs text-ink focus:border-forest outline-none min-h-[44px]"
            >
              <option value="id">Bahasa Indonesia</option>
              <option value="en">English (Archival Catalog)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="theme-select" className="text-xs font-mono text-ink-muted">
              Tampilan
            </label>
            <select
              id="theme-select"
              defaultValue="light"
              className="w-full px-3.5 py-2.5 rounded-btn bg-surface border border-border text-xs text-ink focus:border-forest outline-none min-h-[44px]"
            >
              <option value="light">Terang · Museum editorial</option>
              <option value="warm">Kertas arsip · Warm paper</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="density-select" className="text-xs font-mono text-ink-muted">
              Kepadatan konten
            </label>
            <select
              id="density-select"
              defaultValue="comfortable"
              className="w-full px-3.5 py-2.5 rounded-btn bg-surface border border-border text-xs text-ink focus:border-forest outline-none min-h-[44px]"
            >
              <option value="comfortable">Nyaman</option>
              <option value="compact">Ringkas (Compact)</option>
            </select>
          </div>

          <button
            type="submit"
            className="py-2.5 px-4 rounded-btn bg-surface hover:bg-paper border border-border text-ink text-xs font-semibold min-h-[44px] transition-colors"
          >
            Simpan preferensi
          </button>
        </form>
      </div>

      {/* Koneksi Wallet */}
      <section className="space-y-4">
        <h2 className="text-xl font-display font-bold text-ink">Koneksi wallet</h2>
        <div className="bg-surface border border-border rounded-card p-6 space-y-5 shadow-subtle">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-ink">MetaMask / wallet EVM</p>
              <p className="text-xs text-ink-muted">
                Wallet hanya diminta saat kurator akan menandatangani transaksi.
              </p>
            </div>
            <span
              className={`px-2.5 py-1 rounded-btn text-xs font-mono font-medium ${
                wallet.isConnected
                  ? 'bg-sage text-forest border border-sage-border'
                  : 'bg-paper text-ink-muted border border-border'
              }`}
            >
              {wallet.isConnected ? 'Terhubung' : 'Belum terhubung'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
            <div className="p-3 rounded-btn bg-paper/60 border border-border space-y-1">
              <span className="text-ink-muted font-sans text-[11px]">Akun aktif</span>
              <p className="text-ink select-all break-all">
                {wallet.address ? truncateIdentifier(wallet.address, 10, 8) : 'Belum tersedia'}
              </p>
            </div>

            <div className="p-3 rounded-btn bg-paper/60 border border-border space-y-1">
              <span className="text-ink-muted font-sans text-[11px]">Chain ID</span>
              <p className="text-ink">{wallet.chainId} ({wallet.chainName})</p>
            </div>

            <div className="p-3 rounded-btn bg-paper/60 border border-border space-y-1">
              <span className="text-ink-muted font-sans text-[11px]">Peran kurator</span>
              <p className="text-forest font-semibold">
                {wallet.isCurator ? 'Terdaftar (Dapat menandatangani)' : 'Bukan kurator (Akses terbatas)'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={connectWallet}
              className="px-4 py-2 rounded-btn bg-forest hover:bg-forest-hover text-surface text-xs font-semibold transition-colors min-h-[44px]"
            >
              {wallet.isConnected ? 'Sinkronkan ulang wallet' : 'Hubungkan MetaMask'}
            </button>
            {wallet.isConnected && (
              <button
                type="button"
                onClick={disconnectWallet}
                className="px-4 py-2 rounded-btn bg-surface hover:bg-status-dangerBg border border-border hover:border-status-danger text-status-danger text-xs font-semibold transition-colors min-h-[44px]"
              >
                Putuskan sambungan
              </button>
            )}
          </div>

          <div className="p-3.5 rounded-btn bg-sage/60 border border-sage-border text-xs text-sage-text leading-relaxed">
            Aplikasi harus memperbarui UI ketika akun atau jaringan berubah. Penolakan koneksi/transaksi ditampilkan sebagai status batal, bukan sukses.
          </div>
        </div>
      </section>

      {/* Informasi Sistem */}
      <section className="space-y-4">
        <h2 className="text-xl font-display font-bold text-ink">Informasi sistem</h2>
        <div className="bg-surface border border-border rounded-card p-6 divide-y divide-border/80 font-mono text-xs shadow-subtle">
          <div className="py-2.5 flex items-center justify-between">
            <span className="font-sans text-ink">Standar token</span>
            <span className="text-ink font-semibold">ERC-721</span>
          </div>
          <div className="py-2.5 flex items-center justify-between">
            <span className="font-sans text-ink">Penyimpanan berkas</span>
            <span className="text-ink font-semibold">IPFS</span>
          </div>
          <div className="py-2.5 flex items-center justify-between">
            <span className="font-sans text-ink">Jaringan dev</span>
            <span className="text-ink">Hardhat lokal</span>
          </div>
          <div className="py-2.5 flex items-center justify-between">
            <span className="font-sans text-ink">Jaringan bukti akhir</span>
            <span className="text-forest font-semibold">Sepolia</span>
          </div>
        </div>
      </section>

      <FooterDisclaimer />
    </div>
  );
};
