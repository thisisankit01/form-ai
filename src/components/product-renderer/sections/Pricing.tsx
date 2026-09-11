interface PricingProps {
  onAction?: (action: unknown) => void;
  heading: string;
  plans: Array<{
    id: string;
    name: string;
    priceLabel: string;
    description: string;
    features: string[];
    action: ProductAction;
  }>;
}

interface ProductAction {
  kind: string;
  label: string;
  pageId?: string;
  sectionId?: string;
  dialogTitle?: string;
  dialogBody?: string;
}

export default function PricingSection({
  heading,
  plans,
  onAction,
}: PricingProps) {
  return (
    <section className="space-y-8">
      {heading && (
        <h2 className="text-lg font-semibold text-[var(--product-foreground)]">
          {heading}
        </h2>
      )}
      <div className="grid gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="space-y-6 rounded-[var(--product-radius-panel)] border border-[var(--product-border)] p-8"
          >
            <h3 className="text-lg font-semibold text-[var(--product-foreground)]">
              {plan.name}
            </h3>
            <p className="font-medium text-[var(--product-secondary)]">
              {plan.priceLabel}
            </p>
            <p className="text-[var(--product-foreground)]">{plan.description}</p>
            <ul className="space-y-4 text-[var(--product-secondary)]">
              {plan.features.map((feature) => (
                <li key={feature}>
                  <span className="flex h-3 w-3 items-center justify-center me-2">
                    <span className="font-medium text-[var(--product-accent)]">•</span>
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => onAction?.(plan.action)}
              className="w-full rounded-md border border-[var(--product-border)] px-4 py-3 text-left text-[var(--product-secondary)] transition-colors hover:border-[var(--product-accent)] hover:text-[var(--product-foreground)]"
            >
              {plan.action.label}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
