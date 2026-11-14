# Pubvera — hub

Static landing page for the Pubvera family: eight open-data research tools for
science, medicine and funding. This repo is the central entry point, not a ninth
app — it is pure static HTML served from Cloudflare Pages, while the eight apps
themselves run as Docker containers (Go backend + single HTML frontend each)
on a VPS behind Caddy and Cloudflare.

## The eight apps

| App | What it does | Live URL |
|---|---|---|
| Bibliovera | Journal bibliometrics (The Lancet corpus, OpenAlex) | https://bibliovera.pubvera.com/ |
| Praxvera | Clinical literature search (OpenAlex) | https://praxvera.pubvera.com/ |
| Corpova | Evidence consensus analysis for scientific claims (OpenAlex) | https://corpova.pubvera.com/ |
| Trialvera | Clinical trial search & analysis (ClinicalTrials.gov, PubMed, OpenAlex, FAERS) | https://trialvera.pubvera.com/ |
| Devicera | Medical device intelligence (openFDA, GUDID, MAUDE) | https://devicera.pubvera.com/ |
| Retractis | Retraction & research-integrity checker (Crossref, OpenAlex) | https://retractis.pubvera.com/ |
| Recallis | Drug recall & enforcement search (openFDA) | https://recallis.pubvera.com/ |
| Grantvera | Research grant & funding search (NIH RePORTER, NSF, Grants.gov) | https://grantvera.pubvera.com/ |

## How the hub works

- `index.html` — the whole hub: sidebar navigation, one panel per app with a
  description, data sources, a 10-row sample table and CSV / Excel /
  BibTeX / JSON exports (WYSIWYG: exports match the filtered view exactly).
- `data/<app>-sample.json` — stored samples of 10 rows each, captured from a
  real query against the live app. Each file carries a `meta` block with the
  query, source and capture date. Refresh them by re-running the same query
  and trimming to 10 rows.
- The sample tables are static files; opening a panel does not call the apps.

## Hosting

The hub is deployed to Cloudflare Pages by GitHub Actions
(`.github/workflows/deploy.yml`) on every merge to `main`, after the tests
pass: the public files are staged into `dist/`, deployed with a pinned
wrangler, and the live version is checked before the release is tagged.
The eight apps are deployed separately from their own repositories.
See `DEPLOY.md` for the exact steps.
