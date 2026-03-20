import * as React from "react"

import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border bg-card text-card-foreground shadow",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

/** Standard panel/dashboard card: optional header (icon + title left, actions right), base theme styling. */
export interface CardPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  icon?: React.ComponentType<{ className?: string }>;
  actions?: React.ReactNode;
}

const CardPanel = React.forwardRef<HTMLDivElement, CardPanelProps>(
  ({ title, icon: Icon, actions, className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border border-border-soft bg-white p-6 shadow-sm",
        className
      )}
      {...props}
    >
      {(title !== undefined || Icon !== undefined || actions !== undefined) && (
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {Icon && <Icon className="h-5 w-5 shrink-0 text-text-muted" aria-hidden />}
            {title !== undefined && (
              <h2 className="text-lg font-semibold text-text-main truncate">{title}</h2>
            )}
          </div>
          {actions != null && <div className="shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  )
)
CardPanel.displayName = "CardPanel"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, CardPanel }
