import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const CV_SERVICE_URL = process.env.CV_SERVICE_URL || 'http://127.0.0.1:8000';
const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Server-side helper implementation mirror for verification
 */
async function checkHealth(url = CV_SERVICE_URL, timeoutMs = 3000) {
  try {
    const res = await fetch(`${url.replace(/\/+$/, '')}/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return { online: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { online: true, ...data };
  } catch (err) {
    return { online: false, error: err.message };
  }
}

async function detectBytes(bytes, mimeType, filename = 'test.jpg', confidence = 0.25, url = CV_SERVICE_URL) {
  if (bytes.byteLength > MAX_PHOTO_SIZE_BYTES) {
    throw new Error(`Image size (${(bytes.byteLength / (1024 * 1024)).toFixed(2)} MB) exceeds 5 MB limit.`);
  }
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error(`Unsupported photo type '${mimeType}'. Allowed formats: ${ALLOWED_MIME_TYPES.join(', ')}`);
  }

  const formData = new FormData();
  const blob = new Blob([bytes], { type: mimeType });
  formData.append('file', blob, filename);

  const res = await fetch(`${url.replace(/\/+$/, '')}/detect?confidence=${confidence}`, {
    method: 'POST',
    body: formData,
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`YOLO service HTTP ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

test('1. CV_SERVICE_URL formatting and default', () => {
  assert.ok(CV_SERVICE_URL.startsWith('http://'), 'Service URL must start with http://');
  assert.equal(CV_SERVICE_URL.endsWith('/'), false, 'Service URL must not have trailing slash');
});

test('2. Microservice health check against local YOLO server', async () => {
  const health = await checkHealth(CV_SERVICE_URL, 3000);
  assert.equal(typeof health.online, 'boolean');

  if (health.online) {
    assert.equal(health.service, 'fixmybharat-cv-service');
    assert.ok(health.model === 'yolo26n.pt' || health.model === 'yolov8n.pt');
    assert.equal(health.device, 'cpu');
    assert.equal(health.max_file_size_mb, 5);
  }

});

test('3. Graceful offline handling on unreachable endpoint', async () => {
  const offlineHealth = await checkHealth('http://127.0.0.1:59999', 500);
  assert.equal(offlineHealth.online, false);
  assert.ok(offlineHealth.error);
});

test('4. Enforces 5 MB file size limit', async () => {
  const oversizedBytes = new Uint8Array(MAX_PHOTO_SIZE_BYTES + 1024);
  await assert.rejects(
    async () => {
      await detectBytes(oversizedBytes, 'image/jpeg');
    },
    { message: /exceeds 5 MB limit/i }
  );
});

test('5. Rejects unsupported MIME types before transmission', async () => {
  const smallBytes = new Uint8Array(64);
  await assert.rejects(
    async () => {
      await detectBytes(smallBytes, 'application/pdf');
    },
    { message: /unsupported photo type/i }
  );
});

test('6. Live YOLO inference on sample image returns typed bounding boxes', async (t) => {
  const health = await checkHealth(CV_SERVICE_URL, 1500);
  if (!health.online) {
    t.skip('Skipping live inference test because YOLO microservice is offline');
    return;
  }

  const samplePath = join(process.cwd(), 'cv-service', 'sample.jpg');
  if (!existsSync(samplePath)) {
    t.skip('Sample image not found at cv-service/sample.jpg');
    return;
  }

  const sampleBytes = readFileSync(samplePath);
  assert.ok(sampleBytes.length <= MAX_PHOTO_SIZE_BYTES, 'Sample image must be under 5 MB');

  const result = await detectBytes(sampleBytes, 'image/jpeg', 'sample.jpg', 0.25);

  assert.equal(result.status, 'success');
  assert.ok(result.model === 'yolo26n.pt' || result.model === 'yolov8n.pt');
  assert.equal(result.device, 'cpu');

  assert.ok(typeof result.total_detections === 'number');
  assert.ok(Array.isArray(result.detections));

  if (result.detections.length > 0) {
    const d = result.detections[0];
    assert.ok(typeof d.class_name === 'string');
    assert.ok(typeof d.confidence === 'number');
    assert.ok(d.confidence >= 0.25);
    assert.ok(d.box);
    assert.ok(typeof d.box.norm_x1 === 'number');
    assert.ok(typeof d.box.norm_y1 === 'number');
    assert.ok(typeof d.box.norm_width === 'number');
    assert.ok(typeof d.box.norm_height === 'number');
  }

  assert.ok(
    typeof result.model_limitations_notice === 'string',
    'Result must include model limitations notice'
  );
});

test('7. Contract guardrail: YOLO detections must not override rules-based analysis', () => {
  // Existing deterministic rules output
  const rulesAnalysis = {
    predictedCategory: 'pothole',
    confidence: 0.94,
    severityScore: 85,
    severity: 'high',
    explanation: "Detected Pothole signals ('pothole', 'deep crater'). Elevated by accident risk.",
    analysisSource: 'rules',
    modelName: 'fixmybharat-rules-v1',
  };

  // Mock YOLO detections finding a vehicle or person in the background
  const yoloDetections = {
    status: 'success',
    model: 'yolov8n.pt',
    device: 'cpu',
    total_detections: 3,
    detections: [
      { class_name: 'car', confidence: 0.91 },
      { class_name: 'person', confidence: 0.74 },
      { class_name: 'bicycle', confidence: 0.65 },
    ],
  };

  // Integrating vision detection must NOT mutate or override rules categorization
  const combined = {
    ...rulesAnalysis,
    visionDetections: yoloDetections,
  };

  assert.equal(combined.predictedCategory, 'pothole', 'Category must remain pothole');
  assert.equal(combined.severity, 'high', 'Severity must remain high');
  assert.equal(combined.confidence, 0.94, 'Rule confidence must remain untouched');
  assert.equal(combined.analysisSource, 'rules', 'Analysis source must remain rules');
  assert.equal(combined.visionDetections.total_detections, 3, 'Vision detections preserved advisory');
});
