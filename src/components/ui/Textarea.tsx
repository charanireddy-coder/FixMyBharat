import React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  showCount?: boolean;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  hint,
  required,
  showCount,
  className,
  id,
  rows = 4,
  maxLength,
  value,
  ...props
}) => {
  const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  const currentLength = typeof value === 'string' ? value.length : 0;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-700">
          <label htmlFor={textareaId} className="flex items-center gap-1 cursor-pointer">
            <span>{label}</span>
            {required && <span className="text-rose-600 font-bold">*</span>}
          </label>
          {(showCount || maxLength !== undefined) && (
            <span
              className={cn(
                'text-[11px] font-mono font-medium transition-colors',
                maxLength && currentLength >= maxLength
                  ? 'text-rose-600 font-bold'
                  : maxLength && currentLength >= maxLength * 0.9
                  ? 'text-amber-600'
                  : 'text-slate-400'
              )}
            >
              {currentLength} {maxLength ? `/ ${maxLength}` : 'chars'}
            </span>
          )}
        </div>
      )}
      <textarea
        id={textareaId}
        rows={rows}
        maxLength={maxLength}
        value={value}
        className={cn(
          'w-full px-3.5 py-2.5 text-sm rounded-lg border bg-white text-slate-900 placeholder:text-slate-400',
          'transition-all duration-150 outline-none resize-y',
          error
            ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10'
            : 'border-slate-300 focus:border-civic-600 focus:ring-2 focus:ring-civic-500/10',
          className
        )}
        {...props}
      />
      {hint && !error && <span className="text-xs text-slate-500">{hint}</span>}
      {error && <span className="text-xs font-medium text-rose-600">{error}</span>}
    </div>
  );
};
