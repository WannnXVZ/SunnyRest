import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { PublicTopBar } from './components/PublicTopBar';
import { PublicPortalPage } from './pages/PublicPortalPage';
import { WorkspaceLoginPage } from './pages/WorkspaceLoginPage';
import { useArchiveStore } from './store/useArchiveStore';

import { OverviewPage } from './pages/OverviewPage';
import { ArchiveGalleryPage } from './pages/ArchiveGalleryPage';
import { ArchiveDetailPage } from './pages/ArchiveDetailPage';
import { UploadPage } from './pages/UploadPage';
import { RestorationPage } from './pages/RestorationPage';
import { CuratorReviewPage } from './pages/CuratorReviewPage';
import { VerificationPage } from './pages/VerificationPage';
import { SettingsPage } from './pages/SettingsPage';

export const App: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { activePage, viewMode, isWorkspaceAuthenticated } = useArchiveStore();

  // If in public mode: Render Public Portal with Top Bar layout
  if (viewMode === 'public') {
    return (
      <div className="min-h-screen flex flex-col bg-paper text-ink selection:bg-sage selection:text-forest">
        <PublicTopBar />
        <main className="flex-1">
          <PublicPortalPage />
        </main>
      </div>
    );
  }

  // If in login mode or workspace is not authenticated: Render Login Page
  if (viewMode === 'login' || !isWorkspaceAuthenticated) {
    return <WorkspaceLoginPage />;
  }

  // If in workspace mode: Render Private User/Curator Dashboard with Sidebar
  const renderActivePage = () => {
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

  return (
    <div className="min-h-screen flex bg-paper text-ink selection:bg-sage selection:text-forest">
      {/* Sidebar Navigation */}
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader onOpenMobileMenu={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 sm:p-8 lg:p-10 max-w-6xl w-full mx-auto">
          {renderActivePage()}
        </main>
      </div>
    </div>
  );
};

export default App;
