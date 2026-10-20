import fs from "node:fs";
import { JSDOM } from "jsdom";

/* The shared-element section makes a numeric claim on a public page:
   counting a shared element once lowers the 30-step risk figure. If the
   underlying function ever changes, the page must change with it — otherwise
   the site prints a number its own model no longer derives.

   This harness reads BOTH artefacts and asserts they agree:
     - the closed form in cumulative-accessibility-risk-simulator.html
     - the figures printed in the table in index.html
   It also re-derives the published 26.03 % so a regression in the model
   itself is caught here too, not only in popmodel.mjs. */

let fails = 0;
const msgs = new Set();
function ok(cond, msg) { if (!cond) { fails++; msgs.add(msg); } }

/* ---- 1. Load the model function from page two ---- */
const simHtml = fs.readFileSync("../cumulative-accessibility-risk-simulator.html", "utf8");
const scriptSrc = new JSDOM(simHtml).window.document.querySelector("script").textContent;
const dom = new JSDOM(simHtml, { runScripts: "outside-only", pretendToBeVisual: true });
const { window } = dom;
const runnable = scriptSrc.replace(
  /if \(document\.readyState === "loading"\) \{[\s\S]*?\}\s*else \{\s*boot\(\);\s*\}/,
  "window.__h={computeSharedElementModel,N};boot();"
);
new window.Function(runnable).call(window);
const f = window.__h.computeSharedElementModel;
const N = window.__h.N;

ok(typeof f === "function", "computeSharedElementModel is defined on page two");
if (typeof f !== "function") {
  console.log("FAILURES:\n  - " + [...msgs].join("\n  - "));
  process.exit(1);
}

/* ---- 2. The model must still reproduce the published headline ---- */
const r0 = f(0.01, 0);
ok(Math.abs(r0.independent * 100 - 26.03) < 0.005,
   `the published 30-step figure is still 26.03 % (got ${(r0.independent * 100).toFixed(2)})`);
ok(Math.abs(r0.countedOnce - r0.independent) < 1e-12,
   "with no sharing, the counted reading equals the published one (no phantom coin)");
ok(r0.coinsCounted === N, `with no sharing there are ${N} distinct coins`);

/* ---- 3. The three table rows, re-derived ---- */
const cases = [
  { g: 0,  coins: 30, pct: "26.03" },
  { g: 10, coins: 21, pct: "19.03" },
  { g: 30, coins: 1,  pct: "1.00"  },
];
for (const c of cases) {
  const r = f(0.01, c.g);
  ok(r.coinsCounted === c.coins,
     `g=${c.g}: ${c.coins} distinct coins (got ${r.coinsCounted})`);
  ok((r.countedOnce * 100).toFixed(2) === c.pct,
     `g=${c.g}: ${c.pct} % counted once (got ${(r.countedOnce * 100).toFixed(2)})`);
}

/* ---- 4. Those same figures must be the ones printed on page one ---- */
const pageOne = fs.readFileSync("../index.html", "utf8");
const section = pageOne.match(/<section class="panel" aria-labelledby="h-shared">[\s\S]*?<\/section>/);
ok(section !== null, "page one carries a shared-element section");
if (section) {
  const body = section[0];
  for (const c of cases) {
    ok(body.includes(c.pct + "&nbsp;%"),
       `page one prints ${c.pct} % for ${c.coins} coin${c.coins === 1 ? "" : "s"}`);
  }
  ok(/<caption>/.test(body), "the comparison table has a caption");
  ok(/scope="col"/.test(body) && /scope="row"/.test(body),
     "the comparison table uses column and row headers");
  ok(/Independent|independent/.test(body),
     "the section names the independence assumption it is qualifying");
  /* The retracted claim must not come back. */
  ok(!/100\.00|100&nbsp;%/.test(body),
     "the retracted 100 % reading does not appear");
}

/* ---- 5. The correction is stated, not quietly deleted ---- */
ok(section && /correction/i.test(section[0]),
   "the section records the corrected claim rather than hiding it");
ok(section && /200,000-trial|200000/.test(section[0]),
   "the section names the simulation that confirmed the correction");

console.log("=== shared-element model and page-one table agree ===");
console.log("published 30-step risk:", (r0.independent * 100).toFixed(2) + " %");
for (const c of cases) {
  const r = f(0.01, c.g);
  console.log(`  shared ${String(c.g).padStart(2)} -> ${String(r.coinsCounted).padStart(2)} coins -> ${(r.countedOnce * 100).toFixed(2)} %`);
}
console.log(fails === 0 ? "ALL SHARED-ELEMENT ASSERTIONS PASSED" : fails + " FAILURES:");
[...msgs].forEach(m => console.log("  -", m));
if (fails) process.exitCode = 1;
