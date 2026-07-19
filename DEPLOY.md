# Deploying the Pubvera hub to Cloudflare Pages

The hub is pure static files — no build step, no framework.

## 1. Connect the repo

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git**.
2. Authorize GitHub if asked, then pick the repository **laci141/pubvera**.
3. Production branch: **main**.

## 2. Build settings

| Setting | Value |
|---|---|
| Framework preset | None |
| Build command | *(leave empty)* |
| Build output directory | `/` |

Save and deploy. The first deploy gives you a `*.pages.dev` URL — open it and
check that the panels, sample tables and exports work.

## 3. Custom domain (pubvera.com)

1. In the Pages project → **Custom domains** → **Set up a custom domain**.
2. Enter `pubvera.com`. Since the domain is already on Cloudflare Registrar,
   Cloudflare adds the DNS record automatically — just confirm.
3. Repeat for `www.pubvera.com` if you want the `www` variant (Cloudflare
   will offer a redirect).
4. Wait for the certificate status to turn **Active** (usually minutes).

## 4. Updating

Push to `main` → Cloudflare Pages redeploys automatically. To refresh the
sample data, regenerate the `data/*-sample.json` files (same query, trim to
10 rows, update `captured_at`) and push.
