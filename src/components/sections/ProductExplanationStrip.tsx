export function ProductExplanationStrip() {
  return (
    <section className="pt-20 pb-24 bg-surface">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="border-r border-line md:border-b-0 md:border-r md:border-l-0 last:border-0">
            <h3 className="text-text-secondary font-medium text-sm tracking-wide uppercase mb-2">
              01 / Understand the reference
            </h3>
            <p className="text-text">
              See the product, audience, and business model behind the website.
            </p>
          </div>
          <div className="border-r border-line md:border-b-0 md:border-r md:border-l-0 last:border-0">
            <h3 className="text-text-secondary font-medium text-sm tracking-wide uppercase mb-2">
              02 / Shape the alternative
            </h3>
            <p className="text-text">
              Choose the features and direction that make sense for your customers.
            </p>
          </div>
          <div className="border-r border-line md:border-b-0 md:border-r md:border-l-0 last:border-0">
            <h3 className="text-text-secondary font-medium text-sm tracking-wide uppercase mb-2">
              03 / Make it tangible
            </h3>
            <p className="text-text">
              Preview working pages, refine them in chat, and export starter code.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
