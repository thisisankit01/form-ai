interface CtaProps {
  action: ProductAction;
  onAction?: (action: unknown) => void;
  heading: string;
  body: string;
}

interface ProductAction {
  kind: string;
  label: string;
  pageId?: string;
  sectionId?: string;
  dialogTitle?: string;
  dialogBody?: string;
}

export default function CtaSection({
  heading,
  body,
  action,
  onAction,
}: CtaProps) {
  return (
    <section className="space-y-6">
      {heading && (
        <h2 className="text-lg font-semibold text-[var(--product-foreground)]">
          {heading}
        </h2>
      )}
      {body && (
        <p className="text-[var(--product-secondary)]">
          {body}
        </p>
      )}
      <button
        type="button"
        onClick={() => onAction?.(action)}
        className="rounded-md bg-[var(--product-accent)] px-6 py-3 text-sm font-medium text-[var(--product-accent-ink)] hover:opacity-90"
      >
        {action.label}
      </button>
    </section>
  );
}
