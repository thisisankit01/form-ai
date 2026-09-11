interface ActivityListProps {
  heading: string;
  items: Array<{
    id: string;
    title: string;
    detail: string;
    timeLabel: string;
  }>;
}

export default function ActivityListSection({
  heading,
  items,
}: ActivityListProps) {
  return (
    <section className="space-y-6">
      {heading && (
        <h2 className="text-lg font-semibold text-[var(--product-foreground)]">
          {heading}
        </h2>
      )}
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="flex items-start space-x-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--product-muted)]">
              <span className="font-medium text-[var(--product-secondary)]">●</span>
            </div>
            <div>
              <h3 className="font-medium text-[var(--product-foreground)]">{item.title}</h3>
              <p className="text-[var(--product-secondary)]">{item.detail}</p>
              {item.timeLabel && (
                <span className="ml-2 font-mono text-xs text-[var(--product-secondary)]">
                  {item.timeLabel}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
