# Sitemap: every page, what it does, and what works today

Part of the [design track](README.md), stages 0 and 1. Draft of 2026-10-01, written from the code, the READMEs and the plan files. The stage 0 screenshots are still to come. On 2026-10-03 the target paths in §3 and §4 were renamed to the Contour designs and D21; the status marks were not changed.

**Status legend**

| Mark | Meaning |
|---|---|
| ✅ | **Real.** Works against the real API or database |
| 🟡 | **Built, not real.** The screen exists, but it reads fixtures or bundled data, or it saves nothing |
| 🔴 | **Planned.** In the production plan under the task ID shown, not built yet |
| 🆕 | **New.** You asked for it, but the plan does not have it yet. It needs the decision named (U-number) |

## 1. What exists today

### Web: 10 routes, 1 partly connected to the API

| Route | What it shows | State |
|---|---|---|
| `/` | Landing page | 🟡 Static |
| `/overview` | Counts, coverage by zone and round, what is blocking | 🟡 Fixtures |
| `/observations` | Map, table and record detail over one filter set kept in the URL; export | 🟡 Fixtures. The export is generated in the browser from the fixtures |
| `/places` | Sites with zones, rounds, observers and a zone plan | 🟡 Fixtures. No site creation, no zone editor |
| `/instrument` | **Form Studio**: Janet's form with a phone preview and local draft edits; the variable library | 🟡 Reads the real form file in `contracts/forms/`. Drafts stay in the browser, and there is no publish |
| `/basemaps` | Upload QGIS layers as a site package and see the server's checks | ✅ / 🟡 The only screen that calls the API. It needs a pasted manager token and a project ID from an environment variable. Not yet tried against staging (WEB-01) |
| `/qgis` | Connection settings for QGIS | 🟡 Fixture values |
| `/onboarding` | A five-step set-up walkthrough | 🟡 Clickable preview; saves nothing (WEB-18) |
| `/privacy`, `/privacy/delete-data` | Policy pages for the store listings | ✅ Static. The text is out of date: it says administrators create accounts (WEB-14) |

**Not built at all:**
- sign-in, sign-up or any other auth;
- 404 and error pages;
- the organization and project in the URL;
- team, settings and account pages.

### Mobile: 7 screens in one flat stack

| Screen | What it does | State |
|---|---|---|
| Assignments (`index`) | Lists studies (site packages); resumes an unfinished draft | 🟡 Five studies: three packages bundled on the device (Fall Creek, Riverside and the practice garden), plus two rows with no package behind them (one "not downloaded", one archived) |
| Brief | Choose the zone and the round | 🟡 Bundled sites |
| Field | Map; place a point; one question per screen | 🟡 The form engine and saving to the phone are real. The maps are bundled; Fall Creek's is real QGIS data |
| Review | Check the answers; blocks the save while required answers are missing | 🟡 Real logic |
| Saved | What carries into the next observation | 🟡 Real logic |
| Records | Queue states: held, on device, synced, needs attention | ✅ For the practice form (`shell-v1`). Records on Janet's form stay held on the device |
| Account | Sign in | ✅ Sign-in only |

**The current mobile redesign has never run on a device or a simulator.** It is verified by types, tests and bundling only (`mobile/README.md`).

**Not built at all:**
- sign-up, code verification and password reset;
- joining a project, and the profile screen;
- the project list from the server;
- package download;
- record detail;
- the sign-out warning and account deletion.

## 2. What the pages are about

```
Account
└─ Organization ── members (owner · admin · member), invitations
   └─ Project ──── members (manager · observer · viewer), invitations and join codes, QGIS access grants
      ├─ Site ──── map packages (immutable versions, uploaded from QGIS)
      │  └─ Zone   (polygons from the current package; DB-12)
      ├─ Form ──── versions (draft → published → retired; DB-09)
      └─ Observation: a point, plus site, zone, round, form version, observer code and answers
```

Every project page acts on something in this tree. A page that does not belongs at the account level.

**Who sees what on the web** (proposed):

| Page | Org owner / admin | Manager | Viewer | Observer |
|---|---|---|---|---|
| Org projects | all | own projects | own projects | → "Get the app" (U3) |
| Org members, form library, org settings | ✓ | — | — | — |
| Overview, data, reports | ✓ | ✓ | read only | — |
| Sites, zones, packages | ✓ | edit | read only | — |
| Forms | ✓ | edit, publish | read only | — |
| Team | ✓ | ✓ | — | — |
| QGIS | ✓ | ✓ | exports only | — |
| Project settings | ✓ | ✓ | — | — |

