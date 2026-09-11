interface StepsProps {
  heading: string;
  items: Array<{
    id?: string;
    title: string;
    body: string;
  }>;
}

export default function StepsSection({
  heading,
  items,
}: StepsProps) {
  return (
    <section className="space-y-8">
      {heading && (
        <h2 className="text-lg font-semibold text-[var(--product-foreground)]">
          {heading}
        </h2>
      )}
      <ol className="grid gap-6 text-[var(--product-secondary)]">
        {items.map((item, index) => (
          <li key={item.id || index} className="flex items-start space-x-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--product-accent)]/20">
              <span className="font-medium text-[var(--product-accent)]">{index + 1}</span>
            </div>
            <div>
              <h3 className="font-medium text-[var(--product-foreground)]">{item.title}</h3>
              <p className="text-[var(--product-secondary)]">{item.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
