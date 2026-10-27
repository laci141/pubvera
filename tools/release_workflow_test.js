// CalVer deploy and release workflow test.
//
// Run: node tools/release_workflow_test.js
//
// Every non-pull_request run on main deploys the hub to Cloudflare Pages,
// checks that the new version.json is live, and only then creates the git tag
// vYYYY.MM.DD.N and a GitHub Release. Only CI can run the workflow; this static
// check reads .github/workflows/deploy.yml and asserts the pieces are still
// wired together. Plain node, no dependencies, no YAML library.
//
// The workflow is checked line by line, never with a regex that spans lines:
// one such regex hung with catastrophic backtracking in the Retractis pilot.
"use strict";
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const workflowPath = path.join(root, ".github", "workflows", "deploy.yml");

let failed = 0;
function check(label, ok) {
  if (!ok) failed++;
  console.log((ok ? "PASS" : "FAIL") + "  " + label);
}

const exists = fs.existsSync(workflowPath);
check(".github/workflows/deploy.yml exists", exists);
// CRLF is normalised to LF, so the checks behave the same on a CRLF worktree
// and on the CI runner.
const lines = exists ? fs.readFileSync(workflowPath, "utf8").replace(/\r\n/g, "\n").split("\n") : [];

// The lines of one job, from its two-space "  name:" line to the next job or
// top-level key. Empty when the job is missing.
function jobLines(name) {
  const start = lines.indexOf("  " + name + ":");
  if (start < 0) return [];
  let end = lines.length;
  for (let j = start + 1; j < lines.length; j++) {
    const l = lines[j];
    if (l === "") continue;
    if (!l.startsWith(" ") || (l.startsWith("  ") && l[2] !== " ")) {
      end = j;
      break;
    }
  }
  return lines.slice(start, end);
}

// The job's lines before "    steps:": its needs:, if: and permissions.
function jobHeader(job) {
  const i = job.indexOf("    steps:");
  return i < 0 ? job : job.slice(0, i);
}

// Splits a job into its steps on the "      - name:" lines.
function jobSteps(job) {
  const prefix = "      - name:";
  const steps = [];
  for (const l of job) {
    if (l.startsWith(prefix)) {
      steps.push({ name: l.slice(prefix.length).trim(), lines: [] });
    } else if (steps.length > 0) {
      steps[steps.length - 1].lines.push(l);
    }
  }
  return steps;
}

const stepIndex = (steps, name) => steps.findIndex((s) => s.name === name);
const hasLine = (ls, want) => ls.some((l) => l.trim() === want);
const hasText = (ls, want) => ls.some((l) => l.includes(want));
// Comment lines are ignored where a mention would otherwise count.
const code = (ls) => ls.filter((l) => !l.trim().startsWith("#"));

// Every action is a supply-chain dependency: the two checkouts and nothing
// else. Wrangler is pinned through npx and the release uses the gh CLI.
check("exactly 2 uses: lines", lines.filter((l) => l.includes("uses:")).length === 2);

// Two overlapping main runs would count the same tags and compute the same N.
const jobsAt = lines.indexOf("jobs:");
const concAt = lines.indexOf("concurrency:");
check("top-level concurrency: comes before jobs:", concAt >= 0 && jobsAt >= 0 && concAt < jobsAt);
const conc = concAt >= 0 && jobsAt > concAt ? lines.slice(concAt, jobsAt) : [];
check("concurrency group is per workflow and ref", hasLine(conc, "group: ${{ github.workflow }}-${{ github.ref }}"));
check("cancel-in-progress only for pull requests", hasLine(conc, "cancel-in-progress: ${{ github.event_name == 'pull_request' }}"));

// Workflow-level permissions: the top-level "permissions:" block before jobs:.
const permAt = lines.indexOf("permissions:");
const workflowPerms = [];
for (let j = permAt + 1; permAt >= 0 && j < lines.length && lines[j].startsWith("  "); j++) workflowPerms.push(lines[j].trim());
check("workflow-level permissions are contents: read", permAt >= 0 && permAt < jobsAt && workflowPerms.length === 1 && workflowPerms[0] === "contents: read");

const test = jobLines("test");
const deploy = jobLines("deploy");
check("test job exists", test.length > 0);
check("deploy job exists", deploy.length > 0);

const depHeader = jobHeader(deploy);
check("deploy job needs: test", hasLine(depHeader, "needs: test"));
// Main only: a workflow_dispatch on another branch must not deploy.
const cond = depHeader.find((l) => l.startsWith("    if:")) || "";
check("deploy job if: excludes pull_request and requires refs/heads/main",
  cond.includes("!= 'pull_request'") && cond.includes("github.ref == 'refs/heads/main'"));
check("deploy job has contents: write", hasLine(depHeader, "contents: write"));
check("test job has no contents: write", test.length > 0 && !hasLine(test, "contents: write"));

