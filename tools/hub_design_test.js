// Hub design test.
//
// Run: node tools/hub_design_test.js [path-to-index.html]
//
// Static checks on index.html for the modern hub design: per-app colour and
// icon, the Overview link, no mobile menu toggle, aria-current, reduced motion,
// the glass-panel blur values, the hero badges, the data-source chips, the one
// allowed external script, the untouched version script and non-nested links in
// the overview card template. Plain node, no dependencies.
"use strict";
const fs = require("fs");
const path = require("path");

const file = process.argv[2] || path.join(__dirname, "..", "index.html");
const html = fs.readFileSync(file, "utf8").replace(/\r/g, "");

let failed = 0;
function check(label, ok) {
  if (!ok) failed++;
  console.log((ok ? "PASS" : "FAIL") + "  " + label);
}

// 1. APPS: exactly the 8 keys, each with its colour and a non-empty icon.
const COLORS = {
  bibliovera: "#60a5fa", praxvera: "#a78bfa", corpova: "#22d3ee", trialvera: "#34d399",
  devicera: "#818cf8", retractis: "#f87171", recallis: "#fb923c", grantvera: "#facc15"
};
let apps = null;
try {
  const a = html.indexOf("const APPS = {");
  const b = html.indexOf("\n};", a);
  apps = new Function("return (" + html.slice(a + "const APPS = ".length, b + 2) + ");")();
} catch (e) { /* checked below */ }
const keys = apps ? Object.keys(apps).sort() : [];
check("1 APPS has exactly the 8 app keys",
  apps !== null && JSON.stringify(keys) === JSON.stringify(Object.keys(COLORS).sort()));
for (const k of Object.keys(COLORS)) {
  const app = apps && apps[k];
  check("1 " + k + " has color " + COLORS[k] + " and a non-empty icon",
    !!app && app.color === COLORS[k] && typeof app.icon === "string" && app.icon.trim().length > 0);
}

// 2. The nav has an Overview link with href="#".
check("2 nav contains an Overview link with href=\"#\"",
  /<nav\b[\s\S]*?<a\b[^>]*\bhref="#"[^>]*>(?:(?!<\/a>)[\s\S])*Overview(?:(?!<\/a>)[\s\S])*<\/a>[\s\S]*?<\/nav>/.test(html));

// 3. No mobile menu toggle left.
check("3 no navToggle", !html.includes("navToggle"));
check("3 no ☰ character", !html.includes("☰"));

// 4. aria-current is set by the code.
check("4 aria-current is set by the code", /setAttribute\(\s*["']aria-current["']/.test(html));

// 5. Reduced motion.
check("5 @media (prefers-reduced-motion: reduce) exists",
  /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/.test(html));

// 6. Glass panel recipe.
check("6 body::before exists", /body::before\s*\{/.test(html));
check("6 -webkit-backdrop-filter:blur(15px) exists", html.includes("-webkit-backdrop-filter:blur(15px)"));
// The <=768px media block, brace-matched.
let mobile = "";
{
  const m = /@media\s*\(\s*max-width\s*:\s*768px\s*\)\s*\{/.exec(html);
  if (m) {
    let depth = 1;
    let i = m.index + m[0].length;
    const start = i;
    while (i < html.length && depth > 0) {
      if (html[i] === "{") depth++;
      else if (html[i] === "}") depth--;
      i++;
    }
    mobile = html.slice(start, i);
  }
}
check("6 blur(11px) inside the <=768px media query",
  mobile.includes("-webkit-backdrop-filter:blur(11px)") && /(^|[^-])backdrop-filter:blur\(11px\)/.test(mobile));

// 7. The three hero badges.
for (const b of ["No login", "No API keys", "Open data"]) {
  check("7 badge \"" + b + "\"", html.includes(">" + b + "</span>"));
}

// 8. The 8 data-source chips.
const ds = /DATA_SOURCES\s*=\s*\[([^\]]*)\]/.exec(html);
const dsNames = ds ? ds[1].split(",").map((x) => x.trim().replace(/^["']|["']$/g, "")) : [];
for (const n of ["OpenAlex", "Crossref", "ClinicalTrials.gov", "PubMed", "openFDA", "NIH", "NSF", "Grants.gov"]) {
  check("8 data-source chip \"" + n + "\"", dsNames.includes(n));
}

// 9. Exactly one external script, no web fonts, no @import.
const ext = html.match(/<script\b[^>]*\bsrc=["']http[^>]*>/g) || [];
check("9 exactly one <script src=\"http (found " + ext.length + ")", ext.length === 1);
check("9 it is the xlsx-js-style@1.2.0 jsdelivr script",
  ext.length === 1 && ext[0].includes("https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js"));
check("9 no fonts.googleapis", !html.includes("fonts.googleapis"));
check("9 no @import url(", !html.includes("@import url("));

// 10. The version script is intact.
check("10 version script writes 'Pubvera hub v' + d.version", html.includes("'Pubvera hub v' + d.version"));

// 11. No <a> opened inside another open <a> in the overview card template.
{
  const a = html.indexOf("function cardHTML(");
  const b = html.indexOf("async function showPanel(");
  const region = a >= 0 && b > a ? html.slice(a, b) : "";
  let depth = 0, max = 0, opens = 0;
  const re = /<a\b|<\/a>/g;
  let m;
  while ((m = re.exec(region))) {
    if (m[0] === "</a>") depth--;
    else { depth++; opens++; if (depth > max) max = depth; }
  }
  check("11 card template has links and never nests <a> (" + opens + " links, max depth " + max + ")",
    region !== "" && opens >= 2 && max === 1 && depth === 0);
}

// 12. The overview keeps the original intro sentence word for word.
check("12 overview keeps the original intro text",
  html.includes("A family of eight open-data research tools for science, medicine and funding. ") &&
  html.includes("Each app queries public, keyless data sources — no logins, no API keys, no paywalls. ") &&
  html.includes("Pick a tool from the menu, preview a real sample result, then open the live app."));

// 13. The footer has no GitHub link.
{
  const f = /<footer\b[\s\S]*?<\/footer>/.exec(html);
  check("13 footer has no GitHub link", !!f && !/github\.com/i.test(f[0]) && !f[0].includes("GitHub"));
}

if (failed) {
  console.error(failed + " check(s) failed");
  process.exit(1);
}
console.log("all hub design checks pass");
