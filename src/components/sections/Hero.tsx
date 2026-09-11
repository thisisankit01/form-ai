import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative pt-24 pb-32 bg-ink">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-start lg:space-x-12">
          {/* Text content */}
          <div className="flex-1 lg:w-5/12 space-y-6">
            <div className="text-text-secondary font-medium text-sm tracking-wide uppercase">
              FROM REFERENCE TO FIRST VERSION
            </div>
            <h1 className="mb-6 text-3xl font-bold text-text-inverse md:text-4xl lg:text-5xl">
              Good products<br className="hidden lg:inline" />
              start with<br className="hidden lg:inline" />
              a clear form.
            </h1>
            <p className="text-text-secondary max-w-xl">
              Turn any public website into a product brief, a working interface, and a starting point you can make your own.
            </p>
            <div className="flex space-x-4 mt-8">
              <Link
                href="/signup"
                className="flex-1 rounded-md bg-accent px-6 py-3 text-sm font-medium text-accent-ink hover:bg-accent/90"
              >
                Build from a website
              </Link>
              <Link
                href="/demo"
                className="flex-1 border border-line rounded-md px-6 py-3 text-sm font-medium text-text-secondary hover:bg-surface-muted"
              >
                Explore an example
              </Link>
            </div>
            <p className="mt-4 text-text-secondary text-sm">
              Bring a URL. Leave with a direction.
            </p>
          </div>

          {/* Product stage (right side) */}
          <div className="flex-1 lg:w-7/12">
            <div className="relative h-[500px] w-full rounded-stage border border-line-dark bg-surface-muted">
              {/* Subtle radial light */}
              <div className="absolute inset-0 bg-gray-900 opacity-5 pointer-events-none" />
              
              {/* Outer frame */}
              <div className="absolute inset-0 rounded-stage border border-line-dark bg-surface p-4">
                {/* Header */}
                <div className="flex items-start space-x-4 mb-4">
                  <div className="flex-shrink-0 w-19">
                    <div className="h-4 w-4 bg-accent/20 rounded-sm mb-2"></div>
                    <div className="h-4 w-4 bg-accent/20 rounded-sm mb-2"></div>
                    <div className="h-4 w-4 bg-accent/20 rounded-sm"></div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-text-secondary font-mono text-xs">
                      Relay / Version 02
                    </p>
                  </div>
                </div>
                
                {/* Content area */}
                <div className="flex h-full">
                  {/* Left brief panel */}
                  <div className="w-[190px] border-r border-line bg-surface p-4">
                    <div className="space-y-4">
                      <div className="h-4 w-16 bg-accent/20 rounded"></div>
                      <div className="h-4 w-20 bg-accent/20 rounded"></div>
                      <div className="h-4 w-12 bg-accent/20 rounded"></div>
                    </div>
                  </div>
                  
                  {/* Right preview area */}
                  <div className="flex-1 p-4 bg-accent/5">
                    <div className="h-4 w-2/3 bg-accent/20 rounded-lg mb-4"></div>
                    <div className="space-y-2">
                      <div className="h-4 w-1/2 bg-accent/20 rounded-lg mb-2"></div>
                      <div className="h-4 w-3/5 bg-accent/20 rounded-lg mb-2"></div>
                      <div className="h-4 w-1/3 bg-accent/20 rounded-lg"></div>
                    </div>
                  </div>
                </div>
                
                {/* Change receipt */}
                <div className="absolute bottom-4 left-4 flex items-center space-x-2 text-xs">
                  <span className="flex h-3 w-3 items-center justify-center bg-accent/20 rounded-full">
                    <span className="text-accent font-medium">✓</span>
                  </span>
                  <span className="text-text-secondary">Updated for independent consultants</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
