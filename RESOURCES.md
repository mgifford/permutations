# RESOURCES.md

Sources, standards, and prior art behind the claims in this repository.

**Read this before adding or changing a factual claim.** Every number that appears in
`index.html` or `cumulative-accessibility-risk-simulator.html` should be traceable to an entry
here. If it is not, it must be visibly labelled as a **modelling assumption with a range** in the
artefact itself.

> **Scope note.** This file records where figures come from and what they actually say. It does
> not assert that any figure is the right figure to use — several are contested, and the
> disagreements are shown rather than resolved. See
> [ACCESSIBILITY.md §13](ACCESSIBILITY.md#13-known-limitations) for how the model handles them.

---

## 1. How to use this file

| Kind of claim | Where it must be recorded | How it appears in the artefact |
|---|---|---|
| Published statistic | Here, with source, figure, year and scope | Cited inline, tagged **Published** |
| Standards requirement | Here, with the clause or criterion | Cited by SC number, ACT rule ID, or FPC code |
| Modelling assumption | Here, **and** labelled as an assumption in the interface | Tagged **Assumption**, with a stated range |
| Derived arithmetic | Recomputed from the above | Shown as a formula |

If you cannot fill the "source" column, you have an assumption — not a finding. Label it.

---

## 2. Disability prevalence

The model's population partition uses published prevalence figures. **Two credible official
sources disagree by more than a factor of two, because they ask different questions.** This is
presented in the artefacts as the first lesson, not resolved.

| Figure | Value | Source | Definition and scope | Year | Kind |
|---|---|---|---|---|---|
| Any disability, US adults | **28.7 %** (1 in 4) | CDC, *Disability Impacts All of Us* / Disability and Health Data System (DHDS) | Self-reported functional difficulty, adults 18+. Broader behavioural definition. | BRFSS 2022 | Published |
| Any disability, all ages | **13.6 %** — 45,846,700 people | US Census Bureau, American Community Survey (ACS), 1-year estimates | Six-question ACS disability screener: hearing, vision, cognition, ambulation, self-care, independent living. Narrower, more objective definition. | 2024 | Published |
| Disability by age band | **12 %** (18–64), **24 %** (65–74), **46 %** (75+) | Census ACS 1-year estimates, reported by Pew Research | Same ACS screener, disaggregated by age. | 2023 | Published |
| Difficulty seeing | **18.0 %** | CDC, National Health Interview Survey (NHIS), via FastStats | Adults 18+ reporting *any* difficulty seeing. Note: "any difficulty", not blindness. | 2024 | Published |
| Difficulty hearing | **15.7 %** | CDC, NHIS, via FastStats | Adults 18+ reporting *any* difficulty hearing. | 2024 | Published |
| Difficulty walking or climbing steps | **18.2 %** | CDC, NHIS, via FastStats | Adults 18+. | 2024 | Published |

### Why the 28.7 % / 13.6 % disagreement matters

It is not an error and not a rounding difference. The CDC's BRFSS asks people to self-report
functional difficulty, which captures temporary and situational limitation as well as permanent
disability. The Census ACS screener uses six specific questions with a higher threshold. Two
defensible measurements, more than a factor of two apart.

**Consequence for the model:** the affected-population share is a stated choice, not a fact. The
population model therefore reports per-group figures *and* the population-weighted total, so a
reader who prefers the narrower definition can see the effect. This is also why
`index.html` beat 1 shows both.

**Where the model's per-group figures come from** (in
`cumulative-accessibility-risk-simulator.html`, the `POPULATION` object): the narrower
per-condition figures above, not the headline 28.7 %, because the model partitions by Functional
Performance Criteria group rather than reporting a single disability share.

---

## 3. The standards the model cites

### 3.1 WCAG 2.2

