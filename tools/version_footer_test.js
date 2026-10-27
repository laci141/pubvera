// Footer version test.
//
// Run: node tools/version_footer_test.js
//
// The footer shows "Pubvera hub v<version>" from GET /version.json, which CI
// writes into dist/ at deploy time. This static check reads index.html and
// asserts:
//   1. exactly one element has id="app-version", and it is inside the footer;
//   2. the last script fetches '/version.json' with cache 'no-store';
//   3. the text is written with textContent, never innerHTML;
//   4. a failed fetch leaves the element empty (no error text is shown);
//   5. the fetch lives in its own small classic script (no type, an IIFE, no
//      named functions), after the existing inline script and before </body>.
"use strict";
const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8").replace(/\r/g, "");

let failed = 0;
function check(label, ok) {
  if (!ok) failed++;
  console.log((ok ? "PASS" : "FAIL") + "  " + label);
}

const ids = html.match(/\bid=["']app-version["']/g) || [];
check("1 exactly one id=\"app-version\" (found " + ids.length + ")", ids.length === 1);
const footer = (html.match(/<footer class="site">([\s\S]*?)<\/footer>/) || [])[1] || "";
check("1 the app-version span is inside the footer", /<span id="app-version"><\/span>/.test(footer));

const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  .map((m) => ({ attrs: m[1], body: m[2], end: m.index + m[0].length }));
const inline = scripts.filter((s) => !/\bsrc=/.test(s.attrs));
const last = scripts[scripts.length - 1] || { attrs: "", body: "", end: 0 };
const block = /fetch\(\s*['"]\/version\.json['"]/.test(last.body) ? last.body : "";
check("2 the last script fetches '/version.json'", block !== "");
check("2 fetch uses cache: 'no-store'", /fetch\(\s*['"]\/version\.json['"]\s*,\s*\{[^}]*cache:\s*['"]no-store['"]/.test(block));

check("3 writes 'Pubvera hub v' + version with textContent", /\.textContent\s*=\s*['"]Pubvera hub v['"]\s*\+/.test(block));
check("3 never uses innerHTML", block !== "" && !/innerHTML/.test(block));

const c = block.match(/\.catch\(\s*\(\)\s*=>\s*\{([^}]*)\}\s*\)/);
check("4 has a .catch handler", !!c);
check("4 catch handler writes nothing", !!c && !/textContent|innerHTML|innerText|append/.test(c[1]));

check("5 classic script (no type attribute)", block !== "" && last.attrs.trim() === "");
check("5 comes after the existing inline script (2 inline blocks)", inline.length === 2 && inline[1] === last);
check("5 is followed by </body>", block !== "" && /^\s*<\/body>/.test(html.slice(last.end)));
check("5 body is one IIFE", /^\s*\(function \(\) \{/.test(block) && /\}\)\(\);\s*$/.test(block));
check("5 no named function", block !== "" && !/function\s+[A-Za-z_$]/.test(block));
check("5 small (under 20 lines)", block !== "" && block.split("\n").length < 20);

if (failed) {
  console.error(failed + " check(s) failed");
  process.exit(1);
}
console.log("all footer version checks pass");
