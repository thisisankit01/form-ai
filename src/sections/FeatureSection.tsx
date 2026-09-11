import { FORMMark } from "@/lib/brand/mark";

export function FeatureSection() {
  return (
    <section
      id="features"
      className="bg-canvas px-4 py-16 sm:px-6 sm:py-20 lg:px-12 lg:py-28"
      aria-labelledby="feature-heading"
    >
      <div className="mx-auto max-w-[1280px]">
        <header className="mb-20 max-w-[40ch] lg:col-span-5">
          <p className="mb-4 mono text-xs font-medium uppercase tracking-wider text-text-secondary">
            A WORKSPACE FOR THE FIRST VERSION
          </p>
          <h2
            id="feature-heading"
            className="font-display text-[clamp(2.5rem,8vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.045em] text-ink"
          >
            Less blank canvas.<br />More considered choices.
          </h2>
        </header>

        <div className="grid gap-16 lg:grid-cols-12">
          <article className="lg:col-span-5 lg:col-start-1">
            <h3 className="mb-4 font-display font-semibold text-[28px] leading-[1.15] tracking-[-0.035em] text-ink">
              Start with evidence.
            </h3>
            <p className="text-base leading-[1.6] text-text-secondary max-w-[38ch]">
              Read what the website actually says, then separate the facts from
              the opportunities.
            </p>
          </article>
          <article className="lg:col-span-7 lg:col-start-6 relative">
            <div className="rounded-panel border border-line bg-surface p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="mono text-xs text-text-secondary">
                  relay.io/product → Source analysis
                </span>
                <a
                  href="/demo"
                  className="mono text-xs text-accent hover:underline"
                  aria-label="View source"
                >
                  View source →
                </a>
              </div>
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="px-2 py-0.5 rounded-control text-xs font-medium bg-accent text-accent-ink">
                  Observed
                </span>
                <span className="px-2 py-0.5 rounded-control text-xs font-medium bg-surface-muted text-text-secondary">
                  Inferred
                </span>
                <span className="px-2 py-0.5 rounded-control text-xs font-medium bg-surface-muted text-text-secondary">
                  Unknown
                </span>
              </div>
              <div className="space-y-4 text-sm leading-[1.5]">
                <div className="flex items-start space-x-3 p-3 rounded-control bg-surface-muted">
                  <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                    <FORMMark className="h-3 w-3 text-accent" />
                  </span>
                  <p className="text-ink">
                    <strong>Async-first coordination</strong> for distributed
                    product teams. Structured updates replace recurring meetings.
                  </p>
                </div>
                <div className="flex items-start space-x-3 p-3 rounded-control bg-surface-muted">
                  <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                    <svg
                      className="h-3 w-3 text-text-secondary"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                  <p className="text-ink">
                    <strong>Decision log</strong> captures context, not just
                    outcomes. Links to GitHub PRs and Linear issues.
                  </p>
                </div>
                <div className="flex items-start space-x-3 p-3 rounded-control bg-surface-muted">
                  <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                    <svg
                      className="h-3 w-3 text-text-secondary"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                  <p className="text-ink">
                    <strong>Weekly digest</strong> summarizes decisions, blockers,
                    and open threads. Configurable per project.
                  </p>
                </div>
              </div>
            </div>
          </article>

          <article className="lg:col-span-7 lg:col-start-1">
            <div className="rounded-panel border border-line bg-surface p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="mono text-xs text-text-secondary">
                  Version 01 → Version 02 · Change receipt
                </span>
                <a
                  href="#how-it-works"
                  className="mono text-xs text-accent hover:underline"
                  aria-label="View changes"
                >
                  View changes →
                </a>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-control border border-line bg-surface-muted p-4">
                  <p className="mono text-xs text-text-secondary mb-2">Before</p>
                  <div className="space-y-2 text-sm">
                    <p className="text-text-secondary">Generic scheduling homepage</p>
                    <p className="text-text-secondary">All audiences, all features</p>
                    <p className="text-text-secondary">Complex onboarding flow</p>
                  </div>
                </div>
                <div className="rounded-control border border-line bg-surface p-4">
                  <p className="mono text-xs text-accent mb-2">After</p>
                  <div className="space-y-2 text-sm">
                    <p className="text-ink">Focused on independent consultants</p>
                    <p className="text-ink">Clear pricing, booking dashboard</p>
                    <p className="text-ink">Simplified 3-step setup</p>
                  </div>
                </div>
              </div>
              <div className="mt-6 space-y-2">
                <p className="mono text-xs font-medium text-text-secondary">
                  Changes in this revision
                </p>
                <ul className="space-y-1 text-sm text-text-secondary">
                  <li>• Repositioned homepage for consultants</li>
                  <li>• Added pricing page with two tiers</li>
                  <li>• Created booking dashboard page</li>
                </ul>
              </div>
            </div>
          </article>
          <article className="lg:col-span-5 lg:col-start-8 self-center">
            <h3 className="mb-4 font-display font-semibold text-[28px] leading-[1.15] tracking-[-0.035em] text-ink">
              Change the product.<br />See the difference.
            </h3>
            <p className="text-base leading-[1.6] text-text-secondary max-w-[38ch]">
              Ask for a new audience, a different homepage, or a dashboard.
              Review what changed before moving on.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}

export default FeatureSection;
