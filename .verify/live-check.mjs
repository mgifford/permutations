/* Scans the DEPLOYED pages, not the local files.
 *
 * Every other harness reads from the filesystem. This one exists because a
 * defect reached the live site while the local gate was green: the deck-open
 * state was never scanned, and with the deck open the live page carried a
 * serious scrollable-region-focusable violation. The a11y gate now scans that
 * state too — this harness is the independent confirmation that what is
 * actually served matches what we tested.
 *
 * Skipped by default so `npm run all` stays offline and deterministic. Run it
 * deliberately, after a push:
 *
 *   node live-check.mjs
 *   LIVE_URL=https://example.com/page.html node live-check.mjs
 *
 * It asserts the deployed page carries the expected content and that no
 * critical or serious axe violation appears in any state, including the deck.
 */
import fs from "node:fs";
import { spawn } from "node:child_process";
import WebSocket from "ws";

const CHROME = process.env.CHROME_BIN || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const URL_ = process.env.LIVE_URL || "https://mgifford.github.io/permutations/";

if (!fs.existsSync(CHROME)) { console.log("SKIPPED: no Chrome/Chromium binary found."); process.exit(0); }
if (!fs.existsSync("./node_modules/axe-core/axe.min.js")) {
  console.log("SKIPPED: axe-core not installed. Run `npm install` first."); process.exit(0);
}

const PORT = 9431;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  "--headless=new", `--remote-debugging-port=${PORT}`,
  "--no-first-run", "--no-default-browser-check",
  "--user-data-dir=/tmp/oc-live-check", "--window-size=1280,900", "about:blank",
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
  if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text);
  return r.result?.result?.value;
};

let fails = 0; const msgs = new Set();
const ok = (c, m) => { if (!c) { fails++; msgs.add(m); } };

try {
  await send("Runtime.enable");
  await send("Page.enable");
  console.log("scanning", URL_);
  await send("Page.navigate", { url: URL_ + (URL_.includes("?") ? "&" : "?") + "cb=" + Date.now() });
  await sleep(4000);

  /* --- what is actually served ---------------------------------------- */
  const content = await evalJs(`(function(){
    return {
      title: document.title,
      hasGrid: !!document.getElementById('thegridPage'),
      beats: document.querySelectorAll('.beatrow[data-beat]').length,
      hasDeck: !!document.getElementById('deckStage'),
      hasFigure: !!document.querySelector('.beatrow[data-beat="1"] figure.fig svg'),
      hasPictos: document.querySelectorAll('.pictos li').length,
      hasLayers: document.querySelectorAll('.layers > li').length,
      selfContained: !document.querySelector('script[src], link[href^="http"], img[src^="http"]'),
    };
  })()`);
  ok(content.beats === 6, `the deployed page serves six beats (got ${content.beats})`);
  ok(content.hasDeck, "the deployed page serves the slide deck");
  ok(content.hasFigure, "the deployed page serves the coin figure");
  ok(content.hasPictos === 5, `the deployed page serves five pictograms (got ${content.hasPictos})`);
  ok(content.hasLayers === 5, `the deployed page serves five layers (got ${content.hasLayers})`);
  ok(content.selfContained, "the deployed page loads no external script, stylesheet or image");

  /* --- axe, in every state, including the deck ------------------------- */
  await evalJs(fs.readFileSync("./node_modules/axe-core/axe.min.js", "utf8"));

  const scan = async label => {
    const res = await evalJs(`axe.run(document, { resultTypes:['violations'] }).then(function(r){
      return JSON.stringify(r.violations
        .filter(function(v){ return v.impact==='critical' || v.impact==='serious'; })
        .map(function(v){ return { id:v.id, impact:v.impact, nodes:v.nodes.map(function(n){return String(n.target);}) }; }));
    })`);
    const found = JSON.parse(res);
    found.forEach(v => {
      fails++;
      msgs.add(`${label}: ${v.id} (${v.impact}) on ${v.nodes.join(", ")}`);
    });
    console.log(`  ${label}: ${found.length ? found.length + " violation(s)" : "clean"}`);
    return found.length;
  };

  await scan("as loaded");
  await evalJs("window.__setBeats(6); void 0;"); await sleep(600);
  await scan("all beats revealed");
  await evalJs("typeof window.__openDeck === 'function' && window.__openDeck(1); void 0;"); await sleep(700);
  await scan("slide deck open");
  await evalJs("typeof window.__closeDeck === 'function' && window.__closeDeck(); void 0;"); await sleep(400);
} catch (e) {
  fails++; msgs.add("harness error: " + e.message);
} finally {
  ws.close(); chrome.kill("SIGKILL");
  try { fs.rmSync("/tmp/oc-live-check", { recursive: true, force: true }); } catch {}
}

console.log("\n=== deployed site check ===");
console.log(fails === 0 ? "LIVE CHECK PASSED" : fails + " FAILURES:");
[...msgs].forEach(m => console.log("  -", m));
if (fails) process.exitCode = 1;
