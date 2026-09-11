import { cn } from "@/lib/utils";
import { isRenderableMediaUrl } from "../display";

interface HeroProps {
  eyebrow: string;
  headline: string;
  body: string;
  primaryAction: ProductAction;
  secondaryAction?: ProductAction;
  composition: "split" | "centered";
  media?: { url: string; alt: string };
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
  media,
  onAction,
}: HeroProps) {
  const mediaIsUsable = media && isRenderableMediaUrl(media.url);
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
        <div className="relative min-h-[280px] w-full overflow-hidden rounded-[var(--product-radius-stage)] border border-[var(--product-border)] bg-[var(--product-muted)] lg:min-h-[500px]">
          {mediaIsUsable ? (
            <img src={media.url} alt={media.alt} className="h-full min-h-[280px] w-full object-cover lg:min-h-[500px]" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-[var(--product-secondary)]">
              Preview
            </div>
          )}
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
