'use server';

import { createClient } from '@/lib/supabase/server';
import { query } from '@/lib/db';
import {
  FindRelatedInput,
  JoinedRelatedReport,
} from '@/lib/ai/types';
import {
  detectAndSaveRelatedReports,
  getRelatedReportsForComplaint,
  updateRelatedReportReviewed,
} from '@/lib/ai/relatedService';

/**
 * Server action to trigger related-report detection for a complaint.
 * Non-blocking: requires an authenticated session.
 */
export async function triggerRelatedReportsAction(
  complaintId: string,
  targetInput?: FindRelatedInput
): Promise<{ success: boolean; matchesCount: number; error: string | null }> {
  try {
    if (!complaintId) {
      return { success: false, matchesCount: 0, error: 'Complaint ID is required' };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, matchesCount: 0, error: 'Unauthorized: Active session required' };
    }

    let input = targetInput;
    if (!input) {
      const res = await query<FindRelatedInput>(
        `SELECT id, title, description, category, address, latitude, longitude 
         FROM public.complaints 
         WHERE id = $1;`,
        [complaintId]
      );
      if (res.rows.length === 0) {
        return { success: false, matchesCount: 0, error: 'Complaint not found' };
      }
      input = res.rows[0];
    }

    const result = await detectAndSaveRelatedReports(input);
    return {
      success: result.success,
      matchesCount: result.matchesCount,
      error: result.error,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Related reports detection failed';
    console.warn(`[Related-Action] Non-blocking server action error:`, msg);
    return {
      success: false,
      matchesCount: 0,
      error: msg,
    };
  }
}

/**
 * Server action to fetch existing related report linkages with complaint metadata for official view.
 * Strictly restricted to authenticated officials and administrators.
 */
export async function fetchRelatedReportsAction(
  complaintId: string
): Promise<{ reports: JoinedRelatedReport[]; error: string | null }> {
  try {
    if (!complaintId) {
      return { reports: [], error: 'Complaint ID is required' };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { reports: [], error: 'Unauthorized: Active session required' };
    }

    const profileRes = await query<{ role: string }>(
      `SELECT role FROM public.profiles WHERE id = $1`,
      [user.id]
    );
    const userRole = profileRes.rows[0]?.role;
    if (userRole !== 'official' && userRole !== 'admin') {
      return { reports: [], error: 'Forbidden: Only civic officials may view related reports' };
    }

    return await getRelatedReportsForComplaint(complaintId);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch related reports';
    return { reports: [], error: msg };
  }
}

/**
 * Server action for officials/admins to mark a related report as reviewed.
 * Strictly restricted to authenticated officials and administrators.
 */
export async function markRelatedReportReviewedAction(
  reportId: string,
  reviewed: boolean
): Promise<{ success: boolean; error: string | null }> {
  try {
    if (!reportId) {
      return { success: false, error: 'Report ID is required' };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Unauthorized: Active session required' };
    }

    const profileRes = await query<{ role: string }>(
      `SELECT role FROM public.profiles WHERE id = $1`,
      [user.id]
    );
    const userRole = profileRes.rows[0]?.role;
    if (userRole !== 'official' && userRole !== 'admin') {
      return { success: false, error: 'Forbidden: Only civic officials may review related reports' };
    }

    return await updateRelatedReportReviewed(reportId, reviewed);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update review status';
    return { success: false, error: msg };
  }
}
