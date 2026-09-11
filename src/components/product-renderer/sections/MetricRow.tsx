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
      <div className="grid gap-4">
        {metrics.map((metric) => (
          <div key={metric.id} className="text-center">
            <p className="text-sm font-medium text-[var(--product-secondary)]">{metric.label}</p>
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
