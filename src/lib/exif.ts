import ExifReader from 'exifreader';
import { PhotoExifData } from '@/types';

/**
 * Safely parses EXIF camera metadata (GPS coordinates, capture date, camera make/model)
 * from an uploaded photo. Works in both browser and server Node.js runtimes.
 */
export async function parsePhotoExif(
  fileOrBuffer: File | ArrayBuffer | Uint8Array
): Promise<PhotoExifData> {
  try {
    // Handle polymorphic File | ArrayBuffer | Uint8Array inputs across Node.js & browser runtimes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tags: any = await (ExifReader.load as any)(fileOrBuffer, { expanded: true });

    let latitude: number | null = null;
    let longitude: number | null = null;
    let altitude: number | null = null;
    let hasGps = false;

    if (tags.gps && typeof tags.gps.Latitude === 'number' && typeof tags.gps.Longitude === 'number') {
      latitude = Number(tags.gps.Latitude.toFixed(6));
      longitude = Number(tags.gps.Longitude.toFixed(6));
      hasGps = true;
      if (typeof tags.gps.Altitude === 'number') {
        altitude = Number(tags.gps.Altitude.toFixed(1));
      }
    }

    // Exif tags
    const exif = tags.exif || {};
    const capturedAt =
      exif.DateTimeOriginal?.description ||
      exif.DateTimeDigitized?.description ||
      exif.DateTime?.description ||
      null;

    const cameraMake =
      (tags.file as Record<string, { description?: string }> | undefined)?.['Camera Make']?.description ||
      exif.Make?.description ||
      null;

    const cameraModel =
      (tags.file as Record<string, { description?: string }> | undefined)?.['Camera Model']?.description ||
      exif.Model?.description ||
      null;

    const orientation = exif.Orientation?.value ? Number(exif.Orientation.value) : null;

    return {
      capturedAt,
      cameraMake,
      cameraModel,
      latitude,
      longitude,
      altitude,
      hasGps,
      orientation,
    };
  } catch {
    // Return empty safe fallback if file contains no EXIF headers
    return {
      capturedAt: null,
      cameraMake: null,
      cameraModel: null,
      latitude: null,
      longitude: null,
      altitude: null,
      hasGps: false,
      orientation: null,
    };
  }
}

/**
 * Formats EXIF date string (typically "YYYY:MM:DD HH:MM:SS" or ISO) into human-readable format.
 */
export function formatExifTimestamp(raw?: string | null): string {
  if (!raw) return 'Unknown';
  try {
    // EXIF timestamps are often formatted as "2024:10:23 14:30:15"
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
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return raw;
  }
}

/**
 * Calculates Haversine distance in meters between two lat/lng points.
 */
export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export interface LocationComparisonResult {
  status: 'verified_match' | 'nearby' | 'discrepancy' | 'no_exif_gps' | 'no_report_gps';
  distanceMeters: number | null;
  message: string;
}

/**
 * Compares EXIF embedded camera GPS against citizen-reported complaint coordinates.
 * Flag potential spoofing or confirm verified on-site photographic evidence.
 */
export function comparePhotoLocation(
  exifLat?: number | null,
  exifLng?: number | null,
  reportLat?: number | null,
  reportLng?: number | null
): LocationComparisonResult {
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

