import JSZip from 'jszip';
import { ProductSpec } from '../product/schema';
import { z } from 'zod';

export interface ExportOptions {
  spec: ProductSpec;
  versionId: string;
  projectName: string;
}

const REQUIRED_EXPORT_FILES = [
  'package.json',
  'vite.config.ts',
  'tsconfig.json',
  'tsconfig.node.json',
  'index.html',
  'src/main.tsx',
  'src/App.tsx',
  'src/product-spec.json',
  'src/product-spec.ts',
  'src/styles.css',
];

export class InvalidExportZipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidExportZipError';
  }
}

const PACKAGE_JSON_TEMPLATE = `{
  "name": "{{projectName}}",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.2.8",
    "react-dom": "^19.2.8",
    "lucide-react": "^1.42.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.6.0"
  },
  "devDependencies": {
    "@types/react": "^19.2.17",
    "@types/react-dom": "^19.2.17",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "^5.9.3",
    "vite": "^6.0.5",
    "tailwindcss": "^4.3.3"
  }
}`;

const VITE_CONFIG_TEMPLATE = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 3000 },
});`;

const TS_CONFIG_TEMPLATE = `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}`;

const TS_CONFIG_NODE_TEMPLATE = `{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}`;

const INDEX_HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{{projectName}}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;

const MAIN_TSX_TEMPLATE = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)`;

const APP_TSX_TEMPLATE = `import { ProductRenderer } from './components/ProductRenderer';
import { ProductThemeProvider } from './lib/theme/ProductThemeProvider';
import productSpec from './product-spec.json';

function App() {
  return (
    <ProductThemeProvider defaultTheme={productSpec.theme}>
      <ProductRenderer spec={productSpec} />
    </ProductThemeProvider>
  );
}

export default App;`;

// Simplified renderer components for export (subset of full app)
const RENDERER_COMPONENTS = `
// ProductRenderer.tsx
import type { ProductSpec } from '../product-spec';

export function ProductRenderer({ spec }: { spec: ProductSpec }) {
  const currentPage = spec.pages[0];

  return (
    <div className="product-theme-root">
      {currentPage.sections.map((section) => (
        <ProductSection key={section.id} section={section} />
      ))}
    </div>
  );
}

export function ProductSection({ section }: { section: { type: string; headline?: string; heading?: string; body?: string; [key: string]: unknown } }) {
  const title = section.headline || section.heading || section.type;
  return <section className="product-section"><p className="product-eyebrow">{section.type}</p><h2>{title}</h2>{section.body && <p>{section.body}</p>}</section>;
}

// Theme provider
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface ThemeConfig {
  name: string;
  background: string;
  foreground: string;
  secondary: string;
  muted: string;
  border: string;
  accent: string;
  accentInk: string;
  density: string;
  radius: string;
}

interface ProductThemeContextValue {
  theme: ThemeConfig;
}

const ProductThemeContext = createContext<ProductThemeContextValue | undefined>(undefined);

interface ProductThemeProviderProps {
  children: ReactNode;
  defaultTheme: ThemeConfig;
}

export function ProductThemeProvider({ children, defaultTheme }: ProductThemeProviderProps) {
  const [theme] = useState<ThemeConfig>(defaultTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--product-background', theme.background);
    root.style.setProperty('--product-foreground', theme.foreground);
    root.style.setProperty('--product-secondary', theme.secondary);
    root.style.setProperty('--product-muted', theme.muted);
    root.style.setProperty('--product-border', theme.border);
    root.style.setProperty('--product-accent', theme.accent);
    root.style.setProperty('--product-accent-ink', theme.accentInk);
    root.style.setProperty('--product-radius-control', '8px');
    root.style.setProperty('--product-radius-panel', '16px');
    root.style.setProperty('--product-radius-stage', '24px');
  }, [theme]);

  return (
    <ProductThemeContext.Provider value={{ theme }}>
      <div className={\`product-theme-root \${theme.name} \${theme.density} \${theme.radius}\`} data-product-theme={theme.name}>
        {children}
      </div>
    </ProductThemeContext.Provider>
  );
}

export function useProductTheme() {
  const context = useContext(ProductThemeContext);
  if (!context) throw new Error('useProductTheme must be used within ProductThemeProvider');
  return context;
}
`;

