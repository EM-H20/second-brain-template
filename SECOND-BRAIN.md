# Second Brain — Project Knowledge System

This repository contains a project knowledge vault at `knowledge/`.
The vault is an Obsidian vault (plain Markdown). You (Claude) are responsible
for maintaining it according to the rules below. These rules apply to EVERY
session in this repository, whether or not a slash command was used.

## Language

- Write all vault notes in the language of the source material
  (meeting transcripts in Korean → notes in Korean).
- Keep frontmatter KEYS in English. Frontmatter VALUES may be in any language.
- Filenames: use the pattern described per folder below (ASCII-safe, kebab-case,
  date-prefixed).

## Vault layout

```
knowledge/
├── meetings/     # one note per meeting          YYYY-MM-DD-<slug>.md
├── decisions/    # one note per decision         DEC-NNNN-<slug>.md
├── issues/       # issues + completion reports   ISS-NNNN-<slug>.md
├── docs/         # ingested documents            DOC-NNNN-<slug>.md
├── reports/      # generated reports             YYYY-MM-DD-<slug>.md
├── clusters/     # topic index notes             cluster-<topic-slug>.md
├── lessons/      # reusable work-rules          LSN-NNNN-<slug>.md
├── _templates/   # note templates (do not edit during normal work)
└── _sources/     # ingested originals, verbatim (excluded from search & graph)
```

`NNNN` is a zero-padded sequence number. To get the next number, list the
folder and take max+1. Never reuse a number, even if a note was deleted.

## Frontmatter schema (STRICT — every note must comply)

Frontmatter is how you find things without reading every file.
When searching the vault, ALWAYS scan frontmatter first (grep the YAML
blocks), then open only the notes whose frontmatter matches.
`_sources/`는 스키마 없는 원본 보존본이므로 검색 대상이 아니다 — 절대 스캔하지 않는다.

Common keys for all notes:

```yaml
type: meeting | decision | issue | completion-report | report | cluster | doc | lesson
created: YYYY-MM-DD
topics: [<topic-slug>, ...]     # lowercase kebab-case topic tags
status: active | superseded | resolved | open   # per-type, see below
related: ["[[note]]", ...]      # wikilinks to related notes
```

Type-specific keys:

- meeting: `attendees: []`, `decisions: [DEC-NNNN, ...]`, `action_items: n`,
  `source: "_sources/meetings/<id>.md" | "<external URL>"`
- decision: `id: DEC-NNNN`, `supersedes: DEC-NNNN | null`,
  `superseded_by: DEC-NNNN | null`, `status: active | superseded`
- issue: `id: ISS-NNNN`, `symptoms: [<keyword>, ...]`,
  `root_cause: <one line>`, `status: open | resolved`,
  `resolution: "[[ISS-NNNN-...]]" | null` (link to completion report),
  `source: "_sources/issues/<id>.md" | "<external URL>"`
- completion-report: `id: ISS-NNNN` (same id as the issue it closes),
  `resolves: "[[ISS-NNNN-...]]"`, `source: "_sources/issues/<id>.md" | "<external URL>"`
- cluster: `topic: <topic-slug>`, `members: n` (core-`topics` notes only; `topics_ref` 참고 항목은 세지 않음)
- doc: `id: DOC-NNNN`, `doc_type: spec | prd | design | research | article | other`,
  `authority: official | internal | external`,
  `source: "_sources/docs/<id>.md" (local, 텍스트 저장 시) | "<external URL>"`,
  `topics_ref: [...]` (참고 연관 — 검색 후순위), `decisions: [DEC-NNNN, ...]`,
  `supersedes: DOC-NNNN | null`, `superseded_by: DOC-NNNN | null`,
  `status: active | superseded`
- lesson: `type: lesson`, `id: LSN-NNNN`, `trigger: <한 줄, 이 교훈을 소환할 상황 — grep 키>`,
  `status: active | superseded | archived`,
  `source: <세션 날짜 | ISS-NNNN | 회의 id>`,
  `supersedes: LSN-NNNN | null`, `superseded_by: LSN-NNNN | null`.
  이슈의 `symptoms`가 재발 탐지 키이듯, lesson의 `trigger`가 소환 키다.
  파생/curated 노트라 `_sources/` 원본은 없다 (decision과 동일).

