'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { OfficialNav } from '@/components/layout/OfficialNav';
import { Container } from '@/components/ui/Container';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAuth } from '@/components/providers/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import { Department } from '@/types';
import { fetchAllDepartments } from '@/lib/official';
import {
  SanitizedAnalyticsRecord,
  AnalyticsFilterState,
} from '@/lib/analytics/types';
import {
  fetchAllSanitizedComplaints,
  applyAnalyticsFilters,
  calculateSummaryMetrics,
  calculateCategoryBreakdown,
  calculateStatusDistribution,
  calculateSeverityBreakdown,
  calculateTimelineTrends,
  calculateDepartmentWorkloads,
  generateAnalyticsCSV,
} from '@/lib/analytics/service';

import { AnalyticsHeader } from '@/components/analytics/AnalyticsHeader';
import { AnalyticsSummaryCards } from '@/components/analytics/AnalyticsSummaryCards';
import { AnalyticsFilterBar } from '@/components/analytics/AnalyticsFilterBar';
import { CategoryBreakdownChart } from '@/components/analytics/CategoryBreakdownChart';
import { StatusDistributionChart } from '@/components/analytics/StatusDistributionChart';
import { SeverityBreakdownChart } from '@/components/analytics/SeverityBreakdownChart';
import { TimelineTrendChart } from '@/components/analytics/TimelineTrendChart';
import { DepartmentWorkloadChart } from '@/components/analytics/DepartmentWorkloadChart';
import { AnalyticsDocumentation } from '@/components/analytics/AnalyticsDocumentation';

function CivicIntelligenceAnalyticsContent() {
  const { user, role, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [rawRecords, setRawRecords] = useState<SanitizedAnalyticsRecord[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Lazy client timestamp initializer avoids synchronous setState in effects
  const [referenceDate, setReferenceDate] = useState<Date>(() =>
    typeof window !== 'undefined' ? new Date() : new Date('2026-10-13T00:00:00Z')
  );

  // Shared Filter State
  const [filters, setFilters] = useState<AnalyticsFilterState>({
    dateRange: '30d',
    category: 'all',
    severity: 'all',
    status: 'all',
    departmentId: 'all',
  });

  // Role Access Control: Only official or admin
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login?redirectTo=/official/analytics');
      } else if (role === 'citizen') {
        router.push('/citizen');
      }
    }
  }, [user, role, authLoading, router]);

  // Load Real Supabase Data with proper isMounted lifecycle
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const supabase = createClient();
        const [complaintsRes, deptsRes] = await Promise.all([
          fetchAllSanitizedComplaints(supabase),
          fetchAllDepartments(supabase),
        ]);

        if (!isMounted) return;

        if (complaintsRes.error) {
          setFetchError(complaintsRes.error);
        } else {
          setFetchError(null);
          setRawRecords(complaintsRes.records);
        }

        if (!deptsRes.error && deptsRes.departments) {
          setDepartments(deptsRes.departments);
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : 'Error loading analytics';
        setFetchError(msg);
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    }

    if (user && (role === 'official' || role === 'admin')) {
      loadData();
    }

    return () => {
      isMounted = false;
    };
  }, [user, role, isRefreshing]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setReferenceDate(new Date());
  };

  // Reactively calculate filtered complaints using reference timestamp
  const filteredRecords = useMemo(() => {
    return applyAnalyticsFilters(rawRecords, filters, referenceDate);
  }, [rawRecords, filters, referenceDate]);

  // Reactively compute all analytical metrics
  const summaryMetrics = useMemo(() => {
    return calculateSummaryMetrics(filteredRecords);
  }, [filteredRecords]);

  const categoryBreakdown = useMemo(() => {
    return calculateCategoryBreakdown(filteredRecords);
  }, [filteredRecords]);

  const statusDistribution = useMemo(() => {
    return calculateStatusDistribution(filteredRecords);
  }, [filteredRecords]);

  const severityBreakdown = useMemo(() => {
    return calculateSeverityBreakdown(filteredRecords);
  }, [filteredRecords]);

  const timelineTrends = useMemo(() => {
    return calculateTimelineTrends(
      filteredRecords,
      filters.dateRange,
      filters.customStartDate,
      filters.customEndDate,
      referenceDate
    );
  }, [filteredRecords, filters.dateRange, filters.customStartDate, filters.customEndDate, referenceDate]);

  const departmentWorkloads = useMemo(() => {
    return calculateDepartmentWorkloads(filteredRecords, departments);
  }, [filteredRecords, departments]);

  // Export to CSV with accurate filename and sanitization
  const handleExportCSV = () => {
    if (filteredRecords.length === 0) return;

    try {
      const csvContent = generateAnalyticsCSV(filteredRecords, departments);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      const today = referenceDate.toISOString().slice(0, 10);
      link.setAttribute('href', url);
      link.setAttribute('download', `fixmybharat-civic-analytics-${today}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export CSV:', err);
    }
  };

  if (authLoading || (isLoading && !rawRecords.length && !fetchError)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100">
        <LoadingState message="Loading Civic Intelligence records..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100">
      <OfficialNav />

      <main className="flex-1 py-8 sm:py-10">
        <Container size="lg" className="space-y-8">
          {/* Header */}
          <AnalyticsHeader
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            onExportCSV={handleExportCSV}
            filteredCount={filteredRecords.length}
            totalAvailableCount={rawRecords.length}
          />

          {/* Error Banner if Supabase fetch failed */}
          {fetchError && (
            <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs flex items-center gap-3">
              <AlertCircle size={16} className="text-rose-400 shrink-0" />
              <div className="flex-1">
                <span className="font-bold">Failed to sync database records:</span> {fetchError}
              </div>
              <button
                type="button"
                onClick={handleRefresh}
                className="underline hover:text-white font-semibold"
              >
                Retry
              </button>
            </div>
          )}

          {/* Shared Filters */}
          <AnalyticsFilterBar
            filters={filters}
            onChange={setFilters}
            departments={departments}
            totalFiltered={filteredRecords.length}
            totalAvailable={rawRecords.length}
          />

          {/* Part 1: Summary Metrics */}
          <AnalyticsSummaryCards metrics={summaryMetrics} isLoading={isLoading} />

          {/* Part 5: Trends Over Time */}
          <TimelineTrendChart
            trendData={timelineTrends}
            dateRange={filters.dateRange}
            totalFiltered={filteredRecords.length}
          />

          {/* Parts 2 & 4: Category Breakdown & Severity Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CategoryBreakdownChart
              categories={categoryBreakdown}
              totalReports={filteredRecords.length}
            />
            <SeverityBreakdownChart
              severities={severityBreakdown}
              totalReports={filteredRecords.length}
            />
          </div>

          {/* Part 3: Operational Status Distribution across all 7 statuses */}
          <StatusDistributionChart
            statuses={statusDistribution}
            totalReports={filteredRecords.length}
          />

          {/* Part 6: Department Workloads */}
          <DepartmentWorkloadChart
            workloads={departmentWorkloads}
          />

          {/* Part 9: "How to read these metrics" documentation */}
          <AnalyticsDocumentation />
        </Container>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-navy-800 bg-navy-950 text-center text-xs text-slate-500">
        <p>FixMyBharat Civic Operations Desk • Built by Team SyncMates</p>
      </footer>
    </div>
  );
}

export default function CivicIntelligenceAnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100">
          <LoadingState message="Loading Civic Intelligence records..." />
        </div>
      }
    >
      <CivicIntelligenceAnalyticsContent />
    </Suspense>
  );
}
