// Stage dist test.
//
// Run: node tools/stage_dist_test.js
//
// CI publishes only what tools/stage_dist.js copies into dist/. This test runs
// the script into two temp folders (without and with VERSION) and asserts that
// the public files are there, the repo-only files are not, and version.json is
// written only when VERSION is set. Plain node, no dependencies.
"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");

const root = path.join(__dirname, "..");
const script = path.join(root, "tools", "stage_dist.js");

let failed = 0;
function check(label, ok) {
  if (!ok) failed++;
  console.log((ok ? "PASS" : "FAIL") + "  " + label);
}

function stage(out, version) {
  const env = Object.assign({}, process.env);
  delete env.VERSION;
  if (version) env.VERSION = version;
  try {
    execFileSync(process.execPath, [script, out], { cwd: root, env, stdio: "pipe" });
    return true;
  } catch (e) {
    return false;
  }
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "hub-stage-"));
try {
  const plain = path.join(tmp, "plain");
  const versioned = path.join(tmp, "versioned");
  check("stage_dist.js exits 0 without VERSION", stage(plain));
  check("stage_dist.js exits 0 with VERSION", stage(versioned, "2026.10.27.1"));

  const data = execFileSync("git", ["ls-files", "-z", "data"], { cwd: root, encoding: "utf8" })
    .split("\0").filter((f) => f.endsWith(".json"));
  const want = ["index.html", "privacy.html", "terms.html", "robots.txt",
    "pubvera-favicon.svg", "pubvera-logo.svg", "pubvera-mark.svg", "_headers"].concat(data);
  for (const f of want) check("present: " + f, fs.existsSync(path.join(plain, f)));
  check("data/*.json found in git (" + data.length + ")", data.length > 0);

  for (const f of ["README.md", "DEPLOY.md", ".gitignore", ".github", "tools"]) {
    check("absent: " + f, fs.existsSync(plain) && !fs.existsSync(path.join(plain, f)));
  }

  check("no version.json without VERSION", fs.existsSync(plain) && !fs.existsSync(path.join(plain, "version.json")));
  let v = null;
  try { v = fs.readFileSync(path.join(versioned, "version.json"), "utf8"); } catch (e) { /* checked below */ }
  check("version.json is exactly {\"version\":\"2026.10.27.1\"} plus a newline", v === '{"version":"2026.10.27.1"}\n');
  let parsed = null;
  try { parsed = JSON.parse(v); } catch (e) { /* checked below */ }
  check("version.json parses to {version: 2026.10.27.1}",
    parsed !== null && Object.keys(parsed).length === 1 && parsed.version === "2026.10.27.1");

  const src = fs.readFileSync(path.join(root, "index.html"));
  let copy = null;
  try { copy = fs.readFileSync(path.join(plain, "index.html")); } catch (e) { /* checked below */ }
  check("copied index.html is byte-identical", copy !== null && src.equals(copy));

  let headers = "";
  try { headers = fs.readFileSync(path.join(plain, "_headers"), "utf8"); } catch (e) { /* checked below */ }
  check("_headers names /version.json", headers.includes("/version.json"));
  check("_headers has Cache-Control: no-store", headers.includes("Cache-Control: no-store"));
  // The repo copy too: dist/ only gets _headers once it is tracked.
  const repoHeaders = fs.existsSync(path.join(root, "_headers")) ? fs.readFileSync(path.join(root, "_headers"), "utf8") : "";
  check("repo _headers is /version.json with Cache-Control: no-store",
    repoHeaders.replace(/\r\n/g, "\n") === "/version.json\n  Cache-Control: no-store\n");

  // A non-empty outdir must be refused, so a stale file can never be published.
  const busy = path.join(tmp, "busy");
  fs.mkdirSync(busy);
  fs.writeFileSync(path.join(busy, "stale.txt"), "x");
  const r = spawnSync(process.execPath, [script, busy], { cwd: root, stdio: "pipe" });
  check("non-empty outdir exits 1", r.status === 1);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

if (failed) {
  console.error(failed + " check(s) failed");
  process.exit(1);
}
console.log("all stage dist checks pass");
