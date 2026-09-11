"use client";

import * as RadixSwitch from "@radix-ui/react-switch";
import { forwardRef } from "react";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

export const Switch = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<typeof RadixSwitch.Root>
>(({ className, ...props }, ref) => (
  <RadixSwitch.Root
    ref={ref}
    className={cn(
      "inline-flex h-6 w-11 items-center shrink-0 cursor-pointer gap-1 rounded-full border border-line bg-surface transition-[background-color,box-shadow] ease-in-out data-[state=checked]:bg-accent data-[state=unchecked]:bg-surface",
      className
    )}
    {...props}
  >
    <RadixSwitch.Thumb
      className={cn(
        "block h-4 w-4 rounded-full bg-surface shadow-sm ring-0 transition-transform data-[state=unchecked]:translate-x-0 data-[state=checked]:translate-x-5"
      )}
    />
  </RadixSwitch.Root>
));
Switch.displayName = "Switch";
