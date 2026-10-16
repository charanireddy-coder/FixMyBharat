import React from 'react';
import { cn } from '@/lib/utils';
import { Clock, AlertCircle, ArrowUpRight, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';

export type StatusVariant =
  | 'submitted'
  | 'under_review'
  | 'assigned'
  | 'in_progress'
  | 'resolved'
  | 'rejected'
  | 'needs_information'
  | 'Submitted'
  | 'Under Review'
  | 'Assigned'
  | 'In Progress'
  | 'Resolved'
  | 'Rejected'
  | 'Needs Information';

interface StatusConfigItem {
  label: string;
  className: string;
  icon: React.ReactNode;
}

const STATUS_MAP: Record<string, StatusConfigItem> = {
  submitted: {
    label: 'Submitted',
    className: 'bg-civic-50 text-civic-800 border-civic-200',
    icon: <Clock size={12} className="text-civic-600" />,
  },
  under_review: {
    label: 'Under Review',
    className: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: <AlertCircle size={12} className="text-amber-600" />,
  },
  assigned: {
    label: 'Assigned',
    className: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    icon: <ArrowUpRight size={12} className="text-indigo-600" />,
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-alert-50 text-alert-800 border-alert-200',
    icon: <Clock size={12} className="text-alert-600" />,
  },
  resolved: {
    label: 'Resolved',
    className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    icon: <CheckCircle2 size={12} className="text-emerald-600" />,
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-rose-50 text-rose-800 border-rose-200',
    icon: <AlertTriangle size={12} className="text-rose-600" />,
  },
  needs_information: {
    label: 'Needs Info',
    className: 'bg-purple-50 text-purple-800 border-purple-200',
    icon: <HelpCircle size={12} className="text-purple-600" />,
  },
};

export const StatusBadge: React.FC<{
  status: StatusVariant;
  className?: string;
}> = ({ status, className }) => {
  const normalizedKey = status.toLowerCase().replace(/[\s-]+/g, '_');
  const config = STATUS_MAP[normalizedKey] || STATUS_MAP.submitted;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border tracking-wide',
        config.className,
        className
      )}
    >
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
};
