import Link from "next/link";

export function CTASection() {
  return (
    <section className="pt-24 pb-32 bg-ink">
      <div className="container mx-auto px-6 lg:px-8 text-center">
        <h1 className="mb-8 text-3xl font-bold text-text-inverse md:text-4xl lg:text-5xl">
          Give your next idea a form.
        </h1>
        <Link
          href="/signup"
          className="inline-block rounded-md bg-accent px-6 py-3 text-sm font-medium text-accent-ink hover:bg-accent/90"
        >
          Build from a website
        </Link>
      </div>
    </section>
  );
}
