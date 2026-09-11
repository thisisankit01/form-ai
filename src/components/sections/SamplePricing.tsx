export function SamplePricing() {
  return (
    <section className="pt-20 pb-24 bg-canvas">
      <div className="container mx-auto px-6 lg:px-8">
        <h2 className="text-text-secondary font-medium text-sm tracking-wide uppercase mb-6">
          Start small. Build with intent.
        </h2>
        <p className="max-w-xl text-text-secondary mx-auto mb-12">
          Illustrative plans for this prototype. No payment is collected.
        </p>
        <div className="grid gap-6 md:grid-cols-3">
          {/* Explore - Free */}
          <div className="border border-line rounded-xl p-8 space-y-6">
            <h3 className="text-text font-semibold text-lg">Explore</h3>
            <p className="text-text-secondary font-medium">Free</p>
            <p className="text-text mb-4">
              Try the sample workspace.
            </p>
            <button className="w-full text-left text-text-secondary hover:text-accent">
              Explore example → /demo
            </button>
          </div>
          
          {/* Builder - $19/month */}
          <div className="border-t-2 border-accent border-line rounded-xl p-8 space-y-6">
            <h3 className="text-text font-semibold text-lg">Builder</h3>
            <p className="text-text-secondary font-medium">$19 / month</p>
            <p className="text-text mb-4">
              Illustrative individual plan.
            </p>
            <button className="w-full text-left text-text-secondary hover:text-accent">
              Try the prototype → /signup
            </button>
          </div>
          
          {/* Studio - $49/month */}
          <div className="border border-line rounded-xl p-8 space-y-6">
            <h3 className="text-text font-semibold text-lg">Studio</h3>
            <p className="text-text-secondary font-medium">$49 / month</p>
            <p className="text-text mb-4">
              Illustrative team plan.
            </p>
            <button className="w-full text-left text-text-secondary hover:text-accent">
              Try the prototype → /signup
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
