import React from 'react';
import { cn } from '@/lib/utils';
import { ShieldAlert, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';

export type SeverityVariant =
  | 'low'
  | 'medium'
  | 'high'
  | 'critical'
  | 'Low'
  | 'Medium'
  | 'High'
  | 'Critical';

interface SeverityConfigItem {
  label: string;
  className: string;
  icon: React.ReactNode;
}

const SEVERITY_MAP: Record<string, SeverityConfigItem> = {
  low: {
    label: 'Low',
    className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    icon: <CheckCircle size={11} className="text-emerald-600" />,
  },
  medium: {
    label: 'Medium',
    className: 'bg-civic-50 text-civic-800 border-civic-200',
    icon: <AlertCircle size={11} className="text-civic-600" />,
  },
  high: {
    label: 'High',
    className: 'bg-alert-50 text-alert-800 border-alert-200',
    icon: <AlertTriangle size={11} className="text-alert-600" />,
  },
  critical: {
    label: 'Critical',
    className: 'bg-rose-50 text-rose-800 border-rose-300 font-bold animate-pulse',
    icon: <ShieldAlert size={11} className="text-rose-600" />,
  },
};

export const SeverityBadge: React.FC<{
  severity: SeverityVariant;
  className?: string;
}> = ({ severity, className }) => {
  const normalizedKey = severity.toLowerCase();
  const config = SEVERITY_MAP[normalizedKey] || SEVERITY_MAP.low;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border tracking-wide uppercase',
        config.className,
        className
      )}
    >
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
};
