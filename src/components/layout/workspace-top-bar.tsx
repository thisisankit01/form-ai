"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ProjectDropdown } from "./project-dropdown";
import { getApiErrorMessage } from "@/lib/api/error";

export function WorkspaceTopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("Current Project");

  const handleNewProject = () => {
    router.push("/app/projects/new");
  };

  useEffect(() => {
    const projectId = pathname.match(/^\/app\/projects\/([^/]+)/)?.[1];
    if (!projectId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProjectName("Current Project");
      return;
    }
    fetch(`/api/projects/${projectId}`).then((response) => response.ok ? response.json() : null).then((result) => {
      if (result?.data?.project?.name) setProjectName(result.data.project.name);
    }).catch(() => undefined);
  }, [pathname]);

  const handleExport = async () => {
    const projectId = pathname.match(/^\/app\/projects\/([^/]+)/)?.[1];
    if (!projectId) {
      router.push("/app");
      return;
    }
    setExporting(true);
    setExportMessage(null);
    setExportUrl(null);
    try {
       const projectResponse = await fetch(`/api/projects/${projectId}`);
       const projectResult = await projectResponse.json();
       const activeJob = projectResult.data?.recentJobs?.some((job: { status?: string }) => ["queued", "running"].includes(job.status || ""));
       if (activeJob) throw new Error("Finish the active run before exporting.");
       const versionId = projectResult.data?.version?.id;
      if (!versionId) throw new Error("Generate a product version before exporting.");
      const response = await fetch(`/api/projects/${projectId}/export`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ versionId, idempotencyKey: crypto.randomUUID() }),
      });
      const result = await response.json();
       if (!response.ok) throw new Error(getApiErrorMessage(result, "Export could not be started."));
       setExportMessage("Export queued. We'll keep checking for the completed download.");
       for (let attempt = 0; attempt < 24; attempt += 1) {
         await new Promise((resolve) => window.setTimeout(resolve, 2500));
         const latestResponse = await fetch(`/api/projects/${projectId}`);
         if (!latestResponse.ok) continue;
         const latest = await latestResponse.json();
          const completed = latest.data?.exports?.find((item: { id: string; status: string }) => item.status === "completed");
          if (completed) {
            setExportUrl(`/api/exports/${completed.id}/download`);
            setExportMessage("Export complete. Your download is ready.");
           break;
         }
         if (latest.data?.recentJobs?.some((job: { kind: string; status: string }) => job.kind === "export" && job.status === "failed")) {
           setExportMessage("Export failed. Open runs and details for the error.");
           break;
         }
       }
    } catch (error) {
      setExportMessage(error instanceof Error ? error.message : "Export could not be started.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <header className="relative flex h-16 shrink-0 items-center justify-between border-b border-line bg-surface px-5 md:px-8">
      <div className="flex items-center space-x-4 min-w-0">
           <ProjectDropdown projectName={projectName} />
        <div className="flex-1 min-w-0">
          <h1 className="text-workspace-title truncate font-semibold text-text">
            {projectName}
          </h1>
        </div>
      </div>
      <div className="flex items-center space-x-3 shrink-0">
         <button
          onClick={handleNewProject}
          className="flex items-center gap-2 px-4 py-2 text-text-secondary hover:text-text rounded-control text-sm font-medium transition-colors"
          aria-label="Create new project"
        >
          <span className="w-5 h-5 flex items-center justify-center">+</span>
          <span className="hidden sm:inline">New project</span>
        </button>
         <button
           onClick={handleExport}
           disabled={exporting}
           className="flex items-center gap-2 rounded-control bg-ink px-4 py-2 text-sm font-semibold text-text-inverse transition-colors hover:bg-ink-raised"
          aria-label="Export project"
        >
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l2.293-2.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
           <span className="hidden sm:inline">{exporting ? "Exporting..." : "Export"}</span>
         </button>
          {exportMessage && <span className="absolute right-5 top-16 max-w-xs rounded-control border border-line bg-surface px-3 py-2 text-xs text-text-secondary shadow-float" role="status">{exportMessage}{exportUrl && <a href={exportUrl} target="_blank" rel="noreferrer" className="ml-2 font-semibold text-text underline">Download</a>}</span>}
      </div>
    </header>
  );
}
