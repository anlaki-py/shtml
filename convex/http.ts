import { httpRouter } from "convex/server";

import {
  MAX_HTML_BYTES,
  MAX_HTML_SIZE_LABEL,
  validateHtml,
} from "../shared/html";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

const http = httpRouter();
const DEFAULT_PUBLIC_ORIGIN = "https://shtml-theta.vercel.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  Vary: "Origin",
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function getPublicUrl(requestUrl: string, slug: string): string {
  const parsedRequestUrl = new URL(requestUrl);
  const requestOrigin = parsedRequestUrl.origin;
  const requestHostname = parsedRequestUrl.hostname;
  if (requestHostname === "127.0.0.1" || requestHostname === "localhost") {
    return new URL(`/p/${slug}`, requestOrigin).toString();
  }

  const configuredOrigin = process.env.PUBLIC_SITE_URL;
  if (!configuredOrigin) {
    return new URL(`/${slug}`, DEFAULT_PUBLIC_ORIGIN).toString();
  }

  const parsedOrigin = new URL(configuredOrigin);
  if (parsedOrigin.protocol !== "https:") {
    throw new Error("PUBLIC_SITE_URL must use HTTPS.");
  }
  return new URL(`/${slug}`, parsedOrigin.origin).toString();
}

http.route({
  path: "/share",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
      },
    });
  }),
});

http.route({
  path: "/share",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const declaredSize = Number(request.headers.get("Content-Length"));
    if (Number.isFinite(declaredSize) && declaredSize > MAX_HTML_BYTES) {
      return jsonResponse(
        { error: `The HTML is too large. The limit is ${MAX_HTML_SIZE_LABEL}.` },
        413,
      );
    }

    let html: string;
    try {
      html = await request.text();
    } catch {
      return jsonResponse({ error: "The request body could not be read." }, 400);
    }

    const validation = validateHtml(html);
    if (!validation.ok) {
      const status = validation.code === "too_large" ? 413 : 400;
      return jsonResponse({ error: validation.message }, status);
    }

    const storageId = await ctx.storage.store(
      new Blob([html], { type: "text/html; charset=utf-8" }),
    );

    try {
      const page = await ctx.runMutation(internal.pages.create, { storageId });
      const url = getPublicUrl(request.url, page.slug);
      return jsonResponse({ ...page, url }, 201);
    } catch (error) {
      await ctx.storage.delete(storageId);
      throw error;
    }
  }),
});

http.route({
  pathPrefix: "/p/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const path = new URL(request.url).pathname;
    const identifier = path.slice("/p/".length);
    if (!identifier || identifier.includes("/")) {
      return new Response("Page not found.", { status: 404 });
    }

    const page = await ctx.runQuery(internal.pages.get, { identifier });
    if (page === null) {
      return new Response("Page not found.", { status: 404 });
    }

    const body =
      page.kind === "inline" ? page.html : await ctx.storage.get(page.storageId);
    if (body === null) {
      return new Response("Page not found.", { status: 404 });
    }

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }),
});

export default http;
