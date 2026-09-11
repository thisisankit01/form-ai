"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { forwardRef } from "react";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

/* Sheet primitive from @radix-ui/react-dialog, re-exported as Sheet for mobile bottom sheet */

export const Sheet = RadixDialog.Root;
export const SheetTrigger = RadixDialog.Trigger;
export const SheetPortal = RadixDialog.Portal;
export const SheetClose = RadixDialog.Close;

export const SheetOverlay = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof RadixDialog.Overlay>
>(({ className, children, ...props }, ref) => (
  <RadixDialog.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  >
    {children}
  </RadixDialog.Overlay>
));
SheetOverlay.displayName = "SheetOverlay";

export const SheetContent = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof RadixDialog.Content> & { side?: "left" | "right" | "bottom" }
>(({ className, children, side = "bottom", ...props }, ref) => (
  <RadixDialog.Content
    ref={ref}
    className={cn(
      side === "left"
        ? "fixed left-0 top-0 bottom-0 z-50 w-[272px] max-w-[calc(100vw-48px)] overflow-y-auto border-r border-line bg-surface shadow-md duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left"
        : side === "right"
          ? "fixed right-0 top-0 bottom-0 z-50 flex w-[min(440px,calc(100vw-24px))] max-w-full flex-col overflow-hidden border-l border-line bg-surface shadow-md duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right"
        : "fixed left-[50%] bottom-0 z-50 transform -translate-x-1/2 w-full max-w-xl overflow-y-hidden border-t border-line bg-surface shadow-md duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
      className
    )}
    {...props}
  >
    {side === "bottom" && <div className="h-6 w-full" />}
    <div className={side === "right" ? "min-h-0 flex-1 overflow-y-auto" : "space-y-4 p-6"}>{children}</div>
  </RadixDialog.Content>
));
SheetContent.displayName = "SheetContent";

export const SheetHeader = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof RadixDialog.Title>
>(({ className, children, ...props }, ref) => (
  <RadixDialog.Title
    ref={ref}
    className={cn("flex items-center justify-between pb-2 border-b border-line", className)}
    {...props}
  >
    <div className="text-lg font-semibold">{children}</div>
    <SheetTrigger asChild className="rounded-md p-1 text-text-secondary hover:bg-surface-muted">
      <svg
        className="h-4 w-4"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414l-5 5a1 1 0 01-1.414 0l-1.414-1.414a1 1 0 010-1.414l1.414-1.414z"
          clipRule="evenodd"
        />
      </svg>
    </SheetTrigger>
  </RadixDialog.Title>
));
SheetHeader.displayName = "SheetHeader";

export const SheetTitle = RadixDialog.Title;
export const SheetDescription = RadixDialog.Description;
