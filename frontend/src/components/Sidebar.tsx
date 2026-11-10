import React from 'react';
import {
  LayoutDashboard,
  Images,
  Upload,
  Sparkles,
  ClipboardCheck,
  ShieldCheck,
  Settings,
  X,
  LogOut,
} from 'lucide-react';
import { useArchiveStore } from '../store/useArchiveStore';
import { NavigationPage } from '../types';

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, setMobileOpen }) => {
  const { activePage, setActivePage } = useArchiveStore();

  const handleNav = (page: NavigationPage) => {
    setActivePage(page);
    setMobileOpen(false);
  };

  const navItems: { page: NavigationPage; label: string; num: string; icon: React.ReactNode; group: 'WORKSPACE' | 'SISTEM' }[] = [
    { page: 'ringkasan', label: 'Ringkasan', num: '01', icon: <LayoutDashboard className="w-4 h-4" />, group: 'WORKSPACE' },
    { page: 'arsip', label: 'Arsip Foto', num: '02', icon: <Images className="w-4 h-4" />, group: 'WORKSPACE' },
    { page: 'unggah', label: 'Unggah Foto', num: '03', icon: <Upload className="w-4 h-4" />, group: 'WORKSPACE' },
    { page: 'restorasi', label: 'Restorasi AI', num: '04', icon: <Sparkles className="w-4 h-4" />, group: 'WORKSPACE' },
    { page: 'kurator', label: 'Peninjauan Kurator', num: '05', icon: <ClipboardCheck className="w-4 h-4" />, group: 'WORKSPACE' },
    { page: 'verifikasi', label: 'Verifikasi Blockchain', num: '06', icon: <ShieldCheck className="w-4 h-4" />, group: 'SISTEM' },
    { page: 'pengaturan', label: 'Pengaturan', num: '07', icon: <Settings className="w-4 h-4" />, group: 'SISTEM' },
  ];

  const workspaceItems = navItems.filter((i) => i.group === 'WORKSPACE');
  const systemItems = navItems.filter((i) => i.group === 'SISTEM');

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-ink/40 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-screen w-64 bg-surface border-r border-border flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Navigasi Utama"
      >
        {/* Top Branding */}
        <div>
          <div className="h-20 px-6 flex items-center justify-between border-b border-border/60">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-btn bg-forest flex items-center justify-center text-surface font-serif font-bold text-xl shadow-subtle">
                S
              </div>
              <span className="font-serif font-bold text-xl tracking-tight text-ink">
                sunnyrest
              </span>
            </div>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="md:hidden p-2 rounded-btn text-ink-muted hover:text-ink hover:bg-paper transition-colors"
              aria-label="Tutup menu navigasi"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-6 overflow-y-auto">
            {/* WORKSPACE GROUP */}
            <div>
              <p className="px-3 pb-2 text-[11px] font-mono font-medium tracking-wider text-ink-muted uppercase">
                WORKSPACE
              </p>
              <div className="space-y-1">
                {workspaceItems.map((item) => {
                  const isActive = activePage === item.page || (item.page === 'arsip' && activePage === 'detail');
                  return (
                    <button
                      key={item.page}
                      type="button"
                      onClick={() => handleNav(item.page)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-btn text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-sage text-forest font-semibold'
                          : 'text-ink hover:bg-paper hover:text-forest'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-ink-muted">{item.num}</span>
                        <span>{item.label}</span>
                      </div>
                      <span className={isActive ? 'text-forest' : 'text-ink-muted'}>{item.icon}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SISTEM GROUP */}
            <div>
              <p className="px-3 pb-2 text-[11px] font-mono font-medium tracking-wider text-ink-muted uppercase">
                SISTEM
              </p>
              <div className="space-y-1">
                {systemItems.map((item) => {
                  const isActive = activePage === item.page;
                  return (
                    <button
                      key={item.page}
                      type="button"
                      onClick={() => handleNav(item.page)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-btn text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-sage text-forest font-semibold'
                          : 'text-ink hover:bg-paper hover:text-forest'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-ink-muted">{item.num}</span>
                        <span>{item.label}</span>
                      </div>
                      <span className={isActive ? 'text-forest' : 'text-ink-muted'}>{item.icon}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </nav>
        </div>

        {/* Bottom Metadata Branding & Switch to Public */}
        <div className="p-4 border-t border-border/60 bg-paper/60 space-y-2">
          <button
            type="button"
            onClick={() => useArchiveStore.getState().setViewMode('public')}
            className="w-full py-2 px-3 rounded-btn bg-surface hover:bg-paper border border-border text-forest text-xs font-semibold flex items-center justify-center gap-2 shadow-subtle min-h-[38px] transition-colors"
          >
            <span>Buka Portal Publik</span>
          </button>
          <button
            type="button"
            onClick={() => useArchiveStore.getState().logoutWorkspace()}
            className="w-full py-1.5 px-3 rounded-btn text-ink-muted hover:text-status-danger hover:bg-surface/60 text-xs font-mono flex items-center justify-center gap-1.5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Kunci & Keluar</span>
          </button>
          <div className="text-[11px] text-ink-muted font-mono leading-relaxed pt-1">
            <p className="font-semibold text-ink">WORKSPACE PRIVAT</p>
            <p>SunnyRest · Data Kurasi</p>
          </div>
        </div>
      </aside>
    </>
  );
};

