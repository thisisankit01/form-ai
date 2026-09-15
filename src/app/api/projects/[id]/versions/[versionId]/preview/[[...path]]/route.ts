import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizePreviewPath, createPreviewTarget, isPreviewAuthorized } from '@/lib/generation-v3/preview';
import { executeArtifact } from '@/lib/generation-v3/sandbox';
import { CodeArtifact } from '@/lib/generation-v3/contracts';

export const dynamic = 'force-dynamic';

const PREVIEW_CSP = [
  "default-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'self'",
  // Sandboxed documents have an opaque origin, so 'self' would block Vite assets.
  "script-src * 'unsafe-inline' blob:",
  "style-src * 'unsafe-inline'",
  "img-src * data: blob:",
  "font-src * data:",
  "connect-src 'none'",
  "object-src 'none'",
  "media-src 'self' blob:",
].join('; ');
const SAFE_CONTENT_TYPES = /^(?:text\/html|text\/css|text\/javascript|application\/javascript|application\/json|image\/(?:avif|gif|jpeg|png|svg\+xml|webp)|font\/(?:woff|woff2)|application\/font-woff2)$/i;
const previewRestarts = new Map<string, Promise<{ previewUrl: string; previewToken: string }>>();

async function restartPreview(admin: ReturnType<typeof createAdminClient>, versionId: string): Promise<{ previewUrl: string; previewToken: string }> {
  const existing = previewRestarts.get(versionId);
  if (existing) return existing;
  const restart = (async () => {
    const { data: version, error } = await admin.from('product_versions').select('artifact_manifest').eq('id', versionId).single();
    if (error || !version) throw new Error('Saved artifact could not be loaded');
    const artifact = CodeArtifact.safeParse(version.artifact_manifest);
    if (!artifact.success) throw new Error('Saved artifact metadata is invalid');
    const sandbox = await executeArtifact(artifact.data);
    const { error: secretError } = await admin.from('artifact_runtime_secrets').upsert({
      version_id: versionId,
      preview_url: sandbox.previewUrl,
      preview_token: sandbox.trafficAccessToken,
      sandbox_id: sandbox.sandboxId,
      expires_at: new Date(Date.now() + 30 * 60_000).toISOString(),
    }, { onConflict: 'version_id' });
    if (secretError) {
      await sandbox.kill().catch(() => undefined);
      throw secretError;
    }
    return { previewUrl: sandbox.previewUrl, previewToken: sandbox.trafficAccessToken };
  })();
  previewRestarts.set(versionId, restart);
  try {
    return await restart;
  } finally {
    previewRestarts.delete(versionId);
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; versionId: string; path?: string[] }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, versionId, path = [] } = await params;
  const previewPath = normalizePreviewPath(path);
  if (previewPath === null) return NextResponse.json({ error: 'Invalid preview path' }, { status: 400 });

  const { data: project } = await supabase.from('projects').select('id, user_id').eq('id', id).single();
  if (!project || !isPreviewAuthorized(user.id, project.user_id)) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  const admin = createAdminClient();
  const { data: version } = await admin.from('product_versions')
    .select('engine, artifact_manifest')
    .eq('id', versionId).eq('project_id', id).single();
  if (!version || version.engine !== 'code-artifact-v3') return NextResponse.json({ error: 'V3 artifact not found' }, { status: 404 });
  const { data: runtimeSecret } = await admin.from('artifact_runtime_secrets')
    .select('preview_url, preview_token').eq('version_id', versionId).single();
  if (!runtimeSecret?.preview_url || !runtimeSecret.preview_token) return NextResponse.json({ error: 'Artifact preview is not ready' }, { status: 409 });

  let target: URL;
  try { target = createPreviewTarget(runtimeSecret.preview_url, previewPath); } catch { return NextResponse.json({ error: 'Invalid preview target' }, { status: 400 }); }
  const upstream = await fetch(target, {
    headers: { 'e2b-traffic-access-token': runtimeSecret.preview_token },
    redirect: 'manual',
  });
  if (upstream.status === 404 || upstream.status === 502 || upstream.status === 503) {
    try {
      const restarted = await restartPreview(admin, versionId);
      target = createPreviewTarget(restarted.previewUrl, previewPath);
      const recovered = await fetch(target, { headers: { 'e2b-traffic-access-token': restarted.previewToken }, redirect: 'manual' });
      if (recovered.ok || recovered.status >= 300 && recovered.status < 400) {
        return respondWithPreview(recovered, id, versionId);
      }
    } catch {
      return NextResponse.json({ error: 'Preview runtime could not be restarted. Please retry.', code: 'PREVIEW_RESTART_FAILED' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Preview runtime could not be restarted. Please retry.', code: 'PREVIEW_RESTART_FAILED' }, { status: 503 });
  }
  return respondWithPreview(upstream, id, versionId);
}

async function respondWithPreview(upstream: Response, id: string, versionId: string): Promise<NextResponse> {
  if (upstream.status >= 300 && upstream.status < 400) return NextResponse.json({ error: 'Preview redirect rejected' }, { status: 502 });
  const headers = new Headers();
  const contentType = upstream.headers.get('content-type');
  if (contentType && SAFE_CONTENT_TYPES.test(contentType.split(';', 1)[0].trim())) headers.set('content-type', contentType);
  headers.set('cache-control', 'private, no-store');
  headers.set('content-security-policy', PREVIEW_CSP);
  headers.set('content-disposition', 'inline');
  headers.set('x-content-type-options', 'nosniff');
  headers.set('x-frame-options', 'SAMEORIGIN');
  headers.set('referrer-policy', 'no-referrer');
  headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  if (contentType?.toLowerCase().startsWith('text/html')) {
    const html = await upstream.text();
    const previewBase = `/api/projects/${encodeURIComponent(id)}/versions/${encodeURIComponent(versionId)}/preview/`;
    const withBase = /<head(?:\s[^>]*)?>/i.test(html)
      ? html.replace(/<head(?:\s[^>]*)?>/i, (tag) => `${tag}<base href="${previewBase}">`)
      : `<base href="${previewBase}">${html}`;
    const rewritten = withBase.replace(/((?:src|href)=['"])\/(?!\/)/gi, `$1${previewBase}`);
    return new NextResponse(rewritten, { status: upstream.status, headers });
  }
  return new NextResponse(upstream.body, { status: upstream.status, headers });
}
