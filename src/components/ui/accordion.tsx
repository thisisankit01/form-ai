"use client";

import * as RadixAccordion from "@radix-ui/react-accordion";
import { forwardRef } from "react";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

export const Accordion = RadixAccordion.Root;
export const AccordionItem = RadixAccordion.Item;
export const AccordionHeader = RadixAccordion.Header;

export const AccordionTrigger = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<typeof RadixAccordion.Trigger>
>(({ className, children, ...props }, ref) => (
  <RadixAccordion.Trigger
    ref={ref}
    className={cn(
      "flex w-full items-center justify-between rounded-border border border-line bg-surface p-4 text-left text-sm font-semibold transition-colors hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2",
      className
    )}
    {...props}
  >
    <span className="state-open:rotate-180 transition-transform duration-200">
      <svg
        className="h-4 w-4 shrink-0"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-2.938a.75.75 0 111.08 1.04l-4.25 3.364a.75.75 0 01-1.06-.02L5.22 9.082a.75.75 0 01.01-1.87z"
          clipRule="evenodd"
        />
      </svg>
    </span>
    <span className="flex-1">{children}</span>
  </RadixAccordion.Trigger>
));
AccordionTrigger.displayName = "AccordionTrigger";

export const AccordionContent = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof RadixAccordion.Content>
>(({ className, children, ...props }, ref) => (
  <RadixAccordion.Content
    ref={ref}
    className={cn(
      "border-b border-line bg-surface pt-0 pb-4 overflow-hidden text-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  >
    {children}
  </RadixAccordion.Content>
));
AccordionContent.displayName = "AccordionContent";
