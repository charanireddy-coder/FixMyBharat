import type { VisionDetectionResponse } from '@/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getSignedPhotoUrl,
  MAX_PHOTO_SIZE_BYTES,
  ALLOWED_PHOTO_TYPES,
} from '@/lib/storage';



/**
 * Returns the configured base URL of the YOLO Computer Vision Microservice.
 * Configurable via CV_SERVICE_URL env variable (defaults to local 127.0.0.1:8000).
 * NOTE: This is strictly an internal/server-side endpoint and must NEVER be exposed
 * directly to browser bundles or public clients.
 */
export function getVisionServiceUrl(): string {
  const url = process.env.CV_SERVICE_URL || 'http://127.0.0.1:8000';
  return url.replace(/\/+$/, '');
}

export interface VisionHealthStatus {
  online: boolean;
  service?: string;
  model?: string;
  device?: string;
  environment?: string;
  error?: string;
}

/**
 * Probes the YOLO microservice health endpoint with a short timeout.
 * Server-side only. Safe against unreachable/offline services.
 */
export async function checkVisionServiceHealth(
  timeoutMs = 3000
): Promise<VisionHealthStatus> {
  const baseUrl = getVisionServiceUrl();
  try {
    const res = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
      cache: 'no-store',
    });

    if (!res.ok) {
      return {
        online: false,
        error: `Vision service responded with HTTP ${res.status}: ${res.statusText}`,
      };
    }

    const data = await res.json();
    return {
      online: true,
      service: data.service,
      model: data.model,
      device: data.device,
      environment: data.environment,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown network failure';
    return {
      online: false,
      error: `YOLO service unreachable at ${baseUrl} (${msg})`,
    };
  }
}

/**
 * Calls the local YOLO /detect endpoint with raw image bytes.
 * Validates file size (max 5 MB) and MIME types before transmission.
 * Server-side execution only.
 */
