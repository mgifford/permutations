import fs from "node:fs";
import { JSDOM } from "jsdom";
const html = fs.readFileSync("../two-ideas.html","utf8");
const dom = new JSDOM(html,{runScripts:"dangerously",pretendToBeVisual:true});
const d = dom.window.document;
let fails=0; const msgs=new Set();
const ok=(c,m)=>{if(!c){fails++;msgs.add(m);}};

ok(d.querySelectorAll(".beatrow").length===6, "six beats present");
ok(d.querySelectorAll(".beatrow.is-hidden").length===6, "all beats hidden initially");
const st = d.getElementById("revealStatus").textContent;
ok(/Beat 0 of 6/.test(st), "status starts at 0 of 6: "+st);

// reveal one
d.getElementById("revealBtn").click();
ok(d.querySelectorAll(".beatrow.is-hidden").length===5, "one beat shown after first reveal");
ok(/Beat 1 of 6/.test(d.getElementById("revealStatus").textContent), "status at 1");

// reveal all
d.getElementById("revealAllBtn").click();
ok(d.querySelectorAll(".beatrow.is-hidden").length===0, "all beats shown");
ok(d.getElementById("revealBtn").disabled, "next button disabled when complete");

// check the joining math is actually correct in the text
const body = d.body.textContent;
ok(body.includes("0.99³⁰") || body.includes("0.99³⁰"), "formula 0.99^30 present");
ok(/73\.97/.test(body), "73.97 present");
ok(/97\.04/.test(body), "97.04 present");
ok(/28\.7/.test(body), "CDC 28.7 present");
ok(/13\.6/.test(body), "Census 13.6 present");
ok(/46/.test(body), "46% 75+ present");
ok(!body.includes("NaN"), "no NaN");
ok(!body.includes("undefined"), "no undefined");
ok(!body.includes("[object Object]"), "no object leak");

// POUR all four
["Perceivable","Operable","Understandable","Robust"].forEach(p=>ok(body.includes(p),"POUR: "+p));

// headings: two grid headers
ok(d.getElementById("grid-head-l").textContent.includes("Permutations"), "left header");
ok(d.getElementById("grid-head-r").textContent.includes("Digital accessibility"), "right header");

// tables have captions + th scope
d.querySelectorAll("table.data").forEach(t=>ok(!!t.querySelector("caption"),"table caption"));
ok(d.querySelectorAll('th[scope="row"]').length>0,"row headers present");

console.log("beats:",d.querySelectorAll(".beatrow").length);
console.log(fails===0?"ALL ASSERTIONS PASSED":fails+" FAILURES:");
[...msgs].forEach(m=>console.log(" -",m));
