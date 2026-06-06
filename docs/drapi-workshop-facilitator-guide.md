# DRAPI Developer Workshop - Facilitator's Guide

**Audience:** Domino/Notes developers, little or no web background
**Duration:** 5 hours (~4h35 content + 25 min breaks)
**Format:** Vortrag · Demo · Hands-on exercise, ~50/50 split
**Goal:** Attendees leave with a working mental model of DRAPI and a set of examples they can reuse.

> **DRAPI** = Domino REST API · **REST** = Representational State Transfer · **JSON** = JavaScript Object Notation · **OAuth** = Open Authorization · **CORS** = Cross-Origin Resource Sharing · **CRUD** = Create, Read, Update, Delete · **OpenAPI** = a standard file describing a REST API · **SwaggerUI** = a web page that renders an OpenAPI file into interactive docs

---

## Before the day - pre-flight checklist

- [ ] Send setup email 1 week ahead: Node.js, Vite, TypeScript, Bruno, curl install steps.
- [ ] **Provide a pre-configured environment** (devcontainer or hosted box) with the target database already exposed and the `$DATA` scope set up. _This is the single biggest risk to the day - every exercise stalls at step zero without it._
- [ ] Confirm each attendee can reach the DRAPI endpoint and get one successful GET before the workshop, or build a 10-min buffer into "Tools of the trade".
- [ ] Have sample data loaded: customers, products (enough rows to make pagination meaningful - 200+).
- [ ] Prepare fallback slides/links for any stretch item you may have to demo-only.

---

## Schedule at a glance

| Time | Block                                    | Type             | Min |
| ---- | ---------------------------------------- | ---------------- | --- |
| 0:00 | Opening: from Notes to the web           | Vortrag          | 25  |
| 0:25 | Tools of the trade                       | Vortrag          | 25  |
| 0:50 | OpenAPI & SwaggerUI                      | Demo             | 10  |
| 1:00 | A simple customer list                   | Demo             | 10  |
| 1:10 | Implement a product list                 | Exercise         | 25  |
| 1:35 | **Break**                                | -                | 15  |
| 1:50 | From username/password to OAuth (+ CORS) | Vortrag & Demo   | 25  |
| 2:15 | Implement OAuth                          | Exercise         | 30  |
| 2:45 | Dealing with large data                  | Demo             | 15  |
| 3:00 | Implement a long list                    | Exercise         | 25  |
| 3:25 | **Break**                                | -                | 10  |
| 3:35 | Multi-value fields                       | Demo & Exercise  | 20  |
| 3:55 | Creating forms & views                   | Demo & Exercise  | 30  |
| 4:25 | Deployment: `manifest.json`              | Demo · _stretch_ | 15  |
| 4:40 | Ask me anything                          | AMA              | 20  |
| 5:00 | End                                      |                  |     |

---

## Block-by-block notes

### 0:00 – 0:25 · Opening: from Notes to the web _(lecture)_

**Aim:** Make every later block land by mapping known concepts onto new ones.

- Document → JSON resource · Form → schema · View → query result · Notes client → _"you build the client now"_.
- HTTP verbs: GET / POST / PATCH / DELETE.
- Status codes they'll meet: **401** (not authenticated), **403** (authenticated but not allowed), **404** (not found), **409** (conflict - e.g. save conflict, familiar to Notes folk).
- What _stateless_ means and why it changes how they think.
- ⏱ _Cue:_ keep to time; resist deep dives - they come later.

### 0:25 – 0:50 · Tools of the trade _(lecture)_

**Aim:** Get the toolchain working, nothing more.

- Node.js, Vite (fast build tool, live reload), TypeScript, Bruno (file-based API client - **YAML `.yml`** format), curl.
- Focus on install / config / dev mode.
- ⏱ _Cue:_ this is plumbing. If installs misbehave this can silently eat 45 min - lean on the pre-built environment and move on. Park individual issues for the break.

### 0:50 – 1:00 · OpenAPI & SwaggerUI _(demo)_

**Aim:** Show the API documents itself - and connect it to the tools just installed.

- DRAPI publishes an **OpenAPI** spec; **SwaggerUI** renders it into clickable, live docs.
- Call an endpoint from SwaggerUI with zero code - instant feedback.
- Point out that **Bruno imports the same spec** - closing the loop on the previous block.
- ⏱ _Cue:_ tight 10 min. This is the "the API explains itself" moment; don't let it sprawl into a full API tour.

### 1:00 – 1:10 · A simple customer list _(demo)_

**Aim:** The first "aha".

- One GET against the pre-configured DB → JSON in Bruno → same in curl → rendered in browser.

### 1:10 – 1:35 · Implement a product list _(exercise)_

**Aim:** First hands-on; replicate the demo against products.

- ⏱ _Cue:_ expect setup friction even on a clean environment. Already trimmed to 25 min. Circulate - don't lecture from the front.

### 1:35 – 1:50 · Break _(15 min)_

Use this to mop up stragglers' environment issues.

### 1:50 – 2:15 · From username/password to OAuth _(lecture & demo)_

**Aim:** Why basic auth doesn't scale; what tokens are.

- Bearer-token flow; demo a real token request + an authenticated call.
- **Fold in CORS here** - the commonest "why is my browser app failing" trap. They've never met it.

### 2:15 – 2:45 · Implement OAuth _(exercise)_

**Aim:** Get a token, make an authenticated call.

### 2:45 – 3:00 · Dealing with large data _(demo)_

**Aim:** Never fetch everything.

- Pagination via `count` / `start`; why and when.

### 3:00 – 3:25 · Implement a long list _(exercise)_

- ⏱ _Cue:_ **trim to 20 min if behind.**

### 3:25 – 3:35 · Break _(10 min)_

### 3:35 – 3:55 · Multi-value fields _(demo & exercise)_

**Aim:** Arrays in JSON vs Notes multi-value items - a real gotcha for this audience.

### 3:55 – 4:25 · Creating forms & views _(demo & exercise)_

**Aim:** The schema/design side of DRAPI.

- Notes instincts mostly transfer here - should flow well.

### 4:25 – 4:40 · Deployment: `manifest.json` _(demo)_ - **STRETCH**

**Aim:** What gets exposed and how.

- ⏱ _Cue:_ if behind, **demo only (~5 min) and link to docs.** Sheddable.

### 4:40 – 5:00 · Ask me anything _(AMA)_

- ⏱ _Cue:_ **protect this.** It's where the real learning surfaces and the easiest thing to sacrifice. Don't.

---

## If you're running long - shed in this order

1. `manifest.json` → demo-only (saves ~10 min).
2. Long-list exercise → 20 min (saves 5).
3. OpenAPI/SwaggerUI → fold a quick mention into "Tools of the trade" rather than a standalone demo (saves ~8 min).

That recovers ~20 min **without losing a whole topic or touching the AMA.**

## If you're running short

- Extend the OAuth and forms/views exercises - they reward extra time.
- Open the floor early; AMA can absorb any surplus.
