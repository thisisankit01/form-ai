import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Authentication | FORM",
  description: "Sign in or create an account to access FORM",
};

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex bg-canvas">
      <div className="hidden lg:flex lg:w-[44%] flex-col items-center justify-center p-12 bg-ink text-text-inverse">
        <div className="max-w-sm mx-auto text-center">
          <h1 className="font-display text-3xl md:text-4xl font-semibold leading-[0.99] tracking-[-0.055em]">
            Your next product,<br />
            <span className="block">in good shape.</span>
          </h1>
          <p className="mt-6 text-lg text-text-inverse-secondary max-w-xs mx-auto">
            Turn any website into a considered product concept, a working interface, and starter code you can make your own.
          </p>
          <div className="mt-12 p-6 rounded-[16px] border border-line-dark bg-ink-raised">
            <div className="space-y-3 text-left text-sm">
              <div className="flex items-center gap-3 text-text-inverse-secondary">
                <span className="w-2 h-2 rounded-full bg-accent" />
                <span>Source analysis with evidence</span>
              </div>
              <div className="flex items-center gap-3 text-text-inverse-secondary">
                <span className="w-2 h-2 rounded-full bg-accent" />
                <span>AI-shaped product direction</span>
              </div>
              <div className="flex items-center gap-3 text-text-inverse-secondary">
                <span className="w-2 h-2 rounded-full bg-accent" />
                <span>Working preview you can refine</span>
              </div>
              <div className="flex items-center gap-3 text-text-inverse-secondary">
                <span className="w-2 h-2 rounded-full bg-accent" />
                <span>Exportable starter code</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 lg:p-16">
        <div className="w-full max-w-[380px]">
          {children}
        </div>
      </div>
    </div>
  );
}