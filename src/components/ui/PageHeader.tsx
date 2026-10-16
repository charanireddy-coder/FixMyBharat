import React from 'react';
import { cn } from '@/lib/utils';

export interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  eyebrow,
  badge,
  actions,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-200/80 mb-6',
        className
      )}
    >
      <div>
        <div className="flex items-center gap-2.5 mb-1.5">
          {eyebrow && (
            <span className="text-xs font-bold uppercase tracking-wider text-civic-700">
              {eyebrow}
            </span>
          )}
          {badge}
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-950 tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-sm sm:text-base text-slate-600 max-w-3xl">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
    </div>
  );
};
