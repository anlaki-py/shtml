# shtml

Share an HTML document without an account. Paste, choose, or drop a file and
`shtml` returns a short public link on its own domain.

Uploads are immutable, limited to 5 MiB, and stored in Convex file storage.
Shared pages are served as ordinary HTML, including scripts, without a CSP
sandbox.

## Use curl

```sh
curl --data-binary @page.html \
  -H 'Content-Type: text/html' \
  https://shtml-anlaki.vercel.app/api/share
```

The response looks like this:

```json
{
  "id": "...",
  "slug": "aB3x9Q",
  "url": "https://shtml-anlaki.vercel.app/aB3x9Q"
}
```

Invalid or oversized input returns JSON with an `error` string and a `4xx`
status. Machine-readable usage instructions are also published at
[`/llms.txt`](https://shtml-anlaki.vercel.app/llms.txt) and
[`/openapi.json`](https://shtml-anlaki.vercel.app/openapi.json).

## Run locally

You need Node.js 24 and a Convex account.

```sh
npm install
npx convex dev
```

Keep Convex running. In another terminal:

```sh
npm run dev
```

Open `http://localhost:5173`. Convex writes deployment URLs to `.env.local`.
The local browser calls the Convex HTTP action directly. Local responses use a
working `/p/<slug>` Convex URL because the short root-path rewrite only exists
on Vercel.

## Deploy to Vercel

The checked-in `vercel.json` deploys Convex and then builds the Vite app:

```sh
npx convex deploy --cmd 'npm run build'
```

Create a production deploy key in the Convex dashboard and add it to Vercel as
`CONVEX_DEPLOY_KEY` for the Production environment. Use a preview deploy key for
Vercel Preview deployments if needed.

Vercel proxies `POST /api/share` to Convex and rewrites six-character root paths
to Convex's page route. The production Convex site URL is therefore checked into
`vercel.json`; update it if the Convex production deployment changes. To use a
different canonical service domain, set `PUBLIC_SITE_URL` in the Convex
deployment environment and update the public metadata files.

## Checks

```sh
npm run check
```

This runs ESLint, the unit tests, TypeScript, and the production build.

## Security and deletion

The upload route is intentionally public. The size cap limits each request, but
does not stop repeated uploads. Monitor Convex usage and add rate limiting before
promoting the endpoint widely.

Shared HTML has no browser sandbox and runs on the service origin. Treat every
shared page as untrusted. Do not add authentication, secrets, or sensitive
origin-scoped data to this domain without restoring strong isolation.

There is no delete API because anonymous deletion needs a separate secret token.
For now, remove pages and their stored files from the Convex dashboard.
