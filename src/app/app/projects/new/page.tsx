"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { getApiErrorMessage } from "@/lib/api/error";

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [targetCustomer, setTargetCustomer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name || undefined, url, description, targetCustomer }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(getApiErrorMessage(result, "Project could not be created."));
      const analysisResponse = await fetch(`/api/projects/${result.data.id}/analyze`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idempotencyKey: crypto.randomUUID() }),
      });
      if (!analysisResponse.ok) {
        const analysisResult = await analysisResponse.json();
        // The project still exists. Send the user to its recovery state instead
        // of trapping them on the creation form with a dead-end error.
        console.warn("Initial generation could not be queued:", getApiErrorMessage(analysisResult, "Generation could not be started."));
      }
      router.push(`/app/projects/${result.data.id}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Project could not be created.");
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl p-5 md:p-8">
      <div className="mb-8">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-accent-ink">New workspace</p>
        <h1 className="text-page-title mb-2">Start a project</h1>
        <p className="max-w-xl text-text-secondary">Bring a public reference, define the audience, and FORM will shape the first product direction.</p>
      </div>

      {error && <div className="mb-6 rounded-control border border-danger bg-danger/10 p-4 text-sm text-danger" role="alert">{error}</div>}
      
      <form onSubmit={handleSubmit} className="space-y-6 rounded-panel border border-line bg-surface p-5 shadow-float md:p-8">
        <div>
          <Label htmlFor="project-name">Project name <span className="font-normal text-text-secondary">(optional)</span></Label>
          <Input
            id="project-name"
            placeholder="Enter a name for your project"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
          />
        </div>
        
        <div>
          <Label htmlFor="website-url">Website URL</Label>
          <Input
            id="website-url"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        
        <div>
          <Label htmlFor="project-description">Project Description</Label>
          <Textarea
            id="project-description"
            placeholder="A simpler version for independent consultants, with clear pricing and a booking dashboard."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            minLength={30}
            required
            disabled={loading}
          />
        </div>
        
        <div>
          <Label htmlFor="target-customer">Target Customer</Label>
          <Input
            id="target-customer"
            placeholder="Who is this product for? (e.g., small businesses, enterprise customers)"
            value={targetCustomer}
            onChange={(e) => setTargetCustomer(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        
        <div className="flex justify-end">
          <Button 
            type="submit" 
            variant="default" 
            disabled={loading}
            className="w-48"
          >
            {loading ? "Creating…" : "Create project"}
          </Button>
        </div>
      </form>
    </div>
  );
}
