import fs from "node:fs";
import { JSDOM } from "jsdom";
const html = fs.readFileSync("../cumulative-accessibility-risk-simulator.html","utf8");
const scriptSrc = new JSDOM(html).window.document.querySelector("script").textContent;

function runSuite(label, overrides, quality, difficulty, N) {
  const res = { completed:0, terminal:0, exhausted:0, encounters:0 };
  for (let i=0;i<N;i++){
    const dom = new JSDOM(html, { runScripts:"outside-only", pretendToBeVisual:true });
    const { window } = dom, doc = window.document;
    const runnable = scriptSrc.replace(/if \(document\.readyState === "loading"\) \{[\s\S]*?\}\s*else \{\s*boot\(\);\s*\}/, "window.__h={boot,startRun,state,STEP_HAZARD};boot();");
    new window.Function(runnable).call(window);
    const h=window.__h;
    // set controls via the real DOM controls, as a user would
    doc.getElementById("qualitySelect").value = quality;
    doc.getElementById("qualitySelect").dispatchEvent(new window.Event("change"));
    doc.getElementById("difficultySelect").value = difficulty;
    doc.getElementById("difficultySelect").dispatchEvent(new window.Event("change"));
    Object.entries(overrides).forEach(([k,v])=>{
      const sel = doc.getElementById("ov"+k[0].toUpperCase()+k.slice(1));
      sel.value = v; sel.dispatchEvent(new window.Event("change"));
    });
    doc.getElementById("startBtn").click();
    doc.getElementById("runAllBtn").click();
    const st=h.state;
    res.encounters += st.defectsHit.length;
    if (!st.endedAt) res.completed++;
    else if (st.endReason==="exhausted") res.exhausted++;
    else res.terminal++;
    window.close();
  }
  const pct = x => (100*x/N).toFixed(1)+"%";
  console.log(label);
  console.log("  completed", pct(res.completed), "| walled", pct(res.terminal), "| spent", pct(res.exhausted),
              "| avg encounters", (res.encounters/N).toFixed(2));
}

const N=120;
runSuite("Baseline 99%, standard, random persona", {}, "0.99", "standard", N);
runSuite("Worst case: fully exposed (blind+keyboard+executive+deaf)", 
  {vision:"Permanent",motor:"Permanent",cognition:"Permanent",hearing:"Permanent"}, "0.99", "standard", N);
runSuite("Quality 99.9%", {}, "0.999", "standard", N);
runSuite("Quality 95% (pre-remediation)", {}, "0.95", "standard", N);
runSuite("Hostile difficulty", {}, "0.99", "hostile", N);
