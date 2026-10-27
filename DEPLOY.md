# Deploying the Pubvera hub to Cloudflare Pages

The hub is pure static files — no build step, no framework.

## 1. Project type

The Pages project **pubvera** is a Direct Upload project (Git Provider: No,
measured 2026-10-27). It cannot be switched to Git integration. The site is
deployed by GitHub Actions (`.github/workflows/deploy.yml`) on every push to
`main`, after the tests pass.

## 2. Custom domain (pubvera.com)

1. In the Pages project → **Custom domains** → **Set up a custom domain**.
2. Enter `pubvera.com`. Since the domain is already on Cloudflare Registrar,
   Cloudflare adds the DNS record automatically — just confirm.
3. Repeat for `www.pubvera.com` if you want the `www` variant (Cloudflare
   will offer a redirect).
4. Wait for the certificate status to turn **Active** (usually minutes).

## 3. Updating

Push or merge to `main`. CI (`.github/workflows/deploy.yml`) then:

1. stages the public files into `dist/` with `node tools/stage_dist.js dist`
   (`README.md`, `DEPLOY.md` and `tools/` are not published any more);
2. deploys `dist/` with a pinned wrangler;
3. checks that https://pubvera.pages.dev/version.json shows the new version;
4. only then creates the git tag and GitHub Release `vYYYY.MM.DD.N`.

To refresh the sample data, edit the `data/*-sample.json` files as before
(same query, trim to 10 rows, update `captured_at`) and push.

## 4. CI secrets

Add these as GitHub Actions repository secrets (names only; never commit the values):

- `CLOUDFLARE_API_TOKEN`: an API token with **Account → Cloudflare Pages → Edit**.
- `CLOUDFLARE_ACCOUNT_ID`: the Cloudflare account id.

## 5. Manual deploy (emergency)

```
node tools/stage_dist.js dist
npx wrangler pages deploy dist --project-name pubvera
```

A manual deploy has no `version.json`, so the footer shows no version until
the next CI deploy. If the old UI is still visible afterwards, purge the
Cloudflare edge cache.
