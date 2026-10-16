'use client';

import React, { useState } from 'react';
import { AlertCircle, Info } from 'lucide-react';
import { SeverityMetric } from '@/lib/analytics/types';

interface SeverityBreakdownChartProps {
  severities: SeverityMetric[];
  totalReports: number;
}

export const SeverityBreakdownChart: React.FC<SeverityBreakdownChartProps> = ({
  severities,
  totalReports,
}) => {
  const [hoveredSeverity, setHoveredSeverity] = useState<SeverityMetric | null>(null);

  const maxCount = Math.max(...severities.map((s) => s.count), 1);

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-navy-950 border border-navy-800 shadow-md flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-navy-800">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-400" />
            <h3 className="text-sm font-bold text-white">Severity Level Distribution</h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Official Record Field</span>
        </div>

        {/* Hover Information Banner */}
        {hoveredSeverity && (
          <div className="mb-3 px-3 py-1.5 rounded-lg bg-navy-900 border border-navy-700 text-xs text-slate-200 flex items-center justify-between animate-in fade-in-50 duration-150">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: hoveredSeverity.color }}
              />
              <span className="font-semibold text-white">{hoveredSeverity.label} Severity:</span>
              <span className="text-slate-400">{hoveredSeverity.description}</span>
            </div>
            <span className="font-mono font-bold text-white ml-2">
              {hoveredSeverity.count} ({totalReports > 0 ? ((hoveredSeverity.count / totalReports) * 100).toFixed(1) : 0}%)
            </span>
          </div>
        )}

        {/* Severity Horizontal Bars */}
        <div className="space-y-3.5 pt-1">
          {severities.map((item) => {
            const widthPct = totalReports > 0 ? (item.count / maxCount) * 100 : 0;
            const pctOfTotal = totalReports > 0 ? ((item.count / totalReports) * 100).toFixed(1) : '0';

            return (
              <div
                key={item.severityKey}
                onMouseEnter={() => setHoveredSeverity(item)}
                onMouseLeave={() => setHoveredSeverity(null)}
                className="group cursor-pointer rounded-xl p-2.5 -mx-2 hover:bg-navy-900/60 transition-colors"
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                      {item.label}
                    </span>
                    <span className="text-[10px] text-slate-400 hidden sm:inline">
                      • {item.description}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white">{item.count}</span>
                    <span className="text-[11px] text-slate-400 w-12 text-right">
                      {pctOfTotal}%
                    </span>
                  </div>
                </div>

                <div className="w-full h-3 rounded-full bg-navy-900 border border-navy-800/80 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 group-hover:brightness-110"
                    style={{
                      width: `${Math.max(widthPct, item.count > 0 ? 3 : 0)}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Accuracy & Integrity Directive Disclaimer */}
      <div className="mt-5 p-3 rounded-xl bg-navy-900/60 border border-navy-800/80 flex items-start gap-2.5 text-[11px] text-slate-400">
        <Info size={14} className="shrink-0 text-civic-400 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-slate-300">Data Integrity Notice:</strong> Severity levels display the official value currently recorded on each database complaint record. AI rules-based suggestions are never substituted into this metric without explicit official approval.
        </p>
      </div>
    </div>
  );
};
