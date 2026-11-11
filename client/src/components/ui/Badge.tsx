import React from 'react';
import clsx from 'clsx';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, { container: string; pip: string }> = {
  success: {
    container: 'bg-emerald-50/80 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50',
    pip: 'bg-emerald-500',
  },
  warning: {
    container: 'bg-amber-50/80 text-amber-800 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50',
    pip: 'bg-amber-500',
  },
  danger: {
    container: 'bg-red-50/80 text-red-800 border-red-200/80 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/50',
    pip: 'bg-red-500',
  },
  neutral: {
    container: 'bg-slate-100/80 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700/60',
    pip: 'bg-slate-400',
  },
};

export function Badge({ variant = 'neutral', className, children, ...props }: BadgeProps) {
  const style = variantStyles[variant];

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium border leading-none tracking-normal select-none',
        style.container,
        className
      )}
      {...props}
    >
      <span className={clsx('h-1.5 w-1.5 rounded-full mr-1.5 shrink-0', style.pip)} />
      {children}
    </span>
  );
}
