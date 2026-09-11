import { humanizeLabel } from "../display";

interface FeatureListProps {
  heading: string;
  items: Array<{
    id: string;
    title: string;
    body: string;
  }>;
}

export default function FeatureListSection({
  heading,
  items,
}: FeatureListProps) {
  return (
    <section className="space-y-8">
      {heading && (
        <h2 className="text-lg font-semibold text-[var(--product-foreground)]">
          {heading}
        </h2>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item, index) => (
          <div key={item.id} className="rounded-[var(--product-radius-panel)] border border-[var(--product-border)] p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--product-muted)]">
                <span className="font-medium text-[var(--product-secondary)]">{index + 1}</span>
              </div>
              <div className="min-w-0">
                <h3 className="font-medium text-[var(--product-foreground)]">{humanizeLabel(item.title)}</h3>
                <p className="text-[var(--product-secondary)]">{item.body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
