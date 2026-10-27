// Stage the public hub files into an output folder for Cloudflare Pages.
//
// Run: node tools/stage_dist.js <outdir>
//
// Copies every tracked file except the repo-only ones (CI, tools, docs) into
// <outdir>, keeping paths. When VERSION is set it also writes
// <outdir>/version.json, which the footer reads. The outdir must be missing or
// empty, so a stale file can never be published. Plain node, no dependencies.
"use strict";
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

// Exact paths, or prefixes when they end in "/".
const EXCLUDE = [".github/", "tools/", "README.md", "DEPLOY.md", ".gitignore", "PROMPT.md"];

function fail(msg) {
  console.error("stage_dist: " + msg);
  process.exit(1);
}

const out = process.argv[2];
if (!out || process.argv.length !== 3) fail("usage: node tools/stage_dist.js <outdir>");

try {
  const root = path.join(__dirname, "..");
  const outDir = path.resolve(out);
  if (fs.existsSync(outDir) && fs.readdirSync(outDir).length > 0) fail(outDir + " is not empty");
  fs.mkdirSync(outDir, { recursive: true });

  const files = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" })
    .split("\0")
    .filter((f) => f !== "")
    .filter((f) => !EXCLUDE.some((e) => (e.endsWith("/") ? f.startsWith(e) : f === e)));

  for (const f of files) {
    const dest = path.join(outDir, f);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(root, f), dest);
    console.log(f);
  }
  let count = files.length;
  if (process.env.VERSION) {
    fs.writeFileSync(path.join(outDir, "version.json"), JSON.stringify({ version: process.env.VERSION }) + "\n");
    console.log("version.json");
    count++;
  }
  console.log(count + " file(s) staged into " + outDir);
} catch (e) {
  fail(e.message);
}
