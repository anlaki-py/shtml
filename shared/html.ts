export const MAX_HTML_BYTES = 5 * 1024 * 1024;
export const MAX_HTML_SIZE_LABEL = "5 MiB";

export type HtmlValidationResult =
  | { ok: true; byteLength: number }
  | { ok: false; code: "empty" | "too_large"; message: string };

export function getHtmlByteLength(html: string): number {
  return new TextEncoder().encode(html).byteLength;
}

export function validateHtml(html: string): HtmlValidationResult {
  if (html.trim().length === 0) {
    return { ok: false, code: "empty", message: "Paste some HTML first." };
  }

  const byteLength = getHtmlByteLength(html);
  if (byteLength > MAX_HTML_BYTES) {
    return {
      ok: false,
      code: "too_large",
      message: `The HTML is too large. The limit is ${MAX_HTML_SIZE_LABEL}.`,
    };
  }

  return { ok: true, byteLength };
}
