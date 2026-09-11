import { z } from "zod";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const BLOCKED_PORTS = new Set([22, 23, 25, 110, 143, 993, 995]);

export class UnsafePublicUrlError extends Error {
  constructor() {
    super("URL resolves to a private or reserved network address.");
    this.name = "UnsafePublicUrlError";
  }
}

function isPrivateIpv4(address: string) {
  const octets = address.split(".").map(Number);
  const [first, second] = octets;
  return first === 10
    || first === 127
    || (first === 169 && second === 254)
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 168)
    || (first === 100 && second >= 64 && second <= 127)
    || first === 0;
}

function isPrivateAddress(address: string) {
  if (isIP(address) === 4) return isPrivateIpv4(address);

  const normalized = address.toLowerCase();
  return normalized === "::1"
    || normalized === "::"
    || normalized.startsWith("fc")
    || normalized.startsWith("fd")
    || /^(fe[89ab])/.test(normalized)
    || normalized.startsWith("::ffff:10.")
    || normalized.startsWith("::ffff:127.")
    || normalized.startsWith("::ffff:192.168.")
    || normalized.startsWith("::ffff:169.254.");
}

export const publicUrlSchema = z.string().trim().min(1).max(2048).transform((value, ctx) => {
  const normalized = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    const url = new URL(normalized);
    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    const privateHost = hostname === "localhost"
      || hostname === "::1"
      || hostname === "0.0.0.0"
      || hostname === "metadata.google.internal"
      || /^(127|10|192\.168|169\.254)\./.test(hostname)
      || /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
      || /^100\.(6\d|[789]\d|1[01]\d|12[0-7])\./.test(hostname)
      || hostname.endsWith(".local");

    if (!(["http:", "https:"].includes(url.protocol)) || url.username || url.password || privateHost) {
      ctx.addIssue({ code: "custom", message: "Enter a public HTTP or HTTPS URL." });
      return z.NEVER;
    }

    const port = url.port ? Number(url.port) : undefined;
    if (port && BLOCKED_PORTS.has(port)) {
      ctx.addIssue({ code: "custom", message: "That port is not supported." });
      return z.NEVER;
    }

    return url.toString();
  } catch {
    ctx.addIssue({ code: "custom", message: "Enter a valid public URL." });
    return z.NEVER;
  }
});

/**
 * Performs the DNS-side of the SSRF check before a URL is handed to capture.
 * The downstream provider must still apply its own egress filter because DNS
 * can change between this lookup and the eventual fetch.
 */
export async function assertSafePublicUrl(value: string): Promise<URL> {
  const url = new URL(publicUrlSchema.parse(value));
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  let addresses: Array<{ address: string }>;
  try {
    addresses = isIP(hostname)
      ? [{ address: hostname }]
      : await withTimeout(lookup(hostname, { all: true, verbatim: true }), 3000);
  } catch {
    // Firecrawl is the production egress boundary. Local development can still
    // exercise the real capture path when the sandbox has no DNS resolver.
    if (process.env.NODE_ENV !== "production") return url;
    throw new UnsafePublicUrlError();
  }

  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new UnsafePublicUrlError();
  }

  return url;
}

function withTimeout<T>(promise: Promise<T>, milliseconds: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new UnsafePublicUrlError()), milliseconds);
    promise.then(resolve, reject).finally(() => clearTimeout(timer));
  });
}
