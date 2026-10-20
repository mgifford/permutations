# Permutations & Digital Accessibility

> A service can report **99 % accessibility** and still fail a quarter of the people who try to
> use it. This repository exists to show that this is arithmetic, not opinion — and to teach the
> arithmetic to people who were never shown it.

**Live site: <https://mgifford.github.io/permutations/>**

---

## The vision of this project

Most accessibility communication fails for one of two reasons.

**It assumes the audience already thinks in systems.** We say "a journey is a serial system, so
component reliabilities multiply" to people who have never been taught that independent
probabilities combine by multiplication. The sentence is true and it lands on nothing.

**It assumes the audience already accepts the premise.** We say "99 % is not good enough" to
people whose entire mental model of accessibility is a Lighthouse score, a green badge, and a
press release. Without the arithmetic behind the claim, it reads as an opinion — and opinions
about accessibility are cheap.

This project addresses both, in that order.

### The argument, in five steps

1. **A permutation is what you get when independent things combine.** The count multiplies.
   Two coins give four outcomes; ten coins give 1,024. This is a teachable idea in isolation,
   with no accessibility content at all.

2. **Independence means probabilities multiply, not average.** If each of two independent things
   succeeds with probability `p`, both succeeding together is `p²`. This is also teachable in
   isolation.

3. **A public-service task is a serial system.** *Applying for an Emergency Heating Assistance
   Benefit* is 30 interactions across 4 sequential stages. You cannot skip a step and still be
   approved. The journey works only if every step works — for the person using it.

4. **Therefore the vendor's number and the citizen's experience are different numbers.**
   Monitoring that checks each step reports **99 %**. The citizen experiences `0.99³⁰ ≈ 0.7397` —
   **73.97 % completion, 26.03 % failure** — before any disability-specific effect is considered.

5. **Disability turns out to be the normal case, not the edge case.** Roughly 1 in 4 US adults
   reports a disability (CDC, 28.7 %). Census measures more narrowly and finds 13.6 % of all
   ages. Prevalence rises with age: 12 % of adults 18–64, 24 % of those 65–74, **46 % of those 75
   and older**. The population that meets these barriers is not a fixed minority; it is a growing
   share of everyone, and every person passes through it — temporarily, situationally or
   permanently.

### What we are trying to change

The project's target is not a bad vendor. It is a **measurement failure**.

Component-level monitoring answers *"is this page broken?"* It is a good question and it is not
the question that matters. The question that matters is *"can this person finish the task?"* —
and that question cannot be answered by a per-page score, because the task has an exponent in it.

The punchline is uncomfortable and it is why the artefacts are built the way they are:

> Improving component quality from 99 % to 99.9 % — a **tenfold reduction in defect rate** —
> moves population-level journey completion by roughly 19 points, and leaves the blind,
> low-vision and mobility groups in the model at or near **zero completion**.

Quality improvement cannot reach the people the walls exclude. A drag-only upload with no
keyboard path is not a lower score. It is a full stop for a specific group of people, and no
amount of contrast fixing addresses it.

---

## What is in this repository

| File | What it is |
|---|---|
| **[index.html](index.html)** | **The front door — page one.** Teaches the two ideas side by side, beat by beat: permutations on the left, digital accessibility on the right. Each row is the same idea seen twice. Optional to read in full; a knowledgeable reader skips on. |
| **[cumulative-accessibility-risk-simulator.html](cumulative-accessibility-risk-simulator.html)** | **Page two — the evidence.** An interactive 30-step, 4-stage journey simulation with selectable persona, component quality and difficulty, four distinct defect mechanics, first-class non-WCAG systemic barriers, and a deterministic cited population-level calculation. |
| [README.md](README.md) | This file — the vision and the argument. |
| [AGENTS.md](AGENTS.md) | Instructions for AI coding agents working in this repository. |
| [ACCESSIBILITY.md](ACCESSIBILITY.md) | The project's accessibility commitment: scope, conformance status, testing strategy, known limitations. |
| [RESOURCES.md](RESOURCES.md) | Sources, standards references, and prior art behind the claims. |
| [.verify/](.verify/) | Node + jsdom harnesses asserting the pages and the maths actually work. |

Both HTML files are **self-contained**: no build step, no external requests, no server, no
framework. Open them directly from disk, or from the published site. Nothing about them depends
on GitHub Pages being available.

