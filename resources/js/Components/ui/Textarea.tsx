import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.ComponentProps<'textarea'> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'w-full min-h-[80px] rounded-lg border border-border-soft bg-white px-3 py-2 text-base text-text-main shadow-sm transition-colors placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:border-brand-gold disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = 'Textarea';

export { Textarea };