`source:` (meeting/issue/completion-report/doc): 원본의 위치. 텍스트 원본을
보존하면 로컬 `_sources/<type>/<id>.md` 경로, 바이너리 등 미보존이면 외부 URL.
(decision·report·cluster는 파생/생성물이라 `source` 없음.)
텍스트 원본을 로컬에 저장한 경우에도 외부 출처(예: 노션 URL)를 남기고 싶으면 노트 본문에 적는다 — frontmatter의 `source:` 키는 하나만 둔다.

## Topic slugs (clustering vocabulary)

`knowledge/clusters/_topics.md` is the controlled vocabulary of topic slugs.
When tagging a note:

1. Read `_topics.md` first.
2. Reuse an existing slug whenever the meaning matches — do NOT create
   near-duplicates (`auth` vs `authentication`).
3. Only create a new slug when nothing fits. When you do, append it to
   `_topics.md` with a one-line definition.

This file is what keeps clustering consistent as the vault grows.

## Workflow rules

### W1 — Meeting ingestion (`/ingest-meeting`)

Given a transcript (file or pasted text):

1. Produce a meeting note from `_templates/meeting-note.md`:
   summary, agenda items, discussion per item, decisions, action items,
   open questions.
2. For every decision made in the meeting, ALSO create a separate decision
   note in `decisions/` (template: `_templates/decision.md`). Link both ways.
3. **Run conflict detection (W4) on every new decision BEFORE saving it.**
4. Tag topics per the vocabulary rules above, then update the matching
   cluster notes (W2, incremental).
5. Add `related` wikilinks to earlier meetings/decisions on the same topics.

### W2 — Clustering (`/cluster`, and incrementally during W1)

A cluster note (`clusters/cluster-<topic>.md`) is a human-readable index:
what this topic is, timeline of meetings that touched it, list of decisions
(active vs superseded), open issues, key/reference documents (핵심 문서 / 참고 문서), current state summary.

- Incremental (during ingestion): update only the clusters whose topics
  appear in the new note.
- Full (`/cluster`): rescan all frontmatter, rebuild every cluster note,
  merge topics that turned out to be duplicates (update `_topics.md` and
  retag affected notes).

### W3 — Context-driven build (`/build`)

When asked to implement something based on meeting agendas/decisions:

1. Identify relevant topics; collect the ACTIVE decisions, latest meeting
   context, relevant docs — `topics` matches first, ordered
   official → internal → external; `topics_ref` matches go to a separate
   reference section — and any open or resolved issues on those topics.
2. Run conflict detection (W4) between the build request and active decisions.
3. Run similar-issue detection (W6) — if a past issue looks related, surface
   it before writing code.
4. Write a **Context Brief** (in chat, not a file): goal, constraints from
   decisions (cite DEC ids), relevant docs (cite DOC ids + authority),
   relevant past issues (cite ISS ids), open questions.
5. THEN proceed to implementation. If a development-methodology harness
   (e.g. Superpowers, ECC) is installed in this project, let its normal
   workflow take over from the Context Brief — do not bypass it. The vault's
   job ends at supplying context; the harness owns how code gets written.

### W4 — Conflict detection (`/check-conflict`, auto during W1 & W3)

A conflict = a new decision, opinion, or build request that contradicts an
ACTIVE decision note.

When detected, STOP and ask the user, in this shape:

> 이전 결정과 충돌합니다.
> - 기존: DEC-0012 (2026-06-30) — "<summary>" [출처: <회의 또는 DOC id + authority>]
> - 신규: "<summary>" [출처: <회의 또는 DOC id + authority>]
> 어느 쪽으로 갈까요? (기존 유지 / 신규로 대체 / 둘 다 조건부 유지)

결정의 출처가 문서(DOC)면 해당 문서의 `authority`를 반드시 함께 표시한다.
권위가 판정을 자동화하지는 않는다 — 항상 사용자가 결정한다.

Resolution handling:
- 신규로 대체 → old note `status: superseded`, `superseded_by: <new id>`;
  new note `supersedes: <old id>`. Never delete or edit the old decision's
  content — history must survive.
- 기존 유지 → do not create the new decision; record the discussion in the
  meeting note only.
