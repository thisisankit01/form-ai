/* eslint-disable @typescript-eslint/no-explicit-any */
import { FirecrawlAppV1 as FirecrawlApp } from '@mendable/firecrawl-js';

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;

if (!FIRECRAWL_API_KEY) {
  throw new Error('FIRECRAWL_API_KEY environment variable is required');
}

const firecrawl = new FirecrawlApp({ apiKey: FIRECRAWL_API_KEY });

const FIRECRAWL_TIMEOUT_MS = 35_000;
const BROWSER_TIMEOUT_MS = 30_000;
const BROWSER_CLEANUP_TIMEOUT_MS = 5_000;

async function withTimeout<T>(operation: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function closeBrowser(browser: any): Promise<void> {
  try {
    await withTimeout(browser.close(), BROWSER_CLEANUP_TIMEOUT_MS, 'Browser cleanup');
  } catch (error) {
    console.warn('Browser fidelity capture cleanup failed:', error instanceof Error ? error.message : error);
  }
}

async function launchBrowserWithTimeout(chromium: any): Promise<any> {
  const launch = chromium.launch({ headless: true });
  let timedOut = false;
  // A launch that resolves after the timeout still owns a browser process.
  launch.then((browser: any) => {
    if (timedOut) return closeBrowser(browser);
  }).catch(() => undefined);
  try {
    return await withTimeout(launch, BROWSER_TIMEOUT_MS, 'Browser launch');
  } catch (error) {
    timedOut = true;
    throw error;
  }
}

export interface CaptureResult {
  kind: 'url' | 'user_pasted';
  requestedUrl: string;
  finalUrl: string | null;
  title: string | null;
  normalizedText: string;
  screenshotPath: string | null;
  metadata: Record<string, unknown>;
  capturedAt: string;
  screenshotData?: string;
  screenshotDataByViewport?: Array<{ viewport: 'desktop' | 'mobile'; data: string; width: number; height: number }>;
  fidelity?: Record<string, unknown>;
}

export interface PageFidelity {
  viewport: { width: number; height: number };
  documentHeight: number;
  dom: string;
  assets: {
    images: string[];
    stylesheets: string[];
    scripts: string[];
    fonts: string[];
    resources: string[];
    other: string[];
  };
  fonts: Array<{ family: string; status: string; weight: string; style: string; stretch: string }>;
  sectionOrder: Array<{ index: number; id: string | null; label: string | null; heading: string | null }>;
  screenshot: { fullPage: true; width: number; height: number };
}

export interface ScreenshotUploadResult {
  path: string;
  publicUrl: string | null;
}

/**
 * Capture a single public page using Firecrawl.
 * Returns markdown content, metadata, and screenshot.
 */
export async function captureWebsite(url: string): Promise<CaptureResult> {
  // Validate URL before request
  const validatedUrl = validateAndNormalizeUrl(url);

  try {
    const result = await withTimeout(firecrawl.scrapeUrl(validatedUrl, {
      formats: ['markdown', 'html', 'screenshot'],
      onlyMainContent: true,
      waitFor: 2000,
      timeout: 30000,
    }), FIRECRAWL_TIMEOUT_MS, 'Firecrawl scrape');

    if (!result.success) {
      throw new Error(result.error || 'Firecrawl scrape failed');
    }

    const resultData = result as any;
    const normalizedText = normalizeText(resultData.markdown || '');
    const screenshotPath = resultData.screenshot || resultData.screenshotUrl || null;
    let screenshotData: string | undefined;
    const screenshotDataByViewport: CaptureResult['screenshotDataByViewport'] = [];
    let fidelity: Record<string, unknown> | undefined;
    let browser: any = null;
    try {
      const { chromium } = await import('playwright');
      browser = await launchBrowserWithTimeout(chromium);
      const page: any = await withTimeout(browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }), BROWSER_TIMEOUT_MS, 'Browser page creation');
      await withTimeout(page.goto(validatedUrl, { waitUntil: 'domcontentloaded', timeout: BROWSER_TIMEOUT_MS }), BROWSER_TIMEOUT_MS, 'Browser navigation');
      await withTimeout(page.evaluate(() => document.fonts?.ready), BROWSER_TIMEOUT_MS, 'Font loading');
      await withTimeout(page.waitForTimeout(1200), BROWSER_TIMEOUT_MS, 'Page settling');
      fidelity = await withTimeout(page.evaluate(() => {
        const resolveUrl = (value: string | null | undefined) => {
          if (!value) return null;
          try { return new URL(value, document.baseURI).href; } catch { return null; }
        };
        const unique = (values: Array<string | null>) => Array.from(new Set(values.filter((value): value is string => Boolean(value))));
        const images = unique(Array.from(document.querySelectorAll('img,source')).map((node) => {
          const element = node as HTMLImageElement | HTMLSourceElement;
          return resolveUrl('currentSrc' in element ? element.currentSrc : element.srcset?.split(',')[0]?.trim().split(' ')[0] || element.src);
        }));
        const stylesheets = unique(Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map((node) => resolveUrl((node as HTMLLinkElement).href)));
        const scripts = unique(Array.from(document.scripts).map((script) => resolveUrl(script.src)));
        const resources = unique(performance.getEntriesByType('resource').map((entry) => resolveUrl((entry as PerformanceResourceTiming).name)));
        const fontResources = resources.filter((url) => /\.(?:woff2?|ttf|otf|eot)(?:[?#]|$)/i.test(url));
        const loadedImageResources = resources.filter((url) => /\.(?:avif|gif|jpe?g|png|svg|webp)(?:[?#]|$)/i.test(url));
        const other = unique(Array.from(document.querySelectorAll('video, audio, source, link[rel="icon"]')).map((node) => {
          const element = node as HTMLMediaElement | HTMLSourceElement | HTMLLinkElement;
          return resolveUrl('href' in element ? element.href : 'currentSrc' in element ? element.currentSrc : element.src);
        }));
        const sections = Array.from(document.querySelectorAll('header,main,nav,section,footer')).map((node, index) => ({
          index,
          id: node.id || null,
          label: node.getAttribute('aria-label') || null,
          heading: node.querySelector('h1,h2,h3,h4')?.textContent?.trim().replace(/\s+/g, ' ') || null,
        }));
        return {
          viewport: { width: window.innerWidth, height: window.innerHeight },
          documentHeight: document.documentElement.scrollHeight,
          dom: document.documentElement.outerHTML,
          assets: { images: unique([...images, ...loadedImageResources]), stylesheets, scripts, fonts: fontResources, resources, other },
          fonts: Array.from(document.fonts || []).map((font) => ({ family: font.family, status: font.status, weight: font.weight, style: font.style, stretch: font.stretch })),
          sectionOrder: sections,
          screenshot: { fullPage: true, width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
        };
      }), BROWSER_TIMEOUT_MS, 'Fidelity analysis');
      for (const viewport of [{ name: 'desktop' as const, width: 1440 }, { name: 'mobile' as const, width: 390 }]) {
        await page.setViewportSize({ width: viewport.width, height: 844 });
        await withTimeout(page.waitForTimeout(250), BROWSER_TIMEOUT_MS, 'Viewport settling');
        const screenshot = await withTimeout(page.screenshot({ fullPage: true, type: 'png' }), BROWSER_TIMEOUT_MS, `${viewport.name} screenshot capture`) as Buffer;
        const data = screenshot.toString('base64');
        screenshotDataByViewport.push({ viewport: viewport.name, data, width: viewport.width, height: 844 });
        if (viewport.name === 'desktop') screenshotData = data;
      }
    } catch (browserError) {
      console.warn('Browser fidelity capture unavailable; using Firecrawl screenshot:', browserError instanceof Error ? browserError.message : browserError);
    } finally {
      if (browser) await closeBrowser(browser);
    }

    return {
      kind: 'url',
      requestedUrl: url,
      finalUrl: resultData.metadata?.sourceURL || validatedUrl,
      title: resultData.metadata?.title || null,
      normalizedText,
      screenshotPath,
      metadata: { ...(resultData.metadata || {}), fidelity: fidelity || null },
      capturedAt: new Date().toISOString(),
      screenshotData,
      screenshotDataByViewport,
      fidelity,
    };
  } catch (error) {
    console.error('Firecrawl capture error:', error);
    throw new Error(`Capture failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Capture from user-pasted content (fallback when crawl fails).
 */
export async function captureFromPastedContent(content: string, sourceUrl: string): Promise<CaptureResult> {
  const normalizedText = normalizeText(content);
  return {
    kind: 'user_pasted',
    requestedUrl: sourceUrl,
    finalUrl: sourceUrl,
    title: extractTitleFromContent(content) || 'Pasted content',
    normalizedText,
    screenshotPath: null,
    metadata: { source: 'user_pasted' },
    capturedAt: new Date().toISOString(),
  };
}

function validateAndNormalizeUrl(url: string): string {
  let normalized = url.trim();
  
  // Permit omitted scheme by normalizing to HTTPS
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = 'https://' + normalized;
  }

  const parsed = new URL(normalized);
  
  // Reject non-http(s) protocols
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only HTTP/HTTPS URLs are allowed');
  }

  // Reject credentials in URL
  if (parsed.username || parsed.password) {
    throw new Error('URLs with credentials are not allowed');
  }

  // Reject local/private targets
  const hostname = parsed.hostname.toLowerCase();
  if (isPrivateHostname(hostname)) {
    throw new Error('Local and private addresses are not allowed');
  }

  // Reject unsupported ports
  const port = parseInt(parsed.port || (parsed.protocol === 'https:' ? '443' : '80'), 10);
  if (port < 1 || port > 65535 || [22, 23, 25, 110, 143, 993, 995].includes(port)) {
    throw new Error('Unsupported port');
  }

  // URL length limit
  if (normalized.length > 2048) {
    throw new Error('URL too long');
  }

  return normalized;
}

function isPrivateHostname(hostname: string): boolean {
  // localhost and loopback
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    return true;
  }

  // Private IP ranges
  const ipMatch = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (ipMatch) {
    const [, a, b] = ipMatch.map(Number);
    // 10.0.0.0/8
    if (a === 10) return true;
    // 172.16.0.0/12
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 192.168.0.0/16
    if (a === 192 && b === 168) return true;
    // 169.254.0.0/16 (link-local)
    if (a === 169 && b === 254) return true;
    // 100.64.0.0/10 (CGNAT)
    if (a === 100 && b >= 64 && b <= 127) return true;
  }

  // Metadata endpoints
  if (hostname === 'metadata.google.internal' || hostname === '169.254.169.254') {
    return true;
  }

  return false;
}

function normalizeText(text: string): string {
  // Cap at 24,000 characters preserving title, headings, pricing, key paragraphs
  if (text.length <= 24000) return text;

  // Priority: keep title, headings, pricing sections, first/last paragraphs
  const lines = text.split('\n');
  const priority: string[] = [];
  const other: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // High priority: headings, pricing, title
    if (/^#{1,3}\s/.test(trimmed) || 
        /\$\d+/.test(trimmed) || 
        /price|cost|plan|tier/i.test(trimmed)) {
      priority.push(line);
    } else {
      other.push(line);
    }
  }

  // Keep first 10 and last 10 other lines
  const kept = [...priority, ...other.slice(0, 10), ...other.slice(-10)];
  return kept.join('\n').slice(0, 24000);
}

function extractTitleFromContent(content: string): string | null {
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.length < 100) {
      return trimmed;
    }
    if (trimmed.startsWith('# ')) {
      return trimmed.slice(2).trim();
    }
  }
  return null;
}
