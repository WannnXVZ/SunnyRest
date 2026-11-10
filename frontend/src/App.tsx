import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { AppNavbar } from './components/AppNavbar';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { WorkspaceLoginPage } from './pages/WorkspaceLoginPage';
import { useArchiveStore } from './store/useArchiveStore';

import { ArchiveGalleryPage } from './pages/ArchiveGalleryPage';
import { ArchiveDetailPage } from './pages/ArchiveDetailPage';
import { UploadPage } from './pages/UploadPage';
import { RestorationPage } from './pages/RestorationPage';
import { CuratorReviewPage } from './pages/CuratorReviewPage';
import { VerificationPage } from './pages/VerificationPage';
import { SettingsPage } from './pages/SettingsPage';
import { OverviewPage } from './pages/OverviewPage';

export const App: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { activePage, setActivePage, viewMode, setViewMode, isWorkspaceAuthenticated } = useArchiveStore();

  const renderActivePage = () => {
    // 1. SISI PUBLIK (Hanya halaman publik yang boleh diakses)
    if (viewMode === 'public') {
      switch (activePage) {
        case 'arsip':
          return <ArchiveGalleryPage />;
        case 'detail':
          return <ArchiveDetailPage />;
        case 'unggah':
          return <UploadPage />;
        case 'verifikasi':
          return <VerificationPage />;
        default:
          return (
            <div className="bg-surface border border-border rounded-card p-10 max-w-lg mx-auto text-center space-y-5 my-12 shadow-card">
              <div className="w-12 h-12 rounded-full bg-forest/10 text-forest flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-display font-bold text-ink">
                  Akses Khusus Kurator Berwenang
                </h2>
                <p className="text-xs text-ink-muted font-sans leading-relaxed">
                  Modul peninjauan izin, analisis inferensi AI, dan tanda tangan pencatatan on-chain hanya dapat diakses melalui Workspace Kurator yang terotentikasi wallet.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setViewMode(isWorkspaceAuthenticated ? 'workspace' : 'login')}
                  className="px-5 py-2.5 rounded-btn bg-forest hover:bg-forest-hover text-surface text-xs font-semibold shadow-subtle transition-colors"
                >
                  Masuk ke Workspace Kurator 🔒
                </button>
                <button
                  type="button"
                  onClick={() => setActivePage('arsip')}
                  className="px-5 py-2.5 rounded-btn bg-surface hover:bg-paper border border-border text-ink text-xs font-medium transition-colors"
                >
                  Kembali ke Galeri Publik
                </button>
              </div>
            </div>
          );
      }
    }

    // 2. SISI WORKSPACE (Akses lengkap modul 01 s/d 07 untuk kurator terotentikasi)
    switch (activePage) {
      case 'ringkasan':
        return <OverviewPage />;
      case 'arsip':
        return <ArchiveGalleryPage />;
      case 'detail':
        return <ArchiveDetailPage />;
      case 'unggah':
        return <UploadPage />;
      case 'restorasi':
        return <RestorationPage />;
      case 'kurator':
        return <CuratorReviewPage />;
      case 'verifikasi':
        return <VerificationPage />;
      case 'pengaturan':
        return <SettingsPage />;
      default:
        return <OverviewPage />;
    }
  };

  // 1. If in login mode (or trying to access workspace without authentication):
  if (viewMode === 'login' || (viewMode === 'workspace' && !isWorkspaceAuthenticated)) {
    return <WorkspaceLoginPage />;
  }

  // 2. If in authenticated curator workspace mode: Render Private Workspace with Sidebar Layout
  if (viewMode === 'workspace') {
    return (
      <div className="min-h-screen flex bg-paper text-ink selection:bg-sage selection:text-forest">
        {/* Workspace Sidebar (01-07) */}
        <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

        {/* Workspace Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <TopHeader onOpenMobileMenu={() => setMobileOpen(true)} />
          <main className="flex-1 p-4 sm:p-8 lg:p-10 max-w-6xl w-full mx-auto">
            {renderActivePage()}
          </main>
        </div>
      </div>
    );
  }

  // 3. Default (viewMode === 'public'): Render Public Portal with Top Bar Layout
  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink selection:bg-sage selection:text-forest">
      <AppNavbar />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
        {renderActivePage()}
      </main>
    </div>
  );
};

export default App;
