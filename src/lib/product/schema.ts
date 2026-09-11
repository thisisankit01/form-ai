import { z } from "zod";

// Evidence status types
export const EvidenceStatus = z.enum(["observed", "inferred", "unknown"]);
export type EvidenceStatus = z.infer<typeof EvidenceStatus>;

// Evidence type
export const Evidence = z.object({
  id: z.string(),
  sourceUrl: z.string(),
  excerpt: z.string().max(500),
});
export type Evidence = z.infer<typeof Evidence>;

// Claim type
export const Claim = z.object({
  text: z.string().max(800),
  status: EvidenceStatus,
  evidenceIds: z.array(z.string()),
});
export type Claim = z.infer<typeof Claim>;

// SourceFacts - used by Research Agent
export const SourceFacts = z.object({
  summary: z.object({
    text: z.string().max(800),
    status: z.enum(["observed", "inferred", "unknown"]),
    evidenceIds: z.array(z.string()),
  }),
  targetUsers: z.array(z.object({
    text: z.string().max(800),
    status: z.enum(["observed", "inferred", "unknown"]),
    evidenceIds: z.array(z.string()),
  })).min(1).max(6),
  coreProblem: z.object({
    text: z.string().max(800),
    status: z.enum(["observed", "inferred", "unknown"]),
    evidenceIds: z.array(z.string()),
  }),
  keyFeatures: z.array(z.object({
    text: z.string().max(800),
    status: z.enum(["observed", "inferred", "unknown"]),
    evidenceIds: z.array(z.string()),
  })).min(1).max(10),
  businessModel: z.object({
    text: z.string().max(800),
    status: z.enum(["observed", "inferred", "unknown"]),
    evidenceIds: z.array(z.string()),
  }),
  evidence: z.array(z.object({
    id: z.string(),
    sourceUrl: z.string(),
    excerpt: z.string().max(500),
  })),
  limitations: z.array(z.string()),
});
export type SourceFacts = z.infer<typeof SourceFacts>;

// Visual schema
export const VisualSchema = z.object({
  layout: z.string(),
  palette: z.array(z.string()),
  hierarchy: z.string(),
  density: z.enum(["low", "medium", "high"]),
  usefulPatterns: z.array(z.string()),
  issues: z.array(z.string()),
}).nullable();
export type VisualFindings = z.infer<typeof VisualSchema>;

// Analysis type
export const Analysis = z.object({
  schemaVersion: z.literal(1),
  summary: Claim,
  targetUsers: z.array(Claim).min(1).max(6),
  coreProblem: Claim,
  keyFeatures: z.array(Claim).min(1).max(10),
  businessModel: Claim,
  improvements: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      rationale: z.string(),
      priority: z.enum(["high", "medium", "low"]),
    })
  ),
  mvpFeatures: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      userValue: z.string(),
      priority: z.enum(["must", "should"]),
    })
  ).min(4).max(6),
  evidence: z.array(Evidence),
  visual: VisualSchema,
  limitations: z.array(z.string()),
});
export type Analysis = z.infer<typeof Analysis>;

// ProductBrief type
export const ProductBrief = z.object({
  name: z.string().min(2).max(60),
  description: z.string().min(20).max(500),
  audience: z.string().min(3).max(240),
  positioning: z.string().max(500),
  features: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      priority: z.enum(["must", "should"]),
    })
  ),
  pagePurposes: z.array(z.object({
    pageId: z.string(),
    purpose: z.string(),
  })),
  navigationIntent: z.array(z.object({
    label: z.string(),
    pageId: z.string(),
  })),
  visualDirection: VisualSchema.nullable().optional(),
});
export type ProductBrief = z.infer<typeof ProductBrief>;

// ProductSpec type
export const ProductSpec = z.object({
  schemaVersion: z.literal(1),
  name: z.string().min(2).max(60),
  description: z.string().min(20).max(500),
  audience: z.string().min(3).max(240),
  positioning: z.string().max(500),
  features: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      priority: z.enum(["must", "should"]),
    })
  ),
  theme: z.object({
    preset: z.enum(["editorial-light", "precision-dark", "warm-service"]),
    accent: z.enum(["lime", "cobalt", "terracotta"]),
    density: z.enum(["comfortable", "compact"]),
    radius: z.enum(["sharp", "soft"]),
  }),
  navigation: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      pageId: z.string(),
    })
  ),
  pages: z.array(
      z.object({
        id: z.string(),
        slug: z.string(),
        title: z.string(),
        kind: z.enum(["landing", "dashboard", "pricing", "about"]),
        sections: z.array(z.lazy(() => Section)).min(1).max(8),
      })
    ).min(1).max(5)
    .refine(
      (val) => {
        const homePages = val.filter((p) => p.kind === "landing");
        return homePages.length === 1;
      },
      { message: "Exactly one home page required" }
    )
    .refine(
      (val) => {
        const slugs = val.map((p) => p.slug);
        return new Set(slugs).size === slugs.length;
      },
      { message: "Page slugs must be unique" }
    )
    .refine(
      (val) => {
        return val.length >= 1 && val.length <= 5;
      },
      { message: "Must have 1-5 pages" }
    ),
  uiDirection: z.string().max(800),
});
export type ProductSpec = z.infer<typeof ProductSpec>;