---

## Reading the two pages

### Page one — `index.html` (the conceptual page)

Six beats, revealed one at a time, with a "reveal everything" control. **Nothing is withheld** —
the content follows in order whether or not you press anything.

The beats can also present as a **full-screen slide deck**, one beat per screen, with a click
prompt and three ways out (Next/Back, "Skip to the full page", "Skip the intro"). The deck is
progressive enhancement: the beats exist once in the markup and are moved into it and back, so the
deck and the page cannot drift apart. With JavaScript unavailable the deck never opens and the page
renders every beat in order.

**One idea per column, per beat.** Each beat is deliberately small — 33 to 89 words — and written
for a reader with no maths background. Depth lives in the running example and the simulation,
both of which are optional; a reader who stops after the beats still has the whole argument.
This is enforced by harnesses, not by intention (see `.verify/readability.mjs`).

**Figures restate, they never introduce.** Beat 1 carries a coin-outcome diagram showing four
outcomes branching, and five disability pictograms. Both are inline SVG — no external file, no
font, no CDN. Neither carries information the surrounding prose does not already state, which
matters because **SVG text does not scale with the reader's browser font-size setting**.

Below the beats, a separate section answers the question the headline number invites:
**"99 % accessible" — 99 % of what?** It separates five things that get called "accessible" and are
not the same:

1. what is actually accessible (the only outcome-shaped layer, and nobody puts a percentage on it);
2. agreed best practice (helpful, not required);
3. what a standard requires — WCAG 2.2 AA, EN 301 549;
4. what automated testing can find at all (GSA: ≈ 30 % of success criteria);
5. what axe actually returns today (it suppresses rules that would produce false positives).

Layers 3–5 are countable, which is why they end up in dashboards; layer 1 is not, so it usually
goes unmeasured. The bar widths are labelled in the page as an illustration of relative breadth,
**not a measurement** — no tool or standards body publishes a tested fraction per layer.

| Beat | Permutations — the mathematics | Digital accessibility — the domain |
|---|---|---|
| 1 | Each new choice multiplies the possibilities | Accessibility is about people; 1 in 4 US adults, 45.8 million |
| 2 | **Independence:** `½ × ½ = ¼` | **POUR** — four principles that must all hold — the same "and" |
| 3 | `0.99³⁰ = 0.7397`, so 26 % of journeys fail | A benefit form is a chain; you cannot skip a step |
| 4 | The rule scales; 99.9 % lifts the journey to 97 % | Disability is permanent, temporary, or situational |
| 5 | Not every failure is a wall: three kinds of harm | Tools check only 30–40 % of the job |
| 6 | Both columns are the same arithmetic | A 99 % score can fail a quarter of your users |

Beat 2 is load-bearing. "Two independent things must both happen" and "POUR's four principles must
all hold" are the same logical shape, and a reader who accepts it has the whole method. Beat 6 then
names the identity outright — the two columns were the same arithmetic all along — at which point
"99 % isn't good enough" stops being an opinion and becomes a consequence.

After the beats, **the running example** lets a reader click through an eight-step journey at 1 %
per step and watch the risk accumulate. It states plainly that the 1 % and the eight steps are
illustrative, that no real service was audited, and that 1 % is the *optimistic* case: the
WebAIM Million 2026 crawl found 56.1 detectable errors on the average home page, and the report
attributes the year-on-year worsening to rising page complexity.

### Page two — `cumulative-accessibility-risk-simulator.html` (the evidence)

Two distinct models live in this file, and they answer different questions.

**The simulation — the game.** Persona, component quality and recovery difficulty are selectable,
random by default, with manual override available per capability axis. Defects resolve through
four different mechanics, because they do not stop people in the same way:

| Mechanic | What it does | Example |
|---|---|---|
| **Terminal** | Pass or fail. The journey ends. | Drag-only upload with no single-pointer or keyboard alternative |
| **Spoon** | Drains a finite capacity pool. Enough of them and the person gives up — an ending no conformance report records. | An unannounced radio-group question that must be re-derived several times |
| **Effort** | Recoverable, at a price in time, attempts and confidence. | A retryable validation failure with a poor error message |
| **Friction** | A genuine violation that stops nobody. | Low contrast — the most common failure on the web, and the most survivable |

