"use client";

import Layout from "@/app/(marketing)/layout";
import ProductSection from "@/components/product-renderer/section";
import { sampleSpec } from "@/lib/product/defaults";

export default function DemoPage() {
  return (
    <Layout>
      <div className="min-h-screen bg-surface py-12">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-text mb-4">
              FORM Demo - Sample Product Preview
            </h1>
            <p className="text-text-secondary max-w-xl">
              This is a working preview of the product generated from the sample
              specification. Try editing the specification in the backend to see
              how the preview changes.
            </p>
            <div className="mt-6 p-4 bg-surface-muted rounded-panel border border-line">
              <p className="text-text-secondary text-sm">
                <strong>Note:</strong> This is a demonstration of the product
                rendering system. In the full application, this preview would be
                generated from an AI-analyzed website and user specifications.
              </p>
            </div>
          </div>

          <div className="max-w-4xl mx-auto">
            {/* Render the sample specification */}
            {sampleSpec.pages.map((page) => (
              <div key={page.id} className="mb-12">
                <h2 className="text-text font-semibold text-lg mb-4">
                  {page.title}
                </h2>
                <div className="space-y-6">
                  {page.sections.map((section, index) => (
                    <ProductSection
                      key={`${page.id}-${index}`}
                      section={section}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
