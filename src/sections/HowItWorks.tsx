export function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Bring a reference",
      description:
        "Enter a public website URL, describe what you want to build differently, and define your target customer.",
    },
    {
      number: "02",
      title: "Review the direction",
      description:
        "FORM analyzes the source, extracts evidence, and proposes a product brief with MVP features you can adjust.",
    },
    {
      number: "03",
      title: "Build and refine",
      description:
        "Generate a working preview, iterate in chat with versioned changes, and export starter code when ready.",
    },
  ];

  return (
    <section
      id="how-it-works"
      className="bg-ink px-4 py-16 text-text-inverse sm:px-6 sm:py-20 lg:px-12 lg:py-28"
      aria-labelledby="how-it-works-heading"
    >
      <div className="mx-auto max-w-[1280px]">
        <span id="features" className="relative -top-4 block" aria-hidden="true" />
        <header className="mb-20 max-w-[40ch]">
          <h2
            id="how-it-works-heading"
            className="font-display text-[clamp(2.5rem,8vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.045em] text-text-inverse"
          >
            A URL is enough to begin.
          </h2>
        </header>

        <div className="space-y-0">
          {steps.map((step) => (
            <article
              key={step.number}
              className="flex gap-8 py-10 border-t border-line-dark last:border-b border-line-dark"
            >
              <div className="flex-shrink-0 w-12 text-right">
                <span className="mono text-[32px] font-medium text-text-inverse-secondary">
                  {step.number}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-semibold text-[20px] leading-[1.3] tracking-[-0.035em] text-text-inverse mb-2">
                  {step.title}
                </h3>
                <p className="text-base leading-[1.6] text-text-inverse-secondary max-w-[56ch]">
                  {step.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