const SECTION_COMPONENTS = `
// sections/Hero.tsx
import { cn } from '../../lib/utils';

interface HeroProps {
  eyebrow?: string;
  headline: string;
  body: string;
  primaryAction: { kind: 'navigate' | 'scroll' | 'demo-dialog'; label: string; pageId?: string; sectionId?: string; dialogTitle?: string; dialogBody?: string };
  secondaryAction?: { kind: 'navigate' | 'scroll' | 'demo-dialog'; label: string; pageId?: string; sectionId?: string; dialogTitle?: string; dialogBody?: string };
  composition: 'split' | 'centered';
}

export function HeroSection({ eyebrow, headline, body, primaryAction, secondaryAction, composition }: HeroProps) {
  const buttonStyle = {
    primary: 'bg-[var(--product-accent)] text-[var(--product-accent-ink)] hover:bg-[var(--product-accent)]/90',
    secondary: 'border border-[var(--product-border)] text-[var(--product-foreground)] hover:bg-[var(--product-muted)]',
  };

  if (composition === 'split') {
    return (
      <div className="grid grid-cols-[5fr_7fr] gap-8 items-start">
        <div className="space-y-6">
          {eyebrow && <p className="text-[var(--product-secondary)] font-medium text-sm tracking-wide uppercase">{eyebrow}</p>}
          <h1 className="mb-4 text-4xl font-bold text-[var(--product-foreground)] leading-none tracking-tight lg:text-5xl">{headline}</h1>
          {body && <p className="text-[var(--product-secondary)] text-base leading-relaxed">{body}</p>}
          <div className="flex space-x-4">
            <button className={\`flex-1 rounded-md px-6 py-3 text-sm font-medium \${buttonStyle.primary}\`}>{primaryAction.label}</button>
            {secondaryAction && <button className={\`flex-1 border px-6 py-3 text-sm font-medium \${buttonStyle.secondary}\`}>{secondaryAction.label}</button>}
          </div>
        </div>
        <div className="relative h-[500px] w-full rounded-stage border border-[var(--product-border)] bg-[var(--product-muted)]">
          <div className="absolute inset-0 flex items-center justify-center text-[var(--product-secondary)]">Product Preview</div>
        </div>
      </div>
    );
  } else {
    return (
      <div className="space-y-8 text-center">
        {eyebrow && <p className="text-[var(--product-secondary)] font-medium text-sm tracking-wide uppercase">{eyebrow}</p>}
        <h1 className="mb-4 text-4xl font-bold text-[var(--product-foreground)] leading-none tracking-tight lg:text-5xl">{headline}</h1>
        {body && <p className="text-[var(--product-secondary)] text-base leading-relaxed max-w-2xl mx-auto">{body}</p>}
        <div className="flex justify-center space-x-4">
          <button className={\`rounded-md px-6 py-3 text-sm font-medium \${buttonStyle.primary}\`}>{primaryAction.label}</button>
          {secondaryAction && <button className={\`border px-6 py-3 text-sm font-medium \${buttonStyle.secondary}\`}>{secondaryAction.label}</button>}
        </div>
      </div>
    );
  }
}

// sections/FeatureList.tsx
export function FeatureListSection({ heading, items }: { heading: string; items: { id: string; title: string; body: string }[] }) {
  return (
    <section className="space-y-6">
      {heading && <h2 className="text-[var(--product-foreground)] font-semibold text-lg">{heading}</h2>}
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="flex items-start space-x-3 p-4 rounded-control border border-[var(--product-border)] bg-[var(--product-muted)]">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--product-accent)]/20 flex items-center justify-center">
              <span className="text-[var(--product-accent)] font-medium">✓</span>
            </div>
            <div>
              <h3 className="text-[var(--product-foreground)] font-medium">{item.title}</h3>
              <p className="text-[var(--product-secondary)]">{item.body}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }
}

// sections/Steps.tsx
export function StepsSection({ heading, items }: { heading: string; items: { title: string; body: string }[] }) {
  return (
    <section className="space-y-6">
      {heading && <h2 className="text-[var(--product-foreground)] font-semibold text-lg">{heading}</h2>}
      <ol className="space-y-6">
        {items.map((item, index) => (
          <li key={index} className="flex items-start space-x-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--product-accent)]/20 shrink-0">
              <span className="text-[var(--product-accent)] font-medium">{index + 1}</span>
            </div>
            <div>
              <h3 className="text-[var(--product-foreground)] font-medium">{item.title}</h3>
              <p className="text-[var(--product-secondary)]">{item.body}</p>
            </div>
          </li>
        ))}
      </ol>
    );
  }
}

// sections/Pricing.tsx
export function PricingSection({ heading, plans }: { heading: string; plans: { id: string; name: string; priceLabel: string; description: string; features: string[]; action: any }[] }) {
  return (
    <section className="space-y-6">
      {heading && <h2 className="text-[var(--product-foreground)] font-semibold text-lg">{heading}</h2>}
      <div className="grid gap-6 md:grid-cols-{plans.length}">
        {plans.map((plan) => (
          <article key={plan.id} className="relative flex flex-col rounded-panel border border-[var(--product-border)] bg-[var(--product-panel)] p-6">
            <h3 className="font-display font-semibold text-[20px] leading-[1.3] tracking-[-0.035em] text-[var(--product-foreground)] mb-2">{plan.name}</h3>
            <p className="mono text-[32px] font-medium text-[var(--product-foreground)]">{plan.priceLabel}</p>
            <p className="mb-8 text-base leading-[1.6] text-[var(--product-secondary)] flex-1">{plan.description}</p>
            <ul className="space-y-2 mb-6 flex-1">
              {plan.features.map((f, i) => (
                <li key={i} className="flex items-start space-x-2 text-[var(--product-secondary)]">
                  <span className="flex-shrink-0 w-4 h-4 text-[var(--product-accent)]">✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <button className="w-full justify-center rounded-md bg-[var(--product-ink)] px-6 py-3 text-sm font-medium text-[var(--product-inverse)] hover:bg-[var(--product-ink-raised)]">
              {plan.action.label}
            </button>
          </article>
        ))}
      </div>
    );
  }
}

// sections/Faq.tsx
import { useState } from 'react';

export function FaqSection({ heading, items }: { heading: string; items: { question: string; answer: string }[] }) {
  return (
    <section className="space-y-6">
      {heading && <h2 className="text-[var(--product-foreground)] font-semibold text-lg">{heading}</h2>}
      <div className="space-y-4">
        {items.map((item, index) => (
          <details key={index} className="border-t border-[var(--product-border)] pt-4 first:border-t-0 first:pt-0">
            <summary className="flex items-center justify-between cursor-pointer p-2 text-[var(--product-foreground)] font-medium list-none">
              {item.question}
              <svg className="h-4 w-4 shrink-0 ml-4 text-[var(--product-secondary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div className="pt-2 text-[var(--product-secondary)]">{item.answer}</div>
          </details>
        ))}
      </div>
    );
  }
}

// sections/Cta.tsx
export function CtaSection({ heading, body, action }: { heading: string; body: string; action: any }) {
  return (
    <section className="space-y-6 text-center">
      <h2 className="text-[var(--product-foreground)] font-semibold text-lg">{heading}</h2>
      <p className="text-[var(--product-secondary)] max-w-xl mx-auto">{body}</p>
      <button className="rounded-md bg-[var(--product-accent)] px-6 py-3 text-sm font-medium text-[var(--product-accent-ink)] hover:bg-[var(--product-accent)]/90">
        {action.label}
      </button>
    </section>
  );
}

// sections/MetricRow.tsx
export function MetricRowSection({ metrics }: { metrics: { id: string; label: string; value: string; delta?: string }[] }) {
  return (
    <section className="grid gap-6 md:grid-cols-{metrics.length}">
      {metrics.map((metric) => (
        <div key={metric.id} className="rounded-panel border border-[var(--product-border)] bg-[var(--product-panel)] p-6 text-center">
          <p className="text-3xl font-bold text-[var(--product-foreground)]">{metric.value}</p>
          {metric.delta && <p className="text-sm text-[var(--product-accent)] mt-1">{metric.delta}</p>}
          <p className="text-[var(--product-secondary)] mt-2">{metric.label}</p>
        </div>
      ))}
    </section>
  );
}

// sections/DataTable.tsx
export function DataTableSection({ heading, columns, rows }: { heading: string; columns: { key: string; label: string }[]; rows: Record<string, string>[] }) {
  return (
    <section className="space-y-6">
      {heading && <h2 className="text-[var(--product-foreground)] font-semibold text-lg">{heading}</h2>}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-[var(--product-secondary)]">
          <thead>
            <tr className="border-b border-[var(--product-border)]">
              {columns.map((col) => (
                <th key={col.key} className="p-4 text-left font-medium text-[var(--product-secondary)] uppercase tracking-wider text-xs">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--product-border)]">
            {rows.map((row, rowIndex) => (
              <tr key={row.id || rowIndex} className="hover:bg-[var(--product-muted)]">
                {columns.map((col) => (
                  <td key={col.key} className="p-4">{row[col.key] || ''}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// sections/ActivityList.tsx
export function ActivityListSection({ heading, items }: { heading: string; items: { id: string; title: string; detail: string; timeLabel: string }[] }) {
  return (
    <section className="space-y-6">
      {heading && <h2 className="text-[var(--product-foreground)] font-semibold text-lg">{heading}</h2>}
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="flex items-start space-x-3 p-4 rounded-control border border-[var(--product-border)] bg-[var(--product-muted)]">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--product-accent)]/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-[var(--product-accent)]" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-[var(--product-foreground)] font-medium">{item.title}</h3>
              <p className="text-[var(--product-secondary)]">{item.detail}</p>
              <span className="text-[var(--product-secondary)] text-xs font-mono">{item.timeLabel}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// sections/RichText.tsx
export function RichTextSection({ heading, paragraphs }: { heading: string; paragraphs: string[] }) {
  return (
    <section className="space-y-6">
      {heading && <h2 className="text-[var(--product-foreground)] font-semibold text-lg">{heading}</h2>}
      <div className="space-y-4 text-[var(--product-secondary)] leading-[1.6]">
        {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
      </div>
    </section>
  );
}
`;

