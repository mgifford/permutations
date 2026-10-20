import fs from "node:fs";
import { JSDOM } from "jsdom";

/* The spoon pool is an input the simulator SHOWS. If it drifts from the pool
   the model enforces, or if the exhaustion ending becomes unreachable again,
   the page teaches the opposite of Spoon Theory: that capacity is not a
   constraint. This harness asserts both the number and the consequence.

   It was written after the pool was found to be 100 against a journey that
   draws a mean of 1.8 — roughly 50x too large, which made the "gave up"
   ending unreachable across 600,000 simulated journeys. The pool is now 20. */

let fails = 0;
const msgs = new Set();
function ok(cond, msg) { if (!cond) { fails++; msgs.add(msg); } }

const html = fs.readFileSync("../cumulative-accessibility-risk-simulator.html", "utf8");
const scriptSrc = new JSDOM(html).window.document.querySelector("script").textContent;
const runnable = scriptSrc.replace(
  /if \(document\.readyState === "loading"\) \{[\s\S]*?\}\s*else \{\s*boot\(\);\s*\}/,
  "window.__h={SPOONS_MAX,state,startRun,advanceOne,computePopulationModel,DEFECTS,N};boot();"
);
const dom = new JSDOM(html, { runScripts: "outside-only", pretendToBeVisual: true });
new dom.window.Function(runnable).call(dom.window);
const h = dom.window.__h;

/* ---- 1. The pool is the rescale we decided on, and the model is untouched ---- */
ok(h.SPOONS_MAX === 20, `SPOONS_MAX is 20 (got ${h.SPOONS_MAX})`);

const m = h.computePopulationModel(0.01);
ok(Math.abs(m.unaffectedFailure * 100 - 26.03) < 0.005,
   `the population model is unaffected by the pool change (26.03 %, got ${(m.unaffectedFailure * 100).toFixed(2)})`);

/* ---- 2. The displayed pool must be the enforced pool ---- */
const shown = dom.window.document.getElementById("mSpoons").textContent.trim();
ok(shown === h.SPOONS_MAX + " / " + h.SPOONS_MAX,
   `the panel shows the real pool (expected "${h.SPOONS_MAX} / ${h.SPOONS_MAX}", got "${shown}")`);

/* ---- 3. Nothing in the markup hard-codes a stale pool ----
   The check is for an actual rendered reading, not for the string "100 / 100"
   appearing anywhere: the comment recording why it was removed contains that
   text legitimately, and a guard that cannot tell code from commentary is a
   guard that will be silenced rather than fixed. */
ok(!/>\s*100\s*\/\s*100\s*</.test(html),
   "no element renders a hard-coded '100 / 100' spoon reading");

/* ---- 4. The two failure endings are both reachable, and comparable ----
   At a ~1.5 % exhaustion rate a small sample can legitimately miss the
   ending, so this asserts reachability over a larger budget and treats the
   rate itself as NOT the claim. A pool that made exhaustion unreachable
   again would spend the whole budget without a single early ending. */
let exhausted = 0, blocked = 0, completed = 0, drewSpoons = 0;
const RUNS = 600;
for (let i = 0; i < RUNS; i++) {
  h.startRun();
  const before = h.state.spoons;
  let guard = 0;
  while (h.state.endedAt === null && h.state.cursor < h.N && guard++ < 200) {
    h.advanceOne();
  }
  if (before - Math.max(0, h.state.spoons) > 0) drewSpoons++;
  if (h.state.endReason === "exhausted") exhausted++;
  else if (h.state.endedAt !== null) blocked++;
  else completed++;
}

ok(drewSpoons > 0,
   `at least one journey in ${RUNS} draws on the spoon pool (got ${drewSpoons})`);
ok(exhausted > 0,
   `the "gave up" ending is reachable within ${RUNS} journeys (got ${exhausted} — was 0 at pool 100)`);
ok(completed > RUNS * 0.5,
   `completing the journey stays the normal outcome (${completed} of ${RUNS})`);

console.log("=== spoon pool and the endings it produces ===");
console.log(`pool: ${h.SPOONS_MAX} spoons · displayed as "${shown}"`);
console.log(`over ${RUNS} journeys: drew spoons ${drewSpoons} · exhausted ${exhausted} · blocked ${blocked} · completed ${completed}`);
console.log("This is shape, not a rate: small samples swing, and the rate is not the claim.");
console.log(fails === 0 ? "ALL SPOON-POOL ASSERTIONS PASSED" : fails + " FAILURES:");
[...msgs].forEach(x => console.log("  -", x));
if (fails) process.exitCode = 1;
