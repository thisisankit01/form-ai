"use client";

import { useCallback, useEffect, useState } from "react";
import { ProjectHeader } from "@/components/dashboard/project-header";
import { PreviewPanel } from "@/components/dashboard/preview-panel";
import { ProductSpec } from "@/lib/product/schema";
import { Button } from "@/components/ui/button";
import { ProjectRunSheet } from "@/components/dashboard/project-run-sheet";
import { getApiErrorMessage } from "@/lib/api/error";
import { VersionHistory } from "@/components/dashboard/version-history";

type WorkspaceData = {
  project: { id: string; name: string; description: string | null; updated_at: string; status: string };
  version: { id: string; version_number: number; spec: unknown; change_summary?: string[] | null; created_at?: string } | null;
  recentJobs: { id: string; kind: string; status: string; stage: string | null; created_at?: string; started_at?: string | null; finished_at?: string | null; error_message?: string | null; steps: { stage_key: string; status: string; started_at?: string | null; finished_at?: string | null; error_code?: string | null }[] }[];
  analysis: { summary_claim?: string; core_problem_text?: string; business_model_text?: string; screenshot_url?: string | null; analysis_evidence?: { source_url?: string; excerpt?: string }[]; analysis_visual?: { layout?: string; palette?: string; hierarchy?: string; density?: string; issues?: string[] }[] } | null;
  captures: { id: string; requested_url: string; final_url?: string | null; title?: string | null; screenshot_path?: string | null; captured_at: string; metadata?: Record<string, unknown> }[];
  qaReports: { id: string; version_id: string; status: string; checks: unknown[]; ai_findings: unknown[]; created_at: string }[];
  exports: { id: string; version_id: string; storage_path: string; status: string; created_at: string }[];
};

