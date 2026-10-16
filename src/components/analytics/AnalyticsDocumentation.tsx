'use client';

import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';

export const AnalyticsDocumentation: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-2xl bg-navy-950 border border-navy-800 shadow-md overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-navy-900/40 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-navy-900 text-civic-400 border border-navy-800 flex items-center justify-center">
            <BookOpen size={15} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">How to Read These Metrics</h3>
            <p className="text-[11px] text-slate-400">
              Operational definitions, data boundaries, and statistical guidelines
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-civic-400">
          <span>{isOpen ? 'Collapse' : 'Expand Guide'}</span>
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {isOpen && (
        <div className="p-5 sm:p-6 border-t border-navy-800 space-y-4 text-xs text-slate-300 leading-relaxed bg-navy-900/30">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Active Reports Definition */}
            <div className="p-3.5 rounded-xl bg-navy-900/60 border border-navy-800 space-y-1">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                1. Definition of Active Reports
              </span>
              <p className="text-slate-300 text-[11px]">
                A complaint is classified as <strong>Active</strong> if its workflow status is currently in one of five operational intake stages:
                <code className="text-amber-300 mx-1">submitted</code>,
                <code className="text-amber-300 mx-1">under_review</code>,
                <code className="text-amber-300 mx-1">assigned</code>,
                <code className="text-amber-300 mx-1">in_progress</code>, or
                <code className="text-amber-300 mx-1">needs_information</code>.
              </p>
            </div>

            {/* Resolved Reports Definition */}
            <div className="p-3.5 rounded-xl bg-navy-900/60 border border-navy-800 space-y-1">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                2. Definition of Resolved Reports
              </span>
              <p className="text-slate-300 text-[11px]">
                A complaint is counted as <strong>Resolved</strong> only when marked with status <code className="text-emerald-300">resolved</code> and accompanied by verified field inspection notes. Reports marked <code className="text-rose-400">rejected</code> are accounted for separately.
              </p>
            </div>

            {/* Timeline Grouping */}
            <div className="p-3.5 rounded-xl bg-navy-900/60 border border-navy-800 space-y-1">
              <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider block">
                3. Submissions Timeline & Date Grouping
              </span>
              <p className="text-slate-300 text-[11px]">
                Trend figures are aggregated by calendar day using the initial creation timestamp (<code className="text-sky-300">created_at</code>). Calendar dates with zero submissions within the selected range display zero (0), reflecting factual database intake.
              </p>
            </div>

            {/* Correlation vs Causation */}
            <div className="p-3.5 rounded-xl bg-navy-900/60 border border-navy-800 space-y-1">
              <span className="text-[11px] font-bold text-civic-300 uppercase tracking-wider block">
                4. Correlation vs. Causation
              </span>
              <p className="text-slate-300 text-[11px]">
                Higher numbers of reports in specific wards or categories reflect community reporting volume and smartphone penetration, rather than verified infrastructure failure rates alone.
              </p>
            </div>
          </div>

          {/* Operational Boundaries & Constraints */}
          <div className="p-3.5 rounded-xl bg-navy-950 border border-navy-800 flex items-start gap-2.5 text-[11px] text-slate-400">
            <ShieldCheck size={16} className="text-civic-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="text-white block">Analytical Scope & Governance</strong>
              <p>
                All charts, distributions, and aggregates reflect historical database records. FixMyBharat does not claim predictive capabilities, automated future incident forecasting, government-wide adoption, or unverified response-time improvements without established baseline metrics.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