An org admin acts as a manager on every project in the org (`docs/plan/product.md`).

## 3. Target web sitemap

The URL scheme follows `web/PLAN.md` ("Target route tree"). Slugs follow the designed tab labels (D21). New items carry their U-number. WEB-20 to WEB-26 build every page below in Contour, on fixtures; the marks show today's state.

```
PUBLIC
  /                                  Landing                                          🟡
  /privacy · /privacy/delete-data    Policy; deletion without the app                 ✅  wording: WEB-14
  404 · error                        Not found · something went wrong                 🔴  WEB-06
                                     (inside /o/[org]: the org header, no tabs)

AUTH
  /sign-in                           Email + password; a distinct message per error   🔴  WEB-04
  /sign-up                           Email + password                                 🔴  WEB-04
  /verify                            The 6-digit code, resend after a cooldown        🔴  WEB-04
  /forgot-password → /reset-password Email → code → new password                      🔴  WEB-04
  /invite#t=…                        "Join {project} ({org}) as {role}?"              🔴  WEB-06
  /join                              Type an 8-character join code                    🆕  U3

FIRST RUN
  /onboarding/[step]                 Create the org → first project → (site, form, team)   🟡 preview → 🔴 WEB-06
  /o/[org]/collect                   Observer handoff: "You collect in the app", store links, QR code   🆕  U3

ORGANIZATION    /o/[org]             Tabs: Projects · Members · Form library · Settings
  /o/[org]                           Projects: one row per project: health, last activity, sites   🔴  WEB-06
  /o/[org]/members                   Members: org roles, invitations, transfer ownership   🔴  WEB-07
  /o/[org]/library                   Form library: org-wide templates and variable library   🆕  U4
  /o/[org]/settings                  Settings: name, slug; deleting the org           🔴  WEB-06 · deletion 🆕

PROJECT         /o/[org]/p/[project] Tabs: Overview · Data · Sites · Forms · Team · QGIS · Reports · Settings
  (project root)                     Overview: what came back, coverage, what is blocking   🟡 fixtures → WEB-11
  data                               Data: map + table + detail; filters; export      🟡 fixtures → WEB-10, WEB-12
  data/[observation]                 Observation: all answers, context, location, history   🟡 a panel today
  sites                              Sites: list; create a site                       🟡 fixtures → WEB-08
  sites/[site]                       Site: zones on a map, coverage, packages, its data   🔴  WEB-08
  sites/[site]/zones/[zone]          Zone: data and coverage inside one zone          🆕  partly a WEB-10 filter
  sites/[site]/zones/edit            Edit zone boundaries: draw or adjust them        🆕  U2
  sites/[site]/packages?step=        Map packages: versions, checks, upload from QGIS   🟡 /basemaps → WEB-08
  forms                              Forms: the project's forms                       🟡 Form Studio → WEB-09
  forms/versions                     Form versions: history, start a draft, retire    🔴  WEB-09
  forms/versions/[version]           Draft editor + phone preview; read-only once published   🟡 Form Studio → WEB-09
  forms/versions/[version]/publish   Review publication: the differences, then publish   🔴  WEB-09
  team                               Team: members, roles, invitations, join code + QR   🔴  WEB-07
  qgis                               QGIS: in: packages by site. Out: publishing, access, exports   🟡 fixtures → WEB-12 · gate 🆕 U5
  reports                            Reports: see U7                                  🆕  U7
  reports/views                      Saved views: named filter sets from Data         🆕  U7
  reports/[report]                   Report: a printable site summary (A4)            🆕  U7
  settings                           Settings: name, code, timezone, QGIS publishing mode, archive   🔴 route planned, no task
  settings/rounds                    Rounds: plan rounds, assign observers (if anyone does)   🆕  U6

ACCOUNT         /account
  /account                           Profile, password, sign out, delete account      🔴  WEB-06
```

**Old paths.** `/overview`, `/observations`, `/places`, `/basemaps`, `/instrument` and `/qgis` redirect to the routes above (307, query string kept; WEB-22).

**Development only.** `/dev/contour` shows every Contour primitive in Day and Dusk. It is `noindex` and exists only in dev and preview builds.

**Navigation.**
- Inside a project, the tabs are Overview · Data · Sites · Forms · Team · QGIS · Reports · Settings. Inside an organization they are Projects · Members · Form library · Settings.
- The header holds the org and project switchers, "Search or jump to" (⌘K) and the account menu.
- Viewers do not see Team or Settings.
- The org-level 404 and error pages, and the observer handoff, show the org header without tabs.

