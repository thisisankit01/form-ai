"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const Badge = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement> & { variant?: "default" | "secondary" | "destructive" | "outline" }
>(({ className, variant = "default", ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      {
        default: "bg-surface-muted text-text-secondary",
        secondary: "bg-surface-muted text-ink/80",
        destructive: "bg-danger/10 text-danger",
        outline: "border border-ink text-ink",
      }[variant],
      className
    )}
    {...props}
  />
));
Badge.displayName = "Badge";

export { Badge };