// Section union discriminants
const SectionHero = z.object({
  type: z.literal("hero"),
  id: z.string(),
  eyebrow: z.string().max(60),
  headline: z.string().max(100),
  body: z.string().max(320),
  primaryAction: z.object({
    kind: z.enum(["navigate", "scroll", "demo-dialog"]),
    label: z.string(),
    pageId: z.string().optional(),
    sectionId: z.string().optional(),
    dialogTitle: z.string().optional(),
    dialogBody: z.string().optional(),
  }),
  secondaryAction: z
    .object({
      kind: z.enum(["navigate", "scroll", "demo-dialog"]),
      label: z.string(),
      pageId: z.string().optional(),
      sectionId: z.string().optional(),
      dialogTitle: z.string().optional(),
      dialogBody: z.string().optional(),
    })
    .optional(),
  composition: z.enum(["split", "centered"]),
});

const SectionFeatureList = z.object({
  type: z.literal("feature-list"),
  id: z.string(),
  heading: z.string().max(100),
  items: z.array(
    z.object({
      id: z.string(),
      title: z.string().max(70),
      body: z.string().max(220),
    })
  ).min(2).max(6),
});

const SectionSteps = z.object({
  type: z.literal("steps"),
  id: z.string(),
  heading: z.string(),
  items: z.array(
    z.object({
      title: z.string(),
      body: z.string(),
    })
  ).min(2).max(4),
});

const SectionPricing = z.object({
  type: z.literal("pricing"),
  id: z.string(),
  heading: z.string(),
  plans: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      priceLabel: z.string(),
      description: z.string(),
      features: z.array(z.string()).min(1).max(6),
      action: z.object({
        kind: z.enum(["navigate", "scroll", "demo-dialog"]),
        label: z.string(),
        pageId: z.string().optional(),
        sectionId: z.string().optional(),
        dialogTitle: z.string().optional(),
        dialogBody: z.string().optional(),
      }),
    })
  ).min(1).max(3),
});

const SectionFaq = z.object({
  type: z.literal("faq"),
  id: z.string(),
  heading: z.string(),
  items: z.array(
    z.object({
      question: z.string(),
      answer: z.string(),
    })
  ).min(2).max(6),
});

const SectionCta = z.object({
  type: z.literal("cta"),
  id: z.string(),
  heading: z.string().max(100),
  body: z.string().max(220),
  action: z.object({
    kind: z.enum(["navigate", "scroll", "demo-dialog"]),
    label: z.string(),
    pageId: z.string().optional(),
    sectionId: z.string().optional(),
    dialogTitle: z.string().optional(),
    dialogBody: z.string().optional(),
  }),
});

const SectionMetricRow = z.object({
  type: z.literal("metric-row"),
  id: z.string(),
  metrics: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      value: z.string(),
      delta: z.string().optional(),
    })
  ).min(2).max(4),
});

const SectionDataTable = z.object({
  type: z.literal("data-table"),
  id: z.string(),
  heading: z.string(),
  columns: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
    })
  ).min(2).max(5),
  rows: z.array(
    z.record(z.string(), z.string().max(160))
  ).min(1).max(12),
});

const SectionActivityList = z.object({
  type: z.literal("activity-list"),
  id: z.string(),
  heading: z.string(),
  items: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      detail: z.string(),
      timeLabel: z.string(),
    })
  ).min(1).max(8),
});

const SectionRichText = z.object({
  type: z.literal("rich-text"),
  id: z.string(),
  heading: z.string(),
  paragraphs: z.array(z.string().max(500)).min(1).max(4),
});

// Section union
export const Section = z.discriminatedUnion("type", [
  SectionHero,
  SectionFeatureList,
  SectionSteps,
  SectionPricing,
  SectionFaq,
  SectionCta,
  SectionMetricRow,
  SectionDataTable,
  SectionActivityList,
  SectionRichText,
]);
export type Section = z.infer<typeof Section>;

// Action type
const NavigateAction = z.object({
  kind: z.literal("navigate"),
  pageId: z.string(),
  label: z.string(),
});

const ScrollAction = z.object({
  kind: z.literal("scroll"),
  sectionId: z.string(),
  label: z.string(),
});

const DemoDialogAction = z.object({
  kind: z.literal("demo-dialog"),
  label: z.string(),
  dialogTitle: z.string(),
  dialogBody: z.string(),
});

export const Action = z.discriminatedUnion("kind", [
  NavigateAction,
  ScrollAction,
  DemoDialogAction,
]);
export type Action = z.infer<typeof Action>;

// Edit result type
export const EditResult = z.object({
  updatedSpec: ProductSpec,
  changeSummary: z.array(z.string()),
  touchedPageIds: z.array(z.string()),
  assumptions: z.array(z.string()),
});
export type EditResult = z.infer<typeof EditResult>;

export const QAResultSchema = z.object({
  issues: z.array(z.object({
    severity: z.enum(['error', 'warning', 'info']),
    pageId: z.string().optional(),
    sectionId: z.string().optional(),
    message: z.string(),
    suggestedFix: z.string().optional(),
  })),
  passed: z.boolean(),
});
export type QAResult = z.infer<typeof QAResultSchema>;
