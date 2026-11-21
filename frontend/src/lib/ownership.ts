import { ArchiveItem } from '../types';

/**
 * Memeriksa apakah arsip dimiliki atau diajukan oleh alamat wallet tertentu.
 * Membandingkan `recipientAddress` atau `ownerAddress` pada setiap versi secara case-insensitive.
 */
export function isArchiveOwnedBy(
  item: ArchiveItem | undefined | null,
  walletAddress: string | null | undefined
): boolean {
  if (!item || !walletAddress) return false;
  const target = walletAddress.trim().toLowerCase();
  if (!target) return false;

  if (item.recipientAddress && item.recipientAddress.trim().toLowerCase() === target) {
    return true;
  }

  return Array.isArray(item.versions)
    ? item.versions.some((ver) => Boolean(ver.ownerAddress && ver.ownerAddress.trim().toLowerCase() === target))
    : false;
}

/**
 * Memeriksa apakah arsip ditandai privat (kenangan pribadi) dan disembunyikan dari galeri publik.
 */
export function isArchivePrivate(item: ArchiveItem | undefined | null): boolean {
  return Boolean(item && (item.visibility === 'private' || item.isPrivate));
}
