'use client';

import React from 'react';
import {
  Filter,
  RotateCcw,
  Building2,
  Tag,
  AlertCircle,
  Clock,
} from 'lucide-react';
import {
  AnalyticsFilterState,
  AnalyticsDateRange,
} from '@/lib/analytics/types';
import {
  STANDARD_CATEGORIES,
  STANDARD_SEVERITIES,
  STANDARD_STATUSES,
} from '@/lib/analytics/service';
import { Department } from '@/types';
import { Button } from '@/components/ui/Button';

interface AnalyticsFilterBarProps {
  filters: AnalyticsFilterState;
  onChange: (updated: AnalyticsFilterState) => void;
  departments: Department[];
  totalFiltered: number;
  totalAvailable: number;
}

export const AnalyticsFilterBar: React.FC<AnalyticsFilterBarProps> = ({
  filters,
  onChange,
  departments,
  totalFiltered,
  totalAvailable,
}) => {
  const isDefault =
    filters.dateRange === '30d' &&
    filters.category === 'all' &&
    filters.severity === 'all' &&
    filters.status === 'all' &&
    filters.departmentId === 'all' &&
    !filters.customStartDate &&
    !filters.customEndDate;

  const handleReset = () => {
    onChange({
      dateRange: '30d',
      category: 'all',
      severity: 'all',
      status: 'all',
      departmentId: 'all',
      customStartDate: '',
      customEndDate: '',
    });
  };

  const dateRangeOptions: { id: AnalyticsDateRange; label: string }[] = [
    { id: '7d', label: 'Last 7 Days' },
    { id: '30d', label: 'Last 30 Days' },
    { id: '90d', label: 'Last 90 Days' },
    { id: 'all', label: 'All Recorded Time' },
    { id: 'custom', label: 'Custom Range' },
  ];

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-navy-950 border border-navy-800 shadow-md space-y-4">
      {/* Top Filter Header & Date Range Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-civic-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Analytics Filters
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-navy-900 border border-navy-800 font-mono text-slate-400">
            {totalFiltered} of {totalAvailable} records
          </span>
        </div>

        <div className="flex items-center gap-2">
          {!isDefault && (
            <Button
              id="reset-analytics-filters-btn"
              variant="outline-dark"
              size="sm"
              onClick={handleReset}
              leftIcon={<RotateCcw size={12} />}
              className="text-xs py-1 h-8 text-slate-300 border-navy-700 hover:text-white"
            >
              Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* Date Range Selection Buttons */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        {dateRangeOptions.map((opt) => {
          const isSelected = filters.dateRange === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange({ ...filters, dateRange: opt.id })}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                isSelected
                  ? 'bg-civic-600 text-white shadow-sm shadow-civic-500/20'
                  : 'bg-navy-900/80 text-slate-400 hover:text-white hover:bg-navy-900 border border-navy-800'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Custom Date Pickers if 'custom' is active */}
      {filters.dateRange === 'custom' && (
        <div className="p-3 rounded-xl bg-navy-900/60 border border-navy-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400 block uppercase">
              Start Date
            </label>
            <input
              type="date"
              value={filters.customStartDate || ''}
              onChange={(e) => onChange({ ...filters, customStartDate: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg bg-navy-950 border border-navy-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-civic-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400 block uppercase">
              End Date
            </label>
            <input
              type="date"
              value={filters.customEndDate || ''}
              onChange={(e) => onChange({ ...filters, customEndDate: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg bg-navy-950 border border-navy-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-civic-500"
            />
          </div>
        </div>
      )}

      {/* Dropdown Filters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 border-t border-navy-900">
        {/* Category Filter */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Tag size={11} className="text-slate-500" />
            <span>Category</span>
          </label>
          <select
            id="filter-analytics-category"
            value={filters.category}
            onChange={(e) => onChange({ ...filters, category: e.target.value })}
            className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-navy-900 border border-navy-800 text-white focus:outline-none focus:ring-1 focus:ring-civic-500"
          >
            <option value="all">All Categories</option>
            {STANDARD_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Clock size={11} className="text-slate-500" />
            <span>Status</span>
          </label>
          <select
            id="filter-analytics-status"
            value={filters.status}
            onChange={(e) => onChange({ ...filters, status: e.target.value })}
            className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-navy-900 border border-navy-800 text-white focus:outline-none focus:ring-1 focus:ring-civic-500"
          >
            <option value="all">All Statuses</option>
            <option value="active_only">Active Only (5 stages)</option>
            {STANDARD_STATUSES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Severity Filter */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <AlertCircle size={11} className="text-slate-500" />
            <span>Severity</span>
          </label>
          <select
            id="filter-analytics-severity"
            value={filters.severity}
            onChange={(e) => onChange({ ...filters, severity: e.target.value })}
            className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-navy-900 border border-navy-800 text-white focus:outline-none focus:ring-1 focus:ring-civic-500"
          >
            <option value="all">All Severities</option>
            {STANDARD_SEVERITIES.map((sev) => (
              <option key={sev.key} value={sev.key}>
                {sev.label}
              </option>
            ))}
          </select>
        </div>

        {/* Department Filter */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Building2 size={11} className="text-slate-500" />
            <span>Department</span>
          </label>
          <select
            id="filter-analytics-department"
            value={filters.departmentId}
            onChange={(e) => onChange({ ...filters, departmentId: e.target.value })}
            className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-navy-900 border border-navy-800 text-white focus:outline-none focus:ring-1 focus:ring-civic-500"
          >
            <option value="all">All Departments</option>
            <option value="unassigned">Unassigned Only</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
