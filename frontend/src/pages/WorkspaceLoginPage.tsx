import React, { useState } from 'react';
import { Shield, ArrowLeft, Lock, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { useArchiveStore } from '../store/useArchiveStore';
import { truncateIdentifier } from '../lib/hash';

export const WorkspaceLoginPage: React.FC = () => {
  const { wallet, connectWallet, loginToWorkspace, setViewMode } = useArchiveStore();

  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleConnectAndLogin = async (forceCurator = true) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      if (!wallet.isConnected) {
        await connectWallet();
      }
      const res = await loginToWorkspace(forceCurator);
      if (!res.success) {
        setAuthError(res.reason || 'Autentikasi gagal.');
      }
    } catch {
      setAuthError('Terjadi kesalahan saat menghubungkan wallet.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Bar with Back to Public */}
      <div className="max-w-4xl w-full mx-auto flex items-center justify-between">
        <button
          type="button"
          onClick={() => setViewMode('public')}
          className="inline-flex items-center gap-2 text-xs font-mono text-ink-muted hover:text-forest transition-colors py-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Galeri Publik</span>
        </button>
        <span className="text-[11px] font-mono text-ink-muted">
          Gerbang Otoritas On-Chain · ERC-721
        </span>
      </div>

      {/* Main Login Card */}
      <div className="max-w-md w-full mx-auto my-8 bg-surface border border-border rounded-card p-8 shadow-card space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-btn bg-forest flex items-center justify-center text-surface font-serif font-bold text-2xl mx-auto shadow-subtle">
            S
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-ink">
              Masuk ke Workspace
            </h1>
            <p className="text-xs text-ink-muted font-sans mt-1">
              Khusus kurator berwenang dan pengelola arsip berizin
            </p>
          </div>
        </div>

        {authError && (
          <div className="p-3.5 rounded-btn bg-status-dangerBg border border-border text-status-danger text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{authError}</span>
          </div>
        )}

        {/* Informational Callout */}
        <div className="p-4 rounded-btn bg-paper/80 border border-border space-y-2 text-xs text-ink-muted leading-relaxed font-sans">
          <div className="flex items-center gap-2 text-ink font-semibold">
            <Lock className="w-3.5 h-3.5 text-forest" />
            <span>Autentikasi Berbasis Dompet Kripto</span>
          </div>
          <p>
            Sistem memverifikasi alamat wallet Anda terhadap aturan smart contract. Hanya akun kurator terdaftar yang berhak menyetujui foto dan menandatangani pencatatan versi.
          </p>
        </div>

        {/* Wallet Status Card */}
        <div className="bg-paper/50 border border-border rounded-btn p-4 space-y-2.5 text-xs font-mono">
          <div className="flex items-center justify-between">
            <span className="text-ink-muted">Status Koneksi:</span>
            <span
              className={`px-2 py-0.5 rounded-btn font-semibold ${
                wallet.isConnected ? 'bg-sage text-forest' : 'bg-paper text-ink-muted border border-border'
              }`}
            >
              {wallet.isConnected ? 'Terhubung' : 'Belum Terhubung'}
            </span>
          </div>

          {wallet.address && (
            <div className="flex items-center justify-between">
              <span className="text-ink-muted">Alamat Akun:</span>
              <span className="text-ink font-semibold select-all">
                {truncateIdentifier(wallet.address, 6, 4)}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-ink-muted">Jaringan Target:</span>
            <span className="text-ink font-semibold">{wallet.chainName}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-ink-muted">Peran On-Chain:</span>
            <span className={wallet.isCurator ? 'text-forest font-semibold' : 'text-status-warning font-semibold'}>
              {wallet.isCurator ? 'Kurator Resmi' : 'Kontributor (Umum)'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          {!wallet.isConnected ? (
            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleConnectAndLogin(true)}
              className="w-full py-3 px-4 rounded-btn bg-forest hover:bg-forest-hover text-surface text-xs font-semibold shadow-subtle flex items-center justify-center gap-2 min-h-[44px] transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memeriksa Akun MetaMask...</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>Hubungkan MetaMask & Masuk</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleConnectAndLogin(true)}
              className="w-full py-3 px-4 rounded-btn bg-forest hover:bg-forest-hover text-surface text-xs font-semibold shadow-subtle flex items-center justify-center gap-2 min-h-[44px] transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Membuka Workspace...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Masuk Sebagai Kurator</span>
                </>
              )}
            </button>
          )}

          {/* Test Simulation Button for testing with non-curator role */}
          {wallet.isConnected && wallet.isCurator && (
            <button
              type="button"
              onClick={() => {
                useArchiveStore.setState((s) => ({ wallet: { ...s.wallet, isCurator: false } }));
              }}
              className="w-full py-2 px-3 rounded-btn bg-surface hover:bg-paper border border-border text-ink-muted text-[11px] font-mono transition-colors"
            >
              Uji Coba Sebagai Pengunjung Biasa (Bukan Kurator)
            </button>
          )}

          {wallet.isConnected && !wallet.isCurator && (
            <button
              type="button"
              onClick={() => {
                useArchiveStore.setState((s) => ({ wallet: { ...s.wallet, isCurator: true } }));
                handleConnectAndLogin(true);
              }}
              className="w-full py-2 px-3 rounded-btn bg-sage hover:bg-sage/80 border border-sage-border text-forest text-[11px] font-mono font-semibold transition-colors"
            >
              Aktifkan Akses Kurator (Simulasi Demo)
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-4xl w-full mx-auto text-center text-xs font-mono text-ink-muted py-4">
        Data pada layar ini adalah contoh demonstrasi. Tidak merepresentasikan hasil inferensi, CID, hash, wallet, maupun transaksi aktual.
      </div>
    </div>
  );
};