void SECTION_COMPONENTS;

const STYLES_CSS_TEMPLATE = `@import "tailwindcss";

:root {
  --color-ink: #111111;
  --color-ink-raised: #1B1B1B;
  --color-canvas: #F5F4F0;
  --color-surface: #FFFFFF;
  --color-surface-muted: #ECEBE6;
  --color-text: #171717;
  --color-text-secondary: #60605B;
  --color-text-inverse: #F8F7F3;
  --color-text-inverse-secondary: #B8B7B1;
  --color-line: #D9D8D1;
  --color-line-dark: #373733;
  --color-accent: #DDF274;
  --color-accent-ink: #20250A;
  --color-focus: #3659D9;

  --radius-control: 8px;
  --radius-panel: 16px;
  --radius-stage: 24px;

  --font-display: var(--font-manrope), system-ui, sans-serif;
  --font-sans: var(--font-inter), system-ui, sans-serif;
  --font-mono: var(--font-jetbrains), ui-monospace, monospace;
}

@theme inline {
  --color-ink: var(--color-ink);
  --color-canvas: var(--color-canvas);
  --color-surface: var(--color-surface);
  --color-text: var(--color-text);
  --color-accent: var(--color-accent);
  --radius-control: var(--radius-control);
  --radius-panel: var(--radius-panel);
  --radius-stage: var(--radius-stage);
  --font-display: var(--font-display);
  --font-sans: var(--font-sans);
  --font-mono: var(--font-mono);
}

* { box-sizing: border-box; }
html, body { margin: 0; min-height: 100%; }
body { background: var(--color-canvas); color: var(--color-text); font-family: var(--font-sans); -webkit-font-smoothing: antialiased; }
button, input, select, textarea { font: inherit; }
::selection { background: var(--color-accent); color: var(--color-accent-ink); }
:focus-visible { outline: 2px solid var(--color-focus); outline-offset: 2px; border-radius: 4px; }
h1,h2,h3,h4 { font-family: var(--font-display); letter-spacing: -0.035em; }
code, pre, .mono { font-family: var(--font-mono); }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; transition-duration: 0.001ms !important; scroll-behavior: auto !important; }
}

.product-theme-root {
  min-height: 100vh;
}

.product-theme-root.editorial-light {
  --product-background: #F5F4F0;
  --product-foreground: #111111;
  --product-secondary: #60605B;
  --product-muted: #ECEBE6;
  --product-border: #D9D8D1;
  --product-accent: #DDF274;
  --product-accent-ink: #20250A;
}

.product-theme-root.precision-dark {
  --product-background: #111111;
  --product-foreground: #F8F7F3;
  --product-secondary: #B8B7B1;
  --product-muted: #1B1B1B;
  --product-border: #373733;
  --product-accent: #DDF274;
  --product-accent-ink: #20250A;
}

.product-theme-root.warm-service {
  --product-background: #FFFFFF;
  --product-foreground: #111111;
  --product-secondary: #60605B;
  --product-muted: #ECEBE6;
  --product-border: #D9D8D1;
  --product-accent: #DDF274;
  --product-accent-ink: #20250A;
}
`;

