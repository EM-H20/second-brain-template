# Learning Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `lesson` note type so the vault accumulates reusable work-rules, surface those lessons during recall, and collapse the 9 slash commands into 3 core triggers — all without a Stop hook.

**Architecture:** Pure template/rules change plus new markdown files. The installer (`bin/init.js`) auto-discovers everything under `.claude/commands/`, `.codex/prompts/`, and `knowledge/`, so **no installer code changes are needed** — creating the files is enough. The regression harness is `bin/test.sh` (bash assertions that run the installer into a temp dir and check the result). TDD here = add an assertion to `test.sh` (RED), create the file / edit content (GREEN), run `bash bin/test.sh`.

**Tech Stack:** Markdown, YAML frontmatter, Node stdlib installer, bash test script. Zero runtime dependencies.

## Global Constraints

- Every note frontmatter must be valid YAML — broken frontmatter breaks retrieval.
- Frontmatter KEYS in English; VALUES may be any language.
- `_templates/*` and any `README.md` are **scaffold** files: the installer keeps them latest and they must contain **no** `<!-- second-brain-template -->` marker (the marker leaks into generated notes). New `knowledge/` files follow this rule.
- `SECOND-BRAIN.md` is a marker-owned file — do not add the marker by hand; the installer appends it.
- No new npm dependencies (installer is stdlib-only).
- Commit message format: `<type>: <description>`, no Co-Authored-By tag.
- Sequence numbers (`LSN-NNNN`) are zero-padded, max+1, never reused.
- The 9 existing commands stay; the 3 new triggers are added alongside them.

---

## File Structure

- `knowledge/_templates/lesson.md` — CREATE. Template for a lesson note.
- `knowledge/lessons/README.md` — CREATE. Folder skeleton (scaffold, keeps folder in git + installed).
- `SECOND-BRAIN.md` — MODIFY. Add `lesson` to layout, type enum, frontmatter schema, new workflow W8, and the 3-trigger routing note.
- `knowledge/_templates/cluster-index.md` — MODIFY. Add a "관련 교훈" section.
- `.claude/commands/capture.md`, `recall.md`, `maintain.md` — CREATE. Frontmatter-style trigger commands.
- `.codex/prompts/capture.md`, `recall.md`, `maintain.md` — CREATE. Imperative (no-frontmatter) mirror.
- `bin/test.sh` — MODIFY. Add assertions that the new files install.

Run the whole suite any time with: `bash bin/test.sh` (expected final line `ALL PASS`).

---

### Task 1: Lesson template + folder skeleton

**Files:**
- Create: `knowledge/_templates/lesson.md`
- Create: `knowledge/lessons/README.md`
- Test: `bin/test.sh` (케이스 1 block)

**Interfaces:**
- Produces: the `lesson` frontmatter shape consumed by Task 2's schema docs and Task 5's `capture` command — keys `type,id,created,topics,trigger,status,source,supersedes,superseded_by,related`.

- [ ] **Step 1: Add failing assertions to `bin/test.sh`**

In `bin/test.sh`, find the line in 케이스 1 that reads:

```bash
[ -f knowledge/_templates/doc.md ] || fail "doc 템플릿 없음"
```

Add immediately after it:

```bash
[ -f knowledge/_templates/lesson.md ] || fail "lesson 템플릿 없음"
[ -f knowledge/lessons/README.md ] || fail "lessons/ 스켈레톤 없음"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash bin/test.sh`
Expected: FAIL with `FAIL: lesson 템플릿 없음`

- [ ] **Step 3: Create `knowledge/_templates/lesson.md`**

```markdown
---
type: lesson
id: LSN-NNNN
created: YYYY-MM-DD
topics: []
trigger: ""           # 이 교훈을 언제 꺼내야 하나. 한 줄, grep 가능하게 (예: "커밋 메시지 작성 시")
status: active        # active | superseded | archived
source: ""            # 어디서 배웠나 — 세션 날짜 / ISS-NNNN / 회의 id
supersedes: null      # LSN-NNNN | null
superseded_by: null   # LSN-NNNN | null
related: []
---

# LSN-NNNN: {교훈 한 줄 요약}

## 규칙
{무엇을 하라/하지 마라. 한두 문장.}

## Why
{왜 이 규칙이 생겼나. 계기가 된 상황/교정/이슈.}

## How to apply
{언제 어떻게 적용하는가. trigger와 맞물리게 구체적으로.}
```

