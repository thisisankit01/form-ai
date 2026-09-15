export function normalizePreviewPath(pathParts: string[] = []): string | null {
  let path: string;
  try { path = decodeURIComponent(pathParts.join('/')); } catch { return null; }
  if (path.includes('\0') || path.includes('..') || path.includes('\\') || path.includes('?') || path.includes('#') || /[\x00-\x1f]/.test(path)) return null;
  return path.replace(/^\/+/, '');
}

export function createPreviewTarget(baseUrl: string, path: string): URL {
  const base = new URL(baseUrl);
  if (base.protocol !== 'https:') throw new Error('Artifact preview must use HTTPS');
  const target = new URL(path ? `${base.toString().replace(/\/$/, '')}/${path}` : base.toString());
  if (target.origin !== base.origin) throw new Error('Artifact preview path escaped its origin');
  return target;
}

export function isPreviewAuthorized(userId: string | null | undefined, projectOwnerId: string | null | undefined): boolean {
  return Boolean(userId && projectOwnerId && userId === projectOwnerId);
}