Barriers that sit **entirely outside WCAG 2.2** are first-class citizens in the model, tagged
`SYSTEMIC`: a phone-only service channel, a mandatory online account, English-only content, a
service that presumes a smartphone, no authorised-proxy path, a utility bill that must be in the
applicant's name, a deadline with no extension. No success criterion is violated and the person
is still stopped. This is the direct answer to *"not all WCAG errors block people, and not all
things that block people are WCAG errors."*

**The population model — the defensible calculation.** This half contains **no random draw at
all.** Every figure is either a published statistic with a citation or an explicitly labelled
assumption with a stated range. Re-running it produces the same answer, so a reviewer can attack
the inputs rather than argue with a dice roll.

Three severities, each resolving differently in the arithmetic:

- **Total blocker** — no path exists. Removes 100 % of the affected Functional Performance
  Criteria group. Needs no assumption: the absence of a path is observable.
- **Partial blocker** — a path exists for part of the group. Removes the share with no
  alternative route, taken from survey data where one exists.
- **Degrader** — blocks nobody outright. Raises error and abandonment rate, which compounds
  through the remaining steps.

---

## Headline results

Unaffected-user serial reliability (the vendor's figure) versus population completion, computed
over the Section 508 / EN 301 549 Functional Performance Criteria partition:

| Component quality | Unaided users (vendor figure) | Population, 30–50 % automated catch |
|---|---|---|
| 99.9 % per component | 2.96 % journey failure | **26.9 – 27.0 % failure** |
| **99 % per component (the brief's baseline)** | **26.03 % journey failure** | **45.2 – 46.0 % failure** |
| 97 % per component | 59.90 % journey failure | 70.9 – 71.3 % failure |
| 95 % per component | 78.54 % journey failure | 84.6 – 84.7 % failure |

Per-group completion at baseline, showing what quality improvement cannot reach:

| FPC group | US adult prevalence | Group completion |
|---|---|---|
| Blind / no vision (302.1) | 5.5 % | 13.5 % |
| Limited vision (302.2) | 18.0 % | 13.5 % |
| Deaf / no hearing (302.4) | 6.2 % | 15.0 % |
| Limited manipulation (302.7) | 12.2 % | **none — unrecoverable wall** |
| Limited cognition (302.9) | 13.9 % | 30.0 % |

---

## Running the verification harnesses

`README` claims are cheap. These harnesses run the pages headlessly and assert the numbers.

```bash
cd .verify
npm install
npm run all          # every harness, in order
```

Individually:

```bash
node --expose-gc --max-old-space-size=3000 verify.mjs   # 250 simulated runs + population model
node calib.mjs                                          # quality / difficulty / pinning controls
node page-one.mjs                                       # page-one reveal mechanics and content
node popmodel.mjs                                       # population numbers at each quality level
node layout-check.mjs                                   # real browser: page-one layout geometry
node run-example-check.mjs                              # real browser: the running example
node deck-check.mjs                                     # real browser: the full-screen slide deck
node a11y-gate.mjs                                      # real browser: axe-core gate
```

`verify.mjs` drives the page's `boot()` explicitly, because jsdom's `runScripts: "outside-only"`
mode never fires `DOMContentLoaded`.

The last four need a Chrome or Chromium binary and drive it through the DevTools protocol; they
skip with a clear message if none is found. They exist because jsdom has no layout engine, and a
previous reveal bug was green in jsdom while being broken in every real browser. `deck-check.mjs`
also covers something axe cannot: it presses Tab twenty times while the deck is open and requires
that focus never reaches the page hidden behind the overlay. That failed when the deck was first
built — axe reported zero violations with the defect live.

---

## The honest limits

These are stated in the artefacts themselves, not buried here. If you intend to attack the
conclusion, this is where to aim — the model wants you to.

- **No standards body publishes partial-blocker fractions** — the share of a disability group with
  no alternative path to a given widget. Every such figure is a labelled assumption with a stated
  range, marked *Assumption* in the interface. Total blockers need no such assumption: the absence
  of a path is observable.
- **The automated-catch-rate range (≈30–50 %)** is carried as a range because it is the widest
  single lever on the output. GSA puts it near 30 % of success criteria; Deque near 40 % of issues.
- **Two credible official sources disagree by more than a factor of two** on disability prevalence
  (28.7 % vs 13.6 %) because they ask different questions. The model states its source and
  definition for every figure rather than picking the convenient one.
- **The population model is a model, not a measurement.** It has not been validated against real
  task-completion data for this or any service. That validation is the obvious next step and it
  has not been done. See [ACCESSIBILITY.md §13](ACCESSIBILITY.md#13-known-limitations).
- **The journey is a worked example, not an audit.** The 30 interactions and their defects are
  constructed to be realistic and citable; they are not the result of testing a specific live
  service.
- **SC 2.5.7 Dragging Movements and SC 2.5.8 Target Size (Minimum) have no published ACT rule.**
  This is a real structural gap in the standardised test surface, cited throughout rather than
  worked around.

---

## Contributing

This is currently a solo-maintained public artefact under AGPL-3.0. Contributions, corrections
and — especially — **attacks on the model's inputs** are welcome through the issue queue. If you
have a better source for a partial-blocker fraction, or task-completion data that would let the
model be calibrated, that is the highest-value contribution available.

Before contributing, read [ACCESSIBILITY.md](ACCESSIBILITY.md) and [AGENTS.md](AGENTS.md).

---

## Roadmap and deliberate deferrals

Ideas that are wanted but **not yet built**, recorded so the reasoning is reviewable rather than
remembered. A deferral here is a decision, not an oversight.

### Planned: Top Tasks presets and a "bureaucracy" toggle

Gerry McGovern's *Top Tasks* framework makes an argument this project's arithmetic can already
demonstrate: that auditing thousands of low-impact pages while neglecting the primary journey is a
mathematical error, not merely a prioritisation mistake. Adding non-essential interactions to a
journey — redundant disclaimers, pre-survey prompts, duplicate address verification — increases the
exponent in `P = 1 − (1 − p)ⁿ` and therefore the failure rate, without adding a single new defect.

Two things are wanted:

- **Presets** across real service archetypes of differing size (micro, low, medium, high
  complexity), to show that the same per-step rate produces very different journey outcomes
  depending on how many steps the service has.
- **A clutter toggle** that injects non-essential steps and moves the failure curve live.

**Decision: the high-complexity preset uses the existing 30-step model, not 40.** A 40-interaction
preset was proposed, but the project's headline result — 26.03 % failure at 99 % per step — *is*
`0.99³⁰`. A 40-step version of the same journey would read **33.10 %**, so publishing both would put
two contradicting failure figures on the same page. `AGENTS.md` §3.3 states that the step count is a
published figure rather than a dial. This is expected to be revisited once the presets exist and can
be judged as built; if the counts do change, every harness assertion built on the 30-step model
changes with them, openly and in one commit.

Two citations proposed alongside this work — "Digital Journey Coach" and "Daily DAP" — are **not
yet sourced**. They cannot appear in an artefact until they have a real, citable reference, per
`RESOURCES.md`.

### Deferred: in-browser SLM journey inference

A proposal to distil a page's DOM in the browser and use a small language model (WebLLM, or the
native Prompt API) to infer the primary task and a predicted interaction chain, then feed that step
count into the compounding model.

**Deferred, deliberately.** Three reasons, in order of weight:

1. **It would be self-refuting.** The model would produce an inferred step count and present it
   with the same visual authority as the cited inputs beside it. This project's entire argument is
   that unvalidated inference must not be dressed as measurement. A 1B-parameter model guessing a
   citizen's primary task from a DOM dump has no validation story, and inventing one would violate
   `AGENTS.md` §2.1.
2. **It breaks a load-bearing constraint.** WebLLM downloads model weights on first use, which
   contradicts §2.5 — no external requests, no CDN, each file opens correctly from the local
   filesystem. That property is why a reviewer can open one file and see the whole argument.
3. **The value is unproven.** The presets above deliver the same teaching — that step count drives
   failure — with cited inputs and no dependency.

Revisit only with a validation plan that says what the inference is and is not, and how a reader
would know which is which.

### Deferred: automated journey testing in CI

A Playwright runner stepping through a real multi-page service flow, firing `axe-core` on each
state transition, exporting completion curves, and publishing reports on a daily schedule.

This is sound but is **infrastructure rather than an educational artefact**, and it needs a real
target service, storage and a schedule. The `axe`-to-FPC mapping portion is the valuable half and
does not need the runner; it can be built against the existing defect registry.

---

## Licence

AGPL-3.0. See [LICENSE](LICENSE).
