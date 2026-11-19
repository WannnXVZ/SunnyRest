import { ArchiveItem, PhotoCategory } from '../types';
import { API_BASE_URL, resolveIpfsUrl } from './ipfs';

export { API_BASE_URL };

export interface BackendHealth {
  status: string;
  model_loaded: boolean;
  classifier_loaded?: boolean;
  sr_loaded?: boolean;
  ipfs_configured?: boolean;
  mock?: boolean;
}

export interface PredictResult {
  label: PhotoCategory;
  confidence: number;
  scores: Record<PhotoCategory, number>;
  model_version: string;
  mock?: boolean;
}

export interface EnhanceResult {
  imageUrl: string;
  blob: Blob;
  method: string;
  modelVersion: string;
  inferenceMs: number;
  scale: number;
  paymentVerified: boolean;
  isMock: boolean;
}

export interface UploadedFileResponse {
  filename: string;
  url: string;
  sha256: string;
  size_bytes: number;
  dimensions: string;
}

export function resolveMediaUrl(urlOrUri: string): string {
  const clean = (urlOrUri || '').trim();
  if (!clean) return '';
  if (clean.startsWith('/storage/')) {
    return `${API_BASE_URL}${clean}`;
  }
  if (clean.startsWith('ipfs://')) {
    return resolveIpfsUrl(clean);
  }
  return clean;
}

async function parseApiError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (data?.detail) return String(data.detail);
  } catch {
    // Non-JSON response
  }
  return `Layanan backend mengembalikan status HTTP ${res.status}.`;
}

export async function checkBackendHealth(): Promise<BackendHealth> {
  const res = await fetch(`${API_BASE_URL}/health`);
  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }
  return res.json();
}

export async function predictPhotoCategory(file: File): Promise<PredictResult> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE_URL}/predict`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }

  return res.json();
}

export async function enhancePhotoWithSR(
  source: File | Blob | string,
  requestId?: number
): Promise<EnhanceResult> {
  let blobToUpload: Blob;
  if (typeof source === 'string') {
    const targetUrl = resolveMediaUrl(source);
    const imgRes = await fetch(targetUrl);
    if (!imgRes.ok) {
      throw new Error('Gagal memuat berkas foto sumber untuk dikirim ke layanan SR.');
    }
    blobToUpload = await imgRes.blob();
  } else {
    blobToUpload = source;
  }

  const formData = new FormData();
  formData.append('file', blobToUpload, 'input.png');
  formData.append('scale', '4');
  if (requestId !== undefined) {
    formData.append('request_id', String(requestId));
  }

  const res = await fetch(`${API_BASE_URL}/enhance`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }

  const pngBlob = await res.blob();
  const method = res.headers.get('X-Method') || 'Real-ESRGAN';
  const modelVersion = res.headers.get('X-Model-Version') || 'x4plus';
  const inferenceMs = Number(res.headers.get('X-Inference-Time-MS') || '0');
  const scale = Number(res.headers.get('X-Scale') || '4');
  const paymentVerified = res.headers.get('X-Payment-Verified') === 'true';
  const isMock = res.headers.get('X-Mock') === 'true' || method === 'mock';

  return {
    imageUrl: URL.createObjectURL(pngBlob),
    blob: pngBlob,
    method,
    modelVersion,
    inferenceMs,
    scale,
    paymentVerified,
    isMock,
  };
}

export async function fetchSubmissions(): Promise<ArchiveItem[]> {
  const res = await fetch(`${API_BASE_URL}/submissions`);
  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }
  const data = await res.json();
  return Array.isArray(data?.items) ? (data.items as ArchiveItem[]) : [];
}

export async function createSubmissionOnServer(
  file: File,
  metadata: Omit<ArchiveItem, 'id'>
): Promise<ArchiveItem> {
  const formData = new FormData();
  formData.append('file', file, file.name);
  formData.append('payload', JSON.stringify(metadata));

  const res = await fetch(`${API_BASE_URL}/submissions`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }
  return (await res.json()) as ArchiveItem;
}

export async function uploadDerivativeFileOnServer(
  subId: string,
  blob: Blob,
  filename: string
): Promise<UploadedFileResponse> {
  const formData = new FormData();
  formData.append('file', blob, filename);

  const res = await fetch(`${API_BASE_URL}/submissions/${encodeURIComponent(subId)}/upload-file`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }
  return (await res.json()) as UploadedFileResponse;
}

export async function patchSubmissionOnServer(
  subId: string,
  patch: Partial<ArchiveItem>
): Promise<ArchiveItem> {
  const res = await fetch(`${API_BASE_URL}/submissions/${encodeURIComponent(subId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });

  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }
  return (await res.json()) as ArchiveItem;
}