const README_TEMPLATE = `# {{projectName}}

A frontend starter generated by FORM — Website-to-product studio.

## What's Included

- React 19 + TypeScript + Vite
- Tailwind CSS v4 with FORM design tokens
- Product specification (product-spec.json)
- Renderer components for all 10 section types
- Three theme presets: editorial-light, precision-dark, warm-service

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

## Prototype Limitations

This is a **frontend prototype** generated from an AI-analyzed website. It includes:

- Working page navigation
- Interactive components (FAQ accordions, data tables, demo dialogs)
- Sample data (labeled as such)
- Responsive preview at desktop/tablet/mobile widths

This prototype does **NOT** include:
- Real authentication or user accounts
- Database or backend APIs
- Payment processing
- Real integrations (Stripe, Supabase, etc.)
- Production deployment configuration

## Project Structure

\`\`\`
src/
├── main.tsx              # App entry point
├── App.tsx               # Root component with theme provider
├── product-spec.json     # Exact selected ProductSpec version
├── components/
│   ├── ProductRenderer.tsx
│   ├── ProductSection.tsx
│   ├── ProductThemeProvider.tsx
│   └── sections/         # All 10 section types
├── lib/
│   ├── theme/
│   │   └── ProductThemeProvider.tsx
│   └── utils.ts
└── styles.css            # Tailwind + design tokens
\`\`\`

## Theme Switching

The prototype uses the theme from \`product-spec.json\`. To switch themes, modify the \`theme\` object in \`product-spec.json\` and restart the dev server.

Available presets:
- \`editorial-light\` (default) — Ivory canvas, black headings, lime accent
- \`precision-dark\` — Near-black background, ivory text, cobalt accent
- \`warm-service\` — Warm white, dark brown text, terracotta accent

## Third-Party Notices

See \`THIRD_PARTY_NOTICES.md\` for license information.
`;

