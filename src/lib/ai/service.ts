import { query } from '@/lib/db';
import { AnalysisInput, AnalysisResult, StoredAIAnalysis } from './types';
import { analyzeComplaint } from './analyzeComplaint';

/**
 * Saves a structured AI analysis result into public.ai_analysis.
 * Server-side only via connection pooler.
 */
export async function saveComplaintAnalysis(
  complaintId: string,
  analysis: AnalysisResult
): Promise<{ success: boolean; data: StoredAIAnalysis | null; error: string | null }> {
  try {
    const res = await query<StoredAIAnalysis>(
      `INSERT INTO public.ai_analysis 
        (complaint_id, model_name, predicted_category, confidence, severity_score, explanation, analysis_source)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *;`,
      [
        complaintId,
        analysis.modelName,
        analysis.predictedCategory,
        analysis.confidence,
        analysis.severityScore,
        analysis.explanation,
        analysis.analysisSource,
      ]
    );

    return {
      success: true,
      data: res.rows[0] || null,
      error: null,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to save AI analysis';
    // Non-blocking error handling: log safely without breaking primary civic workflows
    console.warn(`[AI-Service] Analysis persistence failed for complaint ${complaintId}:`, msg);
    return {
      success: false,
      data: null,
      error: msg,
    };
  }
}

/**
 * Retrieves the latest AI analysis for a complaint.
 */
export async function getLatestComplaintAnalysis(
  complaintId: string
): Promise<{ analysis: StoredAIAnalysis | null; error: string | null }> {
  try {
    const res = await query<StoredAIAnalysis>(
      `SELECT * FROM public.ai_analysis 
       WHERE complaint_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1;`,
      [complaintId]
    );

    return {
      analysis: res.rows[0] || null,
      error: null,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to retrieve analysis';
    return { analysis: null, error: msg };
  }
}

/**
 * Retrieves the historical analysis records for a complaint.
 */
export async function getComplaintAnalysisHistory(
  complaintId: string
): Promise<{ history: StoredAIAnalysis[]; error: string | null }> {
  try {
    const res = await query<StoredAIAnalysis>(
      `SELECT * FROM public.ai_analysis 
       WHERE complaint_id = $1 
       ORDER BY created_at DESC;`,
      [complaintId]
    );

    return {
      history: res.rows || [],
      error: null,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to retrieve analysis history';
    return { history: [], error: msg };
  }
}

/**
 * Non-blocking end-to-end execution: Runs rules analysis and persists to database.
 */
export async function runAndSaveComplaintAnalysis(
  complaintId: string,
  input: AnalysisInput
): Promise<{ success: boolean; result: AnalysisResult; error: string | null }> {
  // 1. Run deterministic rules analysis
  const result = analyzeComplaint(input);

  // 2. Persist analysis non-blockingly
  try {
    await saveComplaintAnalysis(complaintId, result);
    return { success: true, result, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error storing analysis';
    console.warn(`[AI-Service] Non-blocking analysis error for ${complaintId}:`, msg);
    return { success: false, result, error: msg };
  }
}
