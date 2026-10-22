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
 * If local microservice is offline but ULTRALYTICS_API_KEY is configured (e.g. on Netlify),
 * returns online status via the Ultralytics Platform Cloud inference API.
 * Server-side only. Safe against unreachable/offline services.
 */
export async function checkVisionServiceHealth(
  timeoutMs = 3000
): Promise<VisionHealthStatus> {
  const baseUrl = getVisionServiceUrl();
  const apiKey = process.env.ULTRALYTICS_API_KEY || process.env.YOLO_API_KEY;

  try {
    const res = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
      cache: 'no-store',
    });

    if (res.ok) {
      const data = await res.json();
      return {
        online: true,
        service: data.service,
        model: data.model,
        device: data.device,
        environment: data.environment,
      };
    }
  } catch {
    // Local probe failed, evaluate cloud fallback below
  }

  // Cloud API fallback for serverless deployments (Netlify / Vercel)
  if (apiKey) {
    const model = process.env.ULTRALYTICS_MODEL || 'yolo26n';
    return {
      online: true,
      service: 'ultralytics-cloud',
      model: `${model} (Ultralytics Cloud API)`,
      device: 'cloud',
      environment: 'cloud-serverless',
    };
  }

  return {
    online: false,
    error: `YOLO service unreachable at ${baseUrl} and no ULTRALYTICS_API_KEY configured for cloud fallback.`,
  };
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
 * Calls the official Ultralytics Platform Cloud Predict API directly.
 * Allows running YOLO object detection in serverless environments (e.g. Netlify)
 * without needing to deploy or maintain a separate persistent Python container.
 */
export async function detectObjectsFromUltralyticsCloud(
  imageBytes: Uint8Array | ArrayBuffer | Buffer,
  mimeType: string,
  filename = 'complaint-photo.jpg',
  confidence = 0.25,
  timeoutMs = 25000
): Promise<VisionDetectionResponse> {
  const apiKey = process.env.ULTRALYTICS_API_KEY || process.env.YOLO_API_KEY;
  if (!apiKey) {
    throw new Error('ULTRALYTICS_API_KEY is not configured in environment variables.');
  }

  const owner = process.env.ULTRALYTICS_OWNER || 'gundeti-charani-reddy';
  const project = process.env.ULTRALYTICS_PROJECT || 'example-project';
  const model = process.env.ULTRALYTICS_MODEL || 'yolo26n';

  const clampedConfidence = Math.max(0.05, Math.min(0.95, Number(confidence) || 0.25));
  const url = `https://platform.ultralytics.com/api/models/${owner}/${project}/${model}/predict`;

  const blob = new Blob([imageBytes as unknown as BlobPart], { type: mimeType });
  const form = new FormData();
  form.append('file', blob, filename);
  form.append('conf', String(clampedConfidence));

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: form,
    signal: AbortSignal.timeout(timeoutMs),
    cache: 'no-store',
  });

  if (!res.ok) {
    let errDetail = `HTTP ${res.status}: ${res.statusText}`;
    try {
      const errJson = await res.json();
      if (errJson?.message || errJson?.detail) {
        errDetail = errJson.message || errJson.detail;
      }
    } catch {
      // Ignore parse failure on error body
    }
    throw new Error(`Ultralytics Cloud API error: ${errDetail}`);
  }

  interface CloudResultBox {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }
  interface CloudResultItem {
    name: string;
    class?: number;
    confidence: number;
    box: CloudResultBox;
  }
  interface CloudResponse {
    images?: Array<{
      shape?: [number, number];
      results?: CloudResultItem[];
    }>;
  }

  const data: CloudResponse = await res.json();
  const firstImage = data.images?.[0];
  const imgShape = firstImage?.shape || [640, 640];
  const imgHeight = Math.max(1, imgShape[0]);
  const imgWidth = Math.max(1, imgShape[1]);

  const rawResults = firstImage?.results || [];
  const detections = rawResults
    .filter((r) => r.confidence >= clampedConfidence)
    .map((r) => {
      const x1 = Math.round(r.box.x1);
      const y1 = Math.round(r.box.y1);
      const x2 = Math.round(r.box.x2);
      const y2 = Math.round(r.box.y2);
      const w = Math.max(0, x2 - x1);
      const h = Math.max(0, y2 - y1);
      return {
        class_id: r.class ?? 0,
        class_name: r.name || 'object',
        confidence: Number((r.confidence ?? 0).toFixed(4)),
        box: {
          x1,
          y1,
          x2,
          y2,
          width: w,
          height: h,
          norm_x1: Number(Math.max(0, Math.min(1, x1 / imgWidth)).toFixed(4)),
          norm_y1: Number(Math.max(0, Math.min(1, y1 / imgHeight)).toFixed(4)),
          norm_width: Number(Math.max(0, Math.min(1, w / imgWidth)).toFixed(4)),
          norm_height: Number(Math.max(0, Math.min(1, h / imgHeight)).toFixed(4)),
        },
      };
    });

  return {
    status: 'ok',
    model: `${model} (Ultralytics Cloud)`,
    device: 'cloud',
    image: { width: imgWidth, height: imgHeight },
    total_detections: detections.length,
    detections,
    model_limitations_notice:
      'Object detection powered by Ultralytics Platform Cloud inference.',
  };
}

/**
 * High-level server-side helper:
 * 1. Obtains an authorized temporary signed URL for a complaint photo path.
 * 2. Fetches the image server-side.
 * 3. Enforces the 5 MB limit and valid image format.
 * 4. Forwards image bytes to the YOLO /detect endpoint (with seamless Ultralytics Cloud fallback).
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

    // Forward bytes to YOLO microservice (local first, fallback to Ultralytics Cloud)
    const filename = photoPathOrUrl.split('?')[0].split('/').pop() || 'complaint-evidence.jpg';
    const apiKey = process.env.ULTRALYTICS_API_KEY || process.env.YOLO_API_KEY;

    let detectionResponse: VisionDetectionResponse;
    try {
      detectionResponse = await detectObjectsFromBytes(
        arrayBuffer,
        cleanContentType,
        filename,
        confidence,
        apiKey ? 5000 : 15000
      );
    } catch (localErr) {
      if (apiKey) {
        detectionResponse = await detectObjectsFromUltralyticsCloud(
          arrayBuffer,
          cleanContentType,
          filename,
          confidence
        );
      } else {
        throw localErr;
      }
    }

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
      friendlyError = `YOLO microservice is currently offline at ${baseUrl}. Ensure the service is running (python -m uvicorn main:app --port 8000) or configure ULTRALYTICS_API_KEY for cloud inference.`;
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
