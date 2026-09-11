import { Button } from "@/components/ui/button";

export function SamplePricing() {
  const plans = [
    {
      name: "Explore",
      price: "Free",
      description: "Try the sample workspace.",
      cta: "Explore example",
      href: "/demo",
      variant: "outline" as const,
      highlight: false,
    },
    {
      name: "Builder",
      price: "$19 / month",
      description: "Illustrative individual plan.",
      cta: "Try the prototype",
      href: "/signup",
      variant: "default" as const,
      highlight: true,
    },
    {
      name: "Studio",
      price: "$49 / month",
      description: "Illustrative team plan.",
      cta: "Try the prototype",
      href: "/signup",
      variant: "default" as const,
      highlight: false,
    },
  ];

  return (
    <section
      id="pricing"
      className="bg-canvas px-4 py-16 sm:px-6 sm:py-20 lg:px-12 lg:py-28"
      aria-labelledby="pricing-heading"
    >
      <div className="mx-auto max-w-[1280px]">
        <header className="mb-16 max-w-[40ch]">
          <h2
            id="pricing-heading"
            className="mb-4 font-display text-[clamp(2.5rem,8vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.045em] text-ink"
          >
            Start small. Build with intent.
          </h2>
          <p className="mono text-sm text-text-secondary">
            Illustrative plans for this prototype. No payment is collected.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className="relative flex flex-col rounded-panel border border-line bg-surface p-6"
              style={{
                borderTopWidth: plan.highlight ? "4px" : "1px",
                borderTopColor: plan.highlight ? "var(--ink)" : "var(--line)",
              }}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-6 mono text-xs font-medium px-2 py-0.5 bg-ink text-text-inverse rounded-control">
                  SAMPLE PLAN
                </span>
              )}
              <div className="mb-6">
                <h3 className="font-display font-semibold text-[20px] leading-[1.3] tracking-[-0.035em] text-ink mb-2">
                  {plan.name}
                </h3>
                <p className="mono text-[32px] font-medium text-ink">{plan.price}</p>
              </div>
              <p className="mb-8 text-base leading-[1.6] text-text-secondary flex-1">
                {plan.description}
              </p>
              <Button
                asChild
                variant={plan.variant}
                className="w-full h-[48px] justify-center"
              >
                <a href={plan.href}>{plan.cta}</a>
              </Button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default SamplePricing;