- [ ] **Step 4: Create `knowledge/lessons/README.md`**

```markdown
# lessons/

교훈(lesson) 노트 폴더. 파일명 `LSN-NNNN-<slug>.md`.
이슈에 묶이지 않는 횡단 규칙·선호·판단 기준을 담는다. 자세한 규칙은
`SECOND-BRAIN.md`의 워크플로우 W8 참고.
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bash bin/test.sh`
Expected: PASS, final line `ALL PASS`

- [ ] **Step 6: Commit**

```bash
git add knowledge/_templates/lesson.md knowledge/lessons/README.md bin/test.sh
git commit -m "feat: add lesson note template and folder skeleton"
```

---

### Task 2: SECOND-BRAIN.md — lesson type, layout, schema

**Files:**
- Modify: `SECOND-BRAIN.md`
- Test: `bin/test.sh` (케이스 1 block)

**Interfaces:**
- Consumes: the `lesson` frontmatter shape from Task 1.
- Produces: the documented `lesson` schema that Task 3's W8 and Task 5's commands reference.

- [ ] **Step 1: Add failing assertions to `bin/test.sh`**

In 케이스 1, find:

```bash
grep -q 'second-brain-template' SECOND-BRAIN.md || fail "SECOND-BRAIN.md에 마커 없음"
```

Add immediately after it:

```bash
grep -q 'lessons/' SECOND-BRAIN.md || fail "SECOND-BRAIN.md에 lessons 폴더 미기재"
grep -q 'type: lesson' SECOND-BRAIN.md || fail "SECOND-BRAIN.md에 lesson 스키마 없음"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash bin/test.sh`
Expected: FAIL with `FAIL: SECOND-BRAIN.md에 lessons 폴더 미기재`

- [ ] **Step 3: Add `lessons/` to the vault layout block**

In `SECOND-BRAIN.md`, find in the layout code block:

```
├── clusters/     # topic index notes           cluster-<topic-slug>.md
```

Add immediately after it:

```
├── lessons/      # reusable work-rules          LSN-NNNN-<slug>.md
```

- [ ] **Step 4: Add `lesson` to the common type enum**

Find:

```yaml
type: meeting | decision | issue | completion-report | report | cluster | doc
```

Replace with:

```yaml
type: meeting | decision | issue | completion-report | report | cluster | doc | lesson
```

- [ ] **Step 5: Add the lesson type-specific key block**

Find the `- doc:` type-specific block that ends with:

```
  `supersedes: DOC-NNNN | null`, `superseded_by: DOC-NNNN | null`,
  `status: active | superseded`
```

Add immediately after it:

```
- lesson: `id: LSN-NNNN`, `trigger: <한 줄, 이 교훈을 소환할 상황 — grep 키>`,
  `status: active | superseded | archived`,
  `source: <세션 날짜 | ISS-NNNN | 회의 id>`,
  `supersedes: LSN-NNNN | null`, `superseded_by: LSN-NNNN | null`.
  이슈의 `symptoms`가 재발 탐지 키이듯, lesson의 `trigger`가 소환 키다.
  파생/curated 노트라 `_sources/` 원본은 없다 (decision과 동일).
```

- [ ] **Step 6: Run test to verify it passes**

Run: `bash bin/test.sh`
Expected: PASS, final line `ALL PASS`

- [ ] **Step 7: Commit**

```bash
git add SECOND-BRAIN.md bin/test.sh
git commit -m "feat: document lesson note type in SECOND-BRAIN.md schema"
```

---

### Task 3: SECOND-BRAIN.md — W8 workflow + 3-trigger routing

**Files:**
- Modify: `SECOND-BRAIN.md`
- Test: `bin/test.sh` (케이스 1 block)

**Interfaces:**
- Consumes: lesson schema from Task 2.
- Produces: workflow W8 (lesson capture & application) and the capture/recall/maintain routing table that Task 5's command files delegate to.

- [ ] **Step 1: Add failing assertions to `bin/test.sh`**

In 케이스 1, after the `type: lesson` assertion added in Task 2, add:

```bash
grep -q 'W8' SECOND-BRAIN.md || fail "SECOND-BRAIN.md에 W8 워크플로우 없음"
grep -q 'capture' SECOND-BRAIN.md || fail "SECOND-BRAIN.md에 3-트리거 라우팅 없음"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash bin/test.sh`
Expected: FAIL with `FAIL: SECOND-BRAIN.md에 W8 워크플로우 없음`

