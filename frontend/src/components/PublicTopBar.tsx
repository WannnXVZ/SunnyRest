import React from 'react';
import { Images, Sparkles, ShieldCheck, UploadCloud, Lock, Globe } from 'lucide-react';
import { useArchiveStore } from '../store/useArchiveStore';
import { PublicTab } from '../types';

export const PublicTopBar: React.FC = () => {
  const { publicTab, setPublicTab, setViewMode, wallet } = useArchiveStore();

  const navLinks: { tab: PublicTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { tab: 'semua', label: 'Koleksi Arsip', icon: <Images className="w-4 h-4" /> },
    {
      tab: 'unggah_restorasi',
      label: 'Unggah & Restorasi',
      icon: <UploadCloud className="w-4 h-4" />,
      badge: '0.01 ETH',
    },
    { tab: 'restorasi', label: 'Etalase Restorasi', icon: <Sparkles className="w-4 h-4" /> },
    { tab: 'verifikasi', label: 'Verifikasi Terbuka', icon: <ShieldCheck className="w-4 h-4" /> },
  ];

  return (
    <header className="h-20 bg-surface/95 backdrop-blur-md border-b border-border sticky top-0 z-40 transition-all">
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        {/* Left Branding */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-btn bg-forest flex items-center justify-center text-surface font-serif font-bold text-xl shadow-subtle">
            S
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-xl tracking-tight text-ink">
                sunnyrest
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-btn bg-sage text-forest text-[11px] font-mono font-medium">
                Publik
              </span>
            </div>
            <p className="text-[11px] font-mono text-ink-muted hidden md:block">
              Galeri Terbuka · Arsip & Restorasi AI
            </p>
          </div>
        </div>

        {/* Middle Navigation Tabs (Top Bar) */}
        <nav className="hidden sm:flex items-center gap-1 bg-paper/80 p-1 rounded-btn border border-border" aria-label="Navigasi Galeri Publik">
          {navLinks.map((link) => {
            const isActive = publicTab === link.tab;
            return (
              <button
                key={link.tab}
                type="button"
                onClick={() => setPublicTab(link.tab)}
                className={`flex items-center gap-2 px-3 py-2 rounded-btn text-xs font-semibold transition-colors min-h-[40px] ${
                  isActive
                    ? 'bg-surface text-forest shadow-subtle font-bold'
                    : 'text-ink-muted hover:text-ink hover:bg-surface/50'
                }`}
              >
                <span className={isActive ? 'text-forest' : 'text-ink-muted'}>{link.icon}</span>
                <span>{link.label}</span>
                {link.badge && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-brass-light border border-brass-border text-brass-text font-bold">
                    {link.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Network indicator pill */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-btn bg-paper border border-border text-xs font-mono text-ink">
            <Globe className="w-3.5 h-3.5 text-forest" />
            <span>{wallet.chainName}</span>
          </div>

          {/* Login Workspace Gate Button */}
          <button
            type="button"
            onClick={() => setViewMode('login')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-btn bg-surface hover:bg-paper border border-border hover:border-forest text-ink text-xs font-semibold shadow-subtle transition-colors min-h-[44px]"
          >
            <Lock className="w-3.5 h-3.5 text-forest" />
            <span>Masuk Workspace Kurator</span>
          </button>
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="sm:hidden flex items-center justify-around border-t border-border bg-paper/95 px-2 py-1.5 overflow-x-auto">
        {navLinks.map((link) => {
          const isActive = publicTab === link.tab;
          return (
            <button
              key={link.tab}
              type="button"
              onClick={() => setPublicTab(link.tab)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-btn text-[11px] font-semibold whitespace-nowrap ${
                isActive ? 'bg-surface text-forest font-bold' : 'text-ink-muted'
              }`}
            >
              <span>{link.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
