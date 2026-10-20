/* Real-browser check of the slide deck.
 * Moving DOM nodes between containers, full-screen sizing and click-to-advance
 * are all invisible to jsdom, so they are asserted here. */
import fs from "node:fs";
import { spawn } from "node:child_process";
import WebSocket from "ws";

const CHROME = process.env.CHROME_BIN || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
if (!fs.existsSync(CHROME)) { console.log("SKIPPED: no Chrome/Chromium binary found."); process.exit(0); }

const PORT = 9388;
const PAGE = "file://" + process.cwd().replace(/\/.verify$/, "") + "/index.html";
const sleep = ms => new Promise(r => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  "--headless=new", `--remote-debugging-port=${PORT}`,
  "--no-first-run", "--no-default-browser-check",
  "--user-data-dir=/tmp/oc-deck-check", "--window-size=1280,860", "about:blank",
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
  throw new Error("chrome did not start");
}

const ws = new WebSocket(await wsUrl());
await new Promise(r => ws.on("open", r));
let id = 0; const pending = new Map();
ws.on("message", m => {
  const msg = JSON.parse(m);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
});
const send = (method, params = {}) => new Promise(res => {
  const n = ++id; pending.set(n, res); ws.send(JSON.stringify({ id: n, method, params }));
});
const evalJs = async expr => {
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.text + " :: " + JSON.stringify(r.result.exceptionDetails.exception?.description || ""));
  return r.result?.result?.value;
};

let fails = 0; const msgs = new Set();
const ok = (c, m) => { if (!c) { fails++; msgs.add(m); } };

