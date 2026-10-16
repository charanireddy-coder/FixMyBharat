'use client';

import React from 'react';
import {
  BarChart3,
  RefreshCw,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface AnalyticsHeaderProps {
  onRefresh: () => void;
  isRefreshing: boolean;
  onExportCSV: () => void;
  filteredCount: number;
  totalAvailableCount: number;
}

export const AnalyticsHeader: React.FC<AnalyticsHeaderProps> = ({
  onRefresh,
  isRefreshing,
  onExportCSV,
  filteredCount,
  totalAvailableCount,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-navy-800">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-civic-500 via-sky-600 to-alert-500 flex items-center justify-center text-white shadow-md shadow-civic-500/20">
            <BarChart3 size={20} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Civic Intelligence
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
          Understand reported issues, monitor workloads, and identify opportunities to improve civic services.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <Button
          id="analytics-refresh-btn"
          variant="outline-dark"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          leftIcon={<RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />}
        >
          {isRefreshing ? 'Updating...' : 'Refresh'}
        </Button>

        <Button
          id="analytics-export-csv-btn"
          variant="accent"
          size="sm"
          onClick={onExportCSV}
          disabled={filteredCount === 0}
          leftIcon={<Download size={14} />}
          title={
            filteredCount === 0
              ? 'No filtered records to export'
              : `Export ${filteredCount} of ${totalAvailableCount} records to CSV`
          }
        >
          Export CSV ({filteredCount})
        </Button>
      </div>
    </div>
  );
};
