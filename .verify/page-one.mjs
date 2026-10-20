import fs from "node:fs";
import { JSDOM } from "jsdom";
const html = fs.readFileSync("../index.html","utf8");
const dom = new JSDOM(html,{runScripts:"dangerously",pretendToBeVisual:true});
const d = dom.window.document;
let fails=0; const msgs=new Set();
const ok=(c,m)=>{if(!c){fails++;msgs.add(m);}};

/* Hidden beats use the `hidden` ATTRIBUTE, not a class. A previous version
   used a class plus display:none on the children of a display:contents
   wrapper, which read as hidden in jsdom (no layout engine) but did not
   collapse in a real browser. See layout-check.mjs for the real-browser
   guard, and AGENTS.md for why both harnesses exist. */
const hiddenCount = () => d.querySelectorAll(".beatrow[hidden]").length;
const visibleCount = () => d.querySelectorAll(".beatrow:not([hidden])").length;

ok(d.querySelectorAll(".beatrow").length===6, "six beats present");
ok(hiddenCount()===6, "all beats hidden initially, got "+hiddenCount());
const st = d.getElementById("revealStatus").textContent;
ok(/Beat 0 of 6/.test(st), "status starts at 0 of 6: "+st);

// no stale class-based hiding may remain
ok(!html.includes("is-hidden"), "no stale is-hidden class in markup or CSS");

// reveal one
d.getElementById("revealBtn").click();
ok(visibleCount()===1, "one beat visible after first reveal, got "+visibleCount());
ok(/Beat 1 of 6/.test(d.getElementById("revealStatus").textContent), "status at 1");

// reveal to the end, one at a time
d.getElementById("revealBtn").click();
d.getElementById("revealBtn").click();
ok(visibleCount()===3, "three beats visible after three reveals, got "+visibleCount());
d.getElementById("revealBtn").click();
d.getElementById("revealBtn").click();
d.getElementById("revealBtn").click();
ok(visibleCount()===6, "all six visible after six reveals, got "+visibleCount());
ok(d.getElementById("revealBtn").disabled, "next button disabled when complete");

// reveal-all path
d.querySelectorAll(".beatrow").forEach(r=>r.setAttribute("hidden",""));
d.getElementById("revealAllBtn").click();
ok(visibleCount()===6, "reveal-all shows every beat");
ok(hiddenCount()===0, "reveal-all leaves nothing hidden");

// check the joining math is actually correct in the text
const body = d.body.textContent;
ok(body.includes("0.99³⁰"), "formula 0.99^30 present");
ok(/73\.97/.test(body), "73.97 present");
ok(/97\.04/.test(body), "97.04 present");
ok(/28\.7/.test(body), "CDC 28.7 present");
ok(/13\.6/.test(body), "Census 13.6 present");
ok(/46/.test(body), "46% 75+ present");

/* Leak checks must run against RENDERED text, not body.textContent.
   body.textContent includes the raw inline <script> source, and this page's
   script legitimately contains the tokens "undefined" and "NaN" as JS. A
   naive check on body.textContent therefore false-positives on its own
   source — the jsdom gotcha already recorded in AGENTS.md. Strip <script>
   first. */
const rendered = (() => {
  const clone = d.body.cloneNode(true);
  clone.querySelectorAll("script, style").forEach(n => n.remove());
  return clone.textContent;
})();
ok(!rendered.includes("NaN"), "no NaN in rendered text");
ok(!rendered.includes("undefined"), "no undefined in rendered text");
ok(!rendered.includes("[object Object]"), "no object leak in rendered text");

// POUR all four
["Perceivable","Operable","Understandable","Robust"].forEach(p=>ok(body.includes(p),"POUR: "+p));

// headings: two grid headers
ok(d.getElementById("grid-head-l").textContent.includes("Permutations"), "left header");
ok(d.getElementById("grid-head-r").textContent.includes("Digital accessibility"), "right header");

// tables have captions + th scope
d.querySelectorAll("table.data").forEach(t=>ok(!!t.querySelector("caption"),"table caption"));
ok(d.querySelectorAll('th[scope="row"]').length>0,"row headers present");

// the onward link must point at the simulator, and that file must exist
const link = d.querySelector('a[href="cumulative-accessibility-risk-simulator.html"]');
ok(!!link, "page-one links onward to the simulator");
ok(fs.existsSync("../cumulative-accessibility-risk-simulator.html"), "simulator file exists");

/* ---- the running example ------------------------------------------------
   This is the section that makes the 1 % claim felt rather than read, so it
   needs its own guard. We check structure, the arithmetic, and that a forced
   terminal defect actually stops the run. */
const stepList = d.getElementById("runExSteps");
ok(!!stepList, "running example present");
ok(stepList.querySelectorAll("li").length===8, "running example has 8 steps, got "+
   stepList.querySelectorAll("li").length);

// every step cites a criterion — no uncited defect may ship
const cites = [...stepList.querySelectorAll(".cite")].map(c=>c.textContent);
ok(cites.filter(c=>c.trim().length>10).length===8,
   "every running-example step carries a citation, got "+
   cites.filter(c=>c.trim().length>10).length);
ok(cites.some(c=>/2\.5\.7/.test(c)), "the ACT-gap criterion SC 2.5.7 is named");
ok(cites.some(c=>/NO published ACT rule/.test(c)),
   "the absence of an ACT rule is stated, not papered over");

// the arithmetic must be the real serial-reliability number
const rx = d.getElementById("runExFormula");
ok(/0\.99\^0/.test(rx.textContent), "formula starts at 0.99^0: "+rx.textContent);
d.getElementById("runExStep").click();
ok(/0\.99\^1/.test(rx.textContent), "after one attempt the exponent is 1: "+rx.textContent);
d.getElementById("runExStep").click();
ok(/0\.99\^2/.test(rx.textContent), "after two attempts the exponent is 2: "+rx.textContent);
// 1 - 0.99^2 = 1.99 %
ok(/1\.99/.test(d.getElementById("runExRisk").textContent),
   "risk after two steps is 1.99 %, got "+d.getElementById("runExRisk").textContent);

// monotonic: the risk figure must never fall as steps accumulate
const seen = [];
for (let i=0;i<4;i++){
  d.getElementById("runExStep").click();
  seen.push(parseFloat(d.getElementById("runExRisk").textContent));
}
ok(seen.every((v,i)=>i===0||v>=seen[i-1]),
   "accumulated risk is monotonic, saw "+seen.join(", "));

// reset must clear the log and the arithmetic
d.getElementById("runExReset").click();
ok(/0\.99\^0/.test(d.getElementById("runExFormula").textContent), "reset returns to 0.99^0");
ok(stepList.querySelectorAll("li[data-state='failed']").length===0,
   "reset clears failed states");

// the run object is exposed for harness use; a forced terminal must end it
ok(!!d.defaultView.__runEx, "run example exposes its state for testing");

console.log("beats:",d.querySelectorAll(".beatrow").length);
console.log(fails===0?"ALL ASSERTIONS PASSED":fails+" FAILURES:");
[...msgs].forEach(m=>console.log(" -",m));
if (fails) process.exitCode = 1;
