import React from 'react';
import { AppNavbar } from './components/AppNavbar';
import { useArchiveStore } from './store/useArchiveStore';

import { ArchiveGalleryPage } from './pages/ArchiveGalleryPage';
import { ArchiveDetailPage } from './pages/ArchiveDetailPage';
import { UploadPage } from './pages/UploadPage';
import { CuratorReviewPage } from './pages/CuratorReviewPage';
import { VerificationPage } from './pages/VerificationPage';
import { SettingsPage } from './pages/SettingsPage';
import { OverviewPage } from './pages/OverviewPage';

export const App: React.FC = () => {
  const { activePage } = useArchiveStore();

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
