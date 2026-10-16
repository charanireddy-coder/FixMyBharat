'use client';

import React, { useState } from 'react';
import { Tag, BarChart2 } from 'lucide-react';
import { CategoryMetric } from '@/lib/analytics/types';

interface CategoryBreakdownChartProps {
  categories: CategoryMetric[];
  totalReports: number;
}

const CATEGORY_COLORS: Record<string, { bg: string; fill: string }> = {
  pothole: { bg: 'bg-amber-500/20', fill: 'from-amber-500 to-orange-500' },
  garbage: { bg: 'bg-emerald-500/20', fill: 'from-emerald-500 to-teal-500' },
  water_leakage: { bg: 'bg-sky-500/20', fill: 'from-sky-500 to-blue-500' },
  drainage: { bg: 'bg-indigo-500/20', fill: 'from-indigo-500 to-purple-500' },
  streetlight: { bg: 'bg-yellow-500/20', fill: 'from-yellow-400 to-amber-500' },
  footpath: { bg: 'bg-stone-500/20', fill: 'from-stone-400 to-slate-500' },
  open_manhole: { bg: 'bg-rose-500/20', fill: 'from-rose-500 to-red-600' },
  other: { bg: 'bg-slate-500/20', fill: 'from-slate-400 to-slate-600' },
};

export const CategoryBreakdownChart: React.FC<CategoryBreakdownChartProps> = ({
  categories,
  totalReports,
}) => {
  const [hoveredCategory, setHoveredCategory] = useState<CategoryMetric | null>(null);

  const maxCount = Math.max(...categories.map((c) => c.count), 1);

  if (totalReports === 0) {
    return (
      <div className="p-6 rounded-2xl bg-navy-950 border border-navy-800 shadow-md flex flex-col items-center justify-center min-h-[300px] text-center">
        <BarChart2 size={32} className="text-slate-600 mb-2" />
        <h3 className="text-sm font-bold text-white">No Category Records</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">
          No complaints match the currently selected date or filter parameters.
        </p>
      </div>
    );
  }

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-navy-950 border border-navy-800 shadow-md flex flex-col justify-between relative overflow-hidden">
      <div>
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-navy-800">
          <div className="flex items-center gap-2">
            <Tag size={16} className="text-civic-400" />
            <h3 className="text-sm font-bold text-white">Complaints by Category</h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {categories.filter((c) => c.count > 0).length} Active Categories
          </span>
        </div>

        {/* Hover Tooltip Float */}
        {hoveredCategory && (
          <div className="mb-3 px-3 py-1.5 rounded-lg bg-navy-900 border border-navy-700 text-xs text-slate-200 flex items-center justify-between animate-in fade-in-50 duration-150">
            <span className="font-semibold text-white">{hoveredCategory.label}</span>
            <span className="text-civic-300 font-mono">
              {hoveredCategory.count} complaints ({hoveredCategory.percentage}% of total)
            </span>
          </div>
        )}

        {/* Category Horizontal Bars */}
        <div className="space-y-3 pt-1">
          {categories.map((item) => {
            const widthPct = totalReports > 0 ? (item.count / maxCount) * 100 : 0;
            const theme = CATEGORY_COLORS[item.categoryKey] || CATEGORY_COLORS.other;

            return (
              <div
                key={item.categoryKey}
                onMouseEnter={() => setHoveredCategory(item)}
                onMouseLeave={() => setHoveredCategory(null)}
                className="group cursor-pointer rounded-xl p-2 -mx-2 hover:bg-navy-900/60 transition-colors"
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-medium text-slate-200 group-hover:text-white transition-colors">
                    {item.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white">{item.count}</span>
                    <span className="text-[11px] text-slate-400 w-12 text-right">
                      {item.percentage}%
                    </span>
                  </div>
                </div>

                <div className="w-full h-2.5 rounded-full bg-navy-900 border border-navy-800/80 overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${theme.fill} transition-all duration-500 group-hover:brightness-110`}
                    style={{ width: `${Math.max(widthPct, item.count > 0 ? 3 : 0)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-navy-900 flex items-center justify-between text-[11px] text-slate-400">
        <span>Total Count: <strong className="text-white">{totalReports}</strong></span>
        <span>Bars scaled to maximum category volume</span>
      </div>
    </div>
  );
};
