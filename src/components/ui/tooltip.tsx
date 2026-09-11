"use client";

import * as RadixTooltip from "@radix-ui/react-tooltip";
import { forwardRef } from "react";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

export const Tooltip = RadixTooltip.Root;
export const TooltipTrigger = RadixTooltip.Trigger;
export const TooltipPortal = RadixTooltip.Portal;
export const TooltipProvider = RadixTooltip.Provider;

export const TooltipContent = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof RadixTooltip.Content>
>(({ className, sideOffset = 4, children, ...props }, ref) => (
  <RadixTooltip.Content
    ref={ref}
    className={cn(
      "relative z-50 max-w-xs rounded-md border border-line bg-surface p-2 text-sm text-text-secondary shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1 data-[state=open]:slide-in-from-left-1 data-[state=closed]:slide-out-to-top-1 data-[state=open]:slide-in-from-top-1",
      className
    )}
    sideOffset={sideOffset}
    {...props}
  >
    {children}
  </RadixTooltip.Content>
));
TooltipContent.displayName = "TooltipContent";
