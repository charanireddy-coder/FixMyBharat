import React from 'react';
import { cn } from '@/lib/utils';

export interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading civic intelligence data...',
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-12 gap-3 text-slate-500',
        className
      )}
    >
      <div className="w-8 h-8 border-3 border-slate-200 border-t-civic-600 rounded-full animate-spin" />
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
        {message}
      </span>
    </div>
  );
};
