import React from 'react';
import { ArchiveStatus } from '../types';

interface StatusBadgeProps {
  status: ArchiveStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'belum_diterbitkan':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-btn text-xs font-mono bg-paper border border-border text-ink-muted">
          Belum diterbitkan
        </span>
      );
    case 'menunggu_tinjauan':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-btn text-xs font-mono bg-status-warningBg border border-border text-status-warning font-medium">
          Menunggu tinjauan
        </span>
      );
    case 'disetujui':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-btn text-xs font-mono bg-sage text-forest font-medium border border-sage-border">
          Disetujui
        </span>
      );
    case 'ditolak':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-btn text-xs font-mono bg-status-dangerBg text-status-danger font-medium border border-border">
          Ditolak
        </span>
      );
    case 'perlu_koreksi':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-btn text-xs font-mono bg-status-warningBg text-status-warning font-medium border border-border">
          Perlu koreksi
        </span>
      );
    case 'tercatat':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-btn text-xs font-mono bg-sage text-forest font-medium border border-sage-border">
          Tercatat on-chain
        </span>
      );
    default:
      return null;
  }
};
