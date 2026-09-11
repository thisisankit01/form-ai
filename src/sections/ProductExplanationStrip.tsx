export function ProductExplanationStrip() {
  const items = [
    {
      number: "01",
      title: "Understand the reference",
      description:
        "See the product, audience, and business model behind the website.",
    },
    {
      number: "02",
      title: "Shape the alternative",
      description:
        "Choose the features and direction that make sense for your customers.",
    },
    {
      number: "03",
      title: "Make it tangible",
      description:
        "Preview working pages, refine them in chat, and export starter code.",
    },
  ];

  return (
    <section
      id="product"
      className="border-y border-line bg-canvas px-4 py-16 sm:px-6 sm:py-20 lg:px-12 lg:py-28"
      aria-labelledby="product-strip-heading"
    >
      <div className="mx-auto max-w-[1280px]">
        <h2 id="product-strip-heading" className="sr-only">
          How FORM turns a reference into a first version
        </h2>
        <div className="grid grid-cols-1 gap-0 lg:grid-cols-3 lg:gap-8">
          {items.map((item) => (
            <article
              key={item.number}
              className="relative flex flex-col border-b border-line py-8 first:pt-0 last:border-b-0 last:pb-0 lg:min-h-[200px] lg:border-b-0 lg:border-r lg:py-0 lg:pr-12 lg:pl-12 lg:first:pl-0 lg:last:border-r-0 lg:last:pr-0"
            >
              <div className="flex flex-col">
                <p className="mb-2 mono text-sm font-medium text-text-secondary">
                  {item.number}
                </p>
                <h3
                  className="mb-3 font-display font-semibold text-[20px] leading-[1.3] tracking-[-0.035em] text-ink"
                  style={{ letterSpacing: "-0.035em" }}
                >
                  {item.title}
                </h3>
                <p className="text-base leading-[1.6] text-text-secondary max-w-[38ch]">
                  {item.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ProductExplanationStrip;
