import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FORMMark } from "@/lib/brand/mark";

export function Hero() {
  return (
    <section
      className="relative overflow-hidden bg-ink px-4 py-16 text-text-inverse sm:px-6 sm:py-20 lg:px-12 lg:py-24"
      aria-labelledby="hero-heading"
    >
      <div
        className="mx-auto max-w-[1200px] w-full"
      >
        <div className="grid gap-12 lg:grid-cols-[minmax(0,.95fr)_minmax(0,1.05fr)] lg:gap-16">
          <div className="lg:pt-8">
            <p
              className="mb-5 text-xs font-mono uppercase tracking-wider text-text-inverse-secondary"
              id="hero-eyebrow"
            >
              FROM REFERENCE TO FIRST VERSION
            </p>
            <h1
              id="hero-heading"
              className="mb-6 font-display font-semibold leading-[0.99] tracking-[-0.055em] text-hero"
            >
              <span className="block">Good products</span>
              <span className="block">start with</span>
              <span className="block">a clear form.</span>
            </h1>
            <p
              className="mb-7 max-w-[440px] text-intro font-normal leading-[1.6] text-text-inverse-secondary"
            >
              Turn any public website into a product brief, a working interface,
              and a starting point you can make your own.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="w-full sm:w-auto h-[48px] px-5 bg-accent text-accent-ink hover:bg-accent/90"
              >
                <Link href="/signup">Build from a website</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full sm:w-auto h-[48px] px-5 border-text-inverse/30 text-text-inverse hover:bg-white/5"
              >
                <Link href="/demo">Explore an example</Link>
              </Button>
            </div>
            <p className="mt-5 text-sm text-text-inverse-secondary">
              Bring a URL. Leave with a direction.
            </p>
          </div>
          <div className="relative">
            <div
              className="relative z-10 min-h-[300px] w-full max-w-[660px] overflow-hidden rounded-stage border border-line-dark bg-ink-raised shadow-float sm:min-h-[360px]"
              aria-label="Product workspace sample"
            >
              <div
                className="absolute -inset-4 rounded-[24px] bg-[radial-gradient(ellipse_at_center,_rgba(136,136,136,0.12)_0%,_transparent_70%)]"
                aria-hidden="true"
              />
              <ProductStage />
            </div>
            <p className="mt-4 text-xs text-center text-text-inverse-secondary">
              Interactive sample — not a live AI run
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductStage() {
  return (
    <div className="relative h-full flex flex-col overflow-hidden rounded-stage">
      <div className="flex h-12 min-w-0 items-center justify-between border-b border-line-dark bg-ink px-3 sm:px-4">
        <div className="flex min-w-0 items-center space-x-2">
          <FORMMark className="h-4 w-4 text-text-inverse" />
          <span className="font-mono text-xs text-text-inverse">Relay</span>
          <span className="text-xs text-text-inverse-secondary">/ Version 02</span>
        </div>
        <div className="hidden items-center space-x-2 sm:flex">
          <span className="mono text-xs text-text-inverse-secondary">Brief</span>
          <span className="mono text-xs text-text-inverse-secondary">Chat</span>
          <span className="mono text-xs text-text-inverse-secondary">Overview</span>
          <span className="mono text-xs text-text-inverse-secondary">Preview</span>
          <span className="mono text-xs text-text-inverse-secondary">Code</span>
        </div>
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div className="hidden w-[190px] flex-shrink-0 overflow-y-auto border-r border-line-dark bg-ink p-3 sm:block">
          <div className="space-y-3 text-xs">
            <div>
              <p className="font-medium text-text-inverse mb-1">What this product does</p>
              <p className="text-text-inverse-secondary leading-[1.5]">
                Relay helps teams coordinate asynchronous work through structured
                updates and decisions.
              </p>
            </div>
            <div className="pt-3 border-t border-line-dark">
              <p className="font-medium text-text-inverse mb-1">Who it serves</p>
              <p className="text-text-inverse-secondary leading-[1.5]">
                Product teams, engineering leads, and distributed organizations.
              </p>
            </div>
            <div className="pt-3 border-t border-line-dark">
              <p className="font-medium text-text-inverse mb-1">Key features</p>
              <ul className="space-y-1 text-text-inverse-secondary leading-[1.5]">
                <li>• Structured async updates</li>
                <li>• Decision log with context</li>
                <li>• Integration with GitHub/Linear</li>
                <li>• Weekly digest emails</li>
              </ul>
            </div>
            <div className="pt-3 border-t border-line-dark">
              <p className="font-medium text-text-inverse mb-1">Opportunities</p>
              <ul className="space-y-1 text-text-inverse-secondary leading-[1.5]">
                <li>• Simpler onboarding flow</li>
                <li>• Public sharing for consultants</li>
                <li>• Lighter mobile experience</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col bg-surface overflow-hidden">
          <div className="h-12 border-b border-line px-4 flex items-center">
            <span className="mono text-xs text-text-secondary">Generated scheduling page</span>
          </div>
          <div className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="max-w-md space-y-6">
              <div>
                <h2 className="font-display font-semibold text-[28px] leading-[1.15] tracking-[-0.035em] text-ink">
                  Schedule your week
                </h2>
                <p className="mt-2 text-text-secondary leading-[1.5]">
                  Drag blocks, set recurrence, and share with your team.
                </p>
              </div>
              <div className="space-y-3 border-t border-line pt-6">
                <div className="flex items-center justify-between p-3 rounded-control bg-muted">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-accent" />
                    <div>
                      <p className="font-medium text-sm text-ink">Team standup</p>
                      <p className="mono text-xs text-text-secondary">Mon 9:00 AM · 15 min</p>
                    </div>
                  </div>
                  <span className="mono text-xs text-text-secondary">Recurring</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-control bg-muted">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-accent" />
                    <div>
                      <p className="font-medium text-sm text-ink">Design review</p>
                      <p className="mono text-xs text-text-secondary">Tue 2:00 PM · 45 min</p>
                    </div>
                  </div>
                  <span className="mono text-xs text-text-secondary">This week</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-control bg-muted">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-accent" />
                    <div>
                      <p className="font-medium text-sm text-ink">Planning session</p>
                      <p className="mono text-xs text-text-secondary">Wed 10:00 AM · 60 min</p>
                    </div>
                  </div>
                  <span className="mono text-xs text-text-secondary">One-time</span>
                </div>
              </div>
              <Button
                className="w-full justify-center bg-ink text-text-inverse hover:bg-ink-raised"
              >
                Create new block
              </Button>
            </div>
          </div>
        </div>
      </div>
      <div className="flex h-14 items-center px-4 border-t border-line-dark bg-ink">
        <div className="flex items-center space-x-2 text-xs text-text-inverse-secondary">
          <svg
            className="h-3.5 w-3.5 text-accent flex-shrink-0"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <span>Updated for independent consultants</span>
        </div>
      </div>
    </div>
  );
}

export default Hero;
