/**
 * Compute SHA-256 hash using the native browser Web Crypto API.
 * Required by PRD UI to separate file hash from IPFS CID.
 */
export async function computeFileSHA256(file: File | Blob): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Truncate a hash or address for accessible display with full tooltip.
 */
export function truncateIdentifier(id: string, start = 8, end = 6): string {
  if (!id) return '';
  if (id.length <= start + end + 3) return id;
  return `${id.slice(0, start)}...${id.slice(-end)}`;
}