**Settings at three levels.** Your "Settings page" becomes three pages, each beside what it configures:
- `/account` for you;
- org settings;
- project settings.

The account menu always links to `/account`. It adds the org settings link only for org owners and admins, and the project settings link only for the project's managers (and org owners and admins, who act as managers). Viewers and observers see only their account.

**Where the QGIS upload goes.** A package belongs to one site, so the upload lives under the site, at `sites/[site]/packages` (WEB-08). The QGIS page lists every site's package state, links to each upload, and covers the outbound direction too. Everything QGIS-related is then reachable from one place, while the upload itself stays on the site.

## 4. Target mobile sitemap

The routes follow the expo-router tree in `mobile/PLAN.md` ("Target structure"). MOB-23 to MOB-27 build every screen below in Contour; the marks show today's state.

```
(auth)
  welcome                     Create account · Sign in · "N records waiting for a@b.c"   🔴  MOB-05
  sign-in                                                                         🟡 inside Account → MOB-05
  create-account                                                                  🔴  MOB-05
  verify                      Verify code: 6 digits, autofill, resend             🔴  MOB-05
  forgot-password → reset-password                                                🔴  MOB-05

(onboarding)
  profile                     Step 1 of 2: name + initials (the initials become the observer code)   🔴  MOB-06
  join                        Step 2 of 2: 8-character code, Scan QR, or the deep link   🔴  MOB-06
  invitation/[code]           Confirm "Join {project}?"; deep link fieldmaps://join/CODE   🔴  MOB-06

(app)/(tabs)   Projects · Observations · Account, in the floating tab dock. Tablets use the same dock, centred; no side rail.
  (projects)/index            Projects (home): every project, Training included; resume an unfinished observation   🟡 bundled → MOB-14, MOB-16
  (projects)/[project]        Project: its sites with download state              🟡 part of the home list → MOB-14, MOB-16
  (projects)/[project]/[site] Site: not downloaded, downloading or ready; offline checklist; start   🟡 part of Brief → MOB-14
  …/[site]/brief              Before you begin: zone + round context, observer code   🟡
  observations/index          Observations: states; a badge for records that need attention   ✅ legacy → MOB-10
  observations/[id]           Record: answers, state, rejection reason, "Send again"   🔴  MOB-10, MOB-16
  account/index               Account: profile, sync status, Upload now           🟡 sign-in only → MOB-07
  account/preferences         Preferences: hand, map palette (Day · Night), Screen: Day · Dusk, haptics, larger question text   🆕  small
  account/field-guide         Field guide: what each question and option means, offline   🆕  U8
  account/sign-out            Sign out?: records not uploaded yet stay on this device   🔴  MOB-07
  account/delete-account      Delete account                                      🔴  MOB-07

(app), outside the tabs: the dock hides
  collect                     One route: place → answer → review panel → saved card   🟡 → MOB-16
                              (tablet: map and panel side by side, the panel on the preferred hand's side)
  explain/[question]          "Explain this question" sheet                       🟡 an inline hint today
+not-found                    Not found; "Nothing was lost"                       🔴  MOB-03

Development only: (dev)/gallery (every primitive in Day and Dusk) and (dev)/states.

Across every screen: an offline indicator, "Sign in to resume uploads" (MOB-08), the resume-draft prompt, and the loading, empty, error and offline states (MOB-17).
```

Managers use the web, on a laptop or an iPad. Org and project creation happens on the web only (D1), so the mobile app has no set-up screens.

## Decisions

Recommendations are mine. Some of these need Janet.

### U1: One set of words

The same thing has different names on web, mobile and in the database:

| Concept | Web today | Mobile today | Database | Proposed |
|---|---|---|---|---|
| A study | Project | Study, Assignment | `projects` | **Project** |
| A place | Places | Site, Package | `sites` | **Site** (WEB-06 already renames `/places` to `sites`) |
| An area inside it | Zone | Zone | `zones` (DB-12) | **Zone** |
| The questionnaire | Instrument | Form | `form_versions` | **Form**, with **versions** |
| The offline map bundle | Base map | Package | `site_packages` | **Map package** |
| A collected record | Observation | Record | `observations` | **Observation** everywhere, including the mobile tab |

### U2: Zone boundaries: who is the authority?

**Today**
- Zones come from the `zones` layer of the QGIS upload, and the server reduces them to bounding boxes. DB-12 will keep the real polygons, one set per package version.
- `web/README.md` rules out a zone editor on purpose: "a second authority beside QGIS would drift from it."

