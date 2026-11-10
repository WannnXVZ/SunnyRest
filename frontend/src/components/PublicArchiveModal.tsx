import React, { useState, useEffect } from 'react';
import { X, Sparkles, ShieldCheck, Copy, Check } from 'lucide-react';
import { ArchiveItem } from '../types';
import { truncateIdentifier } from '../lib/hash';

interface PublicArchiveModalProps {
  archive: ArchiveItem | null;
  onClose: () => void;
  onOpenVerifier: (hash: string) => void;
}

export const PublicArchiveModal: React.FC<PublicArchiveModalProps> = ({ archive, onClose, onOpenVerifier }) => {
  const [activeVersionIndex, setActiveVersionIndex] = useState<number>(0);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!archive) return null;

  const originalVersion = archive.versions.find((v) => v.versionType === 'original') || archive.versions[0];
  const activeVersion = archive.versions[activeVersionIndex] || originalVersion;

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative bg-surface border border-border rounded-card shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-paper/50">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-btn bg-surface border border-border text-xs font-mono font-bold text-forest">
              {archive.id}
            </span>
            <span className="text-xs font-mono text-ink-muted uppercase">
              Kategori: {archive.finalCategory}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-btn text-ink-muted hover:text-ink hover:bg-paper transition-colors"
            aria-label="Tutup jendela detail"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Title and contributor */}
          <div className="space-y-1">
            <h2 className="text-2xl font-display font-bold text-ink">{archive.title}</h2>
            <p className="text-xs font-mono text-ink-muted">
              Kontributor: {archive.creator} · Sumber: {archive.source}
            </p>
          </div>

          {/* Version Switcher Tabs */}
          <div className="flex flex-wrap items-center gap-2 p-1 bg-paper rounded-btn border border-border">
            {archive.versions.map((ver, idx) => {
              const isSelected = activeVersionIndex === idx;
              return (
                <button
                  key={ver.versionNumber}
                  type="button"
                  onClick={() => setActiveVersionIndex(idx)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-btn text-xs font-semibold transition-colors min-h-[36px] ${
                    isSelected
                      ? 'bg-surface text-forest shadow-subtle'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {ver.versionType === 'derivative' && <Sparkles className="w-3.5 h-3.5 text-brass" />}
                  <span>{ver.label}</span>
                </button>
              );
            })}
          </div>

          {/* Main Visual Comparison Viewer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Primary Displayed Image */}
            <div className="space-y-2">
              <div className="h-72 rounded-btn overflow-hidden bg-paper border border-border flex items-center justify-center">
                <img
                  src={activeVersion.imageUrl}
                  alt={archive.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex items-center justify-between text-xs font-mono text-ink-muted">
                <span>{activeVersion.label}</span>
                <span>{activeVersion.timestamp}</span>
              </div>
            </div>

            {/* Quick Metadata & Integrity Summary */}
            <div className="bg-paper/40 border border-border rounded-btn p-5 space-y-4 text-xs font-mono flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <span className="font-sans font-semibold text-ink text-sm">Integritas Berkas</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-btn bg-sage text-forest font-bold">
                    Terverifikasi
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-ink-muted font-sans">SHA-256 Hash Berkas:</span>
                  <div className="p-2 rounded-btn bg-surface border border-border flex items-center justify-between">
                    <span className="text-[11px] text-ink select-all break-all">
                      {truncateIdentifier(activeVersion.fileHash, 14, 10)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(activeVersion.fileHash, 'hash')}
                      className="p-1 text-ink-muted hover:text-forest"
                      title="Salin hash SHA-256"
                    >
                      {copiedField === 'hash' ? <Check className="w-3.5 h-3.5 text-forest" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-ink-muted font-sans">IPFS Content Identifier (CID):</span>
                  <div className="p-2 rounded-btn bg-surface border border-border flex items-center justify-between">
                    <span className="text-[11px] text-ink select-all break-all">
                      {truncateIdentifier(activeVersion.ipfsCid, 14, 10)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(activeVersion.ipfsCid, 'cid')}
                      className="p-1 text-ink-muted hover:text-forest"
                      title="Salin IPFS CID"
                    >
                      {copiedField === 'cid' ? <Check className="w-3.5 h-3.5 text-forest" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-ink-muted font-sans">Izin Penggunaan:</span>
                  <p className="text-xs font-sans text-ink">{archive.licenseInfo}</p>
                </div>

                {activeVersion.methodLabel && (
                  <div className="space-y-1">
                    <span className="text-ink-muted font-sans">Metode Pemrosesan AI:</span>
                    <p className="text-xs font-sans text-brass-text font-medium">{activeVersion.methodLabel}</p>
                  </div>
                )}
              </div>

              {/* Action: Verify in Open Verifier */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenVerifier(activeVersion.fileHash);
                }}
                className="w-full py-2.5 px-3 rounded-btn bg-surface hover:bg-paper border border-border text-ink text-xs font-semibold flex items-center justify-center gap-2 min-h-[44px] transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-forest" />
                <span>Buka Verifikasi On-Chain Terbuka</span>
              </button>
            </div>
          </div>

          {/* Academic Transparency Alert */}
          <div className="p-4 rounded-btn bg-brass-light border border-brass-border text-xs text-brass-text leading-relaxed">
            Pemberitahuan kuratorial: Hasil restorasi super-resolution disajikan sebagai bantuan visual untuk memperjelas tampilan dan tidak diperlakukan sebagai rekonstruksi fakta sejarah baru. Versi foto sumber asli tetap disimpan dan tidak ditimpa.
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-paper/30 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-btn bg-surface border border-border text-ink text-xs font-semibold hover:bg-paper min-h-[40px]"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
