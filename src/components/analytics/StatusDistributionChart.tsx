'use client';

import React, { useState } from 'react';
import { Clock, Info } from 'lucide-react';
import { StatusMetric } from '@/lib/analytics/types';

interface StatusDistributionChartProps {
  statuses: StatusMetric[];
  totalReports: number;
}

export const StatusDistributionChart: React.FC<StatusDistributionChartProps> = ({
  statuses,
  totalReports,
}) => {
  const [hoveredStatus, setHoveredStatus] = useState<StatusMetric | null>(null);

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-navy-950 border border-navy-800 shadow-md flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-navy-800">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-sky-400" />
            <h3 className="text-sm font-bold text-white">Operational Status Distribution</h3>
          </div>
          <span className="text-[11px] text-slate-400">All 7 Lifecycle Stages</span>
        </div>

        {/* Hover Tooltip Float */}
        {hoveredStatus && (
          <div className="mb-3 px-3 py-1.5 rounded-lg bg-navy-900 border border-navy-700 text-xs text-slate-200 flex items-center justify-between animate-in fade-in-50 duration-150">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: hoveredStatus.color }}
              />
              <span className="font-semibold text-white">{hoveredStatus.label}:</span>
              <span className="text-slate-400">{hoveredStatus.description}</span>
            </div>
            <span className="font-mono font-bold text-white ml-2">
              {hoveredStatus.count} ({totalReports > 0 ? ((hoveredStatus.count / totalReports) * 100).toFixed(1) : 0}%)
            </span>
          </div>
        )}

        {/* Cumulative Stacked Bar */}
        <div className="space-y-1.5 mb-6">
          <div className="w-full h-4 rounded-xl bg-navy-900 overflow-hidden flex border border-navy-800">
            {totalReports === 0 ? (
              <div className="w-full h-full bg-navy-900 flex items-center justify-center text-[10px] text-slate-500">
                No active records in current filter
              </div>
            ) : (
              statuses.map((item) => {
                if (item.count === 0) return null;
                const widthPct = (item.count / totalReports) * 100;
                return (
                  <div
                    key={item.statusKey}
                    onMouseEnter={() => setHoveredStatus(item)}
                    onMouseLeave={() => setHoveredStatus(null)}
                    style={{
                      width: `${widthPct}%`,
                      backgroundColor: item.color,
                    }}
                    className="h-full hover:brightness-125 transition-all cursor-pointer first:rounded-l-xl last:rounded-r-xl"
                    title={`${item.label}: ${item.count} (${widthPct.toFixed(1)}%)`}
                  />
                );
              })
            )}
          </div>
          <p className="text-[10px] text-slate-500 text-right">
            Cumulative proportions of total filtered volume
          </p>
        </div>

        {/* Detailed Breakdown Rows across all 7 statuses */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {statuses.map((item) => {
            const pct = totalReports > 0 ? ((item.count / totalReports) * 100).toFixed(1) : '0';
            const isZero = item.count === 0;

            return (
              <div
                key={item.statusKey}
                onMouseEnter={() => setHoveredStatus(item)}
                onMouseLeave={() => setHoveredStatus(null)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  isZero
                    ? 'bg-navy-900/30 border-navy-900/70 opacity-60 hover:opacity-100 hover:bg-navy-900/60'
                    : 'bg-navy-900/60 border-navy-800 hover:border-navy-700 hover:bg-navy-900'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-slate-200 block truncate">
                      {item.label}
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {item.description}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0 ml-2">
                  <span className={`text-xs font-bold font-mono ${isZero ? 'text-slate-500' : 'text-white'}`}>
                    {item.count}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {isZero ? '0 reports' : `${pct}%`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-navy-900 flex items-center gap-2 text-[11px] text-slate-400">
        <Info size={13} className="shrink-0 text-slate-500" />
        <span>
          Statuses displaying 0 indicate zero verified complaints currently in that workflow stage, not missing data.
        </span>
      </div>
    </div>
  );
};