**Options**
- **A. QGIS stays the only authority.** The web shows zones and lets you name them, describe them and set targets.
- **B. Edit on the web.** Each save creates a new package version, the same as an upload, so nothing is overwritten. The zones download back to QGIS as GeoJSON.
- **C. The web becomes the authority**, and QGIS reads zones from the database.

**Recommendation:** design B now, so the site page has room for it, and build A for the pilot. Build B after the pilot, unless Janet needs to redraw zones in the field before then.

### U3: Join codes and observers on the web

**Today:** observers redeem codes on the phone; the web handles invitation links only. The API's preview and redeem calls already accept a code.

**Recommendation**
- Add `/join` to the web. It reuses the `/invite` confirm screen, so it costs little.
- An observer who signs in on the web gets one page: "You collect in the app", with store links and a QR code, plus a read-only list of their own observations.

### U4: Global forms

**Today:** forms belong to one project (DB-09), and a published version never changes.

**Options**
- **A. Org templates.** "Use in project" copies a template into the project as a new draft. Each project's forms then stay independent.
- **B. Shared forms**, one form used live by many projects. This breaks:
  - the per-project GIS views (GIS-01);
  - project-scoped access rules;
  - "retire" as a safe action, since retiring a shared form would stop collection in every project at once.

**Recommendation:** A, plus an org-wide variable library (reusable questions), which the instrument page already sketches. Both need a new table. They come after the pilot, unless the pilot runs more than one project.

### U5: QGIS publishing gate, and "monitoring QGIS"

**Today and in the plan**
- QGIS reads live typed views of **every accepted observation** in a project that has a reader grant (GIS-01).
- QGIS pulls data whenever a layer refreshes, so there is nothing being synced that could be monitored.
- The September study chose "no send-to-QGIS action" on purpose.

**Options**
- **A. Keep it automatic.** The QGIS page shows what QGIS can see: counts by form version, the latest record, and who has access.
- **B. A review gate.**
  - Each observation gets a review state: new, approved or excluded.
  - A project setting decides what QGIS sees: "every accepted observation" or "approved only".
  - The QGIS page becomes a publishing queue: approve by site, round or date; exclude flagged records; keep a log of what was published.
- **C. Releases.** A manager publishes a frozen dataset version that QGIS reads, while live data stays private.

**Recommendation:** B, defaulting to "every accepted observation" so the pilot never waits on approvals.
- **Cost:** review columns on `observations`, a filter in the GIS-01 views, approve and exclude actions on the Data page, and the DB-13 audit log.
- **About monitoring:**
  - The QGIS page can honestly show: published and pending counts, grants and when they expire, and the last time something was published.
  - "When QGIS last read the data" would need connection logging on the database, which Supabase may not expose. That needs a short spike before the page promises it.

### U6: Rounds and assignments

**Today**
- A round is a number the observer picks in the brief.
- The mobile home says "Assigned to you", but its list is fixtures.
- The overview shows "rounds under target", also from fixtures.
- No table holds rounds, schedules, targets or assignments.

**Question for Janet:** are rounds planned ahead (dates, times of day, which observer covers which site)?
- **If yes:** add a Rounds page on the web and "Today" on the mobile home.
- **If no:** drop the "Assigned" wording, and the mobile home is simply projects and sites.

**Recommendation:** no scheduling for the pilot. Add coverage targets (rounds per zone) as a project setting, so the overview's coverage numbers are real.

### U7: What a report is

**Today:** the overview on screen, and CSV and GeoJSON exports (WEB-12). Nothing called a report.

**Options**
- **A. Printable summaries.** One page per site, round or date range: a map of points by play type, counts, coverage and data-quality flags, saved as a PDF from the browser.
- **B. Saved views.** Name a filter set on the Data page and share it.
- **C. A scheduled email digest.**
- **D. A custom report builder.**

**Recommendation:** A and B first. Ask Janet what she would hand to a funder or a partner school; that defines A.

### U8: Field guide on mobile

Questions already carry a `hint` in the form definition (`contracts/forms/`). A Field guide screen could list every question and option with its meaning, available offline, so an observer can check what counts as "Imaginative" play in the middle of a round.

**Recommendation:** yes. It is small, and it reads the form version the observer is collecting with.

### U9: Light, dark, or both

This is Q8 in [decisions.md](../plan/decisions.md#open-questions). It is decided in stage 5 with outdoor tests, not here.

**Answered 2026-10-03:** Day + Dusk. Contour is Day by default everywhere, and Dusk is a preference ([D19](../plan/decisions.md#decision-log)). Maps keep their own Day and Night palettes (D18).

### U10: Where the design time comes from

See "The cost" in [README.md](README.md#order-each-slice-is-ready-before-its-build-phase).
