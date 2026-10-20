/*
 * Readability check for the beat columns on page one.
 *
 * WHY THIS EXISTS
 * ---------------
 * Page one is explicitly "written for people without a maths background". That
 * is a claim about the writing, and a claim about writing is measurable. This
 * harness computes, per beat cell:
 *
 *   - word count
 *   - average sentence length
 *   - longest sentence
 *   - Flesch Reading Ease  (target: 60+, "plain English")
 *   - Flesch-Kincaid Grade (target: <= 9)
 *
 * It REPORTS; it fails only on the hard thresholds agreed as non-negotiable
 * (a cell over 95 words, or a longest sentence over 45 words). Reading scores
 * are English-specific and blunt, so they are printed for a human to judge
 * rather than used as a pass/fail gate on their own. The honest position: this
 * catches walls of text, it does not prove clarity.
 */

import fs from "node:fs";
import { JSDOM } from "jsdom";

const html = fs.readFileSync("../index.html", "utf8");
const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true });
const d = dom.window.document;

/* Strip the reveal button labels and any aside, so we measure the teaching
   prose rather than furniture. Headings are removed too: a heading is a label,
   not a sentence, and including it distorts sentence-length statistics. */
function teachText(cell) {
  const clone = cell.cloneNode(true);
  clone.querySelectorAll("script, style, .beat, h3, h4, .formula, .pour, table").forEach(n => n.remove());
  return clone.textContent.replace(/\s+/g, " ").trim();
}

/* Flesch requires a syllable count. A simple vowel-group heuristic is standard
   for this purpose and is what most readability libraries use; it is
   approximate, and that is stated rather than hidden. */
function syllables(word) {
  let w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "");
  const m = w.match(/[aeiouy]{1,2}/g);
  return m ? m.length : 1;
}

function stats(text) {
  const sentences = text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 2);
  const words = text.split(/\s+/).filter(w => /[a-zA-Z]/.test(w));
  const W = words.length, S = Math.max(1, sentences.length);
  const Y = words.reduce((a, w) => a + syllables(w), 0);
  const asl = W / S;
  const asw = Y / Math.max(1, W);
  const ease = 206.835 - 1.015 * asl - 84.6 * asw;
  const grade = 0.39 * asl + 11.8 * asw - 15.59;
  const longest = sentences.slice().sort((a, b) =>
    b.split(/\s+/).length - a.split(/\s+/).length)[0] || "";
  return { W, S, asl, ease, grade, longest, longestLen: longest.split(/\s+/).length };
}

let fails = 0;
const msgs = new Set();
const ok = (c, m) => { if (!c) { fails++; msgs.add(m); } };

console.log("beat  side    words  sentences  avg len  longest  reading ease  grade");
console.log("-".repeat(78));

const rows = [];
[...d.querySelectorAll(".beatrow")].forEach(row => {
  ["cell-l", "cell-r"].forEach(side => {
    const cell = row.querySelector("." + side);
    if (!cell) return;
    const text = teachText(cell);
    const s = stats(text);
    rows.push({ beat: row.dataset.beat, side, ...s, text });

    console.log(
      `${String(row.dataset.beat).padEnd(5)} ${side.replace("cell-", "").padEnd(7)} ` +
      `${String(s.W).padStart(5)}  ${String(s.S).padStart(9)}  ${s.asl.toFixed(1).padStart(7)}  ` +
      `${String(s.longestLen).padStart(7)}  ${s.ease.toFixed(1).padStart(12)}  ${s.grade.toFixed(1).padStart(5)}`
    );

    // hard thresholds — these block
    ok(s.W <= 95, `beat ${row.dataset.beat} ${side}: ${s.W} words exceeds 95`);
    ok(s.longestLen <= 45,
       `beat ${row.dataset.beat} ${side}: longest sentence is ${s.longestLen} words (max 45)`);
    // a beat must not be a stub either
    ok(s.W >= 25, `beat ${row.dataset.beat} ${side}: only ${s.W} words — too thin to teach`);
  });
});

/* Whole-page summary. Reported, and failed only if the AVERAGE grade is high
   across everything, which would mean the page as a whole is not plain. */
const avgEase = rows.reduce((a, r) => a + r.ease, 0) / rows.length;
const avgGrade = rows.reduce((a, r) => a + r.grade, 0) / rows.length;
console.log("-".repeat(78));
console.log(`average reading ease ${avgEase.toFixed(1)}  |  average grade ${avgGrade.toFixed(1)}`);

ok(avgGrade <= 10.5, `average reading grade ${avgGrade.toFixed(1)} is above 10.5`);

/* The worst offenders, so a human can rewrite them. */
const worst = rows.slice().sort((a, b) => b.longestLen - a.longestLen).slice(0, 3);
console.log("\nlongest sentences (rewrite candidates):");
worst.forEach(r => console.log(`  beat ${r.beat} ${r.side} (${r.longestLen}w): ${r.longest.slice(0, 150)}`));

/* ---------------------------------------------------------------- preamble
   The beats are capped at 95 words each, and that rule was added because the
   beats had become walls. The same failure mode applies to the prose AROUND
   them: an earlier revision ran 186 words of preamble explaining an idea the
   beats were about to teach, plus a second callout restating it after them.
   The reader met the punchline three times before reaching the running example.

   So the furniture is measured too. The orientation section must be short
   enough to read in one glance, and the hinge idea must not be restated in the
   connective prose — the beats exist to teach it once. */
const startSec = d.querySelector('section[aria-labelledby="h-start"]');
if (startSec) {
  const t = startSec.cloneNode(true);
  t.querySelectorAll("script,style,.btn,.btn-row,#revealStatus,h2").forEach(n => n.remove());
  const w = t.textContent.replace(/\s+/g," ").trim().split(/\s+/).filter(x=>/[a-zA-Z]/.test(x)).length;
  console.log(`\npreamble ("What this page is for") ${w} words`);
  ok(w <= 70, `preamble is ${w} words; it must stay <= 70 so the first screen is not a wall`);
  ok(w >= 25, `preamble is only ${w} words; too thin to orient a reader`);
}

/* The hinge claim, stated once by beat 6. It must not also appear in the
   connective callouts, where it reads as repetition rather than teaching. */
const connective = [...d.querySelectorAll("section > .callout p")].map(p => p.textContent).join(" ");
ok(!/one arithmetic|two vocabularies|same arithmetic in different clothes/i.test(connective),
   "the hinge idea is taught by the beats, not restated in the connective prose");

console.log(fails === 0 ? "\nREADABILITY THRESHOLDS PASSED" : `\n${fails} READABILITY FAILURES:`);
[...msgs].forEach(m => console.log("  -", m));
if (fails) process.exitCode = 1;
