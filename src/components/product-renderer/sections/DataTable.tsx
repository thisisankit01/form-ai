interface DataTableProps {
  heading: string;
  columns: Array<{
    key: string;
    label: string;
  }>;
  rows: Array<Record<string, string>>;
}

export default function DataTableSection({
  heading,
  columns,
  rows,
}: DataTableProps) {
  return (
    <section className="space-y-6">
      {heading && (
        <h2 className="text-lg font-semibold text-[var(--product-foreground)]">
          {heading}
        </h2>
      )}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-[var(--product-secondary)]">
          <thead>
            <tr className="border-b border-[var(--product-border)]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="p-4 text-left text-xs font-medium uppercase tracking-wider text-[var(--product-secondary)]"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row, rowIndex) => (
              <tr key={row.id || rowIndex} className="hover:bg-[var(--product-muted)]">
                {columns.map((col) => (
                  <td key={col.key} className="p-4">
                    {row[col.key] || ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
