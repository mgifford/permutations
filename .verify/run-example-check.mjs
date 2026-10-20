/*
 * Real-browser behaviour check for the running example on page one.
 *
 * jsdom cannot lay out or scroll, so it cannot tell us whether a step list is
 * actually visible, whether the focus move after "Play the whole journey"
 * lands somewhere sensible, or whether the log grows unreadably. This harness
 * drives a real Chrome via CDP and measures.
 *
 * REQUIREMENT: a Chrome or Chromium binary (set CHROME_BIN to override).
 *   node run-example-check.mjs
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { WebSocket } from "ws";

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
  console.log("SKIPPED: no Chrome/Chromium binary found. Set CHROME_BIN to run.");
  process.exit(0);
}

const PAGE = path.resolve(import.meta.dirname ?? ".", "../index.html");
const PORT = 9344;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "a11y-runex-"));

const chrome = spawn(chromePath, [
  "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  `file://${PAGE}`,
], { stdio: "ignore" });

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
const msgs = new Set();
const ok = (c, m) => { if (!c) { fails++; msgs.add(m); } };

try {
  await waitForDevtools();
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const page = list.find(t => t.type === "page" && t.url.startsWith("file:")) || list.find(t => t.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl, { perMessageDeflate: false });
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
  await sleep(700);

  const probe = `(() => {
    const q = s => document.querySelector(s);
    const bx = el => { const b = el.getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height) }; };
    const steps = [...document.querySelectorAll('#runExSteps li')];
    return {
      sectionVisible: (() => { const s = document.getElementById('h-running'); return !!s && bx(s).h > 0; })(),
      stepCount: steps.length,
      stepHeights: steps.map(s => bx(s).h),
      visibleSteps: steps.filter(s => bx(s).h > 0).length,
      risk: q('#runExRisk') ? q('#runExRisk').textContent.trim() : null,
      formula: q('#runExFormula') ? q('#runExFormula').textContent.trim() : null,
      outcomeLabels: steps.map(s => (s.querySelector('.outcome')||{}).textContent || ''),
      logEntries: document.querySelectorAll('#runExLog .entry').length,
      logHeight: (() => { const l = q('#runExLog'); return l ? bx(l).h : 0; })(),
      focused: document.activeElement ? document.activeElement.id : null,
      // a lodged defect must be distinguishable without colour
      failedTexts: steps.filter(s => s.dataset.state === 'failed')
        .map(s => (s.querySelector('.outcome')||{}).textContent || ''),
    };
  })()`;

  const initial = await evalJs(probe);
  ok(initial.sectionVisible, "running example heading is visible in a real browser");
  ok(initial.stepCount === 8, `8 steps rendered, got ${initial.stepCount}`);
  ok(initial.visibleSteps === 8, `all 8 steps have real height, got ${initial.visibleSteps}`);
  ok(initial.stepHeights.every(h => h > 30), `every step row is laid out, heights ${initial.stepHeights.join(",")}`);
  ok(/0\.99\^0/.test(initial.formula || ""), `formula starts at 0.99^0, got ${initial.formula}`);
  ok(/^0\.00/.test(initial.risk || ""), `risk starts at 0.00 %, got ${initial.risk}`);

  /* One attempt at a time. */
  await evalJs(`document.getElementById('runExStep').click(); void 0;`);
  await sleep(150);
  const one = await evalJs(probe);
  ok(/0\.99\^1/.test(one.formula || ""), `after one attempt exponent is 1, got ${one.formula}`);
  ok(one.logEntries >= 1, `an outcome was logged, got ${one.logEntries}`);
  // exactly one step must carry a terminal state marker
  const marked = one.outcomeLabels.filter(t => t && t.trim() !== "—" && t.trim() !== "current").length;
  ok(marked === 1, `exactly one step carries an outcome, got ${marked}: ${one.outcomeLabels.join(" | ")}`);

  /* Play the whole journey from scratch. */
  await evalJs(`document.getElementById('runExReset').click(); void 0;`);
  await sleep(120);
  await evalJs(`document.getElementById('runExAll').click(); void 0;`);
  await sleep(400);
  const all = await evalJs(probe);
  ok(all.logEntries >= 9, `a full run logs every step plus a closing entry, got ${all.logEntries}`);
  ok(all.outcomeLabels.every(t => t && t.trim() !== "—"),
     `every step ends with a stated outcome: ${all.outcomeLabels.join(" | ")}`);
  // a stated outcome must be words or symbols, never colour alone
  ok(all.outcomeLabels.every(t => t.replace(/[^\p{L}\p{N}]/gu, "").length > 0 || t.trim().length > 0),
     "outcomes are communicated as text/symbol, not colour alone");
  // focus must land somewhere valid after a whole-journey run
  ok(["runExReset", "runExStep", "runExAll"].includes(all.focused),
     `focus is on a control after a full run, got ${all.focused}`);

  /* Reset clears everything. */
  await evalJs(`document.getElementById('runExReset').click(); void 0;`);
  await sleep(200);
  const reset = await evalJs(probe);
  ok(/0\.99\^0/.test(reset.formula || ""), `reset returns to 0.99^0, got ${reset.formula}`);
  ok(reset.outcomeLabels.every(t => t.trim() === "—" || t.trim() === "current"),
     `reset clears every outcome, got ${reset.outcomeLabels.join(" | ")}`);

  /* Narrow viewport: the step grid must not overflow. */
  await send("Emulation.setDeviceMetricsOverride", { width: 360, height: 800, deviceScaleFactor: 2, mobile: true });
  await sleep(300);
  const narrow = await evalJs(`(() => {
    const rows = [...document.querySelectorAll('#runExSteps li')];
    const out = rows.map(r => Math.round(r.getBoundingClientRect().width));
    const worst = Math.max(...rows.map(r => r.scrollWidth - r.clientWidth));
    return { widths: out, overflow: worst };
  })()`);
  ok(narrow.overflow <= 1, `no horizontal overflow in the step list at 360px, worst ${narrow.overflow}px`);
  await send("Emulation.clearDeviceMetricsOverride");

  ws.close();
} catch (e) {
  fails++; msgs.add("harness error: " + e.message);
} finally {
  chrome.kill("SIGKILL");
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
}

console.log("=== running example, real browser ===");
console.log(fails === 0 ? "ALL ASSERTIONS PASSED" : fails + " FAILURES:");
[...msgs].forEach(m => console.log("  -", m));
if (fails) process.exitCode = 1;
