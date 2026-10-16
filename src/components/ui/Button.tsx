import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'accent' | 'outline-dark';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  ...props
}) => {
  const variantStyles = {
    primary: 'bg-navy-900 hover:bg-navy-800 text-white shadow-sm border border-navy-800 focus-visible:ring-navy-900',
    accent: 'bg-alert-500 hover:bg-alert-600 text-white shadow-md shadow-alert-500/25 border border-alert-600 focus-visible:ring-alert-500',
    secondary: 'bg-civic-600 hover:bg-civic-700 text-white shadow-sm border border-civic-700 focus-visible:ring-civic-600',
    outline: 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 shadow-sm focus-visible:ring-slate-400',
    'outline-dark': 'bg-navy-900/90 hover:bg-navy-800 text-slate-100 border border-navy-700 hover:border-slate-500 shadow-sm focus-visible:ring-civic-500',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-700 border-transparent focus-visible:ring-slate-300',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm border border-rose-700 focus-visible:ring-rose-600',
  }[variant];

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 rounded-md gap-1.5',
    md: 'text-sm px-4 py-2.5 rounded-lg gap-2',
    lg: 'text-base px-5 py-3 rounded-lg gap-2.5',
  }[size];

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-semibold transition-all duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer select-none',
        variantStyles,
        sizeStyles,
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="w-4 h-4 border-2 border-current border-r-transparent rounded-full animate-spin" />
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </button>
  );
};
