import { ArchiveItem, PhotoCategory } from '../types';
import { isArchivePrivate } from './ownership';

export type TransactionReceiptType =
  | 'mint_original'
  | 'restoration_payment'
  | 'mint_derivative';

export interface TransactionReceiptItem {
  id: string;
  archiveId: string;
  archiveTitle: string;
  category: PhotoCategory;
  type: TransactionReceiptType;
  typeLabel: string;
  txHash: string;
  tokenId?: number;
  parentId?: string | null;
  requestId?: number;
  feeLabel?: string;
  timestamp: string;
  isPrivate: boolean;
  ownerAddress?: string;
  recipientAddress?: string;
  sortTimestamp: number;
  stageWeight: number;
}

const MONTH_MAP: Record<string, number> = {
  jan: 0,
  januari: 0,
  feb: 1,
  februari: 1,
  mar: 2,
  maret: 2,
  apr: 3,
  april: 3,
  mei: 4,
  may: 4,
  jun: 5,
  juni: 5,
  jul: 6,
  juli: 6,
  agu: 7,
  agustus: 7,
  aug: 7,
  sep: 8,
  sept: 8,
  september: 8,
  okt: 9,
  oktober: 9,
  oct: 9,
  nov: 10,
  november: 10,
  des: 11,
  desember: 11,
  dec: 11,
};

/**
 * Mengurai string timestamp format lokal Indonesia (mis. "21 Nov 2026, 09.20" atau "19 Nov 2026")
 * ataupun format ISO menjadi epoch milidetik untuk pengurutan kronologis.
 */
export function parseArchiveTimestamp(raw: string | undefined): number {
  if (!raw || typeof raw !== 'string') return 0;
  const trimmed = raw.trim();
  if (!trimmed) return 0;

  const idMatch = trimmed.match(
    /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})(?:[,\s]+(\d{1,2})[.:](\d{2})(?:[.:](\d{2}))?)?/
  );
  if (idMatch) {
    const day = Number(idMatch[1]);
    const monthKey = idMatch[2].toLowerCase();
    const year = Number(idMatch[3]);
    const hour = idMatch[4] ? Number(idMatch[4]) : 0;
    const minute = idMatch[5] ? Number(idMatch[5]) : 0;
    const second = idMatch[6] ? Number(idMatch[6]) : 0;
    const monthIndex = MONTH_MAP[monthKey];

    if (
      monthIndex !== undefined &&
      !Number.isNaN(day) &&
      !Number.isNaN(year) &&
      !Number.isNaN(hour) &&
      !Number.isNaN(minute)
    ) {
      return Date.UTC(year, monthIndex, day, hour, minute, second);
    }
  }

  const parsed = Date.parse(trimmed);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Mengekstrak seluruh bukti transaksi dari daftar arsip (minting asli, pembayaran restorasi AI,
 * dan minting turunan SR x4) tanpa duplikasi, diurutkan dari yang paling baru.
 */
export function extractTransactionReceipts(archives: ArchiveItem[]): TransactionReceiptItem[] {
  const seen = new Set<string>();
  const results: TransactionReceiptItem[] = [];

  for (const item of archives) {
    const isPriv = isArchivePrivate(item);
    const origVer = item.versions.find((v) => v.versionType === 'original') || item.versions[0];
    const derivVer = item.versions.find((v) => v.versionType === 'derivative');

    for (const ver of item.versions) {
      if (!ver.transactionHash || !ver.transactionHash.trim()) continue;
      const cleanHash = ver.transactionHash.trim();

      if (ver.versionType === 'derivative') {
        const dedupKey = `${item.id}-mint_derivative-${cleanHash.toLowerCase()}`;
        if (seen.has(dedupKey)) continue;
        seen.add(dedupKey);

        const tsLabel = ver.timestamp || item.updatedAt || item.createdAt;
        results.push({
          id: dedupKey,
          archiveId: item.id,
          archiveTitle: item.title,
          category: item.finalCategory || item.initialCategory,
          type: 'mint_derivative',
          typeLabel: 'Minting Turunan SR x4',
          txHash: cleanHash,
          tokenId: ver.onChainTokenId,
          parentId: ver.parentId ?? (origVer?.onChainTokenId ? String(origVer.onChainTokenId) : null),
          requestId: ver.requestId,
          timestamp: tsLabel,
          isPrivate: isPriv,
          ownerAddress: ver.ownerAddress,
          recipientAddress: item.recipientAddress,
          sortTimestamp: parseArchiveTimestamp(tsLabel),
          stageWeight: 3,
        });
      } else {
        const dedupKey = `${item.id}-mint_original-${cleanHash.toLowerCase()}`;
        if (seen.has(dedupKey)) continue;
        seen.add(dedupKey);

        const tsLabel = ver.timestamp || item.createdAt || item.updatedAt;
        results.push({
          id: dedupKey,
          archiveId: item.id,
          archiveTitle: item.title,
          category: item.finalCategory || item.initialCategory,
          type: 'mint_original',
          typeLabel: 'Minting Asli (ERC-721)',
          txHash: cleanHash,
          tokenId: ver.onChainTokenId,
          parentId: '0',
          timestamp: tsLabel,
          isPrivate: isPriv,
          ownerAddress: ver.ownerAddress,
          recipientAddress: item.recipientAddress,
          sortTimestamp: parseArchiveTimestamp(tsLabel),
          stageWeight: 1,
        });
      }
    }

    if (item.paymentTxHash && item.paymentTxHash.trim()) {
      const cleanPayHash = item.paymentTxHash.trim();
      const dedupKey = `${item.id}-restoration_payment-${cleanPayHash.toLowerCase()}`;
      if (!seen.has(dedupKey)) {
        seen.add(dedupKey);
        const tsLabel = derivVer?.timestamp || item.updatedAt || item.createdAt;
        results.push({
          id: dedupKey,
          archiveId: item.id,
          archiveTitle: item.title,
          category: item.finalCategory || item.initialCategory,
          type: 'restoration_payment',
          typeLabel: 'Pembayaran Restorasi AI',
          txHash: cleanPayHash,
          tokenId: origVer?.onChainTokenId,
          parentId: origVer?.onChainTokenId ? String(origVer.onChainTokenId) : null,
          requestId: derivVer?.requestId,
          feeLabel: item.restorationFeePaid || '0.01 ETH',
          timestamp: tsLabel,
          isPrivate: isPriv,
          ownerAddress: origVer?.ownerAddress,
          recipientAddress: item.recipientAddress,
          sortTimestamp: parseArchiveTimestamp(tsLabel),
          stageWeight: 2,
        });
      }
    }
  }

  return results.sort((a, b) => {
    if (b.sortTimestamp !== a.sortTimestamp) {
      return b.sortTimestamp - a.sortTimestamp;
    }
    if (b.stageWeight !== a.stageWeight) {
      return b.stageWeight - a.stageWeight;
    }
    return b.archiveId.localeCompare(a.archiveId);
  });
}
