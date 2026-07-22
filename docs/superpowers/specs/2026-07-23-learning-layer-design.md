# Learning Layer — Design

**Date:** 2026-07-23
**Status:** approved (pending spec review)

## Problem

The vault stores domain knowledge (meetings, decisions, issues, docs) but has
no home for **how we work** — reusable heuristics, preferences, and judgment
rules that don't belong to any single issue or decision. It also exposes 9
slash commands, which is too many entry points to remember. The user wants the
system to accumulate work-lessons over time (retrieval-based "learning," not
model fine-tuning) while collapsing day-to-day interaction down to a few
triggers.

Scope note: this is **B — retrieval-augmented memory**, not A (fine-tuning).
The model's weights never change; what improves is the material it retrieves.

## Goals

1. Add a `lesson` note type for cross-cutting work rules (learning type 2).
2. Surface relevant lessons automatically during recall (learning type 1 for
   lessons, mirroring W6 for issues).
3. Capture lessons at natural moments + on demand — no session-end hook
   (learning type 3, noise-free).
4. Collapse the 9 commands into 3 core triggers; keep the originals as
   power-user aliases.

## Non-Goals

- No model fine-tuning (A).
- No Stop hook / harness changes. If lessons prove to slip through later, a
  Stop hook is a one-line `settings.json` add — deferred, not designed here.
- No new visualization; Obsidian remains the viewer.

## Part 1 — `lesson` note type

New folder `knowledge/lessons/`, files `LSN-NNNN-<slug>.md`. `NNNN` is the
next zero-padded sequence (max existing + 1, never reused), same rule as other
sequenced folders.

Frontmatter schema:

```yaml
type: lesson
id: LSN-NNNN
created: YYYY-MM-DD
topics: [<topic-slug>, ...]         # controlled vocab, per clusters/_topics.md
trigger: <one line, greppable — when this lesson should surface>
status: active | superseded | archived
source: <where it was learned — session date / ISS-NNNN / meeting id>
supersedes: LSN-NNNN | null
superseded_by: LSN-NNNN | null
related: ["[[note]]", ...]
```

- **`trigger`** is the retrieval key, analogous to an issue's `symptoms`.
  Prefer concrete, greppable phrasing tied to the moment of application
  (`"커밋 메시지 작성 시"`, `"배포 전 체크리스트"`).
- **Supersede chain** works like decisions/docs: a changed rule sets the old
  note `status: superseded` + `superseded_by`, new note `supersedes`. Never
  delete or edit the superseded lesson's body — the history of how a rule
  evolved must survive.
- **`archived`** is for lessons that no longer apply but weren't replaced by a
  newer rule (e.g., a preference that became irrelevant).
- Body: the rule itself, then **Why:** and **How to apply:** lines (mirrors the
  existing note conventions). Link related notes with `[[...]]`.
- `lesson` is a derived/curated note; like decisions it has no `_sources/`
  original. `source:` points at the origin context, not a preserved file.

`type: lesson` is added to the common `type` enum in SECOND-BRAIN.md.

## Part 2 — three core triggers

The nine commands stay as aliases. Everyday interaction routes through three
verbs (natural language or thin slash commands). SECOND-BRAIN.md already states
the rules apply every session with or without a slash command, so these are
routing conventions, not new machinery.

| Trigger | Does | Absorbs |
|---------|------|---------|
| **capture** (기억해) | Classify the input → route to meeting / doc / issue / **lesson** ingestion; ask when the type is ambiguous | ingest-meeting, ingest-doc, ingest-issue, + lesson |
| **recall** (꺼내줘) | Gather everything on a topic — active decisions, latest meeting context, relevant docs, open/resolved issues, **relevant lessons**, conflicts — into a Context Brief | build, find-similar-issue, check-conflict, report |
| **maintain** (정리해) | Rebuild clusters, merge duplicate topics, **and sweep the session for candidate lessons** | cluster |

Classification for **capture**: transcript → meeting; spec/기획서/article →
doc; bug/symptom report → issue; a work-rule/preference/heuristic → lesson.
Ambiguous → ask, never guess (same discipline as W7 authority).

## Part 3 — lesson capture & application (no hook)

Two triggers replace the rejected session-end hook (rejected because it fires
every session, mostly with nothing to save — pure noise):

1. **Opportunistic push (in-the-moment).** When a lesson-shaped moment occurs
   mid-session, Claude proposes right then, inside the existing flow:
   - the user corrects Claude's approach ("아니 그건 이렇게 해")
   - a W4 conflict is resolved
   - a completion report is written
   Proposal shape:
   > 이거 교훈으로 남길까요?
   > - "<rule>" [trigger: "<...>", topics: <...>]
   > (ㅇ 저장 / 수정 / 버림)

   On approval → create the `LSN` note. On "수정" → adjust and re-confirm.

2. **On-demand harvest (pull).** `maintain` (정리해) reviews the current
   session for candidate lessons and proposes them the same way, batched.

**Application during recall.** When building a Context Brief (recall / W3),
grep `lessons/` frontmatter for `trigger` and `topics` overlapping the current
task, open only the matches, and include an "관련 교훈" section citing `LSN`
ids — exactly as W6 surfaces past issues by `symptoms`. Lessons also surface
opportunistically whenever their `trigger` matches the work in progress, so a
relevant rule appears before Claude acts, not after.

## Cross-cutting rules

- **Topics:** lessons use the same controlled vocabulary in
  `clusters/_topics.md`; reuse existing slugs, only add new ones with a
  one-line definition.
- **Clusters:** cluster notes gain a "관련 교훈" section listing active lessons
  for that topic (superseded/archived excluded from the count, mirroring how
  decisions are handled).
- **Work log:** creating/updating a lesson appends a line to `knowledge/log.md`
  like any other write (`... | lesson | create | LSN-NNNN-...`).
- **Index:** no change needed unless a lessons overview is desired later.
- **Conflict discipline:** superseding a lesson never happens silently; it
  follows the same supersede-chain rule as decisions (W4 spirit), though a
  lesson change is usually a straightforward user-confirmed replacement rather
  than a full conflict dialog.

## Files touched

- `SECOND-BRAIN.md` — add `lesson` to the type enum, the folder to the layout,
  the lesson frontmatter block, a new workflow section (W8 — lesson capture &
  application), and the three-trigger routing note.
- `knowledge/lessons/` — new folder (with a `.gitkeep` or first note).
- `knowledge/_templates/lesson.md` — new template.
- `clusters/_topics.md`, cluster-note template — add "관련 교훈" section.
- Optionally 3 thin slash commands (capture/recall/maintain) that delegate to
  the existing skills; the 9 originals remain.

## Open questions

None blocking. Slash-command thin wrappers vs. natural-language-only routing
can be decided during planning (default: add the 3 wrappers, keep the 9).