try {
  await send("Runtime.enable");
  await send("Page.enable");
  await send("Page.navigate", { url: PAGE });
  await sleep(1200);

  /* --- with no deck open, every beat is on the page (progressive enhancement) */
  const asPage = await evalJs(`(function(){
    var st = window.__deckState();
    var rows=[].slice.call(document.querySelectorAll('#thegridPage .beatrow[data-beat]'));
    return { open: st.open, gridInDeck: st.gridInDeck, rows: rows.length,
             gridInPage: !!document.querySelector('main #thegridPage') };
  })()`);
  ok(asPage.open === false, "the deck does not open by itself");
  ok(asPage.gridInPage === true, "before opening, the grid lives in the page");

  /* Reveal-all on the page still works (the old behaviour must survive). */
  await evalJs("window.__setBeats(6)");
  await sleep(200);
  const revealed = await evalJs(`document.querySelectorAll('#thegridPage .beatrow[data-beat]:not([hidden])').length`);
  ok(revealed === 6, `reveal-all on the page shows all six beats (got ${revealed})`);

  /* --- open the deck -------------------------------------------------- */
  await evalJs("window.__setBeats(0); window.__openDeck(1); void 0;");
  await sleep(400);

  const open = await evalJs(`(function(){
    var st = window.__deckState();
    var stage = document.getElementById('deckStage');
    var r = stage.getBoundingClientRect();
    var body = document.body;
    var visibleRows=[].slice.call(document.querySelectorAll('#deckMount .beatrow[data-beat]'))
      .filter(function(x){return x.offsetParent!==null;});
    return { open: st.open, gridInDeck: st.gridInDeck, slide: st.slide,
             covers: Math.round(r.width)+'x'+Math.round(r.height),
             vw: window.innerWidth, vh: window.innerHeight,
             bodyOverflow: getComputedStyle(body).overflow,
             visibleRows: visibleRows.length,
             count: document.getElementById('deckCount').textContent };
  })()`);
  ok(open.open === true, "the deck opens");
  ok(open.gridInDeck === true, "opening the deck MOVES the grid into it");
  ok(open.covers === `${open.vw}x${open.vh}`, `the deck covers the viewport (${open.covers} vs ${open.vw}x${open.vh})`);
  ok(open.bodyOverflow === "hidden", "the page behind the deck does not scroll");
  ok(open.visibleRows === 1, `exactly one beat is on screen at a time (got ${open.visibleRows})`);
  ok(open.count === "Beat 1 of 6", `the counter reads Beat 1 of 6 (got "${open.count}")`);

  /* Two columns side by side inside the slide. */
  const cols = await evalJs(`(function(){
    var row = document.querySelector('#deckMount .beatrow[data-beat]:not([hidden])');
    var l = row.querySelector('.cell-l').getBoundingClientRect();
    var r = row.querySelector('.cell-r').getBoundingClientRect();
    return { lw: Math.round(l.width), rw: Math.round(r.width),
             sameTop: Math.abs(l.top - r.top) < 4, lLeftOfR: l.left < r.left };
  })()`);
  ok(cols.lw > 200 && cols.rw > 200, `both columns have real width (${cols.lw} / ${cols.rw})`);
  ok(cols.sameTop, "the two columns sit side by side on the same row");
  ok(cols.lLeftOfR, "Permutations is on the left, Accessibility on the right");

  /* --- the overlay must not leak focus or expose the page behind it -------
     A full-screen overlay that leaves the page focusable is a real defect and
     axe does not detect it. Observed before the fix: tabbing out of the deck
     landed on the reveal buttons behind it, and a screen reader could walk the
     whole hidden page. Asserted while the deck is OPEN. */
  const inert = await evalJs(`(function(){
    var stage = document.getElementById('deckStage');
    var m = document.getElementById('masthead');
    var main = document.getElementById('main');
    return { role: stage.getAttribute('role'),
             modal: stage.getAttribute('aria-modal'),
             label: stage.getAttribute('aria-label'),
             mastheadHidden: m.getAttribute('aria-hidden'),
             mainHidden: main.getAttribute('aria-hidden'),
             mastheadInert: m.hasAttribute('inert') ? m.inert : 'unsupported',
             mainInert: main.hasAttribute('inert') ? main.inert : 'unsupported' };
  })()`);
  ok(inert.role === "dialog", `the deck is exposed as a dialog (got ${inert.role})`);
  ok(inert.modal === "true", "the deck is marked aria-modal");
  ok(!!inert.label, "the deck has an accessible name");
  ok(inert.mastheadHidden === "true" && inert.mainHidden === "true",
     "the page behind the deck is hidden from assistive technology");
  ok(inert.mastheadInert !== false && inert.mainInert !== false,
     "the page behind the deck is removed from the tab order (inert)");

  /* Tab many times; focus must never land on content behind the overlay. */
  const escapes = [];
  for (let i = 0; i < 20; i++) {
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
    await sleep(45);
    escapes.push(await evalJs(`(function(){
      var a = document.activeElement;
      if (!a) return 'none';
      if (a.closest('#deckStage')) return 'deck';
      if (a === document.body || a === document.documentElement) return 'chrome';
      return 'CONTENT:' + (a.id || a.tagName);
    })()`));
  }
  const leaked = escapes.filter(x => x.startsWith("CONTENT"));
  ok(leaked.length === 0,
     `tabbing never reaches content hidden behind the deck (leaked to: ${[...new Set(leaked)].join(", ")})`);

  /* The slide's own text must be present and reachable, or the deck is empty. */
  const slideText = await evalJs(`(function(){
    var row = document.querySelector('#deckMount .beatrow[data-beat]:not([hidden])');
    return row ? row.textContent.replace(/\\s+/g,' ').trim().length : 0;
  })()`);
  ok(slideText > 200, `the visible slide carries real content (${slideText} chars)`);

  /* A slide taller than the screen must be scrollable BY KEYBOARD, not just by
     mouse. tabindex="-1" made the scroll region unreachable, which axe reported
     as scrollable-region-focusable — a real barrier, not a lint failure. */
  const scrollable = await evalJs(`(function(){
    var b = document.getElementById('deckBody');
    return { tabIndex: b.tabIndex, role: b.getAttribute('role'),
             label: b.getAttribute('aria-label'),
             overflow: getComputedStyle(b).overflowY };
  })()`);
  ok(scrollable.tabIndex === 0,
     `the scrolling slide surface is reachable by Tab (tabIndex=${scrollable.tabIndex})`);
  ok(scrollable.role === "region" && !!scrollable.label,
     `the scrolling region has a role and a name (${scrollable.role} / ${scrollable.label})`);

  /* Press Tab from the body and require the deck surface itself to be a stop. */
  await evalJs(`document.getElementById('deckBody').focus(); void 0;`);
  await sleep(120);
  const canFocusBody = await evalJs(`document.activeElement.id`);
  ok(canFocusBody === "deckBody", `the slide surface takes focus (${canFocusBody})`);

  /* --- advance by clicking the slide surface --------------------------- */
  await evalJs(`document.getElementById('deckBody').click(); void 0;`);
  await sleep(300);
  const afterClick = await evalJs(`window.__deckState()`);
  ok(afterClick.slide === 2, `clicking the slide advances it (slide=${afterClick.slide})`);

  /* Clicking a control inside the slide must NOT advance. */
  await evalJs(`(function(){
    var b=document.getElementById('deckNext'); b.click(); return 1;
  })()`);
  await sleep(300);
  const afterBtn = await evalJs(`window.__deckState()`);
  ok(afterBtn.slide === 3, `the Next button advances (slide=${afterBtn.slide})`);

  const onControl = await evalJs(`(function(){
    var before = window.__deckState().slide;
    var b = document.createElement('a');
    b.href = '#h-running';
    b.textContent = 'x';
    document.querySelector('#deckMount .beatrow[data-beat]:not([hidden]) .cell-l').appendChild(b);
    b.click();
    var after = window.__deckState().slide;
    b.remove();
    return { before: before, after: after };
  })()`);
  ok(onControl.before === onControl.after,
     `clicking a link inside a slide does not advance (${onControl.before} -> ${onControl.after})`);

  /* --- keyboard --------------------------------------------------------- */
  const key = async (k) => {
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: k, code: k, windowsVirtualKeyCode: k === "ArrowRight" ? 39 : 37 });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code: k, windowsVirtualKeyCode: k === "ArrowRight" ? 39 : 37 });
    await sleep(250);
  };
  const beforeKeys = (await evalJs("window.__deckState()")).slide;
  await key("ArrowRight");
  const afterRight = (await evalJs("window.__deckState()")).slide;
  ok(afterRight === beforeKeys + 1, `ArrowRight advances the deck (${beforeKeys} -> ${afterRight})`);
  await key("ArrowLeft");
  const afterLeft = (await evalJs("window.__deckState()")).slide;
  ok(afterLeft === beforeKeys, `ArrowLeft goes back (${afterRight} -> ${afterLeft})`);

  /* --- finish: the deck closes and the full page is there --------------- */
  await evalJs("window.__openDeck(6); void 0;");
  await sleep(300);
  const atEnd = await evalJs(`document.getElementById('deckNext').textContent`);
  ok(/finish/i.test(atEnd), `the last slide offers Finish (got "${atEnd}")`);

  await evalJs("document.getElementById('deckNext').click(); void 0;");
  await sleep(400);
  const closed = await evalJs(`(function(){
    var st = window.__deckState();
    var grid = document.getElementById('thegridPage');
    var rows=[].slice.call(document.querySelectorAll('#thegridPage .beatrow[data-beat]'));
    var bodyOverflow = getComputedStyle(document.body).overflow;
    return { open: st.open, gridInDeck: st.gridInDeck,
             inMain: !!document.querySelector('main #thegridPage'),
             rows: rows.length,
             unhidden: rows.filter(function(r){return !r.hasAttribute('hidden');}).length,
             bodyOverflow: bodyOverflow };
  })()`);
  ok(closed.open === false, "finishing closes the deck");
  ok(closed.inMain === true, "the grid is returned to the page");
  ok(closed.rows === 6, `all six beats are back in the page (got ${closed.rows})`);
  ok(closed.unhidden === 6, `all six are visible after finishing (got ${closed.unhidden})`);
  ok(closed.bodyOverflow !== "hidden", "the page can scroll again after the deck closes");

  /* --- skip the intro --------------------------------------------------- */
  await evalJs("window.__openDeck(2); void 0;");
  await sleep(300);
  await evalJs("document.getElementById('deckExit').click(); void 0;");
  await sleep(300);
  const skipped = await evalJs(`(function(){
    var st = window.__deckState();
    var target = document.getElementById('h-running');
    return { open: st.open, inMain: !!document.querySelector('main #thegridPage'),
             targetExists: !!target };
  })()`);
  ok(skipped.open === false, "Skip the intro closes the deck");
  ok(skipped.inMain === true, "Skip the intro returns the grid to the page");
  ok(skipped.targetExists, "the running example the skip anchors to exists");

  /* --- narrow viewport: the slide must not overflow horizontally -------- */
  await send("Emulation.setDeviceMetricsOverride", { width: 360, height: 740, deviceScaleFactor: 2, mobile: true });
  await evalJs("window.__openDeck(1); void 0;");
  await sleep(400);
  const narrow = await evalJs(`(function(){
    var doc = document.documentElement;
    var row = document.querySelector('#deckMount .beatrow[data-beat]:not([hidden])');
    var l = row.querySelector('.cell-l').getBoundingClientRect();
    var r = row.querySelector('.cell-r').getBoundingClientRect();
    return { scrollW: doc.scrollWidth, clientW: doc.clientWidth,
             stacked: r.top >= l.bottom - 2 };
  })()`);
  ok(narrow.scrollW <= narrow.clientW + 2,
     `the deck does not overflow horizontally at 360px (${narrow.scrollW} vs ${narrow.clientW})`);
  ok(narrow.stacked, "at 360px the two columns stack instead of squashing");
  await send("Emulation.clearDeviceMetricsOverride");
  await evalJs("window.__closeDeck(); void 0;");
} catch (e) {
  fails++; msgs.add("harness error: " + e.message);
} finally {
  ws.close(); chrome.kill("SIGKILL");
  try { fs.rmSync("/tmp/oc-deck-check", { recursive: true, force: true }); } catch {}
}

console.log("=== slide deck, real browser ===");
console.log(fails === 0 ? "ALL DECK ASSERTIONS PASSED" : fails + " FAILURES:");
[...msgs].forEach(m => console.log("  -", m));
if (fails) process.exitCode = 1;