- [ ] **Step 3: Add the W8 workflow section**

In `SECOND-BRAIN.md`, find the end of the `### W7 — Document ingestion` section — the line:

```
   the old document's content. Superseding a document does NOT
   supersede the decisions extracted from it — decisions change only
   through W4.
```

Add immediately after it (new section):

````
### W8 — Lesson capture & application (`/capture`, auto during work)

A lesson (`lessons/LSN-NNNN-<slug>.md`) is a reusable work-rule, preference,
or judgment heuristic that does NOT belong to a single issue or decision.

Capture happens at natural moments — NOT on a session-end timer:

1. **Opportunistic (in-the-moment).** When a lesson-shaped moment occurs,
   propose right then, inside the current flow:
   - the user corrects your approach ("아니 그건 이렇게 해")
   - a W4 conflict is resolved
   - a completion report is written
   Propose in this shape:

   > 이거 교훈으로 남길까요?
   > - "<rule>" [trigger: "<...>", topics: <...>]
   > (ㅇ 저장 / 수정 / 버림)

   On approval, create the `LSN` note from `_templates/lesson.md` (next
   LSN-NNNN). On "수정", adjust and re-confirm. Never save silently.
2. **On-demand (during `maintain`).** A full maintain pass also sweeps the
   current session for candidate lessons and proposes them the same way,
   batched.

**Superseding a lesson** follows the decision rule: never delete or edit the
old lesson's body — set old `status: superseded`, `superseded_by: <new id>`;
new `supersedes: <old id>`. Use `archived` for a lesson that no longer applies
but has no replacement.

**Application (during recall / W3).** When building a Context Brief, grep
`lessons/` frontmatter for `trigger`/`topics` overlapping the task, open only
matches, and include a "관련 교훈" section citing LSN ids — exactly as W6
surfaces past issues by `symptoms`. Relevant lessons also surface
opportunistically whenever their `trigger` matches work in progress, so the
rule appears BEFORE you act.

### Trigger routing (3 core verbs)

The 9 slash commands remain as power-user aliases. Everyday interaction —
slash or natural language — routes through three verbs:

- **capture** (기억해): classify the input → route to meeting / doc / issue /
  lesson ingestion (W1 / W7 / W6 / W8). Ambiguous type → ask, never guess.
- **recall** (꺼내줘): gather everything on a topic — active decisions, latest
  meeting context, relevant docs, open/resolved issues, relevant lessons,
  conflicts — into a Context Brief (W3 + W4 + W6 + W5).
- **maintain** (정리해): rebuild clusters and merge duplicate topics (W2 full),
  then sweep the session for candidate lessons (W8 on-demand).
````

- [ ] **Step 4: Run test to verify it passes**

Run: `bash bin/test.sh`
Expected: PASS, final line `ALL PASS`

- [ ] **Step 5: Commit**

```bash
git add SECOND-BRAIN.md bin/test.sh
git commit -m "feat: add W8 lesson workflow and 3-trigger routing to SECOND-BRAIN.md"
```

---

### Task 4: Cluster template — 관련 교훈 section

**Files:**
- Modify: `knowledge/_templates/cluster-index.md`
- Test: `bin/test.sh` (케이스 1 block)

**Interfaces:**
- Consumes: lesson notes (LSN ids) produced by W8.
- Produces: a cluster section that recall/maintain populate with active lessons per topic.

- [ ] **Step 1: Add failing assertion to `bin/test.sh`**

In 케이스 1, find:

```bash
[ -f knowledge/_templates/meeting-note.md ] || fail "_templates 없음"
```

Add immediately after it:

```bash
grep -q '관련 교훈' knowledge/_templates/cluster-index.md || fail "cluster 템플릿에 관련 교훈 섹션 없음"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash bin/test.sh`
Expected: FAIL with `FAIL: cluster 템플릿에 관련 교훈 섹션 없음`

- [ ] **Step 3: Add the section to `knowledge/_templates/cluster-index.md`**

Find the trailing section:

```markdown
## 관련 이슈
- [[ISS-NNNN-...]] ({open|resolved})
```

Add immediately after it:

```markdown

## 관련 교훈
- [[LSN-NNNN-...]] — {규칙 요약} (trigger: {...})
```

Note: only **active** lessons are listed; superseded/archived are excluded (same as decisions). Lessons are not counted in the `members:` frontmatter total (that counts core-`topics` notes only, per SECOND-BRAIN.md).

- [ ] **Step 4: Run test to verify it passes**

