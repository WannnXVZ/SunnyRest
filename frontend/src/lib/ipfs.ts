export const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:8000';

const rawGateway =
  import.meta.env.VITE_IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs/';
export const IPFS_GATEWAY = rawGateway.endsWith('/')
  ? rawGateway
  : `${rawGateway}/`;

export interface IpfsPinResult {
  cid: string;
  uri: string;
  gatewayUrl: string;
  strategy: 'pinata' | 'local-kubo';
}

export function resolveIpfsUrl(uriOrCid: string): string {
  const clean = (uriOrCid || '').trim();
  if (!clean) return '';
  if (
    clean.startsWith('http://') ||
    clean.startsWith('https://') ||
    clean.startsWith('blob:') ||
    clean.startsWith('data:') ||
    clean.startsWith('/')
  ) {
    return clean;
  }
  if (clean.startsWith('ipfs://')) {
    const pathPart = clean.slice('ipfs://'.length).replace(/^ipfs\//i, '');
    return `${IPFS_GATEWAY}${pathPart}`;
  }
  return `${IPFS_GATEWAY}${clean}`;
}

async function parseIpfsError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (data?.detail) return String(data.detail);
  } catch {
    // Non-JSON response
  }
  return `Layanan pinning IPFS gagal (HTTP ${res.status}). Pastikan PINATA_JWT atau IPFS_API_URL dikonfigurasi di backend.`;
}

export async function pinFileToIpfs(
  file: Blob | File,
  filename: string
): Promise<IpfsPinResult> {
  const formData = new FormData();
  formData.append('file', file, filename);

  const res = await fetch(`${API_BASE_URL}/ipfs/pin-file`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new Error(await parseIpfsError(res));
  }

  const data = await res.json();
  return {
    cid: data.cid as string,
    uri: data.uri as string,
    gatewayUrl: data.gateway_url as string,
    strategy: data.strategy as 'pinata' | 'local-kubo',
  };
}

export async function pinMetadataToIpfs(
  metadata: Record<string, unknown>,
  filename = 'metadata.json'
): Promise<IpfsPinResult> {
  const res = await fetch(`${API_BASE_URL}/ipfs/pin-json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ metadata, filename }),
  });

  if (!res.ok) {
    throw new Error(await parseIpfsError(res));
  }

  const data = await res.json();
  return {
    cid: data.cid as string,
    uri: data.uri as string,
    gatewayUrl: data.gateway_url as string,
    strategy: data.strategy as 'pinata' | 'local-kubo',
  };
}

export async function fetchIpfsJson<T = Record<string, unknown>>(
  uriOrCid: string,
  timeoutMs = 6000
): Promise<T | null> {
  const url = resolveIpfsUrl(uriOrCid);
  if (!url) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