export function ProjectWorkspace({ projectId }: { projectId: string }) {
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [messages, setMessages] = useState<{ id: string; role: string; content: string; status: string }[]>([]);
  const [instruction, setInstruction] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [runSheetOpen, setRunSheetOpen] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [qaStarting, setQaStarting] = useState(false);

  const loadProject = useCallback(async (signal?: AbortSignal) => {
    const timeoutController = new AbortController();
    const requestSignal = signal ? AbortSignal.any([signal, timeoutController.signal]) : timeoutController.signal;
    const timeout = window.setTimeout(() => timeoutController.abort(), 15000);
    try {
      const response = await fetch(`/api/projects/${projectId}`, { signal: requestSignal, cache: "no-store" });
      const result = await response.json();
    if (!response.ok) throw new Error(getApiErrorMessage(result, "Project could not be loaded."));
      setData(result.data as WorkspaceData);
      setTimedOut(false);
    } catch (cause) {
      if (timeoutController.signal.aborted && !signal?.aborted) throw new Error("The workspace request timed out.");
      throw cause;
    } finally {
      window.clearTimeout(timeout);
    }
  }, [projectId]);

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProject(controller.signal)
      .catch((cause) => {
        if (!controller.signal.aborted) {
          setTimedOut(cause instanceof Error && cause.message.includes("timed out"));
          setError(cause instanceof Error ? cause.message : "Project could not be loaded.");
        }
      });
    return () => controller.abort();
  }, [loadProject]);

  useEffect(() => {
    const active = polling || data?.recentJobs.some((job) => ["queued", "running"].includes(job.status));
    if (!active) return;
    const timer = window.setInterval(() => {
      loadProject().catch(() => undefined);
    }, 2500);
    const stopTimer = window.setTimeout(() => { setPolling(false); setTimedOut(true); }, 60000);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(stopTimer);
    };
  }, [data?.recentJobs, loadProject, polling]);

  useEffect(() => {
    if (!data) return;
     fetch(`/api/projects/${projectId}/messages`, { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((result) => { if (result?.data) setMessages(result.data); }).catch(() => undefined);
  }, [data, projectId]);

  async function sendInstruction() {
    if (!instruction.trim() || !data?.version || activeJob) return;
    setSending(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/messages`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ instruction: instruction.trim(), baseVersionId: data.version.id, idempotencyKey: crypto.randomUUID() }) });
      const result = await response.json();
       if (!response.ok) throw new Error(getApiErrorMessage(result, "Edit could not be started."));
      setInstruction("");
      setPolling(true);
      const messageResponse = await fetch(`/api/projects/${projectId}/messages`);
      if (messageResponse.ok) setMessages((await messageResponse.json()).data || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Edit could not be started.");
    } finally {
      setSending(false);
    }
  }

  async function startAnalysis() {
    if (activeJob) return;
    setStarting(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/analyze`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idempotencyKey: crypto.randomUUID() }),
      });
      const result = await response.json();
       if (!response.ok) throw new Error(getApiErrorMessage(result, "Analysis could not be started."));
      setPolling(true);
      setNotice("Analysis queued. This page will update when the first version is ready.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Analysis could not be started.");
    } finally {
      setStarting(false);
    }
  }

  async function startQa() {
    if (!data?.version || activeJob) return;
    setQaStarting(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/qa`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ versionId: data.version.id, idempotencyKey: crypto.randomUUID() }) });
      const result = await response.json();
       if (!response.ok) throw new Error(result.error || "QA could not be started.");
      setPolling(true);
      setNotice("QA started. We will show the result here when the run finishes.");
      await loadProject();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "QA could not be started.");
    } finally {
      setQaStarting(false);
    }
  }

  async function retryLoad() {
    setError(null);
    setTimedOut(false);
    try { await loadProject(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Project could not be loaded."); }
  }

  if (error && !data) return <div className="m-5 rounded-panel border border-danger/30 bg-danger/10 p-5" role="alert"><p className="font-semibold text-danger">{timedOut ? "This is taking longer than expected." : "The workspace could not load."}</p><p className="mt-2 text-sm text-danger">{error}</p><Button variant="outline" size="sm" className="mt-4" onClick={() => void retryLoad()}>Try again</Button></div>;
  if (!data) return <div className="p-8 text-text-secondary" aria-busy="true">Loading project...</div>;

  const parsedSpec = data.version ? ProductSpec.safeParse(data.version.spec) : null;
  const spec = parsedSpec?.success ? parsedSpec.data : null;
  const activeJob = data.recentJobs.find((job) => ["queued", "running"].includes(job.status));
  const latestJob = (selectedJobId && data.recentJobs.find((job) => job.id === selectedJobId)) || activeJob || data.recentJobs[0];

   return (
     <div className="flex h-full min-h-0 flex-1 flex-col">
        <ProjectHeader onOpenRuns={() => setRunSheetOpen(true)} project={{ id: data.project.id, name: data.project.name, description: data.project.description || "", updatedAt: data.project.updated_at, status: data.project.status, versionNumber: data.version?.version_number }} />
        {error && <div className="mx-5 mt-4 flex items-center justify-between gap-4 rounded-control border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger md:mx-6" role="alert"><span>{error}</span><Button variant="ghost" size="sm" className="shrink-0 text-danger" onClick={() => void retryLoad()}>Retry</Button></div>}
        <div className="form-workspace-body min-h-0 flex-1">
         <aside className="form-chat flex min-h-0 flex-col border-r border-line bg-muted px-5 py-6">
           <div className="shrink-0"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold tracking-tight text-text">Shape the product</h2><span className="rounded-chip bg-surface px-2 py-1 text-[11px] font-medium text-text-secondary">{data.version ? `v${String(data.version.version_number).padStart(2, "0")}` : "Draft"}</span></div><p className="mt-2 max-w-xs text-sm leading-6 text-text-secondary">Describe the outcome. FORM will turn your direction into a new product version.</p></div>
           <div className="mt-6 min-h-0 flex-1 overflow-y-auto pr-1">
            {!data.version && <div className="rounded-panel border border-line bg-surface p-4"><p className="text-sm text-text-secondary">Analyze the source to extract evidence and generate the first product version.</p><Button type="button" className="mt-4 w-full" onClick={startAnalysis} disabled={starting}>{starting ? "Starting analysis..." : "Analyze source"}</Button></div>}
            {!data.version && <p className="mt-3 text-xs text-text-secondary">Typical analysis time: 30–90 seconds. You can keep working in this tab while each stage updates.</p>}
             <button type="button" onClick={() => setRunSheetOpen(true)} className="mt-5 flex w-full items-center justify-between rounded-panel border border-line bg-surface p-4 text-left transition-colors hover:bg-surface-muted"><span><span className="block text-sm font-semibold text-text">Runs and details</span><span className="mt-1 block text-xs text-text-secondary">Inspect captures, evidence, QA, and exports</span></span><span className="text-xs font-semibold text-text-secondary">Open</span></button>
             {polling && !latestJob && <div className="mt-5 rounded-panel border border-accent/40 bg-accent/10 p-4" role="status"><p className="text-sm font-semibold text-text">Working on it</p><p className="mt-1 text-xs text-text-secondary">The live run will appear here as soon as the worker reports its first stage.</p><div className="mt-4 h-1 overflow-hidden rounded-full bg-surface"><div className="h-full w-1/3 animate-pulse bg-accent" /></div></div>}
             {notice && <p className="mt-4 text-sm text-success" role="status">{notice}</p>}
             {timedOut && <div className="mt-4 rounded-control border border-warning/30 bg-warning/10 p-3 text-xs text-text" role="status"><p className="font-semibold">Live updates paused after one minute.</p><button type="button" className="mt-2 font-semibold underline" onClick={() => { setTimedOut(false); setPolling(true); }}>Resume updates</button></div>}
             <VersionHistory projectId={projectId} currentVersionId={data.version?.id || null} onRestored={() => { setPolling(true); void loadProject(); }} />
          </div>
            {data.version ? <div className="form-chat-composer mt-5 shrink-0 border-t border-line pt-5"><div className="mb-4 max-h-56 space-y-3 overflow-y-auto pr-1" aria-live="polite">{messages.length === 0 && <p className="rounded-control border border-dashed border-line p-3 text-sm leading-6 text-text-secondary">Try: “Make this feel more premium” or “Add a pricing page for three plans.”</p>}{messages.map((message) => <div key={message.id} className={`rounded-control p-3 text-sm leading-6 ${message.role === "user" ? "bg-ink text-text-inverse" : "border border-line bg-surface text-text"}`}><p>{message.content}</p><span className="mt-1 block text-[11px] text-text-secondary">{message.status === "pending" ? "Processing..." : message.status === "completed" ? "Change receipt recorded" : message.status}</span></div>)}</div><textarea aria-label="Describe a product change" value={instruction} onChange={(event) => setInstruction(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendInstruction(); } }} placeholder="Describe a product change..." rows={3} className="w-full resize-none rounded-control border border-line bg-surface p-3 text-sm leading-6 text-text placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-focus" /><div className="mt-2 flex items-center justify-between gap-3"><span className="text-[11px] text-text-secondary">Enter to send · Shift+Enter for a new line</span><Button type="button" className="shrink-0 px-4" onClick={sendInstruction} disabled={sending || !instruction.trim()}>{sending ? "Working..." : "Send"}</Button></div><p className="mt-3 text-[11px] text-text-secondary">New edits create a version. The preview stays on the last confirmed version while processing.</p></div> : <p className="mt-4 border-t border-line pt-4 text-xs leading-5 text-text-secondary">Generate a first version to start shaping the product with chat.</p>}
        </aside>
          <div className="form-preview-pane min-h-0 flex-1 overflow-y-auto bg-canvas p-5">
            {data.analysis && <section className="mb-5 rounded-panel border border-line bg-surface p-5" aria-labelledby="analysis-title"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-text-secondary">Analysis result</p><h2 id="analysis-title" className="mt-1 text-lg font-semibold text-text">Evidence-backed product direction</h2></div><span className="rounded-chip bg-success/10 px-2 py-1 text-[11px] font-semibold text-success">Complete</span></div><p className="mt-4 max-w-3xl text-sm leading-6 text-text-secondary">{data.analysis.summary_claim || "Analysis completed without a summary claim."}</p><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["Core problem", data.analysis.core_problem_text], ["Business model", data.analysis.business_model_text], ["Layout", data.analysis.analysis_visual?.[0]?.layout], ["Palette", data.analysis.analysis_visual?.[0]?.palette]].map(([label, value]) => <div key={label} className="rounded-control bg-surface-muted p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">{label}</p><p className="mt-1 text-sm text-text">{value || "Not captured"}</p></div>)}</div>{data.analysis.analysis_evidence?.[0] && <blockquote className="mt-5 border-l-2 border-accent pl-3 text-sm italic text-text-secondary">“{data.analysis.analysis_evidence[0].excerpt || "Evidence captured from the source."}”</blockquote>}</section>}
            <div className="min-h-[520px] rounded-panel border border-line bg-surface p-3"><PreviewPanel spec={spec} /></div>
          </div>
      </div>
        <ProjectRunSheet open={runSheetOpen} onOpenChange={setRunSheetOpen} data={data} selectedJobId={selectedJobId} onSelectJob={setSelectedJobId} onRunQa={startQa} qaStarting={qaStarting} hasActiveJob={!!activeJob} />
    </div>
  );
}
