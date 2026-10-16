import { SupabaseClient } from '@supabase/supabase-js';
import {
  AnalyticsDateRange,
  AnalyticsFilterState,
  SummaryMetrics,
  CategoryMetric,
  StatusMetric,
  SeverityMetric,
  TimelineTrendPoint,
  DepartmentWorkloadMetric,
  SanitizedAnalyticsRecord,
} from './types';
import { Department } from '@/types';

export const ACTIVE_STATUSES = [
  'submitted',
  'under_review',
  'assigned',
  'in_progress',
  'needs_information',
] as const;

export const STANDARD_CATEGORIES: { key: string; label: string }[] = [
  { key: 'pothole', label: 'Pothole' },
  { key: 'garbage', label: 'Garbage' },
  { key: 'water_leakage', label: 'Water Leakage' },
  { key: 'drainage', label: 'Drainage' },
  { key: 'streetlight', label: 'Streetlight' },
  { key: 'footpath', label: 'Footpath' },
  { key: 'open_manhole', label: 'Open Manhole' },
  { key: 'other', label: 'Other' },
];

export const STANDARD_STATUSES: {
  key: string;
  label: string;
  description: string;
  color: string;
}[] = [
  {
    key: 'submitted',
    label: 'Submitted',
    description: 'New complaints queued for verification',
    color: '#38bdf8', // sky-400
  },
  {
    key: 'under_review',
    label: 'Under Review',
    description: 'Under investigation and assessment',
    color: '#fbbf24', // amber-400
  },
  {
    key: 'assigned',
    label: 'Assigned',
    description: 'Dispatched to municipal department or inspector',
    color: '#818cf8', // indigo-400
  },
  {
    key: 'in_progress',
    label: 'In Progress',
    description: 'Work crews and operations actively deployed',
    color: '#fb923c', // orange-400
  },
  {
    key: 'resolved',
    label: 'Resolved',
    description: 'Field resolution inspected and completed',
    color: '#34d399', // emerald-400
  },
  {
    key: 'rejected',
    label: 'Rejected',
    description: 'Deemed out-of-scope, invalid, or duplicate',
    color: '#f87171', // red-400
  },
  {
    key: 'needs_information',
    label: 'Needs Information',
    description: 'Awaiting additional citizen details/landmarks',
    color: '#c084fc', // purple-400
  },
];

export const STANDARD_SEVERITIES: {
  key: string;
  label: string;
  color: string;
  description: string;
}[] = [
  {
    key: 'low',
    label: 'Low',
    color: '#94a3b8', // slate-400
    description: 'Minor civic nuisance without immediate hazard',
  },
  {
    key: 'medium',
    label: 'Medium',
    color: '#38bdf8', // sky-400
    description: 'Standard civic defect requiring scheduled repair',
  },
  {
    key: 'high',
    label: 'High',
    color: '#fb923c', // orange-400
    description: 'Significant public disruption or potential risk',
  },
  {
    key: 'critical',
    label: 'Critical',
    color: '#f43f5e', // rose-500
    description: 'Urgent hazard requiring immediate operational dispatch',
  },
];

/**
 * Normalizes category string to standard key
 */
export function normalizeCategoryKey(raw?: string | null): string {
  if (!raw) return 'other';
  const clean = raw.toLowerCase().trim().replace(/[\s-]+/g, '_');
  const found = STANDARD_CATEGORIES.find((c) => c.key === clean);
  return found ? found.key : 'other';
}

/**
 * Normalizes status string to standard key
 */
export function normalizeStatusKey(raw?: string | null): string {
  if (!raw) return 'submitted';
  const clean = raw.toLowerCase().trim().replace(/[\s-]+/g, '_');
  const found = STANDARD_STATUSES.find((s) => s.key === clean);
  return found ? found.key : clean;
}

/**
 * Normalizes severity string to standard key
 */
export function normalizeSeverityKey(raw?: string | null): string {
  if (!raw) return 'medium';
  const clean = raw.toLowerCase().trim();
  const found = STANDARD_SEVERITIES.find((s) => s.key === clean);
  return found ? found.key : 'medium';
}

