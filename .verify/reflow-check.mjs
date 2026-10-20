import fs from "node:fs";
import { spawn } from "node:child_process";
import WebSocket from "ws";

/* Page two had NO geometric guard until this harness was written, which is why
   a Reflow failure shipped and stayed: at every width below ~820 px the page
   scrolled sideways. At 360 px, document.scrollWidth was 479 against a 360
   viewport — an extra 119 px, a real SC 1.4.10 Reflow failure a phone user sees
   immediately.

   The cause was not where it looked. A <select> reports an intrinsic minimum
   width taken from its longest <option>, and "Hostile — deadline pressure, no
   channel (1.6× cost)" set a floor that propagated up through .setup-row and
   .grid-2. That is why the first attempt failed: min-width:0 on .grid-2's
   children let the grid track shrink while the select inside it kept its
   intrinsic width, and the overflow got WORSE at 820 px (53 -> 233 px).

   So this harness asserts two things, because either alone is defeatable:
     1. the symptom — the page does not scroll horizontally at any width; and
     2. the cause — no <select> overflows its own cell, with no option text
        clipped, since "fix" by shrinking is only acceptable if nothing is lost.

   Real browser required; skips cleanly when Chrome is absent. */

let fails = 0;
const msgs = new Set();
function ok(cond, msg) { if (!cond) { fails++; msgs.add(msg); } }

const CHROME = process.env.CHROME_BIN
  || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const CANDIDATES = [
  CHROME,
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];
const bin = CANDIDATES.find(p => { try { return fs.existsSync(p); } catch { return false; } });
if (!bin) {
  console.log("=== page-two reflow check ===");
  console.log("SKIPPED: no Chrome/Chromium binary found (set CHROME_BIN to override).");
  process.exit(0);
}

const PORT = 9531;
const profile = "/tmp/oc-reflow-profile";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const chrome = spawn(bin, [
  "--headless=new", `--remote-debugging-port=${PORT}`, "--no-first-run",
  "--no-default-browser-check", `--user-data-dir=${profile}`,
  "--window-size=1280,900", "about:blank",
], { stdio: "ignore" });

async function wsUrl() {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const t = (await r.json()).find(x => x.type === "page");
      if (t) return t.webSocketDebuggerUrl;
    } catch {}
    await sleep(250);
  }
  throw new Error("Chrome did not expose a debugging target");
}

let ws;
try {
  ws = new WebSocket(await wsUrl());
  await new Promise((res, rej) => { ws.on("open", res); ws.on("error", rej); });

  let id = 0;
  const pend = new Map();
  ws.on("message", m => {
    const g = JSON.parse(m);
    if (g.id && pend.has(g.id)) { pend.get(g.id)(g); pend.delete(g.id); }
  });
  const send = (method, params = {}) => new Promise(res => {
    const n = ++id; pend.set(n, res);
    ws.send(JSON.stringify({ id: n, method, params }));
  });
  const evalJs = async expr => {
    const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.result?.exceptionDetails) {
      throw new Error(r.result.exceptionDetails.exception?.description || "eval failed");
    }
    return r.result?.result?.value;
  };

  await send("Runtime.enable");
  await send("Page.enable");
  await send("Page.navigate", {
    url: "file:///Users/mike.gifford/permutations/cumulative-accessibility-risk-simulator.html",
  });
  await sleep(1600);

  /* ---- 1. No horizontal scrolling, at every width a reader might use.
     Thirteen widths, including the 320 px floor the project asserts elsewhere
     and the 820 px breakpoint where .grid-2 becomes two columns. The failure
     was width-dependent and absent at some widths, so sampling only one would
     have missed it: 480 px and 768 px were both clean while 360 px and 820 px
     were not. */
  const widths = [1280, 1024, 900, 820, 768, 700, 600, 540, 480, 414, 390, 360, 320];
  const readings = [];
  for (const W of widths) {
    await send("Emulation.setDeviceMetricsOverride", {
      width: W, height: 900, deviceScaleFactor: 1, mobile: false,
    });
    await sleep(280);
    const r = await evalJs(`(function(){
      return { vw: window.innerWidth,
               docScroll: document.documentElement.scrollWidth,
               bodyScroll: document.body.scrollWidth };
    })()`);
    readings.push({ W, ...r });
    ok(r.docScroll <= r.vw + 1,
       `at ${W}px the page does not scroll horizontally (docScroll ${r.docScroll} vs viewport ${r.vw}, overflows by ${r.docScroll - r.vw}px)`);
  }

  /* ---- 2. The cause is fixed at the source, not merely hidden.
     Each select must fit its own cell. If a select overflows its container, the
     intrinsic-width floor is still there and the next layout change will
     re-expose it. */
  await send("Emulation.setDeviceMetricsOverride", {
    width: 360, height: 900, deviceScaleFactor: 1, mobile: false,
  });
  await sleep(400);
  const sells = await evalJs(`(function(){
    var out = [];
    document.querySelectorAll('.setup select').forEach(function(s){
      var longest = '';
      [].slice.call(s.options).forEach(function(o){ if (o.text.length > longest.length) longest = o.text; });
      out.push({
        id: s.id || null,
        w: Math.round(s.getBoundingClientRect().width),
        clientW: s.clientWidth,
        scrollW: s.scrollWidth,
        clipped: s.scrollWidth > s.clientWidth + 1,
        longestOption: longest
      });
    });
    return out;
  })()`);

  ok(sells.length >= 6, `all six setup selects are present (found ${sells.length})`);
  sells.forEach(s => {
    ok(!s.clipped,
       `select #${s.id} shows its options without clipping at 360px (scrollWidth ${s.scrollW} vs clientWidth ${s.clientW})`);
    ok(s.w > 0 && s.w <= 360,
       `select #${s.id} fits inside the viewport at 360px (width ${s.w})`);
  });

  /* ---- 3. The specific text that set the floor is still readable.
     The longest option is the reason the defect existed, so it is the one most
     at risk from a fix that "solves" reflow by truncating. Asserting the value
     is still present in the DOM guards against the fix being done by deleting
     the option rather than by letting the select shrink. */
  const hostile = await evalJs(`(function(){
    var s = document.getElementById('difficultySelect');
    if (!s) return null;
    var o = [].slice.call(s.options).filter(function(x){ return x.value === 'hostile'; })[0];
    return o ? o.text : null;
  })()`);
  ok(hostile !== null && /Hostile/.test(hostile),
     "the 'Hostile' difficulty option is still present (it is the longest option and the reason the width floor existed)");

  await send("Emulation.clearDeviceMetricsOverride");

  console.log("=== page-two reflow check (every measured width) ===");
  readings.forEach(r => {
    const over = r.docScroll - r.vw;
    console.log(`  ${String(r.W).padStart(4)}px -> docScroll ${String(r.docScroll).padStart(4)}  ${over > 0 ? "OVERFLOW +" + over : "ok"}`);
  });
  console.log(`  selects at 360px: ${sells.map(s => `${s.id}=${s.w}px`).join(", ")}`);
  console.log("Asserting both the symptom (no sideways scroll) and the cause (no select overflows its cell).");
  console.log(fails === 0 ? "ALL PAGE-TWO REFLOW ASSERTIONS PASSED" : fails + " FAILURES:");
  [...msgs].forEach(m => console.log("  -", m));
} catch (e) {
  fails++; msgs.add("harness error: " + e.message);
} finally {
  if (ws) ws.close();
  chrome.kill("SIGKILL");
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
}

if (fails) process.exitCode = 1;
