import fs from "node:fs";
import { spawn } from "node:child_process";
import WebSocket from "ws";
const CHROME = process.env.CHROME_BIN || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
if (!fs.existsSync(CHROME)) { console.log("SKIPPED: no Chrome"); process.exit(0); }
const PORT = 9451; const sleep = ms => new Promise(r => setTimeout(r, ms));
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${PORT}`, "--no-first-run",
  "--user-data-dir=/tmp/oc-rl", "--window-size=1280,900", "about:blank"], { stdio: "ignore" });
async function wsUrl(){for(let i=0;i<80;i++){try{const r=await fetch(`http://127.0.0.1:${PORT}/json/list`);const t=(await r.json()).find(x=>x.type==="page");if(t)return t.webSocketDebuggerUrl;}catch{}await sleep(250);}throw 0;}
const ws = new WebSocket(await wsUrl()); await new Promise(r=>ws.on("open",r));
let id=0; const pend=new Map();
ws.on("message",m=>{const g=JSON.parse(m);if(g.id&&pend.has(g.id)){pend.get(g.id)(g);pend.delete(g.id);}});
const send=(m,p={})=>new Promise(res=>{const n=++id;pend.set(n,res);ws.send(JSON.stringify({id:n,method:m,params:p}));});
const ev=async e=>{const r=await send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true});if(r.result?.exceptionDetails)throw new Error(r.result.exceptionDetails.exception?.description);return r.result?.result?.value;};
let fails=0; const msgs=new Set();
const ok=(c,m)=>{ if(!c){fails++;msgs.add(m);} };
try {
  await send("Runtime.enable"); await send("Page.enable");
  await send("Page.navigate",{url:"file:///Users/mike.gifford/permutations/index.html"}); await sleep(1400);

  // Force every step to PASS by stubbing Math.random high, so we test the
  // pass path specifically (the case in the report) 8 times.
  await ev(`(function(){
    var real = Math.random;
    window.__forcePass = function(){ Math.random = function(){ return 0.5; }; };
    window.__restore = function(){ Math.random = real; };
  })()`);
  await ev("window.__forcePass(); void 0;");
  await ev("document.getElementById('runExReset').click(); void 0;");
  await sleep(200);

  const rows = [];
  for (let i=0;i<8;i++){
    await ev("document.getElementById('runExStep').click(); void 0;");
    await sleep(120);
    rows.push(await ev(`(function(){
      var entries=document.querySelectorAll('#runExLog .entry');
      var e=entries[entries.length-1];
      var rl=e?e.querySelector('.riskline'):null;
      return { header: document.getElementById('runExRisk').textContent,
               riskline: rl?rl.textContent.replace(/\\s+/g,' ').trim():null,
               who: e?e.querySelector('.who').textContent:null };
    })()`));
  }

  // Expected: 1 - 0.99^n
  const exp = n => (1 - Math.pow(0.99, n)) * 100;
  rows.forEach((r,i)=>{
    const n=i+1;
    const want = exp(n).toFixed(2)+" %";
    ok(r.header === want, `step ${n}: header reads ${want}, got ${r.header}`);
    ok(r.riskline && r.riskline.includes(want),
       `step ${n}: the log entry states ${want}, got "${r.riskline}"`);
    ok(r.riskline && /Risk of failing somewhere on this journey/.test(r.riskline),
       `step ${n}: the log entry carries the risk reading`);
  });

  // Step 8 per the report: 7.73%
  ok(exp(8).toFixed(2)==="7.73", "step 8 is 7.73 % by the published arithmetic");
  console.log("step-by-step risk (as rendered):");
  rows.forEach((r,i)=>console.log("  step "+(i+1)+"  header "+r.header+"  |  "+(r.riskline||"").slice(0,80)));

  // The line must MOVE every step, not repeat.
  const figs = rows.map(r=>r.header);
  ok(new Set(figs).size === 8, `the figure changes at every step (got ${new Set(figs).size} distinct of 8)`);

  // And it must be present for a FAILING step too, not just passes.
  await ev("window.__restore(); void 0;");
  await ev("document.getElementById('runExReset').click(); void 0;"); await sleep(150);
  // Force a hit on step 1
  await ev(`(function(){ Math.random = function(){ return 0; }; })()`);
  await ev("document.getElementById('runExStep').click(); void 0;"); await sleep(150);
  const failing = await ev(`(function(){
    var entries=document.querySelectorAll('#runExLog .entry');
    var e=entries[entries.length-1];
    return { who:e.querySelector('.who').textContent,
             riskline: e.querySelector('.riskline') ? e.querySelector('.riskline').textContent.replace(/\\s+/g,' ').trim() : null };
  })()`);
  ok(!!failing.riskline, `a failing step also states the risk ("${failing.who}")`);
  await ev("window.__restore(); void 0;");
} catch(e){ fails++; msgs.add("harness error: "+e.message); }
finally { ws.close(); chrome.kill("SIGKILL"); fs.rmSync("/tmp/oc-rl",{recursive:true,force:true}); }

console.log("\n=== risk line in the step log ===");
console.log(fails===0 ? "ALL RISK-LINE ASSERTIONS PASSED" : fails+" FAILURES:");
[...msgs].forEach(m=>console.log("  -",m));
if (fails) process.exitCode=1;
