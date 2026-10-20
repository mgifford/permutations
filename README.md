# Permutations & Digital Accessibility

Evidence artefacts for a single argument:

> A service can report **99 % accessibility** and still fail a large share of the people who
> try to use it. That is arithmetic, not opinion.

A public-service journey — here, *Applying for an Emergency Heating Assistance Benefit* — is a
**serial system**. Thirty interactions happen in sequence, and the task works only if every one
of them works, for the person using it. Component reliabilities therefore **multiply**; they do
not average. A per-step pass rate of `0.99` across 30 steps gives:

```
P(whole journey succeeds) = 0.99³⁰ ≈ 0.7397   →   ≈ 26 % journey failure
```

Monitoring that checks each page separately reports 99 %. The citizen experiences the product.

## What is in here

| File | What it is |
|---|---|
| `two-ideas.html` | **Page one.** Teaches the two ideas side by side, beat by beat: permutations on the left, digital accessibility (POUR, the Persona Spectrum, prevalence data) on the right. Each row is the same idea seen twice. Optional to read — a knowledgeable reader skips straight on. |
| `cumulative-accessibility-risk-simulator.html` | **Page two.** The evidence. An interactive 30-step, 4-stage journey simulation with selectable persona, component quality, and difficulty; four distinct defect mechanics; and a deterministic, cited population-level calculation. |
| `.verify/` | Node + jsdom harnesses that assert the pages actually work. See below. |

Both HTML files are **self-contained**: no build step, no external requests, no server. Open them
directly in a browser.

## The two artefacts in more detail

### `two-ideas.html` — the conceptual page

Six beats, revealed one at a time (with a "reveal everything" control; nothing is withheld).

| Beat | Permutations | Digital accessibility |
|---|---|---|
| 1 | What a permutation is; the count multiplies | Who is affected; why CDC (28.7 %) and Census (13.6 %) disagree |
| 2 | Independence: `P(A and B) = P(A) × P(B)` | **POUR** — four principles that must all hold — the same "and" |
| 3 | `0.99³⁰ ≈ 0.7397` | A journey is a serial system |
| 4 | Permutations of *kind*: 4 axes × 3 levels | Disability is not fixed: 12 % / 24 % / 46 % by age |
| 5 | Chain of 30 at three quality levels | Automation decides ~30–40 % of the standard |
| 6 | The same arithmetic, applied to people | Total / partial blockers and degraders |

### `cumulative-accessibility-risk-simulator.html` — the evidence

Two things live in this file, answering different questions:

- **The simulation** — the game. Persona, component quality, and recovery difficulty are
  selectable and random by default. Defects resolve through four mechanics:
  **terminal** (a wall), **spoon** (drain on a finite energy pool — Spoon Theory),
  **effort** (recoverable at a cost in time and confidence), and **friction** (a real
  violation that stops nobody). Barriers outside WCAG 2.2 entirely — a phone-only channel, a
  mandatory account, English-only content — are first-class and tagged `SYSTEMIC`.
- **The population model** — the defensible calculation. **No random draw.** Every figure is
  either a published statistic with a citation or an explicitly labelled assumption with a range,
  so re-running gives the same answer and a reviewer can attack the inputs rather than a dice roll.

## Running the verification harnesses

Requires Node (tested on current LTS) and jsdom.

```bash
cd .verify
npm install
node --expose-gc --max-old-space-size=3000 verify.mjs   # 250 simulated runs + population model
node calib.mjs                                          # quality / difficulty / pinning controls
node two.mjs                                            # page-one reveal mechanics and content
node popmodel.mjs                                       # population-model numbers at each quality level
```

`verify.mjs` drives the page's `boot()` explicitly, because jsdom's `runScripts: "outside-only"`
mode never fires `DOMContentLoaded`.

## The honest limits

These are stated in the artefacts themselves, not buried here:

- **No standards body publishes partial-blocker fractions** — the share of a disability group with
  no alternative path to a given widget. Every such figure is a labelled assumption with a stated
  range. Total blockers need no such assumption: the absence of a path is observable.
- The **automated-catch-rate range (≈30–50 %)** is carried as a range because it is the widest
  single lever on the output.
- The population model uses published prevalence figures (CDC DHDS/BRFSS, Census ACS) and the
  Section 508 / EN 301 549 **Functional Performance Criteria** as its population partition.

## Sources

- CDC, *Disability Impacts All of Us* / DHDS (BRFSS 2022) — 28.7 % of US adults.
- US Census Bureau, American Community Survey 2024 — 13.6 % of all ages (45,846,700 people).
- Census ACS / Pew Research 2023 — 12 % (18–64), 24 % (65–74), 46 % (75+).
- Microsoft Inclusive Design, Persona Spectrum.
- W3C, WCAG 2.2 and the W3C ACT Rules.
- Section 508 Appendix C / EN 301 549 Clause 4 — Functional Performance Criteria.
- GSA (≈30 % of success criteria automatable); Deque (≈40 % of issues).
- WebAIM Million 2025 — 51 detectable errors per home page; 94.8 % of pages with WCAG 2 failures.

## Licence

AGPL-3.0. See [LICENSE](LICENSE).
