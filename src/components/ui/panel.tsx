"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Panel = React.forwardRef<HTMLDivElement, PanelProps>(
  ({ className, ...props }, ref) => (
    <div
      className={cn(
        "rounded-panel border border-line bg-surface p-6",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Panel.displayName = "Panel";