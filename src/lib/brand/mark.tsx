import { cn } from "@/lib/utils";

export function FORMMark({ className }: { className?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      aria-hidden="true"
      className={cn("flex-shrink-0", className)}
    >
      {/* Three offset solid rectangles with a negative-space corner.
          Each rectangle is 6x10 or 10x6, arranged to leave a 4x4 gap at the inner corner. */}
      <rect
        x="0"
        y="0"
        width="4"
        height="16"
        fill="currentColor"
      /> {/* vertical left bar */}
      <rect
        x="0"
        y="0"
        width="16"
        height="4"
        fill="currentColor"
      /> {/* horizontal top bar */}
      <rect
        x="12"
        y="8"
        width="4"
        height="8"
        fill="currentColor"
      /> {/* offset vertical bar on right, lower */}
      {/* The negative space is the 4x4 square from (4,4) to (8,8) */}
    </svg>
  );
}

FORMMark.displayName = "FORMMark";