const THIRD_PARTY_NOTICES_TEMPLATE = `# Third-Party Notices

This project includes the following third-party dependencies:

## Runtime Dependencies

- **react** (MIT) — Copyright (c) Meta Platforms, Inc.
- **react-dom** (MIT) — Copyright (c) Meta Platforms, Inc.
- **lucide-react** (ISC) — Copyright (c) Lucide Contributors
- **clsx** (MIT) — Copyright (c) Luke Edwards
- **tailwind-merge** (MIT) — Copyright (c) Dave Lunny

## Development Dependencies

- **@vitejs/plugin-react** (MIT) — Copyright (c) Vite Contributors
- **typescript** (Apache-2.0) — Copyright (c) Microsoft Corporation
- **vite** (MIT) — Copyright (c) Evan You and contributors
- **tailwindcss** (MIT) — Copyright (c) Tailwind Labs Inc.

## Fonts

- **Manrope** (OFL-1.1) — Copyright (c) Mikhail Sharanda
- **Inter** (OFL-1.1) — Copyright (c) Rasmus Andersson
- **JetBrains Mono** (OFL-1.1) — Copyright (c) JetBrains

Full license texts are available in the respective package directories under \`node_modules/\`.
`;

function replaceTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] || '');
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] || character);
}

/** Validate the archive contract before it is persisted or downloaded. */
export async function validateExportZip(buffer: Buffer): Promise<void> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer, { createFolders: false, checkCRC32: true });
  } catch {
    throw new InvalidExportZipError('Generated export is not a valid ZIP archive.');
  }

  const names = Object.keys(zip.files);
  if (names.some((name) => name.startsWith('/') || name.split('/').includes('..'))) {
    throw new InvalidExportZipError('Generated export contains an unsafe file path.');
  }

  const missing = REQUIRED_EXPORT_FILES.filter((name) => !zip.files[name] || zip.files[name].dir);
  if (missing.length > 0) {
    throw new InvalidExportZipError(`Generated export is missing required files: ${missing.join(', ')}`);
  }

  try {
    const packageJson = JSON.parse(await zip.files['package.json'].async('string')) as unknown;
    z.object({
      name: z.string().regex(/^[a-z0-9-]+$/),
      scripts: z.object({ build: z.string().min(1) }),
      dependencies: z.record(z.string(), z.string()),
      devDependencies: z.record(z.string(), z.string()),
    }).parse(packageJson);
    ProductSpec.parse(JSON.parse(await zip.files['src/product-spec.json'].async('string')));
  } catch {
    throw new InvalidExportZipError('Generated export contains invalid package or product specification JSON.');
  }
}

