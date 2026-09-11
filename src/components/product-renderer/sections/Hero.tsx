import { cn } from "@/lib/utils";

interface HeroProps {
  eyebrow: string;
  headline: string;
  body: string;
  primaryAction: ProductAction;
  secondaryAction?: ProductAction;
  composition: "split" | "centered";
  onAction?: (action: unknown) => void;
}

interface ProductAction {
  kind: string;
  label: string;
  pageId?: string;
  sectionId?: string;
  dialogTitle?: string;
  dialogBody?: string;
}

export default function HeroSection({
  eyebrow,
  headline,
  body,
  primaryAction,
  secondaryAction,
  composition,
  onAction,
}: HeroProps) {
  const buttonStyle = {
    primary: "bg-[var(--product-accent)] text-[var(--product-accent-ink)] hover:bg-[var(--product-accent)]/90",
    secondary: "border border-[var(--product-border)] text-[var(--product-foreground)] hover:bg-[var(--product-muted)]",
  };

  if (composition === "split") {
    return (
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[5fr_7fr]">
        <div className="space-y-6">
          {eyebrow && (
            <p className="text-[var(--product-secondary)] font-medium text-sm tracking-wide uppercase">
              {eyebrow}
            </p>
          )}
          <h1 className="mb-4 text-4xl font-bold text-[var(--product-foreground)] leading-none tracking-tight lg:text-5xl">
            {headline}
          </h1>
          {body && (
            <p className="text-[var(--product-secondary)] text-base leading-relaxed">
              {body}
            </p>
          )}
        <div className="flex flex-wrap gap-3">
             <button type="button" onClick={() => onAction?.(primaryAction)} className={cn("flex-1 rounded-md px-6 py-3 text-sm font-medium", buttonStyle.primary)}>
              {primaryAction.label}
            </button>
            {secondaryAction && (
               <button type="button" onClick={() => onAction?.(secondaryAction)} className={cn("flex-1 border px-6 py-3 text-sm font-medium", buttonStyle.secondary)}>
                {secondaryAction.label}
              </button>
            )}
          </div>
        </div>
        <div className="relative min-h-[280px] w-full rounded-[var(--product-radius-stage)] border border-[var(--product-border)] bg-[var(--product-muted)] lg:min-h-[500px]">
          {/* Product stage preview would go here */}
          <div className="absolute inset-0 flex items-center justify-center text-[var(--product-secondary)]">
            Product Preview
          </div>
        </div>
      </div>
    );
  } else {
    return (
      <div className="space-y-8 text-center">
        {eyebrow && (
          <p className="text-[var(--product-secondary)] font-medium text-sm tracking-wide uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="mb-4 text-4xl font-bold text-[var(--product-foreground)] leading-none tracking-tight lg:text-5xl">
          {headline}
        </h1>
        {body && (
          <p className="text-[var(--product-secondary)] text-base leading-relaxed max-w-2xl mx-auto">
            {body}
          </p>
        )}
        <div className="flex flex-wrap justify-center gap-3">
           <button type="button" onClick={() => onAction?.(primaryAction)} className={cn("rounded-md px-6 py-3 text-sm font-medium", buttonStyle.primary)}>
            {primaryAction.label}
          </button>
          {secondaryAction && (
             <button type="button" onClick={() => onAction?.(secondaryAction)} className={cn("border px-6 py-3 text-sm font-medium", buttonStyle.secondary)}>
              {secondaryAction.label}
            </button>
          )}
        </div>
      </div>
    );
  }
}
