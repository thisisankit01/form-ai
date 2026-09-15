"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import ProductSection from "@/components/product-renderer/section";
import { ProductThemeProvider } from "@/lib/theme/product-provider";
import { themeConfigs } from "@/lib/theme/tokens";
import type { ProductSpec } from "@/lib/product/schema";
import type { Action } from "@/lib/product/schema";

interface PreviewPanelProps {
  spec: ProductSpec | null;
  artifact?: { previewUrl: string } | null;
  isBuilding?: boolean;
}

export function PreviewPanel({ spec, artifact = null, isBuilding = false }: PreviewPanelProps) {
  const [viewMode, setViewMode] = useState("desktop"); // desktop, tablet, mobile
  const [frameWidth, setFrameWidth] = useState<number | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const [dialog, setDialog] = useState<{ title: string; body: string } | null>(null);
  const [expanded, setExpanded] = useState(false);
  function handleAction(action: unknown) {
    const candidate = action as Partial<Action>;
    const pageId = "pageId" in candidate ? candidate.pageId : undefined;
    const sectionId = "sectionId" in candidate ? candidate.sectionId : undefined;
    if (candidate.kind === "demo-dialog") setDialog({ title: candidate.dialogTitle || candidate.label || "Preview action", body: candidate.dialogBody || "This interaction is ready for product implementation." });
    if ((candidate.kind === "scroll" && sectionId) || (candidate.kind === "navigate" && pageId)) {
      const content = contentRef.current;
      const selector = candidate.kind === "navigate" ? "[data-preview-page-id]" : "[data-preview-section-id]";
      const target = Array.from(content?.querySelectorAll<HTMLElement>(selector) || [])
        .find((element) => candidate.kind === "navigate"
          ? element.dataset.previewPageId === pageId
          : element.dataset.previewSectionId === sectionId);
      if (content && target) {
        const top = target.getBoundingClientRect().top - content.getBoundingClientRect().top + content.scrollTop;
        content.scrollTo({ top, behavior: "smooth" });
      }
    }
  }

  function startResize(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    frameRef.current?.setPointerCapture(event.pointerId);
    resizeRef.current = { startX: event.clientX, startWidth: frameRef.current?.getBoundingClientRect().width || 720 };
  }

  useEffect(() => {
    function resize(event: globalThis.PointerEvent) {
      if (!resizeRef.current) return;
      setFrameWidth(Math.min(1400, Math.max(320, resizeRef.current.startWidth + event.clientX - resizeRef.current.startX)));
    }
    function stopResize() { resizeRef.current = null; }
    window.addEventListener("pointermove", resize);
    window.addEventListener("pointerup", stopResize);
    return () => { window.removeEventListener("pointermove", resize); window.removeEventListener("pointerup", stopResize); };
  }, []);

  return (
    <div className="preview-panel flex min-h-0 flex-1 flex-col gap-4">
        <div className="flex shrink-0 items-center justify-between gap-4">
          <div><h2 className="text-text font-semibold">Live Preview</h2><p className="mt-1 text-xs text-text-secondary">Independent product canvas</p></div>
         <div className="flex items-center gap-2"><>{artifact && <button type="button" onClick={() => setExpanded(true)} className="rounded-control border border-line bg-surface px-3 py-2 text-xs font-medium text-text transition-colors hover:bg-surface-muted">Expand preview</button>}</><div className="flex items-center gap-1 rounded-control border border-line bg-surface p-1">
          <button
            type="button"
            onClick={() => { setViewMode("desktop"); setFrameWidth(null); }}
            aria-pressed={viewMode === "desktop"}
            className={`rounded px-3 py-2 text-xs transition-colors ${viewMode === "desktop" ? "bg-ink text-text-inverse" : "text-text-secondary hover:bg-surface-muted"}`}
          >
            Desktop
          </button>
          <button
            type="button"
            onClick={() => { setViewMode("tablet"); setFrameWidth(null); }}
            aria-pressed={viewMode === "tablet"}
            className={`rounded px-3 py-2 text-xs transition-colors ${viewMode === "tablet" ? "bg-ink text-text-inverse" : "text-text-secondary hover:bg-surface-muted"}`}
          >
            Tablet
          </button>
          <button
            type="button"
            onClick={() => { setViewMode("mobile"); setFrameWidth(null); }}
            aria-pressed={viewMode === "mobile"}
            className={`rounded px-3 py-2 text-xs transition-colors ${viewMode === "mobile" ? "bg-ink text-text-inverse" : "text-text-secondary hover:bg-surface-muted"}`}
          >
            Mobile
          </button>
        </div></div>
      </div>
      
      <div className="preview-stage relative flex min-h-0 flex-1 items-start justify-center overflow-auto rounded-panel border border-line bg-[radial-gradient(#c4c3bd_1px,transparent_1px)] [background-size:16px_16px] p-5 shadow-inner">
        <div ref={frameRef} style={frameWidth ? { width: `${frameWidth}px` } : undefined} className={`${getViewDimensions(viewMode)} preview-device-frame relative flex min-h-0 shrink-0 flex-col overflow-hidden rounded-[22px] border border-black/15 bg-white shadow-[0_24px_70px_rgba(17,17,17,.16)]`}>
           <ProductThemeProvider className="flex min-h-0 flex-1 flex-col" defaultTheme={spec?.theme ? themeConfigs[spec.theme.preset === "precision-dark" ? "precisionDark" : spec.theme.preset === "warm-service" ? "warmService" : "editorialLight"] : themeConfigs.editorialLight}>
              <div ref={contentRef} className="preview-website min-h-0 flex-1 overflow-y-auto bg-[var(--product-background)] p-5">
                    {artifact ? <iframe title="Generated V3 artifact preview" src={artifact.previewUrl} sandbox="allow-scripts allow-forms allow-same-origin" allow="" referrerPolicy="no-referrer" className="h-full min-h-[680px] w-full rounded-lg border-0 bg-white" /> : spec ? spec.pages.map((page) => <section data-preview-page-id={page.id} key={page.id} className="mb-10 min-w-0"><h2 className="mb-4 text-lg font-semibold text-[var(--product-foreground)]">{page.title}</h2><div className="space-y-6">{page.sections.map((section) => <div data-preview-section-id={section.id} key={section.id}><ProductSection section={section} onAction={handleAction} /></div>)}</div></section>) : <div className="py-16 text-center"><div className={`mx-auto mb-4 h-2 w-24 overflow-hidden rounded-full ${isBuilding ? "bg-accent/20" : "bg-line"}`}><div className={`h-full w-1/2 ${isBuilding ? "animate-pulse bg-accent" : "bg-line-dark"}`} /></div><p className="font-medium text-[var(--product-foreground)]">{isBuilding ? "Building live preview" : "No preview yet"}</p><p className="mt-2 text-sm text-[var(--product-secondary)]">{isBuilding ? "The preview will appear here when the run finishes." : "Analyze a source and build a version to render the product here."}</p></div>}
              </div>
           </ProductThemeProvider>
           <button type="button" aria-label="Resize preview frame" onPointerDown={startResize} className="absolute right-0 top-1/2 z-10 flex h-16 w-3 -translate-y-1/2 translate-x-1/2 cursor-col-resize items-center justify-center rounded-full border border-line bg-surface shadow-sm"><span className="h-8 w-px bg-text-secondary" /></button>
         </div>
      </div>
      {dialog && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-5" role="presentation" onClick={() => setDialog(null)}><div role="dialog" aria-modal="true" aria-labelledby="preview-dialog-title" className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between gap-4"><div><h2 id="preview-dialog-title" className="text-lg font-semibold text-text">{dialog.title}</h2><p className="mt-2 text-sm text-text-secondary">{dialog.body}</p></div><button type="button" aria-label="Close dialog" onClick={() => setDialog(null)} className="rounded-control px-2 py-1 text-text-secondary hover:bg-surface-muted">×</button></div><button type="button" onClick={() => setDialog(null)} className="mt-5 w-full rounded-control bg-ink px-4 py-3 text-sm font-semibold text-text-inverse">Close preview</button></div></div>}
      {expanded && artifact && <div className="fixed inset-0 z-[60] bg-ink/80 p-3 sm:p-6" role="presentation" onClick={() => setExpanded(false)}><div role="dialog" aria-modal="true" aria-labelledby="expanded-preview-title" className="flex h-full w-full flex-col overflow-hidden rounded-panel border border-line bg-surface shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between border-b border-line px-4 py-3"><div><h2 id="expanded-preview-title" className="text-sm font-semibold text-text">Full-screen preview</h2><p className="text-xs text-text-secondary">Generated website</p></div><button type="button" aria-label="Close full-screen preview" onClick={() => setExpanded(false)} className="rounded-control border border-line px-3 py-2 text-xs font-medium text-text hover:bg-surface-muted">Close</button></div><iframe title="Expanded generated artifact preview" src={artifact.previewUrl} sandbox="allow-scripts allow-forms allow-same-origin" referrerPolicy="no-referrer" className="min-h-0 w-full flex-1 border-0 bg-white" /></div></div>}
    </div>
  );
}

function getViewDimensions(mode: string): string {
  switch (mode) {
      case "desktop":
      return "preview-device-frame-desktop";
    case "tablet":
      return "preview-device-frame-tablet";
    case "mobile":
      return "preview-device-frame-mobile";
    default:
      return "preview-device-frame-desktop";
  }
}
