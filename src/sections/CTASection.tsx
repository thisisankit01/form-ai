import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FORMMark } from "@/lib/brand/mark";

export function CTASection() {
  return (
    <>
<section
      id="cta"
       className="bg-ink px-4 py-16 text-text-inverse sm:px-6 sm:py-20 lg:px-12 lg:py-28"
      aria-labelledby="cta-heading"
    >
        <div className="mx-auto max-w-[1280px] text-center">
          <h2
            id="cta-heading"
             className="mb-8 font-display text-[clamp(2.5rem,8vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.045em] text-text-inverse"
          >
            Give your next idea a form.
          </h2>
          <Button
            asChild
            size="lg"
            className="w-full sm:w-auto h-[48px] px-5 bg-accent text-accent-ink hover:bg-accent/90"
          >
            <Link href="/signup">Build from a website</Link>
          </Button>
        </div>
      </section>

      <footer
         className="border-t border-line-dark bg-ink px-4 py-12 text-text-inverse sm:px-6 sm:py-16 lg:px-12"
        role="contentinfo"
      >
        <div className="mx-auto max-w-[1280px]">
          <div className="grid gap-12 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <FORMMark className="h-6 w-6 text-text-inverse" />
                <span className="font-display font-semibold text-lg text-text-inverse">
                  FORM
                </span>
              </div>
              <p className="text-text-inverse-secondary max-w-[40ch] leading-[1.6]">
                A focused studio for turning references into first versions.
              </p>
            </div>

            <nav aria-label="Product">
              <h3 className="mono text-xs font-medium uppercase tracking-wider text-text-inverse-secondary mb-4">
                Product
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link
                     href="/"
                    className="text-sm text-text-inverse-secondary hover:text-accent transition-colors"
                  >
                    Landing
                  </Link>
                </li>
                <li>
                  <Link
                     href="#how-it-works"
                    className="text-sm text-text-inverse-secondary hover:text-accent transition-colors"
                  >
                    How it works
                  </Link>
                </li>
                <li>
                  <Link
                    href="#pricing"
                    className="text-sm text-text-inverse-secondary hover:text-accent transition-colors"
                  >
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link
                     href="/demo"
                    className="text-sm text-text-inverse-secondary hover:text-accent transition-colors"
                  >
                    Explore example
                  </Link>
                </li>
              </ul>
            </nav>

            <nav aria-label="Legal">
              <h3 className="mono text-xs font-medium uppercase tracking-wider text-text-inverse-secondary mb-4">
                Legal
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="/privacy"
                    className="text-sm text-text-inverse-secondary hover:text-accent transition-colors"
                  >
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="text-sm text-text-inverse-secondary hover:text-accent transition-colors"
                  >
                    Terms
                  </Link>
                </li>
              </ul>
            </nav>
          </div>

          <div className="mt-12 pt-8 border-t border-line-dark flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="mono text-xs text-text-inverse-secondary">
              © {new Date().getFullYear()} FORM. All rights reserved.
            </p>
            <div className="flex items-center space-x-6">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-inverse-secondary hover:text-accent transition-colors"
                aria-label="GitHub"
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

export default CTASection;
