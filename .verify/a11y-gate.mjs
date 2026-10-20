/*
 * Automated accessibility gate.
 *
 * WHY THIS EXISTS
 * ---------------
 * This project argues that a build can report near-perfect accessibility and
 * still fail people. It would be self-refuting if its own pages had never been
 * scanned. This harness runs axe-core against both artefacts in a real browser
 * and fails the suite on any violation at the configured impact threshold.
 *
 * WHAT IT IS NOT
 * --------------
 * A green run here means "no automatically detectable violation of this
 * severity", and nothing more. It does not mean conformant, and no claim of
 * conformance is made anywhere in this repository. The two cited coverage
 * figures measure different things and are both approximate:
 *   - GSA Section 508 guidance: roughly 30 % of WCAG success criteria can be
 *     evaluated by tooling at all;
 *   - Deque: roughly 40 % of issues are detectable by automation.
 * RESOURCES.md §6 carries both, and ACCESSIBILITY.md §4 states the limits.
 * Do not let a green CI run quietly contradict them.
 *
 * Sa11y (https://sa11y.netlify.app/) covers an overlapping but different set,
 * biased toward content-authoring mistakes. Its own documentation says it is
 * "not a comprehensive code analysis tool". It is not used here because it is
 * an authoring tool, not a headless gate; its rule intent informed the manual
 * checks listed at the bottom of this file.
 *
 * REQUIREMENT: a Chrome or Chromium binary (set CHROME_BIN to override).
 *   node a11y-gate.mjs            # scan both pages
 *   node a11y-gate.mjs --all      # include moderate findings in the report
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { WebSocket } from "ws";

const require = createRequire(import.meta.url);
const axeSource = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

/* Serios violations fail the run. Moderate and minor are reported because they
   are real, but they do not block: this project's own argument is that severity
   is not a single dial, and a gate that treats "low contrast" and "no keyboard
   path" as equal has learned nothing from it. */
const BLOCKING_IMPACTS = new Set(["critical", "serious"]);
const showAll = process.argv.includes("--all");

const PAGES = [
  { name: "index.html", url: "../index.html" },
  { name: "cumulative-accessibility-risk-simulator.html",
    url: "../cumulative-accessibility-risk-simulator.html" },
];

const CHROME_CANDIDATES = [
  process.env.CHROME_BIN,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);

const chromePath = CHROME_CANDIDATES.find(p => fs.existsSync(p));
if (!chromePath) {
  console.log("SKIPPED: no Chrome/Chromium binary found. Set CHROME_BIN to run the a11y gate.");
  process.exit(0);
}