Run: `bash bin/test.sh`
Expected: PASS, final line `ALL PASS`

- [ ] **Step 5: Commit**

```bash
git add knowledge/_templates/cluster-index.md bin/test.sh
git commit -m "feat: add 관련 교훈 section to cluster template"
```

---

### Task 5: Three trigger commands (capture / recall / maintain)

**Files:**
- Create: `.claude/commands/capture.md`, `.claude/commands/recall.md`, `.claude/commands/maintain.md`
- Create: `.codex/prompts/capture.md`, `.codex/prompts/recall.md`, `.codex/prompts/maintain.md`
- Test: `bin/test.sh` (케이스 1 block)

**Interfaces:**
- Consumes: W8 + trigger routing from Task 3. Each command is a thin pointer to the SECOND-BRAIN.md workflow — no logic duplicated.

- [ ] **Step 1: Add failing assertions to `bin/test.sh`**

In 케이스 1, find:

```bash
[ -f .claude/commands/ingest-doc.md ] || fail "ingest-doc 커맨드 미설치"
```

Add immediately after it:

```bash
[ -f .claude/commands/capture.md ] || fail "capture 커맨드 미설치"
[ -f .claude/commands/recall.md ] || fail "recall 커맨드 미설치"
[ -f .claude/commands/maintain.md ] || fail "maintain 커맨드 미설치"
[ -f .codex/prompts/capture.md ] || fail "capture codex 프롬프트 미설치"
[ -f .codex/prompts/recall.md ] || fail "recall codex 프롬프트 미설치"
[ -f .codex/prompts/maintain.md ] || fail "maintain codex 프롬프트 미설치"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash bin/test.sh`
Expected: FAIL with `FAIL: capture 커맨드 미설치`

- [ ] **Step 3: Create the 3 Claude command files (frontmatter style)**

`.claude/commands/capture.md`:

```markdown
---
description: 입력을 판단해 회의/문서/이슈/교훈 중 알맞은 곳에 저장 (기억해)
---

Capture the input into the vault, per SECOND-BRAIN.md — the "capture" trigger.

Input: $ARGUMENTS (file path or pasted content; if empty, ask).

1. Classify the input: transcript → meeting (W1); spec/기획서/article →
   doc (W7); bug/symptom report → issue (W6); a work-rule / preference /
   judgment heuristic → lesson (W8). Ambiguous → ask, never guess.
2. Run the matching ingestion workflow end to end (원본 보존·클러스터 갱신·
   충돌/재발 검사 포함).
```

`.claude/commands/recall.md`:

```markdown
---
description: 주제 관련 결정·이슈·문서·교훈·충돌을 모아 Context Brief 작성 (꺼내줘)
---

Gather vault context on a topic, per SECOND-BRAIN.md workflow W3 — the
"recall" trigger.

Input: $ARGUMENTS (the topic or task; if empty, ask).

1. Identify relevant topics, then collect: active decisions (official →
   internal → external), latest meeting context, relevant docs (`topics`
   first, `topics_ref` as reference), open/resolved issues (W6), and relevant
   lessons — grep `lessons/` frontmatter for matching `trigger`/`topics` (W8).
2. Run conflict detection (W4) between the request and active decisions.
3. Write a Context Brief in chat (not a file): goal, constraints (cite DEC
   ids), docs (cite DOC ids + authority), past issues (cite ISS ids),
   관련 교훈 (cite LSN ids), open questions.
```

`.claude/commands/maintain.md`:

```markdown
---
description: 클러스터 재구성 + 중복 토픽 병합 + 세션 교훈 수확 (정리해)
---

Maintain the vault, per SECOND-BRAIN.md — the "maintain" trigger.

1. Run a FULL clustering pass (W2): rescan all frontmatter, rebuild every
   cluster note, merge near-duplicate topic slugs (update `_topics.md`, retag
   affected notes). Populate each cluster's "관련 교훈" with active lessons.
2. Sweep the current session for candidate lessons (W8 on-demand): propose
   each as "이거 교훈으로 남길까요?" and save approved ones as LSN notes.
```

- [ ] **Step 4: Create the 3 Codex prompt files (imperative, no frontmatter)**

`.codex/prompts/capture.md`:

