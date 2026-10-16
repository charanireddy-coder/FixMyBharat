import {
  FindRelatedInput,
  RelatedReportCandidate,
  MatchLevel,
  SimilarityBreakdown,
  RelatedReportDetector,
} from './types';

export const SIMILARITY_WEIGHTS = {
  category: 0.20,
  text: 0.40,
  location: 0.30,
  address: 0.10,
} as const;

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'has', 'have', 'had', 'in', 'is', 'it', 'its', 'not', 'of', 'on',
  'or', 'that', 'the', 'this', 'to', 'was', 'were', 'will', 'with',
  'there', 'been', 'about', 'into', 'over', 'after', 'under', 'our',
]);

/**
 * Normalizes text by lowercasing, stripping punctuation, and filtering common stopwords.
 */
export function extractMeaningfulTokens(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

/**
 * Computes Jaccard similarity coefficient between two token sets.
 * J(A, B) = |A ∩ B| / |A ∪ B|
 */
export function computeJaccardSimilarity(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);

  let intersectionCount = 0;
  for (const token of setA) {
    if (setB.has(token)) {
      intersectionCount++;
    }
  }

  const unionCount = new Set([...setA, ...setB]).size;
  if (unionCount === 0) return 0;

  return intersectionCount / unionCount;
}

/**
 * Calculates standard geographic distance in meters using the Haversine formula.
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's mean radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Maps geographic distance in meters to a transparent 0.0 - 1.0 location score.
 * < 50m: 1.0 (very close)
 * 50-150m: 0.8 (close)
 * 150-300m: 0.5 (possibly related)
 * 300-600m: 0.25 (vicinity)
 * > 600m: 0.0 (unrelated)
 */
export function distanceToLocationScore(distanceMeters: number): number {
  if (distanceMeters < 50) return 1.0;
  if (distanceMeters < 150) return 0.8;
  if (distanceMeters < 300) return 0.5;
  if (distanceMeters < 600) return 0.25;
  return 0.0;
}

/**
 * Calculates category similarity.
 * Same category = 1.0
 * Related categories (drainage & water_leakage, or pothole & footpath) = 0.35
 * Unrelated = 0.0
 */
export function computeCategoryScore(catA: string, catB: string): number {
  const a = catA.toLowerCase().replace(/[\s-]+/g, '_');
  const b = catB.toLowerCase().replace(/[\s-]+/g, '_');
  if (a === b) return 1.0;

  const relatedPairs = [
    new Set(['drainage', 'water_leakage']),
    new Set(['pothole', 'footpath']),
    new Set(['open_manhole', 'drainage']),
    new Set(['open_manhole', 'pothole']),
  ];

  for (const pair of relatedPairs) {
    if (pair.has(a) && pair.has(b)) {
      return 0.35;
    }
  }

  return 0.0;
}

/**
 * Calculates address similarity via token overlap of non-generic location tokens.
 */
export function computeAddressScore(addrA?: string | null, addrB?: string | null): number {
  if (!addrA || !addrB) return 0;
  const tokensA = extractMeaningfulTokens(addrA);
  const tokensB = extractMeaningfulTokens(addrB);
  return computeJaccardSimilarity(tokensA, tokensB);
}

/**
 * Maps numeric match score (0-1) to discrete MatchLevel.
 */
export function scoreToMatchLevel(score: number): MatchLevel {
  if (score >= 0.80) return 'possible_duplicate';
  if (score >= 0.60) return 'likely_related';
  return 'weak_relationship';
}

/**
 * Formulates a human-readable match explanation reflecting the actual signals.
 */
export function generateMatchReason(
  breakdown: SimilarityBreakdown,
  categoryMatches: boolean,
  distanceMeters?: number | null
): string {
  const parts: string[] = [];

  if (categoryMatches) {
    parts.push('Same category');
  }

  if (distanceMeters !== undefined && distanceMeters !== null) {
    if (distanceMeters < 50) {
      parts.push(`very close location (${distanceMeters}m away)`);
    } else if (distanceMeters < 150) {
      parts.push(`nearby location (${distanceMeters}m away)`);
    } else if (distanceMeters < 300) {
      parts.push(`same vicinity (${distanceMeters}m away)`);
    }
  } else if (breakdown.addressScore >= 0.35) {
    parts.push('matching address signals');
  }

  if (breakdown.textScore >= 0.5) {
    parts.push('strong text similarity in description');
  } else if (breakdown.textScore >= 0.25) {
    parts.push('similar issue description');
  }

  if (parts.length === 0) {
    return 'Moderate overall civic feature overlap.';
  }

  // Capitalize first letter and format into fluent sentence
  const sentence = parts.join(', ');
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.';
}

/**
 * Compares a target complaint with a single candidate complaint and produces a candidate match.
 */
