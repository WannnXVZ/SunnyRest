import React from 'react';
import { Sun, Wallet, Lock } from 'lucide-react';
import { useArchiveStore } from '../store/useArchiveStore';
import { truncateIdentifier } from '../lib/hash';

export const AppNavbar: React.FC = () => {
  const {
    activePage,
    setActivePage,
    wallet,
    switchNetwork,
    toggleRole,
    setViewMode,
    isWorkspaceAuthenticated,
  } = useArchiveStore();

  const navItems: { page: 'arsip' | 'unggah' | 'verifikasi' | 'kurator'; label: string }[] = [
    { page: 'arsip', label: 'Galeri arsip' },
    { page: 'unggah', label: 'Unggah foto' },
    { page: 'verifikasi', label: 'Verifikasi' },
    { page: 'kurator', label: 'Tinjauan kurator' },
  ];

  return (
    <div className="sticky top-0 z-40 bg-surface">
      {/* Top Demo Notice Strip from Reference Designs */}
      <div className="bg-paper border-b border-border/80 px-4 md:px-8 py-1.5 flex items-center justify-between text-[11px] font-mono text-ink-muted">
        <span>Mode demo · Data contoh</span>
        <span className="hidden sm:inline">
          Tidak ada publikasi atau transaksi nyata · Izin contoh belum diverifikasi
        </span>
      </div>

      {/* Main Top Navigation Bar */}
      <header className="h-16 border-b border-border px-4 md:px-8 flex items-center justify-between">
        {/* Left: Brand and Navigation Links */}
        <div className="flex items-center gap-6 md:gap-10">
          {/* Brand Logo with Sunburst Icon */}
          <button
            type="button"
            onClick={() => setActivePage('arsip')}
            className="flex items-center gap-2 group text-left"
          >
            <div className="w-6 h-6 flex items-center justify-center text-ink group-hover:rotate-45 transition-transform">
              <Sun className="w-5 h-5 text-ink stroke-[2.2]" />
            </div>
            <span className="font-serif font-bold text-xl text-ink tracking-tight">
              SunnyRest
            </span>
          </button>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-2 sm:gap-6" aria-label="Navigasi Utama">
            {navItems.map((item) => {
              const isActive =
                activePage === item.page || (item.page === 'arsip' && activePage === 'detail');
              return (
                <button
                  key={item.page}
                  type="button"
                  onClick={() => setActivePage(item.page)}
                  className={`text-xs sm:text-sm font-sans transition-all py-1.5 px-1 relative ${
                    isActive
                      ? 'text-ink font-bold after:absolute after:bottom-[-16px] after:left-0 after:right-0 after:h-[2px] after:bg-gold'
                      : 'text-ink-muted hover:text-ink font-medium'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right: Network Badges & Wallet Chip */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs font-mono">
          {/* Network: Lokal · simulasi */}
          <button
            type="button"
            onClick={() => switchNetwork(wallet.chainId === 11155111 ? 31337 : 11155111)}
            title="Klik untuk beralih jaringan"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-btn bg-paper border border-border text-ink hover:border-forest transition-colors"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                wallet.chainId === 31337 ? 'bg-gold' : 'bg-forest'
              }`}
            />
            <span>{wallet.chainId === 31337 ? 'Lokal · simulasi' : 'Sepolia'}</span>
          </button>

          {/* Network: Sepolia Status */}
          <span className="hidden lg:inline text-ink-muted text-[11px]">
            {wallet.chainId === 11155111 ? 'Sepolia: terhubung' : 'Sepolia: terputus'}
          </span>

          {/* Wallet / Role Badge */}
          <button
            type="button"
            onClick={toggleRole}
            title="Klik untuk beralih peran (Kreator / Kurator)"
            className="flex items-center gap-2 px-3 py-1.5 rounded-btn bg-paper border border-border hover:border-forest text-ink transition-colors min-h-[36px]"
          >
            <Wallet className="w-3.5 h-3.5 text-ink-muted" />
            <span className="font-semibold text-ink">
              {wallet.address
                ? truncateIdentifier(wallet.address, 4, 4)
                : '0x7A...91C2'}
            </span>
            <span className="hidden md:inline text-ink-muted text-[11px]">
              {wallet.isCurator ? 'Kurator · akun contoh' : 'Kreator · akun contoh'}
            </span>
          </button>

          {/* Workspace Kurator Gate Button */}
          <button
            type="button"
            onClick={() => setViewMode(isWorkspaceAuthenticated ? 'workspace' : 'login')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-btn bg-forest hover:bg-forest-hover text-surface text-xs font-semibold shadow-subtle transition-colors min-h-[36px]"
            title="Masuk ke Workspace Kurator (Memerlukan Wallet)"
          >
            <Lock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Workspace Kurator</span>
            <span className="sm:hidden">Workspace</span>
          </button>
        </div>
      </header>
    </div>
  );
};
