import * as React from 'react';

import { cn } from '@/lib/utils';

const badgeVariants: Record<
  'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'approved' | 'pending' | 'rejected' | 'info',
  string
> = {
  default:
    'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
  secondary:
    'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
  destructive:
    'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
  outline:
    'border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground',
  success:
    'border-transparent theme-success-bg',
  approved: 'border-transparent theme-success-bg',
  pending: 'border-transparent theme-warning-bg',
  rejected: 'border-transparent theme-danger-bg',
  info: 'border-transparent theme-info-bg',
};

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'approved' | 'pending' | 'rejected' | 'info';
}

export function Badge({
  className,
  variant = 'default',
  ...props
}: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  );
}

