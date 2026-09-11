import * as React from "react";
import { cn } from "@/lib/utils";

type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, htmlFor, ...props }, ref) => (
    <label
      className={cn("text-text-secondary font-medium text-sm", className)}
      htmlFor={htmlFor}
      ref={ref}
      {...props}
    />
  )
);
Label.displayName = "Label";

export { Label };
