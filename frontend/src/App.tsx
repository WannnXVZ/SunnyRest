import React, { useState } from 'react';
import { AppNavbar } from './components/AppNavbar';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { WorkspaceLoginPage } from './pages/WorkspaceLoginPage';
import { useArchiveStore } from './store/useArchiveStore';

import { ArchiveGalleryPage } from './pages/ArchiveGalleryPage';
import { ArchiveDetailPage } from './pages/ArchiveDetailPage';
import { UploadPage } from './pages/UploadPage';
import { CuratorReviewPage } from './pages/CuratorReviewPage';
import { VerificationPage } from './pages/VerificationPage';
import { SettingsPage } from './pages/SettingsPage';
import { OverviewPage } from './pages/OverviewPage';

export const App: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { activePage, viewMode, isWorkspaceAuthenticated } = useArchiveStore();

  const renderActivePage = () => {
    switch (activePage) {
      case 'arsip':
        return <ArchiveGalleryPage />;
      case 'detail':
        return <ArchiveDetailPage />;
      case 'unggah':
        return <UploadPage />;
      case 'kurator':
        return <CuratorReviewPage />;
      case 'verifikasi':
        return <VerificationPage />;
      case 'pengaturan':
        return <SettingsPage />;
      case 'ringkasan':
        return <OverviewPage />;
      default:
        return <ArchiveGalleryPage />;
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
