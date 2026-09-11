const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TECHNICAL_KEY_PATTERN = /^(id|uuid|key|internal[_ -]?id|row[_ -]?id)$/i;

export function isTechnicalId(value: string | undefined) {
  return Boolean(value && (UUID_PATTERN.test(value) || TECHNICAL_KEY_PATTERN.test(value)));
}

export function humanizeLabel(value: string) {
  if (isTechnicalId(value)) return "";
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().replace(/^\w/, (letter) => letter.toUpperCase());
}

export function isRenderableMediaUrl(value: string) {
  if (value.startsWith("/") || value.startsWith("./")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