```markdown
Capture the input into the vault, per SECOND-BRAIN.md — the "capture" trigger.

Input: the file path or pasted content below (if empty, ask).

Steps:
1. Classify: transcript → meeting (W1); spec/기획서/article → doc (W7);
   bug/symptom report → issue (W6); work-rule/preference/heuristic →
   lesson (W8). Ambiguous → ask, never guess.
2. Run the matching ingestion workflow end to end (원본 보존, 클러스터 갱신,
   충돌/재발 검사 포함).
```

`.codex/prompts/recall.md`:

```markdown
Gather vault context on a topic, per SECOND-BRAIN.md workflow W3 — the
"recall" trigger.

Input: the topic or task below (if empty, ask).

Steps:
1. Collect active decisions (official → internal → external), latest meeting
   context, relevant docs (`topics` first, `topics_ref` as reference),
   open/resolved issues (W6), and relevant lessons — grep `lessons/`
   frontmatter for matching `trigger`/`topics` (W8).
2. Run conflict detection (W4) against active decisions.
3. Write a Context Brief in chat: goal, constraints (DEC ids), docs (DOC ids
   + authority), past issues (ISS ids), 관련 교훈 (LSN ids), open questions.
```

`.codex/prompts/maintain.md`:

```markdown
Maintain the vault, per SECOND-BRAIN.md — the "maintain" trigger.

Steps:
1. FULL clustering pass (W2): rescan all frontmatter, rebuild every cluster
   note, merge near-duplicate topics (update `_topics.md`, retag). Populate
   each cluster's "관련 교훈" with active lessons.
2. Sweep the current session for candidate lessons (W8 on-demand): propose
   each as "이거 교훈으로 남길까요?" and save approved ones as LSN notes.
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bash bin/test.sh`
Expected: PASS, final line `ALL PASS`

- [ ] **Step 6: Commit**

```bash
git add .claude/commands/capture.md .claude/commands/recall.md .claude/commands/maintain.md \
        .codex/prompts/capture.md .codex/prompts/recall.md .codex/prompts/maintain.md bin/test.sh
git commit -m "feat: add capture/recall/maintain trigger commands"
```

---

### Task 6: README / docs mention of the learning layer

**Files:**
- Modify: `README.md` (repo root — the installer-facing readme; verify it exists and mentions commands before editing)
- Test: manual (`README.md` is not installed into targets; no test.sh assertion)

**Interfaces:**
- Consumes: everything above. Documentation only.

- [ ] **Step 1: Check whether README lists the commands**

Run: `grep -n 'ingest-meeting\|명령\|command' README.md | head`
Expected: shows a command list section (if README has none, skip this task and note it in the completion summary).

- [ ] **Step 2: Add a short learning-layer note**

In the command/usage section of `README.md`, add a brief entry describing the
3 triggers (capture / recall / maintain) and the `lesson` note type, matching
the surrounding format and language. Keep it to a few lines — mirror the
existing command descriptions' tone.

- [ ] **Step 3: Verify the full suite still passes**

Run: `bash bin/test.sh`
Expected: PASS, final line `ALL PASS` (README is not installer-scaffolded, so this only confirms nothing regressed).

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: mention learning layer and 3 triggers in README"
```

---

## Self-Review

**Spec coverage:**
- Part 1 (lesson note type) → Task 1 (template/folder) + Task 2 (schema in SECOND-BRAIN.md). ✓
- Part 2 (3 triggers, 9 aliases kept) → Task 3 (routing doc) + Task 5 (command files). ✓
- Part 3 (opportunistic + on-demand capture, no hook; recall application) → Task 3 (W8) + Task 5 (recall/maintain commands). ✓
- Cross-cutting: clusters "관련 교훈" → Task 4. ✓ Topics vocab reuse → documented in W8/routing (Task 3). ✓ Work-log line → covered by existing SECOND-BRAIN.md General rules (lesson is "any note"), no new task needed. ✓ Supersede chain → Task 2 schema + Task 3 W8. ✓
- Non-goal (no Stop hook / no init.js change) → honored; installer auto-discovers. ✓

**Placeholder scan:** No TBD/TODO. All file contents are complete and literal. The only conditional is Task 6 Step 1 (README may lack a command section) — handled with an explicit skip instruction, not a placeholder.

**Type consistency:** Frontmatter keys `type,id,created,topics,trigger,status,source,supersedes,superseded_by,related` are identical across Task 1 (template), Task 2 (schema doc). Status enum `active | superseded | archived` consistent in Task 1, 2, 3. Trigger verbs `capture/recall/maintain` consistent across Task 3 (routing), Task 5 (both command variants). ID prefix `LSN-NNNN` consistent throughout.
