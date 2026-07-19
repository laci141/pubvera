# Pubvera — hub

Static landing page for the Pubvera family: eight open-data research tools for
science, medicine and funding. This repo is the central entry point, not a ninth
app — it is pure static HTML served from Cloudflare Pages, while the eight apps
themselves run on Render (Go backend + single HTML frontend each).

## The eight apps

| App | What it does | Live URL |
|---|---|---|
| Bibliovera | Journal bibliometrics (The Lancet corpus, OpenAlex) | https://pubvera-bibliovera.onrender.com/ |
| Praxvera | Clinical literature search (OpenAlex) | https://pubvera-praxvera.onrender.com/ |
| Corpova | Evidence consensus analysis for scientific claims (OpenAlex) | https://pubvera-corpova.onrender.com/ |
| Trialvera | Clinical trial search & analysis (ClinicalTrials.gov, PubMed, OpenAlex, FAERS) | https://pubvera-trialvera.onrender.com/ |
| Devicera | Medical device intelligence (openFDA, GUDID, MAUDE) | https://pubvera-devicera.onrender.com/ |
| Retractis | Retraction & research-integrity checker (Crossref, OpenAlex) | https://pubvera-retractis.onrender.com/ |
| Recallis | Drug recall & enforcement search (openFDA) | https://pubvera-recallis.onrender.com/ |
| Grantvera | Research grant & funding search (NIH RePORTER, NSF, Grants.gov) | https://pubvera-grantvera.onrender.com/ |

## How the hub works

- `index.html` — the whole hub: sidebar navigation, one panel per app with a
  description, data sources, a 10-row live sample table and CSV / Excel /
  BibTeX / JSON exports (WYSIWYG: exports match the filtered view exactly).
- `data/<app>-sample.json` — stored samples of 10 rows each, captured from a
  real query against the live app. Each file carries a `meta` block with the
  query, source and capture date. Refresh them by re-running the same query
  and trimming to 10 rows.
- Wake-on-intent: opening an app's panel silently pings that app's health
  endpoint once per session (no-cors), so the Render free instance is already
  waking while the visitor reads. There is no timed keep-alive by design —
  the free instance-hours budget is shared across all eight apps.

## Hosting

The hub deploys to Cloudflare Pages straight from the repo root (no build
step). The apps stay on Render. See `DEPLOY.md` for the exact steps.