/**
 * Fetches all complaints in batched queries to prevent silent 1000-row clipping,
 * selecting ONLY sanitized operational columns (no citizen personal phone or email).
 */
export async function fetchAllSanitizedComplaints(
  supabase: SupabaseClient
): Promise<{ records: SanitizedAnalyticsRecord[]; error: string | null }> {
  try {
    const allRecords: SanitizedAnalyticsRecord[] = [];
    const pageSize = 1000;
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('complaints')
        .select('id, complaint_number, title, category, severity, status, department_id, created_at, resolved_at')
        .order('created_at', { ascending: false })
        .range(from, from + pageSize - 1);

      if (error) {
        return { records: [], error: error.message };
      }

      if (!data || data.length === 0) {
        hasMore = false;
        break;
      }

      for (const item of data) {
        allRecords.push({
          id: item.id,
          complaintNumber: item.complaint_number || String(item.id).slice(0, 8),
          title: item.title || 'Civic Complaint',
          category: normalizeCategoryKey(item.category),
          severity: normalizeSeverityKey(item.severity),
          status: normalizeStatusKey(item.status),
          departmentId: item.department_id || null,
          createdAt: item.created_at,
          resolvedAt: item.resolved_at || null,
        });
      }

      if (data.length < pageSize) {
        hasMore = false;
      } else {
        from += pageSize;
      }
    }

    return { records: allRecords, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch complaints';
    return { records: [], error: msg };
  }
}

/**
 * Filters complaint records based on shared filter state.
 */
export function applyAnalyticsFilters(
  records: SanitizedAnalyticsRecord[],
  filters: AnalyticsFilterState,
  referenceDate?: Date
): SanitizedAnalyticsRecord[] {
  const now = referenceDate || (typeof window !== 'undefined' ? new Date() : new Date('2026-10-13T00:00:00Z'));

  // 1. Calculate Date Range Bounds
  let startDate: Date | null = null;
  let endDate: Date | null = null;

  if (filters.dateRange === '7d') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0);
  } else if (filters.dateRange === '30d') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0);
  } else if (filters.dateRange === '90d') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 89, 0, 0, 0);
  } else if (filters.dateRange === 'custom') {
    if (filters.customStartDate) {
      startDate = new Date(filters.customStartDate + 'T00:00:00');
    }
    if (filters.customEndDate) {
      endDate = new Date(filters.customEndDate + 'T23:59:59');
    }
  }

  return records.filter((r) => {
    // Date filter
    if (startDate || endDate) {
      const recordDate = new Date(r.createdAt);
      if (startDate && recordDate < startDate) return false;
      if (endDate && recordDate > endDate) return false;
    }

    // Category filter
    if (filters.category !== 'all' && r.category !== filters.category) {
      return false;
    }

    // Severity filter
    if (filters.severity !== 'all' && r.severity !== filters.severity) {
      return false;
    }

    // Status filter
    if (filters.status === 'active_only') {
      if (!ACTIVE_STATUSES.includes(r.status as (typeof ACTIVE_STATUSES)[number])) {
        return false;
      }
    } else if (filters.status !== 'all' && r.status !== filters.status) {
      return false;
    }

    // Department filter
    if (filters.departmentId === 'unassigned') {
      if (r.departmentId !== null) return false;
    } else if (filters.departmentId !== 'all') {
      if (r.departmentId !== filters.departmentId) return false;
    }

    return true;
  });
}

/**
 * Calculates summary metrics accurately from current filtered records.
 */
export function calculateSummaryMetrics(records: SanitizedAnalyticsRecord[]): SummaryMetrics {
  let submittedReports = 0;
  let activeReports = 0;
  let resolvedReports = 0;
  let criticalReports = 0;

  for (const r of records) {
    if (r.status === 'submitted') {
      submittedReports++;
    }
    if (ACTIVE_STATUSES.includes(r.status as (typeof ACTIVE_STATUSES)[number])) {
      activeReports++;
    }
    if (r.status === 'resolved') {
      resolvedReports++;
    }
    if (r.severity === 'critical') {
      criticalReports++;
    }
  }

  return {
    totalReports: records.length,
    submittedReports,
    activeReports,
    resolvedReports,
    criticalReports,
  };
}

