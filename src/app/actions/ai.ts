'use server';

import { createClient } from '@/lib/supabase/server';
import { query } from '@/lib/db';
import {
  AnalysisInput,
  AnalysisResult,
  StoredAIAnalysis,
} from '@/lib/ai/types';
import {
  runAndSaveComplaintAnalysis,
  getLatestComplaintAnalysis,
  getComplaintAnalysisHistory,
} from '@/lib/ai/service';

/**
 * Server action to run rules analysis on a complaint and store it in public.ai_analysis.
 * Fully non-blocking: requires authenticated session, safe against unauthenticated execution.
 */
export async function triggerComplaintAnalysisAction(
  complaintId: string,
  input: AnalysisInput
): Promise<{ success: boolean; result: AnalysisResult | null; error: string | null }> {
  try {
    if (!complaintId) {
      return { success: false, result: null, error: 'Complaint ID is required' };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, result: null, error: 'Unauthorized: Active session required' };
    }

    const res = await runAndSaveComplaintAnalysis(complaintId, input);
    return {
      success: res.success,
      result: res.result,
      error: res.error,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Analysis failed unexpectedly';
    console.warn(`[AI-Action] Non-blocking server action error:`, msg);
    return {
      success: false,
      result: null,
      error: msg,
    };
  }
}

/**
 * Server action to fetch existing AI analysis for an authorized official/admin workspace
 * or the citizen who reported the complaint.
 */
export async function fetchComplaintAnalysisAction(
  complaintId: string
): Promise<{
  latest: StoredAIAnalysis | null;
  history: StoredAIAnalysis[];
  error: string | null;
}> {
  try {
    if (!complaintId) {
      return { latest: null, history: [], error: 'Complaint ID is required' };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { latest: null, history: [], error: 'Unauthorized: Active session required' };
    }

    // Role check: Only officials, admins, or complaint owner can read AI analysis
    const profileRes = await query<{ role: string }>(
      `SELECT role FROM public.profiles WHERE id = $1`,
      [user.id]
    );
    const userRole = profileRes.rows[0]?.role;
    const isOfficial = userRole === 'official' || userRole === 'admin';

    if (!isOfficial) {
      const ownerRes = await query<{ user_id: string }>(
        `SELECT user_id FROM public.complaints WHERE id = $1`,
        [complaintId]
      );
      if (ownerRes.rows.length === 0 || ownerRes.rows[0].user_id !== user.id) {
        return { latest: null, history: [], error: 'Forbidden: Insufficient privileges' };
      }
    }

    const [latestRes, historyRes] = await Promise.all([
      getLatestComplaintAnalysis(complaintId),
      getComplaintAnalysisHistory(complaintId),
    ]);

    return {
      latest: latestRes.analysis,
      history: historyRes.history,
      error: latestRes.error || historyRes.error,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch AI analysis';
    return {
      latest: null,
      history: [],
      error: msg,
    };
  }
}
