export interface SharedPage {
  id: string;
  url: string;
}

interface ShareErrorBody {
  error?: unknown;
}

interface ConvexEnvironment {
  readonly VITE_CONVEX_URL?: string;
  readonly VITE_CONVEX_SITE_URL?: string;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function assertHttpUrl(value: string): string {
  const parsedUrl = new URL(value);
  const isLoopback =
    parsedUrl.hostname === "localhost" ||
    parsedUrl.hostname === "127.0.0.1" ||
    parsedUrl.hostname === "[::1]";
  const isAllowedProtocol =
    parsedUrl.protocol === "https:" ||
    (parsedUrl.protocol === "http:" && isLoopback);

  if (!isAllowedProtocol) {
    throw new Error("The Convex URL must use HTTPS.");
  }
  return parsedUrl.origin;
}

export function resolveConvexSiteUrl(env: ConvexEnvironment): string {
  if (env.VITE_CONVEX_SITE_URL) {
    return assertHttpUrl(env.VITE_CONVEX_SITE_URL);
  }

  if (env.VITE_CONVEX_URL) {
    const cloudUrl = trimTrailingSlash(env.VITE_CONVEX_URL);
    if (cloudUrl.endsWith(".convex.cloud")) {
      return assertHttpUrl(cloudUrl.replace(/\.convex\.cloud$/, ".convex.site"));
    }
  }

  throw new Error(
    "Convex is not configured. Run `npx convex dev`, then restart Vite.",
  );
}

function parseSharedPage(value: unknown): SharedPage | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const candidate = value as Partial<SharedPage>;
  if (typeof candidate.id !== "string" || typeof candidate.url !== "string") {
    return null;
  }

  return { id: candidate.id, url: candidate.url };
}

async function readJson(response: Response): Promise<unknown> {
  const body = await response.text();
  if (!body) {
    return null;
  }

  try {
    return JSON.parse(body) as unknown;
  } catch {
    return null;
  }
}

export async function shareHtml(
  siteUrl: string,
  html: string,
  request: typeof fetch = fetch,
): Promise<SharedPage> {
  const response = await request(`${siteUrl}/share`, {
    method: "POST",
    headers: { "Content-Type": "text/html; charset=utf-8" },
    body: html,
  });
  const body = await readJson(response);

  if (!response.ok) {
    const errorBody = body as ShareErrorBody | null;
    const message =
      typeof errorBody?.error === "string"
        ? errorBody.error
        : `Sharing failed with status ${response.status}.`;
    throw new Error(message);
  }

  const sharedPage = parseSharedPage(body);
  if (!sharedPage) {
    throw new Error("The server returned an invalid response.");
  }

  return sharedPage;
}

export function buildCurlCommand(siteUrl: string): string {
  return `curl --data-binary @page.html -H 'Content-Type: text/html' ${siteUrl}/share`;
}