/**
 * Calculates category breakdown metrics.
 */
export function calculateCategoryBreakdown(
  records: SanitizedAnalyticsRecord[]
): CategoryMetric[] {
  const total = records.length;
  const countMap: Record<string, number> = {};

  for (const cat of STANDARD_CATEGORIES) {
    countMap[cat.key] = 0;
  }

  for (const r of records) {
    if (countMap[r.category] !== undefined) {
      countMap[r.category]++;
    } else {
      countMap['other'] = (countMap['other'] || 0) + 1;
    }
  }

  return STANDARD_CATEGORIES.map((cat) => {
    const count = countMap[cat.key] || 0;
    const percentage = total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0;
    return {
      categoryKey: cat.key,
      label: cat.label,
      count,
      percentage,
    };
  }).sort((a, b) => b.count - a.count);
}

/**
 * Calculates status distribution across all 7 statuses, clearly showing zero-counts.
 */
export function calculateStatusDistribution(
  records: SanitizedAnalyticsRecord[]
): StatusMetric[] {
  const countMap: Record<string, number> = {};

  for (const s of STANDARD_STATUSES) {
    countMap[s.key] = 0;
  }

  for (const r of records) {
    if (countMap[r.status] !== undefined) {
      countMap[r.status]++;
    }
  }

  return STANDARD_STATUSES.map((s) => ({
    statusKey: s.key,
    label: s.label,
    count: countMap[s.key] || 0,
    description: s.description,
    color: s.color,
  }));
}

/**
 * Calculates severity breakdown across low, medium, high, critical.
 */
export function calculateSeverityBreakdown(
  records: SanitizedAnalyticsRecord[]
): SeverityMetric[] {
  const countMap: Record<string, number> = {};

  for (const sev of STANDARD_SEVERITIES) {
    countMap[sev.key] = 0;
  }

  for (const r of records) {
    if (countMap[r.severity] !== undefined) {
      countMap[r.severity]++;
    }
  }

  return STANDARD_SEVERITIES.map((sev) => ({
    severityKey: sev.key,
    label: sev.label,
    count: countMap[sev.key] || 0,
    color: sev.color,
    description: sev.description,
  }));
}

/**
 * Groups submissions over time by calendar day.
 * Days within the range with no submissions are explicitly populated with count: 0.
 */
export function calculateTimelineTrends(
  records: SanitizedAnalyticsRecord[],
  dateRange: AnalyticsDateRange,
  customStartDate?: string,
  customEndDate?: string,
  referenceDate?: Date
): TimelineTrendPoint[] {
  const now = referenceDate || (typeof window !== 'undefined' ? new Date() : new Date('2026-10-13T00:00:00Z'));
  let daysCount = 30;

  if (dateRange === '7d') daysCount = 7;
  else if (dateRange === '30d') daysCount = 30;
  else if (dateRange === '90d') daysCount = 90;

  const dateList: string[] = [];

  if (dateRange === 'custom' && customStartDate && customEndDate) {
    const start = new Date(customStartDate + 'T00:00:00');
    const end = new Date(customEndDate + 'T00:00:00');
    const curr = new Date(start);
    while (curr <= end && dateList.length < 180) {
      dateList.push(curr.toISOString().slice(0, 10));
      curr.setDate(curr.getDate() + 1);
    }
  } else if (dateRange === 'all') {
    if (records.length === 0) {
      // Default to last 7 days if empty
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        dateList.push(d.toISOString().slice(0, 10));
      }
    } else {
      // Find oldest and newest record
      let minTimestamp = Infinity;
      let maxTimestamp = -Infinity;
      for (const r of records) {
        const t = new Date(r.createdAt).getTime();
        if (t < minTimestamp) minTimestamp = t;
        if (t > maxTimestamp) maxTimestamp = t;
      }
      const start = new Date(minTimestamp);
      const end = new Date(Math.max(maxTimestamp, Date.now()));
      const curr = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      while (curr <= end && dateList.length < 365) {
        dateList.push(curr.toISOString().slice(0, 10));
        curr.setDate(curr.getDate() + 1);
      }
    }
  } else {
    // 7d, 30d, 90d
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      dateList.push(d.toISOString().slice(0, 10));
    }
  }

  // Count reports per calendar day
  const countsPerDay: Record<string, number> = {};
  for (const dateKey of dateList) {
    countsPerDay[dateKey] = 0;
  }

  for (const r of records) {
    const day = r.createdAt.slice(0, 10);
    if (countsPerDay[day] !== undefined) {
      countsPerDay[day]++;
    }
  }

  return dateList.map((day) => {
    const d = new Date(day + 'T00:00:00');
    const displayDate = new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
    }).format(d);

    return {
      dateKey: day,
      displayDate,
      count: countsPerDay[day] || 0,
    };
  });
}

