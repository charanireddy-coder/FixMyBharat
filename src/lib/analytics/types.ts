export type AnalyticsDateRange = '7d' | '30d' | '90d' | 'all' | 'custom';

export interface AnalyticsFilterState {
  dateRange: AnalyticsDateRange;
  customStartDate?: string;
  customEndDate?: string;
  category: string; // 'all' or specific category
  severity: string; // 'all' or specific severity
  status: string; // 'all' or 'active_only' or specific status
  departmentId: string; // 'all' or 'unassigned' or specific department UUID
}

export interface SummaryMetrics {
  totalReports: number;
  submittedReports: number;
  activeReports: number; // submitted, under_review, assigned, in_progress, needs_information
  resolvedReports: number; // resolved
  criticalReports: number; // severity === 'critical'
}

export interface CategoryMetric {
  categoryKey: string;
  label: string;
  count: number;
  percentage: number;
}

export interface StatusMetric {
  statusKey: string;
  label: string;
  count: number;
  description: string;
  color: string;
}

export interface SeverityMetric {
  severityKey: string;
  label: string;
  count: number;
  color: string;
  description: string;
}

export interface TimelineTrendPoint {
  dateKey: string; // YYYY-MM-DD
  displayDate: string; // e.g. "12 Oct" or "12/10"
  count: number;
}

export interface DepartmentWorkloadMetric {
  departmentId: string;
  departmentName: string;
  assignedCount: number;
  activeCount: number;
  resolvedCount: number;
}

export interface SanitizedAnalyticsRecord {
  id: string;
  complaintNumber: string;
  title: string;
  category: string;
  severity: string;
  status: string;
  departmentId: string | null;
  createdAt: string;
  resolvedAt: string | null;
}
