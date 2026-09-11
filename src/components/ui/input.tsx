import * as React from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  autoComplete?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, autoComplete, ...props }, ref) => (
    <input
      type="text"
      autoComplete={autoComplete ?? "on"}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-surface px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };