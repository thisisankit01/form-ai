import { humanizeLabel } from "../display";

interface MetricRowProps {
  metrics: Array<{
    id: string;
    label: string;
    value: string;
    delta?: string;
  }>;
}

export default function MetricRowSection({
  metrics,
}: MetricRowProps) {
  return (
    <section className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.id} className="rounded-[var(--product-radius-panel)] border border-[var(--product-border)] bg-[var(--product-muted)]/35 p-5 text-left">
            <p className="text-sm font-medium text-[var(--product-secondary)]">{humanizeLabel(metric.label)}</p>
            <p className="mt-1 text-2xl font-bold text-[var(--product-foreground)]">{metric.value}</p>
            {metric.delta && (
              <p className={`text-xs font-medium ${metric.delta.startsWith("-") ? "text-danger" : "text-success"}`}>
                {metric.delta}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