export async function detectObjectsFromBytes(
  imageBytes: Uint8Array | ArrayBuffer | Buffer,
  mimeType: string,
  filename = 'complaint-photo.jpg',
  confidence = 0.25,
  timeoutMs = 15000
): Promise<VisionDetectionResponse> {
  const byteLength = imageBytes.byteLength;

  if (byteLength > MAX_PHOTO_SIZE_BYTES) {
    throw new Error(
      `Image size (${(byteLength / (1024 * 1024)).toFixed(2)} MB) exceeds the maximum allowed 5 MB limit.`
    );
  }

  if (!ALLOWED_PHOTO_TYPES.includes(mimeType)) {
    throw new Error(
      `Unsupported photo type '${mimeType}'. Allowed formats: ${ALLOWED_PHOTO_TYPES.join(', ')}`
    );
  }

  const clampedConfidence = Math.max(0.05, Math.min(0.95, Number(confidence) || 0.25));
  const baseUrl = getVisionServiceUrl();
  const targetUrl = `${baseUrl}/detect?confidence=${clampedConfidence}`;

  const formData = new FormData();
  // Wrap bytes in standard Web Blob
  const blob = new Blob([imageBytes as unknown as BlobPart], { type: mimeType });
  formData.append('file', blob, filename);


  const res = await fetch(targetUrl, {
    method: 'POST',
    body: formData,
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    let errorDetail = `HTTP ${res.status}: ${res.statusText}`;
    try {
      const errJson = await res.json();
      if (errJson?.detail) {
        errorDetail = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
      }
    } catch {
      // Ignore JSON parse failure on error body
    }
    throw new Error(`YOLO vision service error: ${errorDetail}`);
  }

  const result: VisionDetectionResponse = await res.json();
  return result;
}

/**
 * High-level server-side helper:
 * 1. Obtains an authorized temporary signed URL for a complaint photo path.
 * 2. Fetches the image server-side.
 * 3. Enforces the 5 MB limit and valid image format.
 * 4. Forwards image bytes to the YOLO /detect endpoint.
 * 5. Returns parsed detections or graceful error details without crashing.
 */
export async function detectComplaintPhoto(
  photoPathOrUrl: string,
  confidence = 0.25,
  supabaseClient?: SupabaseClient
): Promise<{
  success: boolean;
  data: VisionDetectionResponse | null;
  error: string | null;
}> {
  if (!photoPathOrUrl || !photoPathOrUrl.trim()) {
    return {
      success: false,
      data: null,
      error: 'No photo path or URL provided for vision analysis.',
    };
  }

  try {
    let arrayBuffer: ArrayBuffer | null = null;
    let cleanContentType = 'image/jpeg';
    let fetchUrl = photoPathOrUrl.trim();

    // If it's a relative storage path, attempt direct storage download or signed URL resolution
    if (!fetchUrl.startsWith('http://') && !fetchUrl.startsWith('https://')) {
      if (supabaseClient) {
        try {
          const { data: blob, error: dlErr } = await supabaseClient.storage
            .from('complaint-photos')
            .download(fetchUrl);
          if (!dlErr && blob) {
            cleanContentType = (blob.type || 'image/jpeg').split(';')[0].trim().toLowerCase();
            arrayBuffer = await blob.arrayBuffer();
          }
        } catch {
          // Fall through to signed URL
        }
      }

      if (!arrayBuffer) {
        const signedUrl = await getSignedPhotoUrl(fetchUrl, 300, supabaseClient);
        if (!signedUrl) {
          return {
            success: false,
            data: null,
            error: 'Failed to generate secure signed URL for complaint photo from storage.',
          };
        }
        fetchUrl = signedUrl;
      }
    }

    if (!arrayBuffer) {
      // Fetch the image server-side with a strict timeout
      const imageRes = await fetch(fetchUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(10000),
        cache: 'no-store',
      });

      if (!imageRes.ok) {
        return {
          success: false,
          data: null,
          error: `Could not download photo evidence (HTTP ${imageRes.status} from storage)`,
        };
      }

      const contentType = imageRes.headers.get('content-type') || 'image/jpeg';
      cleanContentType = contentType.split(';')[0].trim().toLowerCase();

      // Check Content-Length header if available as early guard
      const contentLength = imageRes.headers.get('content-length');
      if (contentLength && parseInt(contentLength, 10) > MAX_PHOTO_SIZE_BYTES) {
        return {
          success: false,
          data: null,
          error: `Photo evidence exceeds 5 MB limit (${(parseInt(contentLength, 10) / (1024 * 1024)).toFixed(2)} MB).`,
        };
      }

      arrayBuffer = await imageRes.arrayBuffer();
    }

    if (arrayBuffer.byteLength > MAX_PHOTO_SIZE_BYTES) {
      return {
        success: false,
        data: null,
        error: `Photo evidence exceeds 5 MB limit (${(arrayBuffer.byteLength / (1024 * 1024)).toFixed(2)} MB).`,
      };
    }

    // Forward bytes to YOLO microservice
    const filename = photoPathOrUrl.split('?')[0].split('/').pop() || 'complaint-evidence.jpg';
    const detectionResponse = await detectObjectsFromBytes(
      arrayBuffer,
      cleanContentType,
      filename,
      confidence
    );

    return {
      success: true,
      data: detectionResponse,
      error: null,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Vision inference failed';
    const baseUrl = getVisionServiceUrl();
    const isConnRefused = msg.includes('ECONNREFUSED') || msg.includes('fetch failed');
    const isTimeout = msg.includes('timeout') || msg.includes('aborted');

    let friendlyError = msg;
    if (isConnRefused) {
      friendlyError = `YOLO microservice is currently offline at ${baseUrl}. Ensure the service is running (python -m uvicorn main:app --port 8000).`;
    } else if (isTimeout) {
      friendlyError = `YOLO vision request timed out while processing photo.`;
    }

    return {
      success: false,
      data: null,
      error: friendlyError,
    };
  }
}
