import React, { useEffect, useState } from 'react';
import { Check, RotateCw } from 'lucide-react';
import { useArchiveStore } from '../store/useArchiveStore';
import { NETWORKS } from '../config/networks';
import { API_BASE_URL } from '../lib/api';
import { IPFS_GATEWAY } from '../lib/ipfs';
import { truncateIdentifier } from '../lib/hash';
import { FooterDisclaimer } from '../components/FooterDisclaimer';

const PREFS_STORAGE_KEY = 'sunnyrest_ui_prefs_v1';

export const SettingsPage: React.FC = () => {
  const { wallet, connectWallet, disconnectWallet, syncArchives } = useArchiveStore();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [language, setLanguage] = useState('id');
  const [density, setDensity] = useState('comfortable');
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREFS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.displayName === 'string') setDisplayName(parsed.displayName);
        if (typeof parsed.email === 'string') setEmail(parsed.email);
        if (typeof parsed.language === 'string') setLanguage(parsed.language);
        if (typeof parsed.density === 'string') setDensity(parsed.density);
      }
    } catch {
      // Abaikan storage tidak valid
    }
  }, []);

  const persistPrefs = (notice: string) => {
    try {
      localStorage.setItem(
        PREFS_STORAGE_KEY,
        JSON.stringify({ displayName, email, language, density })
      );
    } catch {
      // Abaikan kegagalan storage
    }
    setSavedNotice(notice);
    setTimeout(() => setSavedNotice(null), 3000);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    persistPrefs('Profil lokal berhasil disimpan.');
  };

  const handleSavePrefs = (e: React.FormEvent) => {
    e.preventDefault();
    persistPrefs('Preferensi antarmuka disimpan.');
  };

  const activeNet = NETWORKS[wallet.chainId];

  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <p className="text-xs font-mono font-medium tracking-wider text-ink-muted uppercase">
          SUNNYREST · PENGATURAN &amp; KONEKSI JARINGAN
        </p>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-ink leading-tight max-w-4xl">
          Kelola preferensi lokal dan verifikasi peran wallet. Otorisasi kurator selalu ditegakkan langsung oleh smart contract.
        </h1>
      </div>

      {savedNotice && (
        <div className="p-3.5 rounded-btn bg-sage border border-sage-border text-forest text-xs font-medium flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{savedNotice}</span>
        </div>
      )}

      {/* Profile & Interface Preferences */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <form onSubmit={handleSaveProfile} className="bg-surface border border-border rounded-card p-6 space-y-4 shadow-subtle">
          <h2 className="text-xs font-mono font-semibold tracking-wider text-ink-muted uppercase">
            IDENTITAS KURATOR / KONTRIBUTOR LOKAL
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
              placeholder="Masukkan nama tampilan Anda"
              className="w-full px-3.5 py-2.5 rounded-btn bg-surface border border-border text-xs text-ink focus:border-forest outline-none min-h-[44px]"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email-input" className="text-xs font-mono text-ink-muted">
              Kontak / email instansi (opsional)
            </label>
            <input
              id="email-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@instansi.ac.id"
              className="w-full px-3.5 py-2.5 rounded-btn bg-surface border border-border text-xs text-ink focus:border-forest outline-none min-h-[44px]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-ink-muted">Peran on-chain saat ini</label>
            <div className="p-2.5 rounded-btn bg-paper border border-border text-xs font-mono text-ink flex items-center justify-between gap-2">
              <span>
                {wallet.isConnected
                  ? wallet.isCurator
                    ? 'CURATOR_ROLE Terverifikasi'
                    : 'Akun Umum (Tanpa CURATOR_ROLE)'
                  : 'Wallet belum terhubung'}
              </span>
              <button
                type="button"
                onClick={() => {
                  void connectWallet();
                  void syncArchives();
                }}
                className="inline-flex items-center gap-1 text-[11px] text-forest underline hover:text-forest-hover flex-shrink-0"
              >
                <RotateCw className="w-3 h-3" />
                <span>Cek ulang on-chain</span>
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
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-btn bg-surface border border-border text-xs text-ink focus:border-forest outline-none min-h-[44px]"
            >
              <option value="id">Bahasa Indonesia</option>
              <option value="en">English (Archival Catalog)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="density-select" className="text-xs font-mono text-ink-muted">
              Kepadatan konten
            </label>
            <select
              id="density-select"
              value={density}
              onChange={(e) => setDensity(e.target.value)}
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
                Otoritas kurator diperiksa langsung melalui fungsi `hasRole(CURATOR_ROLE, address)` di kontrak `ArsipFotoVersi`.
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
              <p className="text-ink">
                {wallet.chainId} ({wallet.chainName})
              </p>
            </div>

            <div className="p-3 rounded-btn bg-paper/60 border border-border space-y-1">
              <span className="text-ink-muted font-sans text-[11px]">Peran kurator</span>
              <p className="text-forest font-semibold">
                {wallet.isCurator ? 'Terdaftar (CURATOR_ROLE)' : 'Bukan kurator'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void connectWallet()}
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
        </div>
      </section>

      {/* Informasi Sistem */}
      <section className="space-y-4">
        <h2 className="text-xl font-display font-bold text-ink">Konfigurasi sistem aktif</h2>
        <div className="bg-surface border border-border rounded-card p-6 divide-y divide-border/80 font-mono text-xs shadow-subtle">
          <div className="py-2.5 flex items-center justify-between gap-4">
            <span className="font-sans text-ink">Standar token</span>
            <span className="text-ink font-semibold">ERC-721 (ArsipFotoVersi)</span>
          </div>
          <div className="py-2.5 flex items-center justify-between gap-4">
            <span className="font-sans text-ink">Alamat kontrak ({wallet.chainName})</span>
            <span className="text-ink select-all break-all text-right">
              {activeNet?.contractAddress || 'Belum dikonfigurasi di .env'}
            </span>
          </div>
          <div className="py-2.5 flex items-center justify-between gap-4">
            <span className="font-sans text-ink">Backend AI &amp; Proxy IPFS</span>
            <span className="text-ink select-all break-all text-right">{API_BASE_URL}</span>
          </div>
          <div className="py-2.5 flex items-center justify-between gap-4">
            <span className="font-sans text-ink">Gateway IPFS Pembaca</span>
            <span className="text-ink select-all break-all text-right">{IPFS_GATEWAY}</span>
          </div>
        </div>
      </section>

      <FooterDisclaimer />
    </div>
  );
};
