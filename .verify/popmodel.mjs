import fs from "node:fs";
import { JSDOM } from "jsdom";
const html = fs.readFileSync("../cumulative-accessibility-risk-simulator.html","utf8");
const scriptSrc = new JSDOM(html).window.document.querySelector("script").textContent;
const dom = new JSDOM(html, { runScripts:"outside-only", pretendToBeVisual:true });
const { window } = dom;
const runnable = scriptSrc.replace(/if \(document\.readyState === "loading"\) \{[\s\S]*?\}\s*else \{\s*boot\(\);\s*\}/, "window.__h={computePopulationModel,POPULATION_IMPACT,groupShare,POPULATION};boot();");
new window.Function(runnable).call(window);
const h=window.__h;

for (const p of [0.01, 0.001, 0.03, 0.05]) {
  const m = h.computePopulationModel(p);
  console.log("\n=== component defect rate p = " + p + " (" + ((1-p)*100).toFixed(1) + "% accessible) ===");
  console.log("  unaffected completion (vendor headline): " + (m.unaffectedCompletion*100).toFixed(2) + "%");
  console.log("  unaffected failure: " + (m.unaffectedFailure*100).toFixed(2) + "%");
  console.log("  per-group completion:");
  for (const [g,v] of Object.entries(m.perGroup)) {
    if (v.prevalence>0) console.log("    "+g.padEnd(10), "prev "+(v.prevalence*100).toFixed(1)+"%",
      "removed "+(v.removed*100).toFixed(2)+"pp",
      "completion "+(v.completionRate*100).toFixed(1)+"%",
      v.saturated?"(SATURATED)":"");
  }
  console.log("  population completion by catch rate:");
  for (const [cr,v] of Object.entries(m.byCatch)) {
    console.log("    catch "+(v.catchRate*100)+"%  trueP="+v.trueP.toFixed(4),
      " pop completion "+(v.populationCompletion*100).toFixed(2)+"%",
      " pop failure "+(v.populationFailure*100).toFixed(2)+"%");
  }
}
