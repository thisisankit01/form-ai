import { useState } from "react";

interface FaqProps {
  heading: string;
  items: Array<{
    id?: string;
    question: string;
    answer: string;
  }>;
}

export default function FaqSection({
  heading,
  items,
}: FaqProps) {
  const [openId, setOpenId] = useState<string | number | null>(null);
  return (
    <section className="space-y-8">
      {heading && (
        <h2 className="text-lg font-semibold text-[var(--product-foreground)]">
          {heading}
        </h2>
      )}
      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={item.id || index} className="border-t border-[var(--product-border)] pt-4 first:border-t-0 first:pt-0">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 p-4 text-left font-medium text-[var(--product-foreground)]"
              aria-expanded={openId === (item.id || index)}
              aria-controls={`faq-${item.id || index}`}
              onClick={() => setOpenId(openId === (item.id || index) ? null : (item.id || index))}
            >
              <span>{item.question}</span>
              <svg
                 className={`h-4 w-4 shrink-0 transition-transform duration-200 ${openId === (item.id || index) ? "rotate-180" : ""}`}
                 aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            <div id={`faq-${item.id || index}`} hidden={openId !== (item.id || index)} className="px-4 pb-4 pt-1 text-[var(--product-secondary)]">
              {item.answer}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
