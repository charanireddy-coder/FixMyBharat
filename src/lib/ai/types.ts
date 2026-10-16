import { ComplaintCategory, ComplaintSeverity } from '@/types';

export type AnalysisSource = 'demo' | 'rules' | 'model';

export interface AnalysisInput {
  title: string;
  description: string;
  category?: string | null;
  address?: string | null;
}

export interface AnalysisResult {
  predictedCategory: ComplaintCategory;
  confidence: number; // 0.0 to 1.0
  severityScore: number; // 0 to 100
  severity: ComplaintSeverity;
  explanation: string;
  analysisSource: AnalysisSource;
  modelName: string;
  matchedCategorySignals: string[];
  matchedSeveritySignals: string[];
}

export interface ComplaintAnalyzer {
  analyze(input: AnalysisInput): Promise<AnalysisResult> | AnalysisResult;
}

export interface StoredAIAnalysis {
  id: string;
  complaint_id: string;
  model_name: string | null;
  predicted_category: string | null;
  confidence: number | null;
  severity_score: number | null;
  explanation: string | null;
  analysis_source: string;
  created_at: string;
}

// ----------------------------------------------------
// STEP 7: DUPLICATE & RELATED REPORTS INTELLIGENCE
// ----------------------------------------------------

export type MatchLevel = 'possible_duplicate' | 'likely_related' | 'weak_relationship';

export interface FindRelatedInput {
  id: string;
  title: string;
  description: string;
  category: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface SimilarityBreakdown {
  categoryScore: number; // 0 to 1
  textScore: number;     // 0 to 1
  locationScore: number; // 0 to 1
  addressScore: number;  // 0 to 1
  distanceMeters?: number | null;
}

export interface RelatedReportCandidate {
  complaintId: string;
  matchScore: number; // 0.0 to 1.0
  matchLevel: MatchLevel;
  matchReason: string;
  breakdown: SimilarityBreakdown;
}

export interface RelatedReportDetector {
  findRelatedReports(
    target: FindRelatedInput,
    candidates: FindRelatedInput[]
  ): Promise<RelatedReportCandidate[]> | RelatedReportCandidate[];
}

export interface StoredRelatedReport {
  id: string;
  complaint_id: string;
  related_complaint_id: string;
  match_score: number | null;
  match_reason: string | null;
  reviewed: boolean;
  created_at: string;
}

export interface JoinedRelatedReport extends StoredRelatedReport {
  related_complaint?: {
    id: string;
    complaint_number: string;
    title: string;
    category: string;
    status: string;
    severity: string;
    address: string | null;
    created_at: string;
  };
}

