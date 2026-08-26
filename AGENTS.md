# shtml agent notes

## Purpose

`shtml` accepts an HTML document without authentication and returns a public URL.
The browser UI and curl both use the same Convex HTTP action.

## Structure

- `src/` contains the Vite and React client.
- `src/share-page/` owns the browser API client.
- `shared/html.ts` is the upload contract used by the browser and backend.
- `convex/http.ts` exposes `POST /share` and `GET /p/<identifier>`.
- `convex/pages.ts` owns database reads and writes.
- `vercel.json` proxies `/api/share` and six-character public paths to Convex.

Do not hand-edit `convex/_generated/`. Run `npx convex dev` or
`npx convex codegen` after changing Convex functions.

## Commands

- `npm run dev` starts Vite.
- `npm run convex:dev` syncs the Convex backend.
- `npm run check` runs lint, tests, TypeScript, and the production build.

## Rules

- Keep the web API usable with raw `curl --data-binary` requests.
- Validate the 5 MiB byte limit in the browser and backend.
- Store new HTML in Convex file storage. The optional inline field only supports
  pages created by older deployments.
- Keep six-character slugs base62 and resolve them through the `by_slug` index.
- Shared HTML is immutable and intentionally has no CSP sandbox.
- Public pages have no owner because the service has no authentication.
