import { httpRouter } from "convex/server";

import {
  MAX_HTML_BYTES,
  MAX_HTML_SIZE_LABEL,
  validateHtml,
} from "../shared/html";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

const http = httpRouter();

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

    const pageId = await ctx.runMutation(internal.pages.create, { html });
    const url = new URL(`/p/${pageId}`, request.url).toString();
    return jsonResponse({ id: pageId, url }, 201);
  }),
});

http.route({
  pathPrefix: "/p/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const path = new URL(request.url).pathname;
    const id = path.slice("/p/".length);
    if (!id || id.includes("/")) {
      return new Response("Page not found.", { status: 404 });
    }

    const page = await ctx.runQuery(internal.pages.get, { id });
    if (page === null) {
      return new Response("Page not found.", { status: 404 });
    }

    return new Response(page.html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Security-Policy":
          "sandbox allow-downloads allow-forms allow-modals allow-popups allow-scripts allow-top-navigation-by-user-activation",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }),
});

export default http;
