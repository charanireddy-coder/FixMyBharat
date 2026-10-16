import { Complaint, ComplaintCategory, ComplaintSeverity } from '@/types';
import { calculateHaversineDistanceMeters } from '@/lib/ai/similarity';

export interface HotspotCluster {
  id: string;
  center: [number, number];
  radiusMeters: number;
  complaintCount: number;
  complaintIds: string[];
  dominantCategory: ComplaintCategory;
  highestSeverity: ComplaintSeverity;
  severityCounts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

/**
 * Validates whether numeric coordinates are in genuine geographic range.
 */
export function isValidCoordinate(lat?: number | null, lng?: number | null): boolean {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return false;
  const numLat = Number(lat);
  const numLng = Number(lng);
  if (isNaN(numLat) || isNaN(numLng)) return false;
  return numLat >= -90 && numLat <= 90 && numLng >= -180 && numLng <= 180;
}

/**
 * Computes reported issue hotspots using transparent geographic distance clustering.
 * Clusters complaints located within `clusterDistanceMeters` (default: 400m).
 * Only clusters with >= minReports (default: 2) are surfaced as hotspots.
 */
export function calculateReportedHotspots(
  complaints: Complaint[],
  clusterDistanceMeters: number = 400,
  minReports: number = 2
): HotspotCluster[] {
  // 1. Filter only complaints with valid coordinates
  const validComplaints = complaints.filter(
    (c) => isValidCoordinate(c.latitude, c.longitude)
  );

  if (validComplaints.length < minReports) {
    return [];
  }

  const visited = new Set<string>();
  const clusters: HotspotCluster[] = [];

  for (let i = 0; i < validComplaints.length; i++) {
    const root = validComplaints[i];
    if (visited.has(root.id)) continue;

    const group: Complaint[] = [root];
    visited.add(root.id);

    for (let j = i + 1; j < validComplaints.length; j++) {
      const candidate = validComplaints[j];
      if (visited.has(candidate.id)) continue;

      const dist = calculateHaversineDistanceMeters(
        Number(root.latitude),
        Number(root.longitude),
        Number(candidate.latitude),
        Number(candidate.longitude)
      );

      if (dist <= clusterDistanceMeters) {
        group.push(candidate);
        visited.add(candidate.id);
      }
    }

    // Only surface as hotspot if threshold count is reached
    if (group.length >= minReports) {
      // Compute center
      const avgLat =
        group.reduce((acc, c) => acc + Number(c.latitude), 0) / group.length;
      const avgLng =
        group.reduce((acc, c) => acc + Number(c.longitude), 0) / group.length;

      // Category frequency
      const catCounts: Record<string, number> = {};
      let dominantCategory: ComplaintCategory = group[0].category;
      let maxCatCount = 0;

      // Severity counts
      const severityCounts = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      };

      let highestSeverity: ComplaintSeverity = 'low';
      const severityRank: Record<string, number> = {
        critical: 4,
        high: 3,
        medium: 2,
        low: 1,
      };

      for (const c of group) {
        // Category count
        catCounts[c.category] = (catCounts[c.category] || 0) + 1;
        if (catCounts[c.category] > maxCatCount) {
          maxCatCount = catCounts[c.category];
          dominantCategory = c.category;
        }

        // Severity count
        const sevKey = (c.severity || 'medium').toLowerCase() as keyof typeof severityCounts;
        if (severityCounts[sevKey] !== undefined) {
          severityCounts[sevKey]++;
        }

        if ((severityRank[sevKey] || 0) > (severityRank[highestSeverity] || 0)) {
          highestSeverity = sevKey as ComplaintSeverity;
        }
      }

      // Compute radius
      let maxDistFromCenter = 0;
      for (const c of group) {
        const d = calculateHaversineDistanceMeters(
          avgLat,
          avgLng,
          Number(c.latitude),
          Number(c.longitude)
        );
        if (d > maxDistFromCenter) {
          maxDistFromCenter = d;
        }
      }

      const radiusMeters = Math.max(120, Math.min(600, maxDistFromCenter + 50));

      clusters.push({
        id: `hotspot-${clusters.length + 1}`,
        center: [avgLat, avgLng],
        radiusMeters,
        complaintCount: group.length,
        complaintIds: group.map((c) => c.id),
        dominantCategory,
        highestSeverity,
        severityCounts,
      });
    }
  }

  // Sort by highest report count descending
  return clusters.sort((a, b) => b.complaintCount - a.complaintCount);
}
