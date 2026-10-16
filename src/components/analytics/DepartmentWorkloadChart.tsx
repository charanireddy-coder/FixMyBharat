'use client';

import React, { useState } from 'react';
import { Building2, Info } from 'lucide-react';
import { DepartmentWorkloadMetric } from '@/lib/analytics/types';

interface DepartmentWorkloadChartProps {
  workloads: DepartmentWorkloadMetric[];
}

export const DepartmentWorkloadChart: React.FC<DepartmentWorkloadChartProps> = ({
  workloads,
}) => {
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);

  const maxAssigned = Math.max(...workloads.map((w) => w.assignedCount), 1);

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-navy-950 border border-navy-800 shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-navy-800">
        <div className="flex items-center gap-2">
          <Building2 size={16} className="text-civic-400" />
          <h3 className="text-sm font-bold text-white">Department Workload Distribution</h3>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[11px] text-slate-300">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-sky-500" />
            <span>Assigned</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-amber-500" />
            <span>Active</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
            <span>Resolved</span>
          </span>
        </div>
      </div>

      {workloads.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-400">
          No department assignments recorded for this filter.
        </div>
      ) : (
        <div className="space-y-3.5">
          {workloads.map((dept) => {
            const isUnassigned = dept.departmentId === 'unassigned';
            const activePct = (dept.activeCount / maxAssigned) * 100;
            const resolvedPct = (dept.resolvedCount / maxAssigned) * 100;

            return (
              <div
                key={dept.departmentId}
                onClick={() =>
                  setSelectedDeptId(selectedDeptId === dept.departmentId ? null : dept.departmentId)
                }
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isUnassigned
                    ? 'bg-amber-950/20 border-amber-800/40 hover:border-amber-700/60'
                    : 'bg-navy-900/50 border-navy-800 hover:border-navy-700 hover:bg-navy-900/80'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${isUnassigned ? 'text-amber-300' : 'text-white'}`}>
                      {dept.departmentName}
                    </span>
                    {isUnassigned && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                        Requires Assignment
                      </span>
                    )}
                  </div>

                  {/* Exact Numbers Grid */}
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <div className="flex items-center gap-1 text-slate-300" title="Total Assigned">
                      <span className="text-[10px] text-slate-400 font-sans uppercase">Total:</span>
                      <strong className="text-white">{dept.assignedCount}</strong>
                    </div>
                    <span className="text-slate-600">•</span>
                    <div className="flex items-center gap-1 text-amber-300" title="Active (In Workflow)">
                      <span className="text-[10px] text-amber-400 font-sans uppercase">Active:</span>
                      <strong>{dept.activeCount}</strong>
                    </div>
                    <span className="text-slate-600">•</span>
                    <div className="flex items-center gap-1 text-emerald-300" title="Resolved">
                      <span className="text-[10px] text-emerald-400 font-sans uppercase">Resolved:</span>
                      <strong>{dept.resolvedCount}</strong>
                    </div>
                  </div>
                </div>

                {/* Comparative Proportional Progress Bar */}
                <div className="space-y-1">
                  <div className="w-full h-2 rounded-full bg-navy-950 border border-navy-800 overflow-hidden flex">
                    <div
                      style={{ width: `${Math.max(activePct, dept.activeCount > 0 ? 3 : 0)}%` }}
                      className="h-full bg-amber-500 transition-all duration-300"
                      title={`Active: ${dept.activeCount}`}
                    />
                    <div
                      style={{ width: `${Math.max(resolvedPct, dept.resolvedCount > 0 ? 3 : 0)}%` }}
                      className="h-full bg-emerald-500 transition-all duration-300"
                      title={`Resolved: ${dept.resolvedCount}`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Accuracy & Integrity Directive Disclaimer */}
      <div className="mt-5 p-3 rounded-xl bg-navy-900/60 border border-navy-800/80 flex items-start gap-2.5 text-[11px] text-slate-400">
        <Info size={14} className="shrink-0 text-civic-400 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-slate-300">Workload Definition Notice:</strong> Department metrics reflect actual counts of complaints allocated to municipal departments. Complaints without an assigned department appear under <em>Unassigned</em>. Higher complaint counts do not represent inferior municipal performance, but rather intake volume and operational jurisdiction.
        </p>
      </div>
    </div>
  );
};
