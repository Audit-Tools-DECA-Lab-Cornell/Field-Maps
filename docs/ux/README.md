# Design track: pages, flows and the look of FieldMaps

The [production plan](../plan/README.md) says what has to work for Janet's pilot. This track decides which screens the product has and what each one does, then how they look. It defines no plan tasks. Its output becomes `WEB-*` and `MOB-*` tasks at the handoff stage (stage 8).

- Started: 2026-10-01, in week 2 of the 13-week plan.
- Current stage: **8, handoff, in progress.** The build tasks are WEB-20 to WEB-26 in [`web/PLAN.md`](../../web/PLAN.md) and MOB-23 to MOB-27 in [`mobile/PLAN.md`](../../mobile/PLAN.md). The page list is in [sitemap.md](sitemap.md).
- Delivered:
  - **Stage 5, visual direction:** Contour, a light system with Day (the default) and Dusk themes. [D19](../plan/decisions.md#decision-log) records it and closes Q8 (U9).
  - **Stage 6, design system v2:** the tokens in [`contracts/contour.json`](../../contracts/contour.json), and the system described in the root [`DESIGN.md`](../../DESIGN.md).
  - **Stage 7, high fidelity:** four design sets: the Contour system (12 pages), the project workspace (19 screens), organization, auth and public pages (19 screens), and the mobile collector (31 screens, phone and tablet).
- Where the designs are: the four sets were supplied as PDFs in the build session and are not committed. [`DESIGN.md`](../../DESIGN.md) is the committed reference.
- Stages 2 to 4 have no separate documents in the repo (no `flows.md` or `pages/`); the high-fidelity designs cover their pages and states.

## Why this track exists

- **There is no single list of pages.** Screens were added one task at a time. The web has eight routes, and only one of them talks to the API. The mobile app has seven screens in one flat stack. No document lists what exists, what works, and what is still missing. [sitemap.md](sitemap.md) now does.
- **Phase 1 builds screens nobody has designed.** WEB-04, WEB-06 and WEB-07 (web sign-in, onboarding, team) and MOB-05 and MOB-06 (mobile sign-in, join) are scheduled for weeks 2–4. MOB-05 says outright: "There is no design for auth screens yet."
- **The visual direction was chosen and then not built.** The September [Direction Study](../../designs/Direction%20Study.dc.html) picked "Survey Sheet": light, steel accent, condensed type, square corners. It rejected "Night Transit" because a dark screen turns into a mirror in direct sun. The apps were then built in Nocturne, which is Night Transit. D18 has since moved the maps back to a light palette, and Q8 (a light theme for the whole app) stayed open until stage 5 settled it: Contour, Day by default with a Dusk preference (D19).

## Stages

| # | Stage | What it produces | Time box | Gate |
|---|---|---|---|---|
| 0 | **Audit** | A screenshot of every existing screen, labelled real, fixture, preview or missing | ½ day | — |
| 1 | **Information architecture** | Page list for web and mobile, glossary, a matrix of which role sees which page, navigation model, URL scheme | 1–2 days | You sign off the sitemap |
| 2 | **Flows** | Journeys J1–J4 from [product.md](../plan/product.md), plus the new ones, as step diagrams that include failure paths | 1–2 days | You |
| 3 | **Page specs** | One card per page: its job in one sentence, who uses it, data, actions, every state (empty, loading, error, offline, no permission), API endpoint, owning task | 2–3 days | You |
| 4 | **Wireframes** | Greyscale layouts at phone, tablet and desktop sizes for every page in the sitemap. Layout only, no visual style | 3–4 days | You, then a walkthrough with Janet |
| 5 | **Visual direction** | Three divergent directions applied to the same four key screens; a daylight test; one chosen direction. **Protected time; never cut** | 4–5 days | You and Janet |
| 6 | **Design system v2** | Tokens (and whether there is one theme or two), type, the component inventory with states, motion, how the map palettes fit | 3 days | You |
| 7 | **High fidelity and prototype** | Key screens in the chosen direction, clickable for the main flows, in the order the build needs them | 5–7 days | You |
| 8 | **Handoff** | Edits to existing `WEB-*` and `MOB-*` tasks and new tasks with IDs, with token changes in both apps together; `pnpm plan:check` passes | 1 day | `plan:check` |

The total is **20–28 working days of design.** I can produce most of each stage's drafts. Your time goes mainly into the review at each gate.

## Order: each slice is ready before its build phase

*This schedule was written before the designs arrived. All four design sets were delivered together, so the identity screens are built directly on Contour (WEB-21, MOB-24), with no Nocturne restyle step.*

Stages 1, 2 and 5 cover the whole product at once: the sitemap has to be complete, and the direction has to be chosen before any high-fidelity work. Stages 3, 4, 6 and 7 run in three slices. Each slice is finished before the production phase that builds it starts:

| Slice | Pages | Needed by |
|---|---|---|
| **A: Identity** | Web: sign-in, sign-up, verify, forgot and reset password, invite, join, onboarding, account, team. Mobile: welcome, sign-in, create account, verify, reset, profile, join | Phase 1, weeks 2–4: WEB-04, WEB-06, WEB-07, MOB-05, MOB-06, MOB-07 |
| **B: Workspace** | Org home, overview, data review, sites, zones, packages, forms, QGIS, reports, settings | Phase 3, weeks 7–10: WEB-08 to WEB-13 |
| **C: Collector** | Projects home, site download, brief, collect, review, records, record detail, account | Phase 4, weeks 9–12: MOB-16, MOB-17, MOB-18 |

| Week | Dates | Design work | Feeds |
|---|---|---|---|
| 2 | Oct 1–2 | Stage 0; stage 1 drafted and signed off | — |
| 3 | Oct 5–7 | Stage 2 for the identity journeys; slice A specs and wireframes; **slice A structural handoff** by Oct 7 | Phase 1: WEB-04, WEB-06, WEB-07, MOB-05, MOB-06, MOB-07 |
| 3–4 | Oct 8–16 | Stage 2 for the rest; stage 5 runs and ends in a decision; stage 6 tokens | — |
| 4–5 | Oct 15–21 | Slice A restyled in the chosen direction: a token and primitive change, no new layouts | Phase 1 screens already built |
| 5–6 | Oct 19–30 | Slice B specs, wireframes and high fidelity | Phase 3 (from week 7) |
| 7 | Nov 2–6 | Slice B prototype; walkthrough with Janet; slice B handoff | Phase 3 |
| 8 | Nov 9–13 | Slice C wireframes and high fidelity; handoff | Phase 4 (from week 9) |

**Slice A is handed off in two parts, because Phase 1 cannot wait for stage 5.** By Oct 7 its pages are fixed in structure: flows, fields, every state, copy and layout. They are built on today's Nocturne primitives (`chrome.tsx` in both apps). Once the direction is chosen, those screens are restyled through tokens and the shared primitives, with no new layouts. That restyle is planned rework, kept small because identity screens use nothing but shared primitives. Slices B and C get their high-fidelity design before they are built.

**The cost.** The 13-week plan has no design time in it. If the one developer does this work alongside the build, the pilot slips by about 3–4 weeks. If I draft each stage and you only review at the gates, the work runs in parallel and the schedule above holds. **Recommendation:** run it in parallel. Even if the schedule tightens, keep stage 5 at full length, because every screen built afterwards takes on the direction chosen there.

## Stage 5: time for a design of its own

The aim is a product that someone would recognise with the logo covered.

1. **Start from field science, not a dashboard template.** Moodboard sources:
   - survey plats and engineering drawings;
   - waterproof field notebooks;
   - Ordnance Survey and USGS topographic sheets;
   - museum specimen labels;
   - transit diagrams;
   - playground signage.
2. **Draw three directions that genuinely differ.** Each one has:
   - a one-line concept;
   - one signature element that only this product would have;
   - type, and colour in both light and dark;
   - the same four screens:
     - **mobile collect** (map plus question), where observers spend nearly all their time;
     - **web site page** (zones map and coverage);
     - **web data review** (map plus table);
     - **sign-in**, the first impression in both apps.
3. **Seeds to start from.** These are examples, not decisions:
   - **Survey Sheet, pushed further.** The September pick that was never built: registration marks, coordinate ticks around every map frame, condensed type.
   - **Field Notebook.** A ruled or grid paper ground, sections tabbed like a field book, record states shown as rubber stamps, and the save confirmation as a tear-off slip.
   - **Cartouche.** The map is the page. Panels are map legends and cartouches, contour lines give texture, and the navigation reads as a legend.
   - **Nocturne, reworked as a dusk theme** rather than the only theme.
4. **Score each direction on the same criteria:**
   - legibility in daylight, tested outdoors at midday on a real phone and a real tablet;
   - density, so a 40-question form fits;
   - room for status colours that the accent does not use;
   - how distinctive it looks;
   - build cost in React Native and Tailwind;
   - WCAG contrast.
5. **Patterns ruled out from the start:**
   - a row of four KPI tiles at the top of a dashboard;
   - cards as the default container for everything;
   - copying the usual SaaS left-rail-plus-top-bar shell without thinking;
   - empty states built around a cartoon illustration;
   - colour as the only signal of a state.

## Decisions this track needs from you

Each one is set out with options and a recommendation in [sitemap.md § Decisions](sitemap.md#decisions). Some depend on Janet.

| # | Question | Blocks |
|---|---|---|
| U1 | One set of words across both apps (Project or Study, Site or Place, Form or Instrument…) | Stage 1 |
| U2 | Zone boundaries: does QGIS stay the only authority, or can managers edit zones on the web? | Site page design |
| U3 | Join codes and observers on the web | Slice A |
| U4 | "Global forms": org templates that are copied into a project, or forms shared live across projects | Forms design, schema |
| U5 | A QGIS publishing gate, and what "monitoring QGIS" can honestly show | QGIS page, GIS-01 |
| U6 | Rounds and assignments: does anyone plan them ahead? | Mobile home, overview |
| U7 | What a "report" is | Reports page |
| U8 | An offline field guide on mobile | Slice C |
| U9 | Light, dark, or both (Q8) | Answered 2026-10-03: Day + Dusk, see D19 |
| U10 | Where the design time comes from (see "The cost" above) | Schedule |

## Files

- [sitemap.md](sitemap.md): what exists today, the target pages for web and mobile, and the decisions above.
- [`DESIGN.md`](../../DESIGN.md) (repo root): Contour, the state vocabulary, motion and the copy guide; the committed reference to the design PDFs.
- [`contracts/contour.json`](../../contracts/contour.json): the Contour tokens both apps read.
