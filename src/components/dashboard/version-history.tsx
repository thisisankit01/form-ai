"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Version = {
  id: string;
  version_number: number;
  change_summary: string[] | null;
  created_at: string;
};

export function VersionHistory({
  projectId,
  currentVersionId,
  onRestored,
}: {
  projectId: string;
  currentVersionId: string | null;
  onRestored: () => void;
}) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadVersions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/versions?limit=20`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Versions could not be loaded.");
      setVersions(result.data || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Versions could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadVersions();
  }, [loadVersions]);

  async function restore(version: Version) {
    if (!currentVersionId || version.id === currentVersionId) return;
    setRestoring(version.id);
    setNotice(null);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/restore`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ versionId: version.id, expectedCurrentVersionId: currentVersionId, idempotencyKey: crypto.randomUUID() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Version could not be restored.");
      setNotice(`Restored v${String(version.version_number).padStart(2, "0")} as a new version.`);
      onRestored();
      await loadVersions();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Version could not be restored.");
    } finally {
      setRestoring(null);
    }
  }

  return (
    <section aria-labelledby="version-history-title" className="mt-5 rounded-panel border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 id="version-history-title" className="text-sm font-semibold text-text">Version history</h3>
          <p className="mt-1 text-xs text-text-secondary">Restore creates a new version. Nothing is overwritten.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void loadVersions()} disabled={loading}>Refresh</Button>
      </div>
      {loading && <p className="mt-4 text-xs text-text-secondary" aria-busy="true">Loading versions...</p>}
      {error && <div className="mt-4 rounded-control border border-danger/30 bg-danger/10 p-3 text-xs text-danger" role="alert"><p>{error}</p><Button variant="ghost" size="sm" className="mt-2 px-0 text-danger" onClick={() => void loadVersions()}>Try again</Button></div>}
      {notice && <p className="mt-4 text-xs text-success" role="status">{notice}</p>}
      {!loading && !error && versions.length === 0 && <p className="mt-4 text-xs text-text-secondary">No saved versions yet.</p>}
      <div className="mt-4 space-y-2">
        {versions.map((version) => {
          const current = version.id === currentVersionId;
          return <div key={version.id} className={`flex items-center justify-between gap-3 rounded-control border p-3 ${current ? "border-accent bg-accent/10" : "border-line"}`}>
            <div className="min-w-0"><div className="flex items-center gap-2"><span className="text-sm font-semibold text-text">v{String(version.version_number).padStart(2, "0")}</span>{current && <span className="rounded-chip bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text">Current</span>}</div><p className="mt-1 truncate text-xs text-text-secondary">{version.change_summary?.[0] || "Product version"}</p><p className="mt-1 text-[11px] text-text-secondary">{new Date(version.created_at).toLocaleString()}</p></div>
            {!current && <Button variant="outline" size="sm" onClick={() => void restore(version)} disabled={restoring !== null}>{restoring === version.id ? "Restoring..." : "Restore"}</Button>}
          </div>;
        })}
      </div>
    </section>
  );
}
