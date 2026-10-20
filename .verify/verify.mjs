import fs from "node:fs";
import { JSDOM } from "jsdom";

const html = fs.readFileSync("../cumulative-accessibility-risk-simulator.html", "utf8");
const scriptSrc = new JSDOM(html).window.document.querySelector("script").textContent;

let fails = 0;
const failMsgs = new Set();
function ok(cond, msg) { if (!cond) { fails++; failMsgs.add(msg); } }

const outcomes = { completed: 0, blocked: 0, exhausted: 0 };
const mechCount = { terminal: 0, spoon: 0, effort: 0, friction: 0 };
let systemicFired = 0, systemicRuns = 0;
let minSpoons = 999, maxTime = 0;
const R = 250;

for (let i = 0; i < R; i++) {
  // Build the document WITHOUT executing the inline script, then run it
  // ourselves once the DOM exists — deterministic and browser-equivalent.
  const dom = new JSDOM(html, { runScripts: "outside-only", pretendToBeVisual: true });
  const { window } = dom, doc = window.document;

  try {
    // The page auto-boots on DOMContentLoaded. jsdom's outside-only mode does
    // not fire that event for us, so boot exactly as a browser would.
    const runnable = scriptSrc.replace(
      /if \(document\.readyState === "loading"\) \{[\s\S]*?\}\s*else \{\s*boot\(\);\s*\}/,
      "boot();"
    );
    new window.Function(runnable).call(window);
  } catch (e) {
    fails++; failMsgs.add("script threw: " + e.message);
    continue;
  }

  doc.getElementById("startBtn").click();
  const railItems = doc.querySelectorAll("#rail li[data-state]");
  ok(railItems.length === 30, "rail has 30 interactive steps, got " + railItems.length);
  doc.getElementById("runAllBtn").click();

  const banner = doc.getElementById("endBanner");
  ok(!banner.hidden, "end banner visible after run");
  const txt = doc.getElementById("endBannerText").textContent;
  ok(txt.length > 10, "end banner has text");
  if (banner.classList.contains("ok")) outcomes.completed++;
  else if (banner.classList.contains("spent")) outcomes.exhausted++;
  else if (banner.classList.contains("blocked")) outcomes.blocked++;
  else { fails++; failMsgs.add("banner class unknown: " + banner.className); }

  const exec = doc.getElementById("execBody");
  ok(exec.innerHTML.length > 500, "exec summary populated");
  ok(!doc.getElementById("execSummary").hidden, "exec summary visible");

  doc.querySelectorAll("#ledgerOut li").forEach(li => {
    ["terminal","spoon","effort","friction"].forEach(m => {
      if (li.classList.contains("mech-" + m)) mechCount[m]++;
    });
  });

  const sysItems = doc.querySelectorAll("#sysLedger li:not(.ledger-empty)");
  if (sysItems.length) { systemicRuns++; systemicFired += sysItems.length; }

  const stepText = doc.getElementById("mStep").textContent;
  ok(/^\d+ \/ 30$/.test(stepText), "step counter well formed: " + stepText);
  const spoons = doc.getElementById("mSpoons").textContent;
  minSpoons = Math.min(minSpoons, parseInt(spoons, 10));
  ok(!/^-\d/.test(spoons), "spoons not negative: " + spoons);
  maxTime = Math.max(maxTime, parseInt(doc.getElementById("mTime").textContent,10));

  const body = doc.body.textContent;
  ok(!body.includes("NaN"), "no NaN in output");
  ok(!body.includes("[object Object]"), "no [object Object] in output");
  ok(!/Infinity/.test(body), "no Infinity in output");
  ok(!body.includes("undefined %"), "no 'undefined %' in output");
  ok(!body.includes("undefined /"), "no 'undefined /' in output");

  // milestone + record integrity
  ok(doc.getElementById("recordOut").innerHTML.length > 100, "defect record rendered");
  const milestone = doc.getElementById("milestoneOut").innerHTML;
  ok(milestone.length > 40, "milestone narrative rendered");

  // Population model: deterministic tables with citations
  const popIn = doc.querySelectorAll("#popInputsBody tr");
  ok(popIn.length >= 10, "population inputs table populated: " + popIn.length);
  let cited = 0, assumed = 0;
  popIn.forEach(tr => {
    const k = tr.children[3].textContent.trim();
    if (k === "Published") cited++;
    if (k === "Assumption") assumed++;
  });
  ok(cited > 0 && assumed > 0, "inputs distinguish published from assumed");
  const popRes = doc.querySelectorAll("#popResultBody tr");
  ok(popRes.length === 5, "population result rows for 5 FPC groups: " + popRes.length);
  popRes.forEach(tr => {
    const comp = tr.children[3].textContent.trim();
    ok(/^(\d+\.\d %|none)$/.test(comp), "group completion well formed: " + comp);
  });
  const popQ = doc.querySelectorAll("#popQualityBody tr");
  ok(popQ.length === 4, "quality dial table has 4 rows: " + popQ.length);
  const sumText = doc.getElementById("popSummaryText").textContent;
  ok(sumText.length > 200, "population summary populated");
  ok(/26\.03 %/.test(sumText), "summary cites the vendor failure figure");
  ok(/no path at all|none/.test(sumText), "summary states absolute loss rather than 0.0 %");

  // P(journey failure) monotone sanity at end
  const pAll = parseFloat(doc.getElementById("mAll").textContent);
  ok(pAll >= 0 && pAll <= 100, "P(all) in range: " + pAll);

  window.close();
}

console.log("=== " + R + " runs ===");
console.log("completed:", outcomes.completed, "| blocked:", outcomes.blocked, "| gave up:", outcomes.exhausted);
console.log("ledger mechanic tally:", mechCount);
console.log("runs with systemic barrier:", systemicRuns, "(total fired:", systemicFired + ")");
console.log("min spoons reached:", minSpoons, "| max minutes:", maxTime);
if (fails === 0) console.log("\nALL ASSERTIONS PASSED");
else { console.log("\n" + fails + " FAILURES:"); [...failMsgs].slice(0,12).forEach(m=>console.log("  -",m)); }
