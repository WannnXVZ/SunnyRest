import React from 'react';
import { Menu, UserCheck, Eye } from 'lucide-react';
import { useArchiveStore } from '../store/useArchiveStore';
import { truncateIdentifier } from '../lib/hash';

interface TopHeaderProps {
  onOpenMobileMenu: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ onOpenMobileMenu }) => {
  const { activePage, wallet, switchNetwork, toggleRole } = useArchiveStore();

  const pageBreadcrumbMap: Record<string, string> = {
    ringkasan: 'Workspace / Ringkasan',
    arsip: 'Workspace / Arsip Foto',
    detail: 'Workspace / Detail Arsip dan Riwayat Versi',
    unggah: 'Workspace / Unggah foto berizin',
    restorasi: 'Workspace / Analisis dan restorasi AI',
    kurator: 'Workspace / Peninjauan kurator',
    verifikasi: 'Sistem / Verifikasi blockchain',
    pengaturan: 'Sistem / Pengaturan',
  };

  const currentBreadcrumb = pageBreadcrumbMap[activePage] || 'Workspace / Ringkasan';

  return (
    <div className="sticky top-0 z-30 bg-surface shadow-subtle">
      {/* Top Demo Notice Banner */}
      <div className="bg-paper border-b border-border/80 px-4 md:px-8 py-1.5 flex items-center justify-between text-[11px] font-mono text-ink-muted">
        <span>Mode demo · Data contoh</span>
        <span className="hidden sm:inline">Tidak ada publikasi atau transaksi nyata · Izin contoh belum diverifikasi</span>
      </div>

      <header className="h-16 border-b border-border px-4 md:px-8 flex items-center justify-between">
        {/* Left: Mobile hamburger & breadcrumb */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="md:hidden p-2 rounded-btn text-ink-muted hover:text-ink hover:bg-paper"
            aria-label="Buka menu navigasi"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-xs md:text-sm font-mono text-ink-muted tracking-tight">
            {currentBreadcrumb}
          </span>
        </div>

        {/* Right: Network status badges & Curator account chip */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Switch to Public Portal Button */}
          <button
            type="button"
            onClick={() => useArchiveStore.getState().setViewMode('public')}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-btn bg-paper border border-border text-xs font-mono text-forest hover:border-forest transition-colors"
            title="Buka tampilan galeri publik"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Lihat Publik</span>
          </button>

          {/* Network Target Badges (Matching reference designs: Lokal · simulasi & Sepolia) */}
          <button
            type="button"
            onClick={() => switchNetwork(wallet.chainId === 11155111 ? 31337 : 11155111)}
            title="Klik untuk beralih antara target Sepolia dan Hardhat Localhost"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-btn bg-paper border border-border text-xs font-mono text-ink hover:border-forest transition-colors"
          >
            <span className={`w-2 h-2 rounded-full ${wallet.chainId === 31337 ? 'bg-gold' : 'bg-forest'}`} />
            <span>{wallet.chainId === 31337 ? 'Lokal · simulasi' : 'Sepolia'}</span>
            <span className="text-ink-muted hidden md:inline">({wallet.chainId === 11155111 ? 'terhubung' : 'simulasi'})</span>
          </button>

          {/* User Role / Wallet Badge */}
          <button
            type="button"
            onClick={toggleRole}
            title="Klik untuk beralih peran (Kurator / Kreator)"
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-btn bg-paper border border-border text-xs font-mono text-ink hover:border-forest transition-colors"
          >
            <UserCheck className="w-3.5 h-3.5 text-forest" />
            {wallet.address && (
              <span className="font-mono text-ink">
                {truncateIdentifier(wallet.address, 4, 3)}
              </span>
            )}
            <span className="hidden sm:inline text-ink-muted">
              {wallet.isCurator ? 'Kurator · akun contoh' : 'Kreator · akun contoh'}
            </span>
          </button>
        </div>
      </header>
    </div>
  );
};

