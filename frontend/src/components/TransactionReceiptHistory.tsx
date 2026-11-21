import React, { useState } from 'react';
import {
  ShieldCheck,
  Copy,
  Check,
  ExternalLink,
  Lock,
  Sparkles,
  History,
} from 'lucide-react';
import { NETWORKS } from '../config/networks';
import { truncateIdentifier } from '../lib/hash';
import { TransactionReceiptItem } from '../lib/receipts';

interface TransactionReceiptHistoryProps {
  receipts: TransactionReceiptItem[];
  chainId: number;
  title?: string;
  subtitle?: string;
  defaultLimit?: number;
  onSelectArchive?: (archiveId: string) => void;
  emptyMessage?: string;
}

export const TransactionReceiptHistory: React.FC<TransactionReceiptHistoryProps> = ({
  receipts,
  chainId,
  title = 'Riwayat bukti transaksi',
  subtitle = 'Mencakup minting token asli, pembayaran restorasi AI, dan minting versi turunan SR x4.',
  defaultLimit = 5,
  onSelectArchive,
  emptyMessage = 'Belum ada bukti transaksi blockchain yang tercatat.',
}) => {
  const [showAll, setShowAll] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | 'mint' | 'restoration'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeNet = NETWORKS[chainId];

  const filtered = receipts.filter((r) => {
    if (typeFilter === 'mint') {
      return r.type === 'mint_original' || r.type === 'mint_derivative';
    }
    if (typeFilter === 'restoration') {
      return r.type === 'restoration_payment' || r.type === 'mint_derivative';
    }
    return true;
  });

  const visible = showAll ? filtered : filtered.slice(0, defaultLimit);
  const hasMoreThanDefault = filtered.length > defaultLimit;

  const handleCopy = (e: React.MouseEvent, txHash: string, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(txHash);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-forest" />
            <h2 className="text-xl font-display font-bold text-ink">{title}</h2>
          </div>
          <p className="text-xs text-ink-muted font-sans leading-relaxed">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {receipts.length > 1 && (
            <div className="inline-flex items-center p-0.5 rounded-btn bg-paper border border-border text-[11px] font-mono">
              {[
                { id: 'all', label: 'Semua Jenis' },
                { id: 'mint', label: 'Minting' },
                { id: 'restoration', label: 'Restorasi' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTypeFilter(opt.id as 'all' | 'mint' | 'restoration')}
                  className={`px-2.5 py-1 rounded-btn transition-colors ${
                    typeFilter === opt.id
                      ? 'bg-surface text-ink font-semibold shadow-subtle'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {filtered.length > 0 && (
            <div className="inline-flex items-center p-0.5 rounded-btn bg-paper border border-border text-[11px] font-mono">
              <button
                type="button"
                onClick={() => setShowAll(false)}
                className={`px-2.5 py-1 rounded-btn transition-colors ${
                  !showAll
                    ? 'bg-forest text-surface font-semibold shadow-subtle'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                {defaultLimit} Terbaru
              </button>
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className={`px-2.5 py-1 rounded-btn transition-colors ${
                  showAll
                    ? 'bg-forest text-surface font-semibold shadow-subtle'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                Semua ({filtered.length})
              </button>
            </div>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-surface border border-border rounded-card p-8 text-center shadow-subtle">
          <p className="text-xs font-mono text-ink-muted">{emptyMessage}</p>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-card overflow-hidden shadow-subtle">
          <div className="px-4 py-2.5 bg-paper/40 border-b border-border flex items-center justify-between text-[11px] font-mono text-ink-muted">
            <span>
              Menampilkan {visible.length} dari {filtered.length} transaksi
            </span>
            <span className="hidden sm:inline">Urutan terbaru ke terlama</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-paper/50 text-[11px] font-mono text-ink-muted uppercase">
                <tr>
                  <th className="py-3 px-4 font-medium">Arsip</th>
                  <th className="py-3 px-4 font-medium">Jenis Transaksi</th>
                  <th className="py-3 px-4 font-medium">Token / Ref</th>
                  <th className="py-3 px-4 font-medium">Transaction Hash</th>
                  <th className="py-3 px-4 font-medium">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {visible.map((rec) => {
                  const refText =
                    rec.type === 'mint_derivative'
                      ? `${rec.tokenId ? `#${rec.tokenId}` : 'Turunan'}${
                          rec.parentId ? ` (parent #${rec.parentId})` : ''
                        }`
                      : rec.type === 'restoration_payment'
                      ? `${rec.requestId ? `Request #${rec.requestId}` : 'Restorasi'}${
                          rec.tokenId ? ` · Token #${rec.tokenId}` : ''
                        }`
                      : rec.tokenId
                      ? `#${rec.tokenId}`
                      : '-';

                  return (
                    <tr
                      key={rec.id}
                      onClick={() => onSelectArchive?.(rec.archiveId)}
                      className={`hover:bg-paper/40 transition-colors ${
                        onSelectArchive ? 'cursor-pointer' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-semibold text-forest">
                            {rec.archiveId}
                          </span>
                          {rec.isPrivate && (
                            <span title="Arsip Privat">
                              <Lock className="w-3 h-3 text-ink-muted flex-shrink-0" />
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-ink font-medium truncate max-w-[200px]">
                          {rec.archiveTitle}
                        </p>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-btn text-[11px] font-mono font-medium ${
                            rec.type === 'mint_derivative'
                              ? 'bg-gold-light border border-gold-border text-ink'
                              : rec.type === 'restoration_payment'
                              ? 'bg-paper border border-border text-ink'
                              : 'bg-sage border border-sage-border text-forest'
                          }`}
                        >
                          {rec.type === 'mint_derivative' ? (
                            <Sparkles className="w-3 h-3 text-brass" />
                          ) : (
                            <ShieldCheck className="w-3 h-3" />
                          )}
                          <span>{rec.typeLabel}</span>
                        </span>
                        {rec.feeLabel && (
                          <span className="block text-[10px] font-mono text-ink-muted mt-0.5">
                            Biaya: {rec.feeLabel}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-ink whitespace-nowrap">
                        {refText}
                      </td>

                      <td className="py-3 px-4 font-mono">
                        <div className="flex items-center gap-2">
                          <span className="text-ink select-all">
                            {truncateIdentifier(rec.txHash, 10, 8)}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleCopy(e, rec.txHash, rec.id)}
                            className="p-1 rounded text-ink-muted hover:text-forest transition-colors"
                            title="Salin Transaction Hash"
                          >
                            {copiedId === rec.id ? (
                              <Check className="w-3.5 h-3.5 text-forest" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          {activeNet?.explorerUrl && rec.txHash.startsWith('0x') && (
                            <a
                              href={`${activeNet.explorerUrl}/tx/${rec.txHash}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-[11px] text-forest hover:underline"
                              title="Buka di Explorer"
                            >
                              <span>Explorer</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-ink-muted whitespace-nowrap">
                        {rec.timestamp || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {hasMoreThanDefault && (
            <div className="px-4 py-3 bg-paper/40 border-t border-border flex items-center justify-center">
              <button
                type="button"
                onClick={() => setShowAll((prev) => !prev)}
                className="text-xs font-mono font-semibold text-forest hover:underline"
              >
                {showAll
                  ? `Ringkas ke ${defaultLimit} transaksi terbaru`
                  : `Tampilkan semua (${filtered.length} transaksi)`}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default TransactionReceiptHistory;
