/*
 * Real-browser layout check.
 *
 * WHY THIS EXISTS
 * ---------------
 * jsdom has no layout engine. In the previous version of index.html the reveal
 * mechanism looked correct under jsdom while being completely broken in a real
 * browser: beats were "hidden" with a class that set display:none on the two
 * children of a display:contents wrapper. jsdom reported the class was applied
 * and the children's computed display was "none", so page-one.mjs passed — but
 * a display:contents element generates no box, so the row never collapsed and
 * the un-hidden cells stacked into the grid as stray items.
 *
 * A headless layout engine is the only way to assert this class of behaviour.
 * This harness launches its own Chrome, so it needs no pre-running instance.
 *
 * REQUIREMENT: a Chrome or Chromium binary. Set CHROME_BIN to override.
 *   npm install ws          # one WebSocket client dependency
 *   node layout-check.mjs
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
  console.log("SKIPPED: no Chrome/Chromium binary found.");
  console.log("Set CHROME_BIN to run the real-browser layout check.");
  process.exit(0);
}

const PAGE = path.resolve(import.meta.dirname ?? ".", "../index.html");
const PORT = 9333;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "a11y-layout-"));

const chrome = spawn(chromePath, [
  "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  `file://${PAGE}`,
], { stdio: "ignore" });

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitForDevtools() {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (r.ok) return;
    } catch { /* not up yet */ }
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
  // give the page a moment to lay out
  await sleep(600);

  /* Measured geometry, not class names. Only rows carrying data-beat are
     beats; the pre-reveal placeholder shares the .beatrow class so it inherits
     the two-column shape, and must never be counted as a beat. */
  const probe = `(() => {
    const rows = [...document.querySelectorAll('.beatrow[data-beat]')];
    const bx = el => { const b = el.getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height) }; };
    const grid = document.getElementById('thegridPage');
    return {
      rows: rows.map(r => ({
        beat: r.dataset.beat,
        hidden: r.hasAttribute('hidden'),
        box: bx(r),
        cells: [...r.children].map(c => ({ cls: c.className, box: bx(c) })),
      })),
      // a "stray" cell is a left/right cell that is a direct child of the grid
      // rather than of a row — the exact artefact of the display:contents bug
      strayCells: [...grid.children].filter(c =>
        c.classList.contains('cell-l') || c.classList.contains('cell-r')).length,
      gridH: Math.round(grid.getBoundingClientRect().height),
    };
  })()`;

  const initial = await evalJs(probe);
  ok(initial.rows.length === 6, "six beat rows in the DOM");
  ok(initial.strayCells === 0, "no stray cells directly inside the grid (display:contents regression)");
  initial.rows.forEach(r => {
    ok(r.hidden, `beat ${r.beat} starts hidden`);
    ok(r.box.h === 0, `beat ${r.beat} starts collapsed to zero height, got ${r.box.h}`);
  });

  /* Reveal three, then check that exactly three have real height. */
  await evalJs(`document.getElementById('revealBtn').click();
                document.getElementById('revealBtn').click();
                document.getElementById('revealBtn').click();
                void 0;`);
  await sleep(200);
  const three = await evalJs(probe);
  const grown = three.rows.filter(r => r.box.h > 50);
  ok(grown.length === 3, `exactly three beats have real height after three reveals, got ${grown.length}`);
  ok(three.rows.slice(0,3).every(r => !r.hidden && r.box.h > 50),
     "the first three beats are the visible ones");
  ok(three.rows.slice(3).every(r => r.hidden && r.box.h === 0),
     "beats four to six are collapsed to zero height");
  ok(three.strayCells === 0, "still no stray cells after partial reveal");

  /* Both cells of a revealed beat must sit side by side and be visible. */
  const cellsOk = three.rows[0].cells.length === 2 &&
                  three.rows[0].cells.every(c => c.box.w > 100 && c.box.h > 50);
  ok(cellsOk, "both columns of a revealed beat are laid out and visible");

  /* --- feedback: a click must SHOW something -------------------------------
     A user reported the reveal "only worked once". It always worked — but the
     control sits at the top of the page and the revealed row appears ~2,300px
     below it, off screen, so clicking looked like it did nothing. jsdom cannot
     see that, because it has no viewport. Asserted here instead. */
  await evalJs(`window.scrollTo(0,0); window.__setBeats(0); void 0;`);
  await sleep(250);

  const phBefore = await evalJs(`(function(){
    var ph = document.getElementById('gridPlaceholder');
    return { exists: !!ph, shown: ph ? !ph.hasAttribute('hidden') : null,
             h: ph ? ph.getBoundingClientRect().height : 0 };
  })()`);
  ok(phBefore.exists, "a placeholder keeps the two-column shape visible before any reveal");
  ok(phBefore.shown === true && phBefore.h > 20,
     `the placeholder is rendered before the first reveal (h=${phBefore.h})`);

  const feedback = await evalJs(`(function(){
    window.scrollTo(0,0);
    var before = window.scrollY;
    document.getElementById('revealBtn').click();
    var row = document.querySelector('.beatrow[data-beat="1"]');
    return { before: before, rowTop: row.getBoundingClientRect().top };
  })()`);
  await sleep(800); /* let the smooth scroll settle */

  const after = await evalJs(`(function(){
    var row = document.querySelector('.beatrow[data-beat="1"]');
    var r = row.getBoundingClientRect();
    var ph = document.getElementById('gridPlaceholder');
    return { scrollY: Math.round(window.scrollY),
             visible: r.top < window.innerHeight && r.bottom > 0,
             top: Math.round(r.top),
             phHidden: ph ? ph.hasAttribute('hidden') : null };
  })()`);

  ok(after.visible,
     `clicking scrolls the newly revealed beat into view (was ${feedback.rowTop}px below the fold, now top=${after.top})`);
  ok(after.scrollY > 0,
     `the page actually moves when a beat is revealed (scrollY=${after.scrollY})`);
  ok(after.phHidden === true,
     "the placeholder is removed once a real beat is showing");

  /* Reveal everything. */
  await evalJs(`document.getElementById('revealAllBtn').click(); void 0;`);
  await sleep(200);
  const all = await evalJs(probe);
  ok(all.rows.every(r => !r.hidden && r.box.h > 50), "reveal-all gives every beat real height");
  ok(all.strayCells === 0, "no stray cells after reveal-all");

  /* --- figures must actually render -------------------------------------
     Inline SVG can be present in the DOM and still collapse, clip or be
     invisible — which is exactly what happened before with display:contents.
     jsdom cannot see any of it. So the drawings are measured here. */
  const figs = await evalJs(`(function(){
    var out = { coin: null, pictos: [], layers: 0, smallText: null };
    var coin = document.querySelector('.beatrow[data-beat="1"] figure.fig svg');
    if (coin) {
      var b = coin.getBoundingClientRect();
      var cs = [].slice.call(coin.querySelectorAll('text'))
        .map(function(t){ return parseFloat(getComputedStyle(t).fontSize); });
      out.coin = { w: Math.round(b.width), h: Math.round(b.height),
                   visible: b.top < window.innerHeight * 40 && b.width > 0,
                   texts: cs.length,
                   smallest: cs.length ? Math.min.apply(null, cs) : null,
                   hasTitle: !!coin.querySelector('title'),
                   hasDesc: !!coin.querySelector('desc'),
                   labelled: !!coin.getAttribute('aria-labelledby') };
    }
    out.pictos = [].slice.call(document.querySelectorAll('.pictos svg')).map(function(s){
      var b = s.getBoundingClientRect();
      return { w: Math.round(b.width), h: Math.round(b.height) };
    });
    out.layers = document.querySelectorAll('.layers > li').length;
    return out;
  })()`);

  ok(figs.coin && figs.coin.w > 200 && figs.coin.h > 80,
     `the coin figure renders at a real size (${figs.coin ? figs.coin.w + "x" + figs.coin.h : "missing"})`);
  ok(figs.coin && figs.coin.hasTitle && figs.coin.hasDesc && figs.coin.labelled,
     "the coin figure is named and described for assistive technology");
  ok(figs.coin && figs.coin.smallest >= 14,
     `no SVG label is smaller than 14px (smallest ${figs.coin ? figs.coin.smallest : "?"}px)`);
  ok(figs.pictos.length === 5, `all five disability pictograms render (got ${figs.pictos.length})`);
  ok(figs.pictos.every(p => p.w > 30 && p.h > 30),
     `every pictogram has real size (${JSON.stringify(figs.pictos)})`);
  ok(figs.layers === 5, `the five-layer section renders five layers (got ${figs.layers})`);

  /* Narrow viewport: the row must reflow to a single column. */
  await send("Emulation.setDeviceMetricsOverride", {
    width: 360, height: 800, deviceScaleFactor: 2, mobile: true,
  });
  await sleep(300);
  const narrow = await evalJs(probe);
  ok(narrow.strayCells === 0, "no stray cells at 360px viewport");
  const c0 = narrow.rows[0].cells;
  ok(c0[0].box.w > 200 && c0[1].box.w > 200,
     "at 360px both cells of a beat are full width and stacked (single column)");
  ok(c0[1].box.h > 0 && c0[1].box.w > 200,
     "the second cell stacks below the first at 360px");

  /* No beat may extend past the grid box, at any width.
     This was broken for a long time and nothing noticed: .formula uses
     white-space:pre, so a long formula's min-content width set a floor of
     ~404px on every beat row inside a 272px grid at 360px. The grid's
     overflow:hidden clipped it, so document scrollWidth never moved and the
     page looked fine while the content was cut off. Width alone did not catch
     it — the earlier assertion here only required the cells to be "wide".
     Fit, not width, is what matters. */
  const widths = [1280, 768, 480, 360, 320];
  for (const W of widths) {
    await send("Emulation.setDeviceMetricsOverride", {
      width: W, height: 800, deviceScaleFactor: 1, mobile: false,
    });
    await sleep(300);
    const fit = await evalJs(`(function(){
      var grid = document.getElementById('thegridPage');
      var gb = grid.getBoundingClientRect();
      var rows = [].slice.call(grid.querySelectorAll('.beatrow[data-beat]'));
      var worst = 0;
      rows.forEach(function(r){ worst = Math.max(worst, r.getBoundingClientRect().right); });
      return { vw: window.innerWidth,
               docScroll: document.documentElement.scrollWidth,
               past: Math.round(worst - gb.right) };
    })()`);
    ok(fit.past <= 1,
       `at ${W}px no beat extends past the grid box (overflows by ${fit.past}px)`);
    ok(fit.docScroll <= fit.vw + 1,
       `at ${W}px the page does not scroll horizontally (${fit.docScroll} vs ${fit.vw})`);
  }
  await send("Emulation.clearDeviceMetricsOverride");

  ws.close();
} catch (e) {
  fails++; msgs.add("harness error: " + e.message);
} finally {
  chrome.kill("SIGKILL");
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
}

console.log("=== real-browser layout check ===");
console.log(fails === 0 ? "ALL LAYOUT ASSERTIONS PASSED" : fails + " FAILURES:");
[...msgs].forEach(m => console.log("  -", m));
if (fails) process.exitCode = 1;
