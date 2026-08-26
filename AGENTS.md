# shtml agent notes

## Purpose

`shtml` accepts an HTML document without authentication and returns a public URL.
The browser UI and curl both use the same Convex HTTP action.

## Structure

- `src/` contains the Vite and React client.
- `src/share-page/` owns the browser API client.
- `shared/html.ts` is the upload contract used by the browser and backend.
- `convex/http.ts` exposes `POST /share` and `GET /p/<id>`.
- `convex/pages.ts` owns database reads and writes.

Do not hand-edit `convex/_generated/`. Run `npx convex dev` or
`npx convex codegen` after changing Convex functions.

## Commands

- `npm run dev` starts Vite.
- `npm run convex:dev` syncs the Convex backend.
- `npm run check` runs lint, tests, TypeScript, and the production build.

## Rules

- Keep the web API usable with raw `curl --data-binary` requests.
- Validate byte size on both sides. Convex documents must remain below 1 MiB.
- Shared HTML is immutable and must keep its CSP sandbox without
  `allow-same-origin`.
- Public pages have no owner because the service has no authentication.
