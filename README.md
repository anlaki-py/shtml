# shtml

Paste HTML or choose a file. `shtml` stores it in Convex and returns a public
link. There is no account system.

Shared pages run as HTML, including inline scripts. A Content Security Policy
gives each page an opaque origin, so it cannot use cookies or local storage from
the Convex deployment. Uploads are immutable and limited to 800 KiB.

## Run it locally

You need Node.js 22 or newer and a Convex account.

```sh
npm install
npx convex dev
```

Keep Convex running. In another terminal:

```sh
npm run dev
```

Open `http://localhost:5173`. The Convex command writes the deployment URLs to
`.env.local`. Older CLI versions may only write `VITE_CONVEX_URL`; the client can
derive the matching `.convex.site` HTTP URL from it.

## Use curl

Replace the deployment name with the value from the Convex dashboard under
Settings, URL and Deploy Key.

```sh
curl --data-binary @page.html \
  -H 'Content-Type: text/html' \
  https://your-deployment.convex.site/share
```

The response looks like this:

```json
{
  "id": "...",
  "url": "https://your-deployment.convex.site/p/..."
}
```

Invalid or oversized input returns JSON with an `error` string and a `4xx`
status.

## Deploy to Vercel

The checked-in `vercel.json` uses this build command:

```sh
npx convex deploy --cmd 'npm run build'
```

Create a production deploy key in the Convex dashboard. Give it the
`deployment:deploy` permission, then add it to Vercel as `CONVEX_DEPLOY_KEY` for
the Production environment. Add a Convex preview deploy key to Vercel's Preview
environment if you want preview deployments.

Vercel hosts the Vite app. Convex hosts the public `/share` and `/p/<id>` routes.
The links therefore use the deployment's `.convex.site` domain. Convex custom
domains also work by setting `VITE_CONVEX_SITE_URL` to that HTTPS origin.

## Checks

```sh
npm run check
```

This runs ESLint, the unit tests, TypeScript, and the Vite production build.

## Abuse and deletion

The upload route is intentionally public. The size cap limits each request, but
it does not stop someone from sending many requests. Watch Convex usage and add
rate limiting before posting the endpoint somewhere busy.

There is no delete API because anonymous deletion needs a separate secret token.
For now, remove pages from the Convex dashboard.