/**
 * Calculates workload metrics per department, including Unassigned complaints.
 */
export function calculateDepartmentWorkloads(
  records: SanitizedAnalyticsRecord[],
  departments: Department[]
): DepartmentWorkloadMetric[] {
  const deptMap = new Map<string, string>();
  departments.forEach((d) => deptMap.set(d.id, d.name));

  const statsMap = new Map<
    string,
    { name: string; assignedCount: number; activeCount: number; resolvedCount: number }
  >();

  // Initialize all official departments
  departments.forEach((d) => {
    statsMap.set(d.id, {
      name: d.name,
      assignedCount: 0,
      activeCount: 0,
      resolvedCount: 0,
    });
  });

  // Initialize Unassigned category
  statsMap.set('unassigned', {
    name: 'Unassigned',
    assignedCount: 0,
    activeCount: 0,
    resolvedCount: 0,
  });

  for (const r of records) {
    const key = r.departmentId || 'unassigned';
    let entry = statsMap.get(key);
    if (!entry) {
      // In case department was deleted or unmapped
      entry = {
        name: r.departmentId ? 'Unknown Department' : 'Unassigned',
        assignedCount: 0,
        activeCount: 0,
        resolvedCount: 0,
      };
      statsMap.set(key, entry);
    }

    entry.assignedCount++;

    if (ACTIVE_STATUSES.includes(r.status as (typeof ACTIVE_STATUSES)[number])) {
      entry.activeCount++;
    }
    if (r.status === 'resolved') {
      entry.resolvedCount++;
    }
  }

  const results: DepartmentWorkloadMetric[] = [];
  statsMap.forEach((val, id) => {
    results.push({
      departmentId: id,
      departmentName: val.name,
      assignedCount: val.assignedCount,
      activeCount: val.activeCount,
      resolvedCount: val.resolvedCount,
    });
  });

  // Sort by active workload descending, keeping Unassigned visible
  return results.sort((a, b) => {
    if (a.departmentId === 'unassigned') return -1;
    if (b.departmentId === 'unassigned') return 1;
    return b.activeCount - a.activeCount;
  });
}

/**
 * Generates an escaped CSV file content from sanitized analytics complaints.
 * Excludes personal citizen contacts.
 */
export function generateAnalyticsCSV(
  records: SanitizedAnalyticsRecord[],
  departments: Department[]
): string {
  const deptMap = new Map<string, string>();
  departments.forEach((d) => deptMap.set(d.id, d.name));

  const headers = [
    'Complaint Number',
    'Title',
    'Category',
    'Severity',
    'Status',
    'Department',
    'Created At',
    'Resolved At',
  ];

  const escapeField = (val?: string | null): string => {
    if (val === null || val === undefined) return '""';
    const clean = String(val).replace(/"/g, '""');
    return `"${clean}"`;
  };

  const rows = records.map((r) => {
    const deptName = r.departmentId ? deptMap.get(r.departmentId) || 'Assigned Department' : 'Unassigned';
    return [
      escapeField(r.complaintNumber),
      escapeField(r.title),
      escapeField(STANDARD_CATEGORIES.find((c) => c.key === r.category)?.label || r.category),
      escapeField(r.severity.toUpperCase()),
      escapeField(STANDARD_STATUSES.find((s) => s.key === r.status)?.label || r.status),
      escapeField(deptName),
      escapeField(r.createdAt),
      escapeField(r.resolvedAt || 'N/A'),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\r\n');
}
