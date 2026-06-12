export type UploadInitPayload = {
  totalSizeBytes: number;
  totalChunks: number;
  settings: {
    ttl: '1h' | '24h' | '7d' | '30d';
    burnAfterRead: boolean;
    hasAccessPassword: boolean;
    maxDownloads: number | null;
  };
};

export type UploadInitResponse = {
  sessionId: string;
  chunkSizeBytes: number;
  expiresAt: string;
};

export type UploadCompleteResponse = {
  fileId: string;
  deleteToken: string;
  expiresAt: string;
  blobSizeBytes: number;
};

export type FileMetaResponse = {
  fileId: string;
  blobSizeBytes: number;
  expiresAt: string;
  burnAfterRead: boolean;
  hasAccessPassword: boolean;
  encryptedMetadata: string | null;
  encryptionIv: string | null;
  accessVerifier: {
    verifier: string | null;
    salt: string | null;
    iv: string | null;
  } | null;
};

export type SenderStatusResponse = {
  fileId: string;
  status: 'active' | 'expired' | 'deleted';
  createdAt: string | null;
  expiresAt: string | null;
  downloadCount: number;
  firstAccessedAt: string | null;
  burnAfterRead: boolean;
  hasAccessPassword: boolean;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function normalizeApiBaseUrl(rawValue: string | undefined): string {
  const fallback = 'http://127.0.0.1:8000/api';
  const value = rawValue?.trim();

  if (!value) return fallback;

  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    const url = new URL(withProtocol);
    const pathname = url.pathname.replace(/\/+$/, '');
    url.pathname = pathname.endsWith('/api') ? pathname : `${pathname}/api`;
    return url.toString().replace(/\/$/, '');
  } catch {
    return fallback;
  }
}

export const apiBase = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL as string | undefined);

async function readErrorMessage(res: Response, fallback: string) {
  try {
    const data = await res.json();
    if (data && typeof data === 'object' && 'title' in data && typeof (data as { title?: unknown }).title === 'string') {
      return (data as { title: string }).title;
    }
  } catch {
    try {
      const text = await res.text();
      if (text.trim()) return text;
    } catch {
      // ignore and fall back below
    }
  }

  return fallback;
}

export async function uploadInit(payload: UploadInitPayload): Promise<UploadInitResponse> {
  const res = await fetch(`${apiBase}/upload/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`upload init failed (${res.status})`);
  return res.json();
}

export async function uploadChunk(sessionId: string, index: number, bytes: Uint8Array): Promise<void> {
  const res = await fetch(`${apiBase}/upload/chunk/${sessionId}/${index}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: bytes,
  });
  if (!res.ok) throw new Error(`upload chunk failed (${res.status})`);
}

export async function uploadStatus(sessionId: string): Promise<{ sessionId: string; totalChunks: number; receivedChunks: number[]; nextChunkIndex: number; expiresAt: string }> {
  const res = await fetch(`${apiBase}/upload/status/${sessionId}`);
  if (!res.ok) throw new Error(`upload status failed (${res.status})`);
  return res.json();
}

export async function uploadChunkWithRetry(sessionId: string, index: number, bytes: Uint8Array, maxRetries = 5): Promise<void> {
  let attempt = 0;
  const baseDelay = 300;
  while (true) {
    try {
      await uploadChunk(sessionId, index, bytes);
      return;
    } catch (err) {
      attempt += 1;
      if (attempt > maxRetries) {
        // Check upload status to see if the server already has this chunk
        try {
          const status = await uploadStatus(sessionId);
          if (status.receivedChunks && status.receivedChunks.includes(index)) {
            return; // other attempt succeeded server-side
          }
        } catch (e) {
          // ignore status error and fall through to final throw
        }
        throw err;
      }
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 100);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

export async function uploadComplete(sessionId: string, payload: {
  encryptedMetadata: string;
  encryptionIv: string;
  accessVerifier: {
    verifier: string;
    salt: string;
    iv: string;
  } | null;
}): Promise<UploadCompleteResponse> {
  const res = await fetch(`${apiBase}/upload/complete/${sessionId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`upload complete failed (${res.status})`);
  return res.json();
}

export async function getFileMeta(fileId: string): Promise<FileMetaResponse> {
  const res = await fetch(`${apiBase}/file/${fileId}/meta`);
  if (!res.ok) {
    throw new ApiError(await readErrorMessage(res, `meta fetch failed (${res.status})`), res.status);
  }
  return res.json();
}

export async function downloadFileBlob(fileId: string): Promise<Blob> {
  const res = await fetch(`${apiBase}/file/${fileId}`);
  if (!res.ok) {
    throw new ApiError(await readErrorMessage(res, `download failed (${res.status})`), res.status);
  }
  return res.blob();
}

export async function getSenderStatus(fileId: string, token: string): Promise<SenderStatusResponse> {
  const res = await fetch(`${apiBase}/status/${fileId}?token=${encodeURIComponent(token)}`);
  if (!res.ok) {
    throw new ApiError(await readErrorMessage(res, `status fetch failed (${res.status})`), res.status);
  }
  return res.json();
}

export async function deleteFile(fileId: string, token: string): Promise<void> {
  const res = await fetch(`${apiBase}/file/${fileId}?token=${encodeURIComponent(token)}`, { method: 'DELETE' });
  if (!res.ok) {
    // treat 410 as a valid terminal state but still communicate it to callers
    throw new ApiError(await readErrorMessage(res, `delete failed (${res.status})`), res.status);
  }
}
