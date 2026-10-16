'use client';

import React from 'react';
import {
  Layers,
  Clock,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { SummaryMetrics } from '@/lib/analytics/types';

interface AnalyticsSummaryCardsProps {
  metrics: SummaryMetrics;
  isLoading?: boolean;
}

export const AnalyticsSummaryCards: React.FC<AnalyticsSummaryCardsProps> = ({
  metrics,
  isLoading = false,
}) => {
  const cards = [
    {
      id: 'metric-total-reports',
      label: 'Total Reports',
      count: metrics.totalReports,
      sublabel: 'Accessible complaints in current filter',
      icon: Layers,
      colorClasses: 'text-slate-300 bg-navy-900 border-navy-800',
      valueColor: 'text-white',
    },
    {
      id: 'metric-submitted-reports',
      label: 'Submitted Reports',
      count: metrics.submittedReports,
      sublabel: 'Queued intake awaiting review',
      icon: Clock,
      colorClasses: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
      valueColor: 'text-sky-300',
    },
    {
      id: 'metric-active-reports',
      label: 'Active Reports',
      count: metrics.activeReports,
      sublabel: 'Submitted, review, assigned, progress, info',
      icon: Activity,
      colorClasses: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      valueColor: 'text-amber-300',
      hasDefinitionTooltip: true,
    },
    {
      id: 'metric-resolved-reports',
      label: 'Resolved Reports',
      count: metrics.resolvedReports,
      sublabel: 'Field verification completed',
      icon: CheckCircle2,
      colorClasses: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      valueColor: 'text-emerald-300',
    },
    {
      id: 'metric-critical-reports',
      label: 'Critical Reports',
      count: metrics.criticalReports,
      sublabel: 'High hazard civic incidents',
      icon: AlertTriangle,
      colorClasses: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
      valueColor: 'text-rose-300',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            id={card.id}
            className="p-4 sm:p-5 rounded-2xl bg-navy-950 border border-navy-800 shadow-lg flex flex-col justify-between relative overflow-hidden transition-all duration-200 hover:border-navy-700"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-300">
                    {card.label}
                  </span>
                  {card.hasDefinitionTooltip && (
                    <span
                      title="Active Reports includes complaints in statuses: submitted, under_review, assigned, in_progress, and needs_information."
                      className="cursor-help text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      <Info size={12} />
                    </span>
                  )}
                </div>
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border flex items-center justify-center shrink-0 ${card.colorClasses}`}
                >
                  <Icon size={16} />
                </div>
              </div>

              <div className={`text-2xl sm:text-3xl font-black ${card.valueColor}`}>
                {isLoading ? (
                  <span className="inline-block w-12 h-7 bg-navy-900 animate-pulse rounded" />
                ) : (
                  card.count
                )}
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-2 line-clamp-1">
              {card.sublabel}
            </p>
          </div>
        );
      })}
    </div>
  );
};