export async function generateExportZip(options: ExportOptions): Promise<Buffer> {
  const zip = new JSZip();
  const { spec, versionId, projectName } = options;
  ProductSpec.parse(spec);
  if (!z.string().uuid().safeParse(versionId).success) throw new InvalidExportZipError('Export version ID must be a UUID.');
  const safeName = projectName.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase().replace(/^-+|-+$/g, '') || 'form-export';

  // Root files
  zip.file('package.json', replaceTemplate(PACKAGE_JSON_TEMPLATE, { projectName: safeName }));
  zip.file('vite.config.ts', VITE_CONFIG_TEMPLATE);
  zip.file('tsconfig.json', TS_CONFIG_TEMPLATE);
  zip.file('tsconfig.node.json', TS_CONFIG_NODE_TEMPLATE);
  zip.file('index.html', replaceTemplate(INDEX_HTML_TEMPLATE, { projectName: escapeHtml(projectName) }));
  zip.file('README.md', replaceTemplate(README_TEMPLATE, { projectName: escapeHtml(projectName) }));
  zip.file('THIRD_PARTY_NOTICES.md', THIRD_PARTY_NOTICES_TEMPLATE);

  // Source files
  zip.file('src/main.tsx', MAIN_TSX_TEMPLATE);
  zip.file('src/App.tsx', APP_TSX_TEMPLATE);
  zip.file('src/product-spec.json', JSON.stringify(spec, null, 2));
  zip.file('src/product-spec.ts', `import spec from './product-spec.json';\nexport type ProductSpec = typeof spec;\nexport default spec;`);
  zip.file('src/styles.css', STYLES_CSS_TEMPLATE);

  // Components
  zip.file('src/components/ProductRenderer.tsx', RENDERER_COMPONENTS.trim());
  zip.file('src/components/ProductSection.tsx', `export function ProductSection({ section }: { section: { type: string; headline?: string; heading?: string; body?: string } }) { return <section className="product-section"><p>{section.type}</p><h2>{section.headline || section.heading || section.type}</h2>{section.body && <p>{section.body}</p>}</section>; }`);
  zip.file('src/components/ProductThemeProvider.tsx', `import type { ReactNode } from 'react';\nexport function ProductThemeProvider({ children }: { children: ReactNode; defaultTheme?: unknown }) { return <>{children}</>; }`);
  zip.file('src/lib/theme/ProductThemeProvider.tsx', `import type { ReactNode } from 'react';\nexport function ProductThemeProvider({ children }: { children: ReactNode; defaultTheme?: unknown }) { return <>{children}</>; }`);

  // Utils
  zip.file('src/lib/utils.ts', `export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}`);

  // Generate buffer
  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  await validateExportZip(buffer);
  return buffer;
}
