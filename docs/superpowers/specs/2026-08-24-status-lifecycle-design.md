# Status Lifecycle & Skill Parity — Design

**Date:** 2026-08-24
**Status:** approved (pending spec review)

## Problem

Retrieval quality hinges on `status`, but the current model has three holes:

1. **Incomplete vocabularies.** meeting/report/cluster notes carry
   `status: active` with no defined value set, so W2 integrity check #1
   ("status value not valid for this type") is unenforceable for them, and
   "active" is meaningless on a historical record.
2. **No death without replacement.** decision and doc only know
   `active | superseded` — a note that is simply obsolete (a stale external
   article, a decision nobody replaced) cannot be retired. lesson already has
   `archived`; decision/doc don't.
3. **No staleness signal.** Only `created` exists. A 3-year-old active
   decision and one confirmed yesterday are indistinguishable at recall time,
   and the harness has no defined per-status consumption rule beyond W3's
   "ACTIVE decisions". The user's core requirement: the harness must be able
   to tell dead / alive / old-needs-human-review apart, with the semantics
   written down where every workflow references them.

Separately, cross-CLI parity is asymmetric: Codex discovers
`.agents/skills/second-brain/SKILL.md` (auto-triggered by description), but
Claude Code does not read `.agents/skills/` — it only has the 12 thin
commands in `.claude/commands/`.

## Goals

1. Define the complete status vocabulary for every note type; make W2
   check #1 enforceable across the vault.
2. Add `archived` to decision and doc (retire without replacement).
3. Add an optional `reviewed: YYYY-MM-DD` key (decision/doc/lesson) and a
   staleness rule: flag-only, all disposal decisions stay human.
4. Add a **status semantics table** to SECOND-BRAIN.md — the harness contract
   for how each status is consumed at retrieval.
5. Mirror the existing skill into `.claude/skills/second-brain/` so both CLIs
   discover the same skill, with a sync guard in `bin/test.sh`.

## Non-Goals

- **No automatic state transitions.** Time never changes a `status`. Staleness
  produces annotations and review candidates only.
- No date-based recency judgment between notes — "최신성은 구조로 판정"
  (supersede chains) stays the only currency mechanism. Staleness is
  confidence decay, not currency.
- No per-authority/per-type thresholds — one constant (3 months).
- No splitting the skill into 12 per-workflow skills; the monolithic
  `second-brain` skill stays, commands remain power-user aliases.
- No CLAUDE.md slim-down (always-injected rules are a feature).
- No `_bases/` view changes (archived notes disappearing from active/
  superseded views is correct behavior).
- No embeddings, no graph DB (unchanged).

## Design — Part A: status lifecycle

### A1. Vocabulary (per type, exhaustive)

| Type | Values | Change |
|---|---|---|
| decision | `active \| superseded \| archived` | +archived |
| doc | `active \| superseded \| archived` | +archived |
| lesson | `active \| superseded \| archived` | unchanged |
| issue | `open \| resolved` | unchanged |
| completion-report | `resolved` (fixed) | unchanged |
| meeting, report, cluster, index | `active` (fixed) | now explicit: historical records and derived artifacts have no lifecycle |

`archived` = retired with no successor. Same immutability rule as supersede:
never delete or edit the body; flip status only, by explicit user decision.

### A2. `reviewed:` key

- Optional key on decision/doc/lesson only: `reviewed: YYYY-MM-DD`, the date
  a human last confirmed the note is still valid. Absent → `created` is the
  reference date.
- Updated ONLY on explicit human confirmation (typically during the W2 review
  report, or when the user says so). Never bumped automatically, never bumped
  by the agent citing the note.
- Templates (`decision.md`, `doc.md`, `lesson.md`) gain a
  `reviewed: null` line with a one-line comment.

### A3. Staleness rule

A note is **stale** when `status: active` and
`today − max(created, reviewed) > 3 months`. The constant lives in
SECOND-BRAIN.md prose (single place; tune per project by editing one number).

Consumed in exactly two places:

- **recall / W3 (and any Context Brief):** stale notes are still used as
  constraints but MUST carry an inline flag, e.g.
  `DEC-0012 — ⚠ 마지막 확인 7개월 전`.
- **W2 full pass:** after the integrity check, report review candidates
  (id, age since last confirmation). Per candidate the user chooses:
  still valid → bump `reviewed` / retire → `archived` / replaced →
  supersede chain. Report-only, same as the integrity check — the pass
  never edits frontmatter on its own. Approved fixes are logged in `log.md`
  (existing write-log rule covers this).

### A4. Status semantics table (harness contract)