export function compareComplaints(
  target: FindRelatedInput,
  candidate: FindRelatedInput
): RelatedReportCandidate | null {
  // 1. Guard against self-matching (Part 13)
  if (target.id === candidate.id) {
    return null;
  }

  // 2. Category signal (weight: 0.20)
  const categoryScore = computeCategoryScore(target.category, candidate.category);
  const isExactCategory = target.category.toLowerCase() === candidate.category.toLowerCase();

  // 3. Text signal (weight: 0.40)
  const targetTokens = extractMeaningfulTokens(`${target.title} ${target.description}`);
  const candidateTokens = extractMeaningfulTokens(`${candidate.title} ${candidate.description}`);
  const textScore = computeJaccardSimilarity(targetTokens, candidateTokens);

  // Extra boost if title tokens specifically overlap strongly
  const targetTitleTokens = extractMeaningfulTokens(target.title);
  const candidateTitleTokens = extractMeaningfulTokens(candidate.title);
  const titleScore = computeJaccardSimilarity(targetTitleTokens, candidateTitleTokens);
  const effectiveTextScore = Math.min(1.0, textScore * 0.7 + titleScore * 0.3);

  // 4. Location signal (weight: 0.30)
  let locationScore = 0;
  let distanceMeters: number | null = null;
  const hasCoordinates =
    target.latitude !== null &&
    target.latitude !== undefined &&
    target.longitude !== null &&
    target.longitude !== undefined &&
    candidate.latitude !== null &&
    candidate.latitude !== undefined &&
    candidate.longitude !== null &&
    candidate.longitude !== undefined;

  if (hasCoordinates) {
    distanceMeters = calculateHaversineDistanceMeters(
      Number(target.latitude),
      Number(target.longitude),
      Number(candidate.latitude),
      Number(candidate.longitude)
    );
    locationScore = distanceToLocationScore(distanceMeters);
  }

  // 5. Address signal (weight: 0.10)
  const addressScore = computeAddressScore(target.address, candidate.address);

  // 6. Dynamic weight redistribution if coordinates are missing (Part 6)
  let totalScore: number;
  if (hasCoordinates) {
    totalScore =
      categoryScore * SIMILARITY_WEIGHTS.category +
      effectiveTextScore * SIMILARITY_WEIGHTS.text +
      locationScore * SIMILARITY_WEIGHTS.location +
      addressScore * SIMILARITY_WEIGHTS.address;
  } else {
    // Redistribute weight across category (0.2), text (0.4), address (0.1) -> sum = 0.7
    const activeWeightsSum =
      SIMILARITY_WEIGHTS.category + SIMILARITY_WEIGHTS.text + SIMILARITY_WEIGHTS.address;
    totalScore =
      (categoryScore * SIMILARITY_WEIGHTS.category +
        effectiveTextScore * SIMILARITY_WEIGHTS.text +
        addressScore * SIMILARITY_WEIGHTS.address) /
      activeWeightsSum;
  }

  // Strictly clamp between 0.0 and 1.0, rounded to 2 decimal places
  const matchScore = Math.round(Math.max(0, Math.min(1.0, totalScore)) * 100) / 100;

  // 7. Threshold cutoff (Part 9: below 0.40 -> do not create a related report)
  if (matchScore < 0.40) {
    return null;
  }

  const breakdown: SimilarityBreakdown = {
    categoryScore,
    textScore: effectiveTextScore,
    locationScore: hasCoordinates ? locationScore : 0,
    addressScore,
    distanceMeters,
  };

  const matchLevel = scoreToMatchLevel(matchScore);
  const matchReason = generateMatchReason(breakdown, isExactCategory, distanceMeters);

  return {
    complaintId: candidate.id,
    matchScore,
    matchLevel,
    matchReason,
    breakdown,
  };
}

/**
 * Default rules-based detector implementing RelatedReportDetector.
 * Designed with a clean interface for future replacement by embedding/vector models.
 */
export class RulesRelatedReportDetector implements RelatedReportDetector {
  public findRelatedReports(
    target: FindRelatedInput,
    candidates: FindRelatedInput[]
  ): RelatedReportCandidate[] {
    const results: RelatedReportCandidate[] = [];

    for (const candidate of candidates) {
      const match = compareComplaints(target, candidate);
      if (match) {
        results.push(match);
      }
    }

    // Sort descending by match score
    return results.sort((a, b) => b.matchScore - a.matchScore);
  }
}

const defaultDetector = new RulesRelatedReportDetector();

export function findRelatedComplaints(
  target: FindRelatedInput,
  candidates: FindRelatedInput[]
): RelatedReportCandidate[] {
  return defaultDetector.findRelatedReports(target, candidates);
}
