"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { getApiErrorMessage } from "@/lib/api/error";
import { formatStatusLabel } from "@/components/dashboard/status-label";

interface ProjectHeaderProps {
  project: {
    id: string;
    name: string;
    description: string;
    updatedAt: string;
    status: string;
    versionNumber?: number | null;
  };
}

export function ProjectHeader({ project, onOpenRuns }: ProjectHeaderProps & { onOpenRuns?: () => void }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deleteProject() {
    if (!window.confirm(`Delete “${project.name}”? This permanently removes its versions and jobs.`)) return;
    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        setError(getApiErrorMessage(result, "Project could not be deleted."));
        setDeleting(false);
        return;
      }
    } catch {
      setError("Project could not be deleted.");
      setDeleting(false);
      return;
    }
    router.replace("/app");
  }

  return (
    <div className="shrink-0 border-b border-line-dark bg-surface px-5 py-4 md:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <button type="button" onClick={() => router.push('/app/projects')} className="mb-3 text-xs font-semibold text-text-secondary transition-colors hover:text-text">Back to projects</button>
          <h1 className="text-text-xl font-bold">{project.name}</h1>
          <p className="max-w-2xl text-text-secondary">{project.description}</p>
        </div>
          <div className="flex flex-wrap items-center gap-2">
          <span className={`px-3 py-1 text-text-xs rounded-full bg-${getStatusColor(project.status)}/20 text-${getStatusColor(project.status)}`}>
            {formatStatusLabel(project.status)}
          </span>
          <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="sm" aria-label="Project actions"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={onOpenRuns}>Runs and details</DropdownMenuItem><DropdownMenuItem onSelect={() => router.push(`/app/projects/${project.id}`)}>Refresh project</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onSelect={deleteProject} className="text-danger">{deleting ? "Deleting..." : "Delete project"}</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-danger" role="alert">{error}</p>}
      <div className="mt-3 flex items-center gap-4 text-text-xs">
        <span>Updated: {new Date(project.updatedAt).toLocaleDateString()}</span>
        <span className="h-0.5 w-px bg-line-dark"></span>
        <span>Version: {project.versionNumber ? String(project.versionNumber).padStart(2, "0") : "Not generated"}</span>
      </div>
    </div>
  );
}

function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case "completed":
      return "success";
    case "in progress":
      return "accent";
    case "planning":
      return "warning";
    default:
      return "text";
  }
}
