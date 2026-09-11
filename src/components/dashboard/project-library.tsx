"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatStatusLabel } from "@/components/dashboard/status-label";

type Project = {
  id: string;
  name: string;
  description: string | null;
  source_url: string | null;
  status: string;
  updated_at: string;
};

export function ProjectLibrary() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"updated" | "newest">("updated");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ sort });
      if (query.trim()) params.set("q", query.trim());
      const response = await fetch(`/api/projects?${params}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Projects could not be loaded.");
      setProjects(result.data || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Projects could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [query, sort]);

  useEffect(() => {
    const timer = window.setTimeout(loadProjects, 150);
    return () => window.clearTimeout(timer);
  }, [loadProjects]);

  return (
    <section className="mx-auto w-full max-w-[1440px] p-5 md:p-8" aria-labelledby="projects-heading">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-accent-ink">Workspace</p>
          <h1 id="projects-heading" className="text-page-title text-text">Your projects</h1>
          <p className="mt-2 max-w-lg text-text-secondary">Turn a public reference into a product direction, then keep the versions worth building.</p>
        </div>
        <Link href="/app/projects/new" className="inline-flex h-12 items-center justify-center rounded-control bg-accent px-5 text-sm font-bold text-accent-ink hover:brightness-95">New project</Link>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="sr-only" htmlFor="project-search">Search projects</label>
        <input id="project-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects" className="h-12 w-full max-w-xs rounded-control border border-line bg-surface px-4 text-base text-text placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-focus" />
        <label className="sr-only" htmlFor="project-sort">Sort projects</label>
        <select id="project-sort" value={sort} onChange={(event) => setSort(event.target.value as "updated" | "newest")} className="h-12 rounded-control border border-line bg-surface px-4 text-sm text-text focus:outline-none focus:ring-2 focus:ring-focus">
          <option value="updated">Recently updated</option>
          <option value="newest">Newest</option>
        </select>
      </div>

      {loading && <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading projects">{[1, 2, 3].map((item) => <div key={item} className="h-48 animate-pulse rounded-panel border border-line bg-surface-muted" />)}</div>}
      {error && !loading && <div className="mt-8 rounded-control border border-danger bg-danger/10 p-4 text-sm text-danger" role="alert">{error} <button type="button" className="ml-2 font-semibold underline" onClick={loadProjects}>Retry</button></div>}
      {!loading && !error && projects.length === 0 && <div className="mt-12 max-w-xl border-t border-line pt-8"><h2 className="text-text-lg font-semibold text-text">{query ? "No projects match that search." : "The first version starts here."}</h2><p className="mt-2 text-text-secondary">{query ? "Try another search or clear the filter." : "Start with a public website and a clear audience."}</p>{query ? <button type="button" onClick={() => setQuery("")} className="mt-5 text-sm font-semibold text-text underline">Clear search</button> : <Link href="/app/projects/new" className="mt-5 inline-flex h-12 items-center rounded-control bg-ink px-5 text-sm font-semibold text-text-inverse">New project</Link>}</div>}
        {!loading && !error && projects.length > 0 && <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{projects.map((project) => <Link key={project.id} href={`/app/projects/${project.id}`} className="group overflow-hidden rounded-panel border border-line bg-surface transition hover:-translate-y-0.5 hover:border-ink hover:shadow-float"><div className="relative aspect-[16/10] overflow-hidden border-b border-line bg-ink" aria-label="No preview available"><div className="absolute inset-4 border border-white/15"><div className="absolute left-4 top-4 h-2 w-20 bg-accent" /><div className="absolute bottom-4 left-4 right-4 grid grid-cols-3 gap-2"><span className="h-12 bg-white/10" /><span className="h-12 bg-white/10" /><span className="h-12 bg-white/10" /></div></div></div><div className="p-5"><div className="flex items-start justify-between gap-3"><h2 className="min-w-0 truncate text-base font-semibold text-text" title={project.name}>{project.name}</h2><span className="shrink-0 rounded-chip bg-surface-muted px-2 py-1 text-xs font-medium text-text-secondary">{formatStatusLabel(project.status)}</span></div><p className="mt-2 line-clamp-2 text-sm text-text-secondary">{project.description || "No description"}</p><p className="mt-4 truncate font-mono text-xs text-text-secondary">{project.source_url || "No source URL"}</p><p className="mt-2 text-xs text-text-secondary">Updated {new Date(project.updated_at).toLocaleDateString()}</p></div></Link>)}</div>}
    </section>
  );
}
