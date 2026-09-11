export function HowItWorks() {
  return (
    <section className="pt-20 pb-24 bg-surface">
      <div className="container mx-auto px-6 lg:px-8">
        <h2 className="text-text-secondary font-medium text-sm tracking-wide uppercase mb-8">
          A URL is enough to begin.
        </h2>
        <div className="space-y-12">
          <div className="border-t border-line pt-12">
            <div className="flex flex-col items-start space-x-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent/20 flex-shrink-0">
                <span className="text-accent font-bold text-xl">01</span>
              </div>
              <div>
                <h3 className="text-text font-semibold text-lg">Bring a reference</h3>
                <p className="text-text-secondary max-w-xl">
                  Start with any public website - a competitor, inspiration, or your current site.
                </p>
              </div>
            </div>
          </div>
          <div className="border-t border-line pt-12">
            <div className="flex flex-col items-start space-x-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent/20 flex-shrink-0">
                <span className="text-accent font-bold text-xl">02</span>
              </div>
              <div>
                <h3 className="text-text font-semibold text-lg">Review the direction</h3>
                <p className="text-text-secondary max-w-xl">
                  See the evidence, shape your alternative, and define what makes your version different.
                </p>
              </div>
            </div>
          </div>
          <div className="border-t border-line pt-12 pb-8">
            <div className="flex flex-col items-start space-x-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent/20 flex-shrink-0">
                <span className="text-accent font-bold text-xl">03</span>
              </div>
              <div>
                <h3 className="text-text font-semibold text-lg">Build and refine</h3>
                <p className="text-text-secondary max-w-xl">
                  Generate working pages, edit in chat, and export starter code you can keep.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
