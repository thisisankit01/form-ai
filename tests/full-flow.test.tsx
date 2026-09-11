import JSZip from "jszip";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { publicUrlSchema } from "@/lib/validation/url";
import { ProductSpec, QAResultSchema } from "@/lib/product/schema";
import ProductSection from "@/components/product-renderer/section";
import { ProductThemeProvider } from "@/lib/theme/product-provider";
import { generateExportZip, InvalidExportZipError, validateExportZip } from "@/lib/export/generator";

const generatedSpec = {
  schemaVersion: 1 as const,
  name: "Relay Desk",
  description: "A focused workspace for independent teams to coordinate client work.",
  audience: "Independent consultants",
  positioning: "The calm operating layer for client delivery.",
  features: [
    { id: "intake", title: "Client intake", description: "Turn new requests into clear next steps.", priority: "must" as const },
    { id: "status", title: "Delivery status", description: "Keep every stakeholder aligned on progress.", priority: "must" as const },
    { id: "notes", title: "Shared notes", description: "Capture decisions where the work happens.", priority: "should" as const },
    { id: "billing", title: "Simple billing", description: "Make completed work easy to close out.", priority: "should" as const },
  ],
  theme: { preset: "editorial-light" as const, accent: "lime" as const, density: "comfortable" as const, radius: "soft" as const },
  navigation: [{ id: "home-nav", label: "Overview", pageId: "home" }],
  pages: [{
    id: "home",
    slug: "/",
    title: "Relay Desk",
    kind: "landing" as const,
    sections: [
      {
        type: "hero" as const,
        id: "hero",
        eyebrow: "Client delivery, clarified",
        headline: "Run client work without the chase",
        body: "A focused workspace for independent teams to coordinate client work.",
        primaryAction: { kind: "demo-dialog" as const, label: "See the workspace", dialogTitle: "Relay Desk", dialogBody: "A deterministic preview action." },
        composition: "centered" as const,
      },
      {
        type: "feature-list" as const,
        id: "features",
        heading: "Everything in one clear place",
        items: [
          { id: "intake", title: "Client intake", body: "Turn new requests into clear next steps." },
          { id: "status", title: "Delivery status", body: "Keep every stakeholder aligned on progress." },
        ],
      },
    ],
  }],
  uiDirection: "Editorial, calm, and operational with clear hierarchy.",
};

const editedSpec = {
  ...generatedSpec,
  positioning: "The calm operating layer for premium client delivery.",
  pages: generatedSpec.pages.map((page) => ({
    ...page,
    sections: page.sections.map((section) => section.type === "hero"
      ? { ...section, headline: "Run premium client work without the chase" }
      : section),
  })),
};

const projectInput = z.object({
  name: z.string().trim().max(80).optional(),
  url: publicUrlSchema,
  description: z.string().trim().min(30).max(2000),
  targetCustomer: z.string().trim().min(3).max(240),
});

const aiResponses: unknown[] = [];
vi.mock("@/lib/ai/provider", () => ({
  generateValidated: vi.fn(async () => ({ data: aiResponses.shift() })),
  analyzeImage: vi.fn(),
  isVisionUnavailable: vi.fn(() => false),
}));

describe("deterministic product flow harness", () => {
  beforeEach(() => {
    aiResponses.splice(0, aiResponses.length);
  });

  it("covers validation, project contract, build/render, edit/version, QA, and ZIP export", async () => {
    const project = projectInput.parse({
      name: "Relay Desk",
      url: "example.com",
      description: "A focused workspace for independent teams to coordinate client work.",
      targetCustomer: "Independent consultants",
    });
    expect(project.url).toBe("https://example.com/");
    expect(() => projectInput.parse({ ...project, url: "http://127.0.0.1" })).toThrow();

    const { runUIAgent, runRevisionAgent, runQAAgent } = await import("@/lib/ai/pipeline");
    aiResponses.push(generatedSpec);
    const firstSpec = await runUIAgent({
      name: generatedSpec.name,
      description: generatedSpec.description,
      audience: generatedSpec.audience,
      positioning: generatedSpec.positioning,
      features: generatedSpec.features,
      pagePurposes: [{ pageId: "home", purpose: "Explain the product" }],
      navigationIntent: [{ label: "Overview", pageId: "home" }],
    });
    expect(ProductSpec.safeParse(firstSpec).success).toBe(true);

    const rendered = renderToStaticMarkup(
      React.createElement(ProductThemeProvider, null,
        firstSpec.pages.flatMap((page) => page.sections).map((section) => React.createElement(ProductSection, { key: section.id, section })),
      ),
    );
    expect(rendered).toContain("Run client work without the chase");
    expect(rendered).toContain("Everything in one clear place");
    expect(rendered).toContain("Client delivery, clarified");

    const versions = [{ id: "00000000-0000-4000-8000-000000000001", versionNumber: 1, spec: firstSpec }];
    aiResponses.push({
      updatedSpec: editedSpec,
      changeSummary: ["Made the positioning feel more premium"],
      touchedPageIds: ["home"],
      assumptions: [],
    });
    const edit = await runRevisionAgent(firstSpec, "Make this feel more premium");
    expect(ProductSpec.safeParse(edit.updatedSpec).success).toBe(true);
    expect(JSON.stringify(edit.updatedSpec)).not.toBe(JSON.stringify(firstSpec));
    versions.push({ id: "00000000-0000-4000-8000-000000000002", versionNumber: 2, spec: edit.updatedSpec });
    expect(versions).toHaveLength(2);
    expect(versions[1].spec).not.toBe(versions[0].spec);
    expect(versions[0].spec.positioning).toBe("The calm operating layer for client delivery.");

    aiResponses.push({ passed: true, issues: [] });
    const qa = await runQAAgent(edit.updatedSpec, project.description, { valid: true, issues: [] }, []);
    expect(QAResultSchema.parse(qa)).toEqual({ passed: true, issues: [] });

    const exportBuffer = await generateExportZip({
      spec: edit.updatedSpec,
      versionId: versions[1].id,
      projectName: project.name || "Relay Desk",
    });
    await expect(validateExportZip(exportBuffer)).resolves.toBeUndefined();
    const archive = await JSZip.loadAsync(exportBuffer);
    expect(await archive.file("src/product-spec.json")?.async("string")).toContain("premium client delivery");
  });

  it("keeps the negative validation and export boundaries deterministic", async () => {
    expect(() => publicUrlSchema.parse("https://user:pass@example.com")).toThrow();
    expect(() => ProductSpec.parse({ ...generatedSpec, pages: [] })).toThrow();

    const unsafeArchive = new JSZip();
    unsafeArchive.file("../outside.txt", "unsafe");
    await expect(validateExportZip(await unsafeArchive.generateAsync({ type: "nodebuffer" })))
      .rejects.toBeInstanceOf(InvalidExportZipError);
  });
});
