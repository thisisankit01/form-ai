export function FeatureSection() {
  return (
    <section className="pt-20 pb-24 bg-surface">
      <div className="container mx-auto px-6 lg:px-8">
        <h2 className="text-text-secondary font-medium text-sm tracking-wide uppercase mb-4">
          A WORKSPACE FOR THE FIRST VERSION
        </h2>
        <h1 className="mb-12 text-2xl font-semibold tracking-tight md:text-3xl lg:text-4xl">
          Less blank canvas.<br className="hidden md:inline" />More considered choices.
        </h1>
        <div className="grid gap-12 md:grid-cols-2">
          {/* Row 1: Start with evidence */}
          <div className="flex flex-col md:flex-row md:items-start md:space-x-8">
            <div className="w-full md:w-1/2 space-y-4">
              <h3 className="text-text font-semibold text-lg">
                Start with evidence.
              </h3>
              <p className="text-text-secondary">
                Read what the website actually says, then separate the facts from the opportunities.
              </p>
            </div>
            <div className="w-full md:w-1/2 space-y-4">
              {/* Sample evidence item */}
              <div className="flex items-start space-x-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-surface-muted">
                  <span className="text-text-secondary font-medium">01</span>
                </div>
                <div>
                  <h4 className="text-text font-medium">User research shows 68% abandon signup due to unclear pricing</h4>
                  <p className="text-text-secondary text-sm mt-1">
                    <a href="/demo" className="underline underline-offset-4 hover:text-accent">
                      veeblefetzer.com/pricing
                    </a>
                  </p>
                  <div className="flex mt-2 space-x-3">
                    <span className="inline-flex h-3 w-3 rounded-full bg-accent"></span>
                    <span className="text-xs text-accent">Observed</span>
                    <span className="inline-flex h-3 w-3 rounded-full bg-warning/20"></span>
                    <span className="text-xs text-warning">Inferred</span>
                    <span className="inline-flex h-3 w-3 rounded-full bg-danger/20"></span>
                    <span className="text-xs text-danger">Unknown</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Row 2: Change the product */}
          <div className="flex flex-col md:flex-row md:items-start md:space-x-8 mt-12">
            <div className="w-full md:w-1/2 space-y-4 order-2 md:order-1">
              <h3 className="text-text font-semibold text-lg">
                Change the product.<br className="hidden md:inline" />See the difference.
              </h3>
              <p className="text-text-secondary">
                Ask for a new audience, a different homepage, or a dashboard. Review what changed before moving on.
              </p>
            </div>
            <div className="w-full md:w-1/2 space-y-4 order-1 md:order-2">
              {/* Sample before/after */}
              <div className="space-y-4">
                <div className="flex items-start space-x-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-surface-muted">
                    <span className="text-text-secondary font-medium">A</span>
                  </div>
                  <div>
                    <h4 className="text-text font-medium">Before: Generic scheduling tool</h4>
                    <p className="text-text-secondary text-sm mt-1">
                       One-size-fits-all approach that doesn&apos;t serve independent consultants well.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent/20">
                    <span className="text-text-secondary font-medium">B</span>
                  </div>
                  <div>
                    <h4 className="text-text font-medium">After: Consultant-focused with tiered pricing</h4>
                    <p className="text-text-secondary text-sm mt-1">
                      Tailored packages for solo practitioners, small teams, and agencies.
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center space-x-3 text-xs">
                  <span className="flex h-3 w-3 items-center justify-center bg-accent/20 rounded-full">
                    <span className="text-accent font-medium">+</span>
                  </span>
                  <span className="text-text-secondary">Updated for independent consultants</span>
                  <span className="flex h-3 w-3 items-center justify-center ml-2">
                    <svg className="h-4 w-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
