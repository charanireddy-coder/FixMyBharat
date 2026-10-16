import { query } from '@/lib/db';
import {
  FindRelatedInput,
  RelatedReportCandidate,
  JoinedRelatedReport,
  StoredRelatedReport,
} from './types';
import { findRelatedComplaints } from './similarity';

/**
 * Fetches pre-filtered candidates from database to avoid unbounded comparisons.
 * Excludes self (target.id) and rejected complaints.
 */
export async function fetchComplaintCandidates(
  target: FindRelatedInput
): Promise<FindRelatedInput[]> {
  try {
    // Pre-filtering: match same category, or within ~5-10km lat/lng window, or recent open complaints
    let candidateQuery = `
      SELECT id, title, description, category, address, latitude, longitude
      FROM public.complaints
      WHERE id <> $1
        AND status NOT IN ('rejected')
    `;
    const params: (string | number)[] = [target.id];

    if (
      target.latitude !== null &&
      target.latitude !== undefined &&
      target.longitude !== null &&
      target.longitude !== undefined
    ) {
      // Bounding box filter ~0.1 deg (~11km)
      params.push(target.category, Number(target.latitude), Number(target.longitude));
      candidateQuery += `
        AND (
          category = $2
          OR (
            latitude IS NOT NULL 
            AND longitude IS NOT NULL 
            AND ABS(latitude - $3) < 0.1 
            AND ABS(longitude - $4) < 0.1
          )
        )
      `;
    } else {
      params.push(target.category);
      candidateQuery += `
        AND (category = $2 OR address IS NOT NULL)
      `;
    }

    candidateQuery += `
      ORDER BY created_at DESC
      LIMIT 60;
    `;

    const res = await query<FindRelatedInput>(candidateQuery, params);
    return res.rows || [];
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error fetching candidates';
    console.warn(`[Related-Service] Candidate pre-fetch error:`, msg);
    return [];
  }
}

/**
 * Detects and saves related/duplicate reports into public.related_reports.
 * Guaranteed non-blocking: never throws to caller.
 */
export async function detectAndSaveRelatedReports(
  target: FindRelatedInput
): Promise<{
  success: boolean;
  matchesCount: number;
  matches: RelatedReportCandidate[];
  error: string | null;
}> {
  try {
    if (!target.id) {
      return { success: false, matchesCount: 0, matches: [], error: 'Target ID is required' };
    }

    // 1. Fetch filtered candidate pool
    const candidates = await fetchComplaintCandidates(target);
    if (candidates.length === 0) {
      return { success: true, matchesCount: 0, matches: [], error: null };
    }

    // 2. Run deterministic similarity detection
    const qualifyingMatches = findRelatedComplaints(target, candidates);

    // 3. Persist qualifying matches (score >= 0.40) into public.related_reports
    let savedCount = 0;
    for (const match of qualifyingMatches) {
      try {
        await query(
          `INSERT INTO public.related_reports 
            (complaint_id, related_complaint_id, match_score, match_reason, reviewed)
           VALUES ($1, $2, $3, $4, false)
           ON CONFLICT (complaint_id, related_complaint_id) 
           DO UPDATE SET 
             match_score = EXCLUDED.match_score,
             match_reason = EXCLUDED.match_reason;`,
          [target.id, match.complaintId, match.matchScore, match.matchReason]
        );
        savedCount++;
      } catch (insertErr) {
        // Gracefully ignore unique constraint violations or duplicate pairs
        console.warn(`[Related-Service] Match insertion skipped for ${match.complaintId}:`, insertErr);
      }
    }

    return {
      success: true,
      matchesCount: savedCount,
      matches: qualifyingMatches,
      error: null,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to analyze related reports';
    console.warn(`[Related-Service] Non-blocking analysis notice for ${target.id}:`, msg);
    return {
      success: false,
      matchesCount: 0,
      matches: [],
      error: msg,
    };
  }
}

/**
 * Retrieves all related report linkages for a complaint (either as source or target)
 * with the related complaint joined for UI display.
 */
export async function getRelatedReportsForComplaint(
  complaintId: string
): Promise<{
  reports: JoinedRelatedReport[];
  error: string | null;
}> {
  try {
    const sql = `
      SELECT 
        rr.id,
        rr.complaint_id,
        rr.related_complaint_id,
        rr.match_score,
        rr.match_reason,
        rr.reviewed,
        rr.created_at,
        c.id AS rc_id,
        c.complaint_number AS rc_complaint_number,
        c.title AS rc_title,
        c.category AS rc_category,
        c.status AS rc_status,
        c.severity AS rc_severity,
        c.address AS rc_address,
        c.created_at AS rc_created_at
      FROM public.related_reports rr
      JOIN public.complaints c 
        ON c.id = (CASE WHEN rr.complaint_id = $1 THEN rr.related_complaint_id ELSE rr.complaint_id END)
      WHERE rr.complaint_id = $1 OR rr.related_complaint_id = $1
      ORDER BY rr.match_score DESC NULLS LAST, rr.created_at DESC;
    `;

    interface JoinedDbRow extends StoredRelatedReport {
      rc_id: string;
      rc_complaint_number: string;
      rc_title: string;
      rc_category: string;
      rc_status: string;
      rc_severity: string;
      rc_address: string | null;
      rc_created_at: string;
    }

    const res = await query<JoinedDbRow>(sql, [complaintId]);

    const reports: JoinedRelatedReport[] = (res.rows || []).map((row) => ({
      id: row.id,
      complaint_id: row.complaint_id,
      related_complaint_id: row.related_complaint_id,
      match_score: row.match_score,
      match_reason: row.match_reason,
      reviewed: row.reviewed,
      created_at: row.created_at,
      related_complaint: {
        id: row.rc_id,
        complaint_number: row.rc_complaint_number,
        title: row.rc_title,
        category: row.rc_category,
        status: row.rc_status,
        severity: row.rc_severity,
        address: row.rc_address,
        created_at: row.rc_created_at,
      },
    }));

    return { reports, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error fetching related reports';
    console.warn(`[Related-Service] Fetch error for ${complaintId}:`, msg);
    return { reports: [], error: msg };
  }
}

/**
 * Updates the reviewed status on a related_reports record.
 */
export async function updateRelatedReportReviewed(
  reportId: string,
  reviewed: boolean
): Promise<{ success: boolean; error: string | null }> {
  try {
    const res = await query(
      `UPDATE public.related_reports 
       SET reviewed = $1 
       WHERE id = $2 
       RETURNING id;`,
      [reviewed, reportId]
    );

    if (res.rowCount === 0) {
      return { success: false, error: 'Related report record not found' };
    }

    return { success: true, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update review status';
    return { success: false, error: msg };
  }
}