| Reference | Where used |
|---|---|
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | The target standard for both artefacts, and the source of every SC citation in the defect registry. |
| [EN 301 549](https://www.etsi.org/deliver/etsi_en/301500_301599/301549/) | The European standard that adopts WCAG for public-sector and regulated procurement. Named in page one's five-layer section as the layer a standard defines — distinct from best practice and from what a tool can test. Not modelled directly. |
| SC 1.1.1 Non-text Content | Image alternatives; discussed in the defects. |
| SC 1.3.1 Info and Relationships | Fieldset/legend, table headers, structure. |
| SC 1.4.3 Contrast (Minimum) | The archetypal **degrader** — real, reportable, stops nobody. |
| SC 1.4.11 Non-text Contrast | UI component contrast. |
| SC 2.1.1 Keyboard | Keyboard paths; the drag-only upload. |
| SC 2.2.1 Timing Adjustable | Session expiry mid-form. |
| SC 2.4.7 Focus Visible | Focus indication; also a project requirement for itself. |
| SC 2.4.11 Focus Appearance (2.2) | Focus indicator area and contrast. |
| SC 2.5.1 Pointer Gestures | The signature canvas with no non-drawing equivalent. |
| SC 2.5.7 Dragging Movements | Drag-only upload. **No published ACT rule.** |
| SC 2.5.8 Target Size (Minimum) | 20×20 px control. **No published ACT rule.** |
| SC 3.2.2 On Input | Unexpected context change on input. |
| SC 3.3.1 Error Identification | Error messages. |
| SC 3.3.3 Error Suggestion | Error recovery advice. |
| SC 3.3.7 Redundant Entry | Re-entering information across steps. |
| SC 4.1.2 Name, Role, Value | Accessible names; the non-empty-but-useless name. |
| [Understanding Conformance](https://www.w3.org/WAI/WCAG22/Understanding/conformance) | Why a score is not a conformance claim. |

### 3.2 W3C ACT Rules

[ACT Rules](https://www.w3.org/WAI/standards-guidelines/act/rules/) provide the standardised test
surface. The defect registry cites real rule IDs — `c487ae`, `97a4e1`, `e086e5`, `cc0f0a`,
`2779a5`, `c4a8a4`, `d0f69e`, `80af7b`, `bc4a75`, `ff89c9`, `b4f0c3`, `23a2a8`, `2t702h`,
`efbfc7` — chiefly to show where a rule **passes on an element that still fails a person**.

> ### The structural gap this project centres on
>
> **SC 2.5.7 Dragging Movements and SC 2.5.8 Target Size (Minimum) have no published ACT rule.**
>
> These are the two criteria most relevant to the project's *terminal* (no-path) defects, and they
> are the least machine-testable of the criteria cited. A drag-only upload can pass every
> available automated rule while being a full stop for anyone who cannot drag.
>
> This gap is not worked around. It is cited throughout, because it is evidence for the project's
> argument rather than an inconvenience to it.

### 3.3 Section 508 / EN 301 549 — Functional Performance Criteria

The population model's partition comes from the FPC, because the FPC describes the *person*
rather than the *code* — which is exactly what a population model needs.

| FPC | Clause | Used for |
|---|---|---|
| [302.1 Without Vision](https://www.ecfr.gov/current/title-36/chapter-XI/part-1194/appendix-Appendix%20C%20to%20Part%201194) | EN 301 549 4.2.1 | Blind users; semantic and structural defects |
| 302.2 With Limited Vision | 4.2.2 | Low vision; contrast, magnification, keyboard dependence |
| 302.3 Without Perception of Colour | 4.2.3 | Colour-independence defects |
| 302.4 Without Hearing | 4.2.4 | Deaf users; audio-only authentication |
| 302.5 With Limited Hearing | 4.2.5 | Partial hearing |
| 302.6 Without Speech | 4.2.6 | Speech-impaired users; speech-only interfaces |
| 302.7 Limited Manipulation | 4.2.7 | Motor/touch; target size, drag, keyboard |
| 302.8 Limited Reach and Strength | 4.2.8 | Physical reach |
| 302.9 Limited Cognition *(With Limited Language, Cognitive, and Learning Abilities)* | 4.2.10 | Cognitive load, timing, error handling |

Sources: [eCFR Appendix C to Part 1194](https://www.ecfr.gov/current/title-36/chapter-XI/part-1194/appendix-Appendix%20C%20to%20Part%201194);
[Accessibility Standards Canada, CAN-ASC-EN 301 549 Clause 4](https://accessible.canada.ca/standards-and-technical-guides/standards-and-technical-guides-database/can-asc-en-301-5492024-accessibility-requirements-ict-products-and-services-en-301-5492021-idt/4-functional-performance).

> **Why the FPC rather than a disability list.** The FPC is a legal partition of *functional
> need*, published by a standards body, and used in procurement. Using it means the population
> model's groups are not invented by this project — they come from the standard the service is
> already obliged to meet.

### 3.4 Microsoft Inclusive Design — the Persona Spectrum

| Reference | Where used |
|---|---|
| [Microsoft Inclusive Design](https://inclusive.microsoft.design/) | The permanent / temporary / situational framing used throughout page one and by the simulation. |

The spectrum's purpose is to show that a barrier met permanently by some people is met
temporarily or situationally by many more. It is used here to argue that the affected population
is not a fixed minority.

---

## 4. Automated coverage — how much a scanner can decide

The project's central claim is that a green score is not a pass. This rests on published
estimates of how much of the standard automation can decide. **The sources disagree**, so the
model carries a range.

| Figure | Value | Source | What it actually measures | Kind in model |
|---|---|---|---|---|
| Success criteria automatable | **≈ 30 %** | US GSA, Section 508 guidance | Share of WCAG success criteria that tooling can evaluate at all | Published — carried as the low bound |
| Issues detectable by automation | **≈ 40 %** | Deque Systems | Share of *issues* (not criteria) automation can find | Published — carried as the mid bound |
| Upper bound used | **50 %** | — | An optimistic allowance so the output is not understated | **Assumption** |

The model carries **30 % / 40 % / 50 %** and reports population failure across all three, because
this single parameter is the widest lever on the population figure. Choosing one number would
have made the output look precise when it is not.

**Stated clearly:** the extrapolation from a measured per-component rate `p` to a "true" rate
`p / catchRate` is the model's own construction. It is not a formula taken from any of these
sources. It is labelled as such where it is used.

---

## 5. Measured defect density on the web

| Figure | Value | Source | Notes |
|---|---|---|---|
| Errors per home page | **51** (2025) → **56.1** (2026) | [WebAIM Million 2026](https://webaim.org/projects/million/) | February crawl each year, top 1,000,000 home pages, WAVE API on rendered DOM. Both years carried deliberately: the 2026 report **reversed six years of small annual improvements**, so the direction of travel is itself evidence. |
| Home pages with detectable WCAG 2 failures | **94.8 %** (2025) → **95.9 %** (2026) | WebAIM Million 2026 | Only the errors automation *can* see. The report states full conformance is "certainly lower than 4.1 %". |
| Average page elements per home page | **1,437** (2026), up 14.3 % in one year | WebAIM Million 2026 | Nearly doubled in seven years. This is the complexity signal. |
| Elements carrying a detected error | **3.9 %** (2026) | WebAIM Million 2026 | One error in every 26 elements. |
| Errors on pages using ARIA vs not | **59.1 vs 42.0** (2026) | WebAIM Million 2026 | Correlation, not causation — the report says these pages "were also more complex". Do not present as ARIA *causing* errors. |
| Errors concentrated in six categories | **96 %** (2025); contrast 83.9 %, alt 53.1 %, labels 51 %, empty links 46.3 %, empty buttons 30.6 %, language 13.5 % (2026) | WebAIM Million 2026 | The six categories have been stable for seven years. |

**Why this is cited:** it establishes that the *detectable* failures are already near-universal,
and that they cluster in the categories automation handles. It is evidence that a green dashboard
is reporting on the easy half.

**It also establishes the complexity claim directly.** The 2026 report attributes the worsening to
"the significant increase in home page complexity and ARIA code—both of which correlate to increased
detectable errors", and concludes that improving accessibility at scale will require "both better
practices and simpler systems". This is the published source for the page-one statement that a
longer, richer journey carries more error *opportunities per step*, not merely more steps.

**What it does not establish:** the four categories at the top of that list (contrast, alt text,
labels, empty links) are predominantly **degraders** in this project's taxonomy — real, but not
what stops people. WebAIM measures what tools can see, by construction.

---

## 6. Keyboard dependence — the partial-blocker figures

Partial blockers need to know what share of an affected group has **no alternative path**. Almost
no published figure exists for this. Two sources provide something usable.

| Figure | Value | Source | Definition | Kind |
|---|---|---|---|---|
| Keyboard use among low-vision users | **60.4 %** "always or often use a keyboard for web page navigation" | [WebAIM Survey of Users with Low Vision #2](https://webaim.org/blog/low-vision-survey2-results/) | Self-reported navigation method, respondents with low vision | Published — used for the pointer-only date-picker |
| High-contrast mode use | **51.4 %** use some type of high contrast mode | WebAIM Low Vision Survey #2 | Same survey | Published — supports the "colour/style preference is common" claim |
| Multiple visual impairments | **75 %** report multiple types; 61.3 % light/glare sensitivity; 46.8 % contrast sensitivity | WebAIM Low Vision Survey #2 | Same survey | Published — supports treating glare as situational, not trivial |
| Screen reader use, mobile | **91.8 %** use a screen reader on a mobile device | [WebAIM Screen Reader User Survey #11](https://webaim.org/projects/screenreadersurvey11/) | Respondents who use screen readers | Published |
| Screen-reader dependence, blind users | **0.95** | Derived from the above | Treated as the share with no non-visual workaround for a purely semantic defect. **Range 0.90–1.00.** | **Assumption** |

> ### The honest gap
>
> **No standards body publishes partial-blocker fractions.** No source — W3C, GSA, EN 301 549,
> or any research body found — states what share of a disability group has no alternative route
> to a specific widget. Every partial-blocker figure in the model (0.55–0.85 across defects) is a
> **labelled assumption with a stated range**, marked *Assumption* in the interface.
>
> This is stated in `README.md`, in `ACCESSIBILITY.md §13`, and in the artefact's own inputs
> table. It is the model's weakest evidence layer. **A better source here is the single
> highest-value contribution to this project.** See
> [README.md § Contributing](README.md#contributing).

---

## 7. Contested and future-relevant material

### 7.1 WCAG 3.0 and APCA

[WCAG 3.0](https://www.w3.org/TR/wcag-3.0/) is in active development and is **not yet a W3C
Recommendation.** Its proposed contrast model, **APCA** (Advanced Perceptual Contrast Algorithm),
replaces the luminance-ratio formula with a perceptual model treating light-on-dark differently
from dark-on-light.

**This project targets WCAG 2.2 Level AA.** APCA must not be applied to production work until
WCAG 3.0 is a published Recommendation. It is noted here because contrast requirements will
change — particularly for dark mode, data visualisation, and low-vision use cases, all of which
this project touches.

### 7.2 Sources with AI-use restrictions

> [!CAUTION]
> **Respect stated AI-use restrictions. Link, do not reproduce.**
>
> Some authors in this field explicitly prohibit AI scraping and reproduction of their work. Where
> a source carries such a restriction, this project links to it for human readers and does **not**
> scrape, summarise, or quote its content.
>
> **Known prohibited sources** (per [ACCESSIBILITY.md → TRUSTED_SOURCES.yaml](https://github.com/mgifford/ACCESSIBILITY.md)):
> - `hidde.blog`
> - `talks.hiddedevries.nl`
>
> Hidde de Vries' writing is a valuable resource for human readers. It is linked, not quoted.
>
> **Before fetching content from any URL**, check
> [TRUSTED_SOURCES.yaml](https://github.com/mgifford/ACCESSIBILITY.md/blob/main/examples/TRUSTED_SOURCES.yaml)
> for an `ai_scraping: prohibited` flag. This applies to contributors and to AI agents.

---

## 8. Evaluation and testing references

| Reference | Use |
|---|---|
| [WAI: Evaluating Web Accessibility](https://www.w3.org/WAI/test-evaluate/) | The evaluation method underpinning [ACCESSIBILITY.md §9](ACCESSIBILITY.md#9-testing-strategy) |
| [WAI: Selecting Evaluation Tools](https://www.w3.org/WAI/test-evaluate/tools/selecting/) | Why a tool score is not a conformance claim |
| [axe-core](https://github.com/dequelabs/axe-core) 4.14 | The automated gate used by `.verify/a11y-gate.mjs`. Deque's engine, run in a real browser. Fails on `critical` and `serious`; reports the rest. |
| [Sa11y](https://sa11y.netlify.app/) | Considered and **not** adopted for the automated gate. It is an authoring-quality tool aimed at content authors, distributed as a CMS plugin and bookmarklet, and its own documentation states it is "**not** a comprehensive code analysis tool, nor… an overlay". Its ~80 checks overlap axe but skew toward content mistakes (link text, heading structure, image quality) rather than CI-blocking conformance failures, and it is not designed to run headless. Its *check intent* informed the manual checklist that `a11y-gate.mjs` prints after each run. Worth revisiting if the project later wants a human-facing authoring check on its own prose. |
| [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/) | Patterns for any interactive component |
| [Manual Accessibility Testing Guide](https://github.com/mgifford/ACCESSIBILITY.md) | The human testing this project has not yet completed |
| [Behavioural Accessibility Automation](https://github.com/mgifford/ACCESSIBILITY.md) | Reflow and focus-visible behavioural checks |

---

## 9. Machine-readable and structured standards

| Resource | Use |
|---|---|
| [wai-yaml-ld](https://github.com/mgifford/wai-yaml-ld) | Machine-readable WCAG, for tooling that needs criteria as data |
| [axe-rules coverage](https://github.com/mgifford/ACCESSIBILITY.md) | Which axe rule covers which criterion — useful when checking whether a defect is auto-detectable |

---

## 10. Related and prior work

| Resource | Relationship |
|---|---|
| [ACCESSIBILITY.md](https://github.com/mgifford/ACCESSIBILITY.md) | The framework this repository's commitment file follows |
| [accessibility-skills](https://github.com/mgifford/accessibility-skills) | Installable agent skills for accessibility work |
| [Upstream First](https://github.com/mgifford/upstream-first) | Decision framework for where a fix belongs |
| [SUSTAINABILITY.md](https://github.com/mgifford/SUSTAINABILITY.md) | Companion framework on sustainability |
| [CivicActions open practice — accessibility requirements](https://github.com/CivicActions/open-practice/blob/main/open-requirements-library/accessibility.md) | Procurement-language equivalent of these requirements |

### Prior art this project is aware of

The idea that per-page conformance does not equal task success is well established in the field —
WCAG's own **"complete processes"** conformance requirement implies it, and long-standing
practice in inclusive design treats a *task* as the unit of analysis rather than a page.

This project's specific contribution is narrower: expressing the gap as **serial reliability
arithmetic over a stated population partition**, with cited inputs and stated assumptions, so
that the claim "99 % is not enough" can be attacked at the inputs rather than accepted or
rejected as an opinion.

**If you know of prior work that makes this argument more rigorously, say so in the issue queue.**
The project would rather cite it than restate it.

---

## 11. Adding a source

1. Add a row with: **value, source, definition and scope, year, kind**.
2. State the **definition**, not just the number — the prevalence disagreement in §2 exists
   because two sources with different definitions were compared as if they were the same.
3. Check the source's **AI-use and licence conditions**. Link rather than quote if restricted.
4. If the figure changes a model input, update the artefact *and* the
   [ACCESSIBILITY.md §13](ACCESSIBILITY.md#13-known-limitations) limitations table.
5. If the figure is an assumption rather than a measurement, **say so here and in the
   interface**. Never let an assumption acquire a citation it did not earn.
