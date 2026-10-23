import test from 'node:test';
import assert from 'node:assert/strict';

// Helper reproduction matching src/lib/exif.ts logic for standalone test execution
function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function comparePhotoLocation(exifLat, exifLng, reportLat, reportLng) {
  if (exifLat === null || exifLat === undefined || exifLng === null || exifLng === undefined) {
    return {
      status: 'no_exif_gps',
      distanceMeters: null,
      message: 'Photo has no embedded GPS metadata (Reported via manual map pin/address).',
    };
  }

  if (reportLat === null || reportLat === undefined || reportLng === null || reportLng === undefined) {
    return {
      status: 'no_report_gps',
      distanceMeters: null,
      message: `Camera captured at [${exifLat}, ${exifLng}], but complaint has no pinned coordinates.`,
    };
  }

  const distance = haversineDistanceMeters(exifLat, exifLng, reportLat, reportLng);

  if (distance <= 300) {
    return {
      status: 'verified_match',
      distanceMeters: distance,
      message: `Verified On-Site: Photo GPS matches reported location (${distance}m delta).`,
    };
  }

  if (distance <= 1500) {
    return {
      status: 'nearby',
      distanceMeters: distance,
      message: `Nearby Location: Photo taken within ${(distance / 1000).toFixed(2)} km of reported pin.`,
    };
  }

  return {
    status: 'discrepancy',
    distanceMeters: distance,
    message: `Location Discrepancy: Photo GPS is ${(distance / 1000).toFixed(1)} km away from reported location pin.`,
  };
}

function formatExifTimestamp(raw) {
  if (!raw) return 'Unknown';
  let clean = raw.trim();
  if (/^\d{4}:\d{2}:\d{2}/.test(clean)) {
    clean = clean.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
  }
  const date = new Date(clean);
  if (isNaN(date.getTime())) return raw;
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

test('1. Haversine distance calculates accurate geographic distance', () => {
  // Bangalore MG Road to Indiranagar (~4 km)
  const dist = haversineDistanceMeters(12.9756, 77.6066, 12.9784, 77.6408);
  assert.ok(dist >= 3500 && dist <= 4200, `Expected ~3.7km, got ${dist}m`);
});

test('2. Photo location comparison: Identifies verified on-site photo within 300m', () => {
  const result = comparePhotoLocation(12.971598, 77.594562, 12.971650, 77.594600);
  assert.equal(result.status, 'verified_match');
  assert.ok(result.distanceMeters !== null && result.distanceMeters <= 50);
});

test('3. Photo location comparison: Flags discrepancy if photo was taken across town (>1500m)', () => {
  // 12.9716, 77.5946 to 13.0358, 77.5970 (Hebbal, ~7km away)
  const result = comparePhotoLocation(13.0358, 77.5970, 12.9716, 77.5946);
  assert.equal(result.status, 'discrepancy');
  assert.ok(result.distanceMeters > 5000);
});

test('4. Photo location comparison: Gracefully handles photos without GPS headers', () => {
  const result = comparePhotoLocation(null, null, 12.9716, 77.5946);
  assert.equal(result.status, 'no_exif_gps');
  assert.equal(result.distanceMeters, null);
});

test('5. Formats raw EXIF timestamp into readable format', () => {
  const formatted = formatExifTimestamp('2024:10:23 14:30:00');
  assert.match(formatted, /23.*Oct.*2024/i);
});
