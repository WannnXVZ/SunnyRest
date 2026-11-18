import { PhotoCategory } from '../types';

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface BackendHealth {
  status: string;
  model_loaded: boolean;
  classifier_loaded?: boolean;
  sr_loaded?: boolean;
  mock?: boolean;
}

export interface PredictResult {
  label: PhotoCategory;
  confidence: number;
  scores: Record<string, number>;
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

async function parseApiError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (data?.detail) return String(data.detail);
  } catch {
    // Non-JSON response
  }
  return `Layanan AI mengembalikan status HTTP ${res.status}.`;
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
    const imgRes = await fetch(source);
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