const PORT = 9355;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "a11y-gate-"));
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitForDevtools() {
  for (let i = 0; i < 40; i++) {
    try { if ((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok) return; }
    catch { /* not up yet */ }
    await sleep(250);
  }
  throw new Error("Chrome devtools endpoint did not come up");
}

let fails = 0;
const allFindings = [];

/* One Chrome, one page at a time: navigate, inject axe, scan. */
const chrome = spawn(chromePath, [
  "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, "about:blank",
], { stdio: "ignore" });

try {
  await waitForDevtools();
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const target = list.find(t => t.type === "page");
  const ws = new WebSocket(target.webSocketDebuggerUrl, { perMessageDeflate: false });
  let id = 0;
  const pending = new Map();
  ws.on("message", raw => {
    const d = JSON.parse(raw);
    if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
  });
  await new Promise((res, rej) => { ws.on("open", res); ws.on("error", rej); });
  const send = (method, params = {}) => new Promise(res => {
    const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params }));
  });
  const evalJs = async expr => {
    const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails));
    return r.result.result.value;
  };

  await send("Page.enable");
  await send("Runtime.enable");

  for (const page of PAGES) {
    const abs = path.resolve(import.meta.dirname ?? ".", page.url);
    if (!fs.existsSync(abs)) { fails++; allFindings.push({ page: page.name, error: "file missing" }); continue; }

    await send("Page.navigate", { url: "file://" + abs });
    await sleep(900);                       // let the inline script boot
    await evalJs(axeSource + "; void 0;");

    /* Scan the resting state, then the fully-revealed state: on page one every
       beat is hidden initially, and a violation inside a hidden beat is still a
       violation once a reader reveals it. Scanning only the default view would
       under-report. */
    const scan = async label => {
      const res = await evalJs(`
        (async () => {
          const r = await axe.run(document, {
            resultTypes: ['violations', 'incomplete'],
            runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice'] }
          });
          return JSON.stringify({
            violations: r.violations.map(v => ({
              id: v.id, impact: v.impact, help: v.help,
              tags: v.tags.filter(t => t.startsWith('wcag')),
              nodes: v.nodes.map(n => ({ target: n.target, summary: (n.failureSummary||'').slice(0,220) }))
            })),
            incomplete: r.incomplete.map(v => ({ id: v.id, impact: v.impact,
              nodes: v.nodes.length }))
          });
        })()
      `);
      return { label, ...JSON.parse(res) };
    };

    const resting = await scan("as loaded");

    // page one: reveal every beat, then scan again
    const hasReveal = await evalJs(`!!document.getElementById('revealAllBtn')`);
    let revealed = null;
    if (hasReveal) {
      await evalJs(`document.getElementById('revealAllBtn').click(); void 0;`);
      await sleep(400);
      revealed = await scan("all beats revealed");
    }

    // page two: populate the model tables, which are empty until boot runs
    const hasModel = await evalJs(`!!document.getElementById('popResultBody')`);
    let populated = null;
    if (hasModel) {
      await sleep(400);
      populated = await scan("model tables populated");
    }

    for (const state of [resting, revealed, populated].filter(Boolean)) {
      for (const v of state.violations) {
        allFindings.push({
          page: page.name, state: state.label, id: v.id, impact: v.impact,
          help: v.help, tags: v.tags, nodes: v.nodes,
        });
        if (BLOCKING_IMPACTS.has(v.impact)) fails++;
      }
    }
  }
  ws.close();
} catch (e) {
  fails++; allFindings.push({ error: "harness error: " + e.message });
} finally {
  chrome.kill("SIGKILL");
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
}

/* ---- report ------------------------------------------------------------ */
console.log("=== accessibility gate (axe-core, real browser) ===");
console.log("Blocking threshold: critical and serious. A green run is NOT conformance " +
            "(GSA: ~30 % of criteria automatable; Deque: ~40 % of issues).\n");

if (allFindings.length === 0) {
  console.log("No violations detected in any scanned state.");
} else {
  const blocking = allFindings.filter(f => BLOCKING_IMPACTS.has(f.impact));
  const rest = allFindings.filter(f => f.error || (!BLOCKING_IMPACTS.has(f.impact) && showAll));

  for (const f of blocking) {
    console.log(`BLOCKING [${f.impact}] ${f.page} (${f.state}) — ${f.id}: ${f.help}`);
    if (f.tags?.length) console.log(`  criteria: ${f.tags.join(", ")}`);
    for (const n of (f.nodes || []).slice(0, 6)) {
      console.log(`  - ${n.target}`);
      if (n.summary) console.log(`      ${n.summary.replace(/\s+/g, " ")}`);
    }
    if ((f.nodes || []).length > 6) console.log(`  ... and ${f.nodes.length - 6} more nodes`);
  }
  if (rest.length) {
    console.log("\nNON-BLOCKING (reported, not failing):");
    for (const f of rest) console.log(`  [${f.impact || "error"}] ${f.page} — ${f.id || f.error}`);
  } else if (!showAll) {
    const mods = allFindings.filter(f => !BLOCKING_IMPACTS.has(f.impact));
    if (mods.length) {
      console.log(`\nNON-BLOCKING: ${mods.length} moderate/minor finding(s). ` +
                  `Run with --all to list them.`);
    }
  }
}

const manual = `
NOT COVERED BY THIS GATE — manual checks still required:
  * Keyboard-only operation of every control (axe cannot press Tab).
  * Screen reader announcements, especially the running example's role="log"
    and the reveal status line. Does the log read sensibly, or once per step?
  * Focus visibility on all three toolbars and both legends.
  * Contrast in forced-colors / high-contrast mode (axe checks the default theme).
  * Whether the "gave up" and "walled" endings are distinguishable without colour.
  * Whether the reveal controls announce how many beats remain.
See ACCESSIBILITY.md for how these are tracked, and which have not been done.`;
console.log(manual);

if (fails) process.exitCode = 1;
