interface RichTextProps {
  heading: string;
  paragraphs: string[];
}

export default function RichTextSection({
  heading,
  paragraphs,
}: RichTextProps) {
  return (
    <section className="space-y-6">
      {heading && (
        <h2 className="text-lg font-semibold text-[var(--product-foreground)]">
          {heading}
        </h2>
      )}
      <div className="space-y-6">
        {paragraphs.map((p, index) => (
          <p key={index} className="leading-relaxed text-[var(--product-secondary)]">
            {p}
          </p>
        ))}
      </div>
    </section>
  );
}
