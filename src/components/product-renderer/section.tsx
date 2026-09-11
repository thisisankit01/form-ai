import HeroSection from "./sections/Hero";
import FeatureListSection from "./sections/FeatureList";
import StepsSection from "./sections/Steps";
import PricingSection from "./sections/Pricing";
import FaqSection from "./sections/Faq";
import CtaSection from "./sections/Cta";
import MetricRowSection from "./sections/MetricRow";
import DataTableSection from "./sections/DataTable";
import ActivityListSection from "./sections/ActivityList";
import RichTextSection from "./sections/RichText";
import { Section } from "@/lib/product/schema";

export default function ProductSection({ section, onAction }: { section: Section; onAction?: (action: unknown) => void }) {
  switch (section.type) {
    case "hero":
      return <HeroSection {...section} onAction={onAction} />;
    case "feature-list":
      return <FeatureListSection {...section} />;
    case "steps":
      return <StepsSection {...section} />;
    case "pricing":
      return <PricingSection {...section} onAction={onAction} />;
    case "faq":
      return <FaqSection {...section} />;
    case "cta":
      return <CtaSection {...section} onAction={onAction} />;
    case "metric-row":
      return <MetricRowSection {...section} />;
    case "data-table":
      return <DataTableSection {...section} />;
    case "activity-list":
      return <ActivityListSection {...section} />;
    case "rich-text":
      return <RichTextSection {...section} />;
    default: {
      const _exhaustive: never = section;
      return <div>Unknown section type: {_exhaustive}</div>;
    }
  }
}