const testSteps = jobSteps(test);
const hubTests = testSteps[stepIndex(testSteps, "Hub tests")];
check("test job runs every tools/*_test.js",
  hubTests !== undefined && hasText(hubTests.lines, 'for t in tools/*_test.js; do node "$t"; done'));
check("Hub tests runs set -euo pipefail", hubTests !== undefined && hasLine(hubTests.lines, "set -euo pipefail"));
const jsonCheck = testSteps[stepIndex(testSteps, "Sample data is valid JSON")];
check("test job checks data/*.json with JSON.parse",
  jsonCheck !== undefined && hasText(jsonCheck.lines, "JSON.parse") && hasText(jsonCheck.lines, "data"));

const steps = jobSteps(deploy);
const order = ["Checkout", "Compute version", "Stage site", "Deploy to Cloudflare Pages", "Verify live version", "Create GitHub release"];
check("deploy steps are in order: " + order.join(", "),
  steps.length === order.length && steps.every((s, i) => s.name === order[i]));

const stepOf = (name) => (stepIndex(steps, name) >= 0 ? steps[stepIndex(steps, name)].lines : []);
const verLines = stepOf("Compute version");
check("Compute version has id: version", hasLine(verLines, "id: version"));
check("Compute version runs set -euo pipefail", hasLine(verLines, "set -euo pipefail"));
check("Compute version uses date -u +%Y.%m.%d", hasText(verLines, "date -u +%Y.%m.%d"));
check("Compute version counts tags with git ls-remote --tags", hasText(verLines, "COUNT=$(git ls-remote --tags origin"));
check("Compute version sets N=$((COUNT + 1))", hasLine(verLines, "N=$((COUNT + 1))"));
check("Compute version writes GITHUB_OUTPUT", hasText(verLines, "GITHUB_OUTPUT"));

const stage = stepOf("Stage site");
check("Stage site runs node tools/stage_dist.js dist", hasText(stage, "node tools/stage_dist.js dist"));
check("Stage site gets VERSION from steps.version", hasLine(stage, "VERSION: ${{ steps.version.outputs.version }}"));

const dep = stepOf("Deploy to Cloudflare Pages");
check("Deploy pins wrangler@4.154.0", hasText(dep, "npx --yes wrangler@4.154.0"));
check("Deploy runs pages deploy dist", hasText(dep, "pages deploy dist"));
check("Deploy has --project-name pubvera", hasText(dep, "--project-name pubvera"));
check("Deploy has --branch main", hasText(dep, "--branch main"));

// The Cloudflare token and account id are the only secrets, used once each,
// and only on the deploy step.
const all = code(lines);
const tok = "${{ secrets.CLOUDFLARE_API_TOKEN }}";
const acc = "${{ secrets.CLOUDFLARE_ACCOUNT_ID }}";
const countIn = (ls, s) => ls.filter((l) => l.includes(s)).length;
check("secrets.CLOUDFLARE_API_TOKEN appears exactly once", countIn(all, "secrets.CLOUDFLARE_API_TOKEN") === 1);
check("secrets.CLOUDFLARE_ACCOUNT_ID appears exactly once", countIn(all, "secrets.CLOUDFLARE_ACCOUNT_ID") === 1);
check("both Cloudflare secrets are on the Deploy step",
  hasLine(dep, "CLOUDFLARE_API_TOKEN: " + tok) && hasLine(dep, "CLOUDFLARE_ACCOUNT_ID: " + acc));
check("no other secrets. reference in the file", countIn(all, "secrets.") === 2);

const verify = stepOf("Verify live version");
check("Verify reads https://pubvera.pages.dev/version.json", hasText(verify, "https://pubvera.pages.dev/version.json"));
check("Verify compares with jq -r .version", hasText(verify, "jq -r .version"));
check("Verify retries with sleep 10", hasText(verify, "sleep 10"));

const relLines = stepOf("Create GitHub release");
check("Create GitHub release is the last step", steps.length > 0 && steps[steps.length - 1].name === "Create GitHub release");
check("Create GitHub release uses GH_TOKEN: ${{ github.token }}", hasLine(relLines, "GH_TOKEN: ${{ github.token }}"));
// Both branches (baseline notes and generated notes) must tag the commit that
// was deployed, so every create line is checked, not just one of them.
const creates = relLines.filter((l) => l.includes("gh release create"));
check("Create GitHub release has 2 gh release create lines", creates.length === 2);
check("every gh release create has --target \"$GITHUB_SHA\"",
  creates.length > 0 && creates.every((l) => l.includes('--target "$GITHUB_SHA"')));
check("every gh release create has the title Hub $VERSION",
  creates.length > 0 && creates.every((l) => l.includes('--title "Hub $VERSION"')));

check(".github/release.yml exists", fs.existsSync(path.join(root, ".github", "release.yml")));

if (failed) {
  console.error(failed + " check(s) failed");
  process.exit(1);
}
console.log("all release workflow checks pass");