- Never silently overwrite a decision. No exceptions.

### W5 — Report generation (`/report`)

The user supplies a format (template file or description). Fill it using
vault content ONLY — every claim must trace to a meeting, decision, issue, or doc
note. Cite ids inline where the format allows. If information is missing,
say what's missing instead of inventing it. Save to `reports/`.

### W6 — Issue knowledge loop (`/ingest-issue`, `/find-similar-issue`)

Ingesting an issue or completion report:
1. Use the matching template. Extract `symptoms` keywords carefully — they
   are the retrieval keys for future recurrence detection. Prefer concrete,
   greppable terms (error names, module names, observable behavior).
2. A completion report closes its issue: set the issue `status: resolved`
   and cross-link.

Recurrence detection (also runs automatically whenever debugging in W3):
1. Extract symptom keywords from the current problem.
2. Grep `issues/` frontmatter for overlapping `symptoms` and `topics`.
3. Open only the matches; compare root causes.
4. If a plausible match exists, surface it BEFORE attempting a fresh fix:
   past issue id, its root cause, how it was resolved, and whether the same
   fix applies.

### W7 — Document ingestion (`/ingest-doc`)

Ingest a non-transcript document (기획서, 스펙, 설계서, 리서치, 아티클)
into `docs/`:

1. Determine `doc_type` and `authority` (official | internal | external).
   Ask the user when ambiguous — never guess authority.
   - official: 확정 스펙, 계약서, 벤더 공식 문서, 표준
   - internal: 내부 기획서, 설계 초안, 내부 리서치
   - external: 서드파티 아티클, 블로그, 외부 리서치
2. Create a doc note from `_templates/doc.md` (next DOC-NNNN): summary,
   key points, open questions, source reference.
3. Decision extraction — ONLY for official/internal documents: create a
   decision note per decision (`_templates/decision.md`), run conflict
   detection (W4) BEFORE saving each one, link both ways
   (doc `decisions:` ↔ decision `related:`). external documents NEVER
   create decisions — record 논점 only.
4. Weighting: core topics go in `topics`, peripheral ones in `topics_ref`
   (vocabulary rules per `clusters/_topics.md` apply to both). Retrieval
   order everywhere: `topics` matches first (official → internal →
   external), `topics_ref` matches as reference material only.
5. Update matching cluster notes (incremental, W2): core topics under
   "핵심 문서", reference topics under "참고 문서".
6. Add `related` wikilinks to earlier meetings/decisions/issues on the
   same topics. If the new document replaces an older one, use the
   supersede chain (`status: superseded`, `superseded_by`) — never delete
   or edit the old document's content. Superseding a document does NOT
   supersede the decisions extracted from it — decisions change only
   through W4.

## General rules

- **원본 보존.** 인제스트한 원본이 텍스트면, 노트 생성 직후 그 내용을 가공 없이
  (verbatim) `_sources/<type>/<노트와 동일한 id-slug>.md`에 저장하고 노트의
  `source:`를 그 경로로 설정한다 (type = meetings / docs / issues, W1·W6·W7 공통).
  원본이 바이너리(녹음·PDF·이미지)면 저장을 건너뛰고 `source:`에 외부 URL을 적는다.
  붙여넣은 텍스트도 원본으로 저장한다. 저장 파일명은 짝 노트의 정식 id/slug과 동일
  (원본의 원래 이름은 쓰지 않는다 — ASCII kebab-case 규칙 재사용).
- **Work log (append-only).** After EVERY write operation to the vault
  (create/update any note), append one line to `knowledge/log.md`:
  `- YYYY-MM-DD HH:MM | <workflow> | <action> | <files/ids>`.
  Never edit or delete existing log lines. At session start, read the tail
  of `log.md` to recover recent context.
- **Index maintenance.** `knowledge/index.md` is the vault entry point.
  When a cluster note is created, add its wikilink under "주제 클러스터".
- Vault files are the source of truth. When chat memory and vault disagree,
  trust the vault.
- Never modify files under `_templates/` unless the user explicitly asks.
- When updating any note, keep frontmatter valid YAML — broken frontmatter
  breaks retrieval.
- Keep notes atomic: one meeting per note, one decision per note, one issue
  per note. Split rather than append unrelated content.