New SECOND-BRAIN.md subsection under the frontmatter schema; every retrieval
workflow (W2/W3/W6/W8, recall/build) references it:

| status | Retrieval treatment |
|---|---|
| `active`, fresh | Use normally — as a current constraint (decision/doc/lesson) or current context (fixed-`active` types). |
| `active`, stale | Use, but always annotate "unconfirmed for N months". |
| `superseded` | History only. Never cite as a current constraint; follow the chain to the active successor. |
| `archived` | Excluded by default; surface only on explicit request. |
| `open` (issue) | Live problem — surfaces in W3/W6 as today. |
| `resolved` (issue/report) | Closed, but remains prime W6 recurrence-detection material — resolved ≠ ignorable. |

Cluster notes list archived decisions/docs under the history section tagged
`(archived)`, alongside superseded ones.

### A5. Integrity check (W2) additions

- Check #1 becomes enforceable for all types (vocab now total).
- New sub-checks: `reviewed` present on a type that doesn't allow it;
  malformed `reviewed` date; `reviewed` earlier than `created`.

### A6. Obsidian property types (`.obsidian/types.json`)

The vault currently ships only `graph.json` — no property type registry. Add a
scaffolded `knowledge/.obsidian/types.json` registering the schema's key
types so Obsidian renders the right editing widget:

- `date`: `created`, `reviewed`
- `multitext`: `topics`, `topics_ref`, `related`, `symptoms`, `attendees`,
  `decisions`
- everything else stays default (text); Obsidian has no enum enforcement, so
  `status` vocabulary is still guarded by W2 only.

Rationale: retrieval stands entirely on well-formed frontmatter, and a broken
YAML line silently removes a note from search. Typed widgets make human edits
in Obsidian produce schema-valid shapes (a date stays a date, a list stays a
list) — this is harness-performance work, not cosmetics. Like `_bases/`, the
file is human-facing only: the agent's retrieval path never reads it.
`.gitignore` already excludes only `workspace*.json`, so the file ships with
the template.

## Design — Part B: skill parity (Claude + Codex)

- Copy `.agents/skills/second-brain/SKILL.md` to
  `.claude/skills/second-brain/SKILL.md` — a real duplicate, **no symlink**
  (GitHub zip downloads flatten symlinks into path-text files; this repo is
  distributed as a template).
- `agents/openai.yaml` stays Codex-side only (not copied).
- The two SKILL.md copies must stay byte-identical; `bin/test.sh` gains an
  assertion (`cmp`) that fails on drift.
- `bin/init.js` scaffolding: add the new `.claude/skills/second-brain/`
  path so installed projects receive it; test.sh case 1 asserts it exists
  in a fresh scaffold.
- SKILL.md body: extend step 6 to reference the status semantics table and
  the stale-annotation duty. Description (the auto-trigger surface) is
  already trigger-rich — unchanged.
- Auto-trigger answer (investigated): Codex already auto-triggers via
  description; Claude Code auto-triggers project skills in
  `.claude/skills/` the same way. Commands stay as explicit aliases.

## Change surface

| File | Change |
|---|---|
| `SECOND-BRAIN.md` | vocab table, `reviewed` key, staleness rule, semantics table, W2/W3 additions |
| `knowledge/_templates/{decision,doc,lesson}.md` | `reviewed: null` line; status comment updated |
| `knowledge/.obsidian/types.json` | new — property type registry (A6) |
| `.claude/skills/second-brain/SKILL.md` | new (copy) |
| `.agents/skills/second-brain/SKILL.md` | step 6 extension (then re-copy) |
| `AGENTS.md` | Command equivalents section: Claude skill discovery |
| `README.md` | schema/cross-CLI sections × 4 language versions |
| `bin/init.js` | scaffold the new skill path and `types.json` |
| `bin/test.sh` | skill parity `cmp`; scaffold assertions (skill + `types.json`) |

CHANGELOG follows the existing release automation (`bin/changelog.js`).

## Migration

None required. Existing vaults: `reviewed` absent everywhere → `created`
fallback applies; `archived` is additive; meeting/report/cluster templates
already emit `status: active`, which is exactly the now-explicit fixed value.

## Testing

- `bin/test.sh`: SKILL.md parity check; fresh-scaffold contains
  `.claude/skills/second-brain/SKILL.md` and `knowledge/.obsidian/types.json`
  (valid JSON, `reviewed` registered as `date`); existing scaffold-content
  assertions extended where they grep schema text that this design changes.
- Schema semantics are prose contracts consumed by LLMs — guarded by the
  parity/scaffold checks and by W2 itself at runtime, not by unit tests.
