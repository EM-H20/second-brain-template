# Status Lifecycle & Skill Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the vault's status lifecycle (total per-type vocabulary, `reviewed:` key, 3-month staleness flags, harness consumption semantics) and give Claude Code the same auto-discovered skill Codex already has.

**Architecture:** All schema/workflow rules live in one file (`SECOND-BRAIN.md`); templates, the two SKILL.md copies, AGENTS.md, and README (4 language blocks) restate or point to it. `bin/init.js` installs template-owned files by marker and walks the `knowledge/` tree, so a new file under `knowledge/` needs no installer change, while a new `.claude/skills` directory needs one line in `buildPlan()`. `bin/test.sh` is the only test harness — it installs into a temp dir and greps the installed artifacts, so every content change is TDD'd by adding a failing grep first.

**Tech Stack:** Markdown, YAML frontmatter, Node (zero-dependency installer), bash test script.

**Spec:** `docs/superpowers/specs/2026-08-24-status-lifecycle-design.md`

## Global Constraints

- Branch: `feat/status-lifecycle` (already exists; all commits go here).
- Test command: `bash bin/test.sh` from the repo root. It must end with `ALL PASS`.
- The new SECOND-BRAIN.md section title is exactly `## Status 라이프사이클과 회수 시맨틱` — Task 4 (SKILL.md) and Task 5 (docs) reference it by that name; do not vary it.
- The staleness threshold constant is the string `3개월` and it is normative only in SECOND-BRAIN.md; README bullets restate it but SECOND-BRAIN.md is the single tunable place.
- `.claude/skills/second-brain/SKILL.md` and `.agents/skills/second-brain/SKILL.md` must be byte-identical at all times after Task 4.
- Never edit `knowledge/_templates/` beyond the exact lines specified (they are copied verbatim into user notes).
- Keep all YAML frontmatter valid after every edit.
- Commit message format: `<type>: <description>` (feat/fix/docs/test/chore), Korean description, each commit ends with the trailer line `Claude-Session: https://claude.ai/code/session_01A1xXaUjVNJidYjWW9pz2xj` (blank line before it).
- SECOND-BRAIN.md mixes Korean and English deliberately — match the surrounding style of whichever passage you edit.
- Time never changes a `status`. If any wording you write implies automatic transitions, it is wrong — staleness produces annotations and reports only.

---

### Task 1: SECOND-BRAIN.md — status lifecycle rules

**Files:**
- Modify: `SECOND-BRAIN.md` (frontmatter schema block, decision/doc type keys, new section, W2 integrity list, W3 step 4, General rules 최신성 bullet)
- Test: `bin/test.sh` (case 1 assertions, after line 33 `세션 시작 컨텍스트` grep)

**Interfaces:**
- Consumes: nothing (first task).
- Produces: the section `## Status 라이프사이클과 회수 시맨틱` and the key name `reviewed:` — Tasks 2, 4, 5 reference both verbatim.

- [ ] **Step 1: Write the failing tests**

In `bin/test.sh`, directly after the line `grep -q '세션 시작 컨텍스트' SECOND-BRAIN.md || fail "SECOND-BRAIN.md에 세션 시작 규칙 없음"`, insert:

```bash
grep -q 'Status 라이프사이클과 회수 시맨틱' SECOND-BRAIN.md || fail "SECOND-BRAIN.md에 status 시맨틱 섹션 없음"
grep -q 'reviewed: YYYY-MM-DD' SECOND-BRAIN.md || fail "SECOND-BRAIN.md에 reviewed 키 없음"
grep -q '3개월' SECOND-BRAIN.md || fail "SECOND-BRAIN.md에 오래됨 임계값 없음"
grep -q '리뷰 후보' SECOND-BRAIN.md || fail "SECOND-BRAIN.md W2에 리뷰 후보 보고 없음"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bash bin/test.sh`
Expected: `FAIL: SECOND-BRAIN.md에 status 시맨틱 섹션 없음`

- [ ] **Step 3: Edit the frontmatter schema block**

In `SECOND-BRAIN.md`, replace:

```yaml
type: meeting | decision | issue | completion-report | report | cluster | doc | lesson | index
created: YYYY-MM-DD
topics: [<topic-slug>, ...]     # lowercase kebab-case topic tags
status: active | superseded | resolved | open | archived   # per-type, see below
related: ["[[note]]", ...]      # wikilinks to related notes
```

with:

```yaml
type: meeting | decision | issue | completion-report | report | cluster | doc | lesson | index
created: YYYY-MM-DD
reviewed: YYYY-MM-DD            # decision·doc·lesson만, 선택 — 마지막 인간 확인일 ("Status 라이프사이클" 참조)
topics: [<topic-slug>, ...]     # lowercase kebab-case topic tags
status: active | superseded | resolved | open | archived   # 타입별 완결 어휘는 "Status 라이프사이클" 표 참조
related: ["[[note]]", ...]      # wikilinks to related notes
```

- [ ] **Step 4: Add `archived` to decision and doc type keys**

In the type-specific keys list, replace:

```
- decision: `id: DEC-NNNN`, `supersedes: DEC-NNNN | null`,
  `superseded_by: DEC-NNNN | null`, `status: active | superseded`
```

with:

```
- decision: `id: DEC-NNNN`, `supersedes: DEC-NNNN | null`,
  `superseded_by: DEC-NNNN | null`, `status: active | superseded | archived`
```

and in the doc entry replace the fragment `` `supersedes: DOC-NNNN | null`, `superseded_by: DOC-NNNN | null`,
  `status: active | superseded` `` with the same text ending `` `status: active | superseded | archived` ``.

- [ ] **Step 5: Insert the new section**

Insert the following complete section immediately BEFORE the line `## Topic slugs (clustering vocabulary)`:

```markdown
## Status 라이프사이클과 회수 시맨틱

**타입별 status 어휘 (완결 목록 — 이 밖의 값은 W2 무결성 검사 위반):**

| type | status 어휘 |
|---|---|
| decision, doc, lesson | `active \| superseded \| archived` |
| issue | `open \| resolved` |
| completion-report | `resolved` (고정) |
| meeting, report, cluster, index | `active` (고정 — 역사 기록·파생물은 라이프사이클이 없다) |

`archived` = 후속 없이 은퇴한 노트. supersede와 같은 불변 규칙을 따른다:
본문은 절대 삭제·수정하지 않고 status만 바꾸며, 반드시 사용자의 명시적 결정으로만 전환한다.

**`reviewed:` 키 (decision·doc·lesson 전용, 선택).** `reviewed: YYYY-MM-DD` —
인간이 이 노트가 여전히 유효함을 마지막으로 확인한 날. 없으면 `created`가 기준일.
갱신은 오직 명시적 인간 확인(주로 W2 full 리뷰 보고에 대한 응답)으로만 한다 —
에이전트가 노트를 인용했다고 자동으로 올리지 않는다.

**오래됨(stale) 판정.** `status: active`이고 `오늘 − max(created, reviewed) > 3개월`이면
리뷰 후보다. 시간 경과는 status를 절대 바꾸지 않는다 — 오래됨은 표시와 보고만 만들고,
처분은 전부 인간이 한다. 소비처는 정확히 두 곳:

- **recall / W3 (모든 Context Brief):** 오래된 노트도 제약으로 사용하되 반드시
  인라인 표기한다. 예: `DEC-0012 — ⚠ 마지막 확인 7개월 전`
- **W2 full 패스:** 무결성 검사 뒤 리뷰 후보 목록(id, 마지막 확인 경과)을 보고한다.
  건별 처분: 아직 유효 → `reviewed` 갱신 / 폐기 → `archived` / 대체됨 → supersede 체인.
  무결성 검사와 동일하게 보고만 하며 자동 수정하지 않는다. 승인된 수정은 `log.md`에 기록.

**회수 시맨틱 표** — 모든 회수 워크플로우(W2·W3·W6·W8, recall/build)가 이 표를 따른다:

| status | 회수 시 취급 |
|---|---|
| `active` (신선) | 정상 사용 — 현재 제약(decision·doc·lesson) 또는 현재 컨텍스트(고정 active 타입) |
| `active` (오래됨) | 사용하되 반드시 "미확인 N개월" 표기 |
| `superseded` | 역사로만. 현재 제약으로 인용 금지, 체인 따라 최신 후속으로 이동 |
| `archived` | 기본 제외. 명시 요청 시에만 노출 |
| `open` (issue) | 살아있는 문제 — W3/W6에 현재형으로 노출 |
| `resolved` (issue·completion-report) | 종결. 단 W6 재발 탐지의 핵심 재료 — resolved ≠ 무시 |

클러스터 노트는 archived 결정·문서를 superseded와 함께 역사 섹션에 `(archived)` 표기로 나열한다.
```

- [ ] **Step 6: Extend W2 integrity check and full pass**

In the W2 무결성 검사 numbered list, replace:

```
1. **frontmatter** — YAML 파싱 실패, type별 필수 키 누락, 해당 type에 없는 `status` 값
```

with:

```
1. **frontmatter** — YAML 파싱 실패, type별 필수 키 누락, 해당 type에 없는 `status` 값,
   `reviewed` 규칙 위반(decision·doc·lesson 외 타입에 존재, 날짜 형식 오류, `created`보다 이른 날짜)
```

Then, after the numbered item 7 (`**source 경로**` …ending `(경로 존재만 확인한다. `_sources/` 본문은 열지 않는다)`) and before the paragraph starting `**검사는 절대 자동 수정하지 않는다.**`, insert:

```markdown
무결성 검사 보고에 이어, full 패스는 **리뷰 후보**(오래된 active 노트 — "Status 라이프사이클과
회수 시맨틱"의 3개월 규칙)도 함께 보고한다: id와 마지막 확인 경과를 나열하고, 건별 처분
(유효 확인 → `reviewed` 갱신 / 폐기 → `archived` / 대체 → supersede 체인)은 사용자가 정한다.
```

- [ ] **Step 7: Extend W3 step 4 and the 최신성 General rule**

In W3, replace:

```
4. Write a **Context Brief** (in chat, not a file): goal, constraints from
   decisions (cite DEC ids), relevant docs (cite DOC ids + authority),
   relevant past issues (cite ISS ids), open questions.
```

with:

```
4. Write a **Context Brief** (in chat, not a file): goal, constraints from
   decisions (cite DEC ids), relevant docs (cite DOC ids + authority),
   relevant past issues (cite ISS ids), open questions. 인용한 active 노트가
   오래됨(stale) 판정이면 반드시 "⚠ 마지막 확인 N개월 전"을 함께 표기한다.
```

In General rules, replace:

```
  active 결정이 둘 이상이면 임의로 날짜를 비교하지 말고 W4로 사용자에게 확인한다.
```

with:

```
  active 결정이 둘 이상이면 임의로 날짜를 비교하지 말고 W4로 사용자에게 확인한다.
  오래됨(stale) 표시는 신뢰도 신호일 뿐, 날짜로 최신성을 고르는 데 쓰지 않는다.
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `bash bin/test.sh`
Expected: `ALL PASS`

- [ ] **Step 9: Commit**

```bash
git add SECOND-BRAIN.md bin/test.sh
git commit -m "feat: status 어휘 완결 + reviewed 키 + 오래됨 규칙 + 회수 시맨틱 표

Claude-Session: https://claude.ai/code/session_01A1xXaUjVNJidYjWW9pz2xj"
```

---

### Task 2: Note templates — `reviewed` key and `archived` vocab

**Files:**
- Modify: `knowledge/_templates/decision.md:4-6`, `knowledge/_templates/doc.md:6-12`, `knowledge/_templates/lesson.md:4-7`
- Test: `bin/test.sh` (case 1, near the existing decision-template greps)

**Interfaces:**
- Consumes: key name `reviewed:` from Task 1.
- Produces: template frontmatter lines that future notes copy verbatim.

- [ ] **Step 1: Write the failing tests**

In `bin/test.sh`, directly after `grep -q '논의 기록 없음' knowledge/_templates/decision.md || fail "결정 템플릿에 빈 섹션 지침 없음"`, insert:

```bash
grep -q '^reviewed: null' knowledge/_templates/decision.md || fail "결정 템플릿에 reviewed 키 없음"
grep -q 'archived' knowledge/_templates/decision.md || fail "결정 템플릿 status 어휘에 archived 없음"
grep -q '^reviewed: null' knowledge/_templates/doc.md || fail "doc 템플릿에 reviewed 키 없음"
grep -q 'archived' knowledge/_templates/doc.md || fail "doc 템플릿 status 어휘에 archived 없음"
grep -q '^reviewed: null' knowledge/_templates/lesson.md || fail "lesson 템플릿에 reviewed 키 없음"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bash bin/test.sh`
Expected: `FAIL: 결정 템플릿에 reviewed 키 없음`

- [ ] **Step 3: Edit the three templates**

`knowledge/_templates/decision.md` — replace:

```yaml
created: YYYY-MM-DD
topics: []
status: active        # active | superseded
```

with:

```yaml
created: YYYY-MM-DD
reviewed: null        # 마지막 인간 확인일 YYYY-MM-DD — W2 리뷰 확인 시에만 갱신
topics: []
status: active        # active | superseded | archived
```

`knowledge/_templates/doc.md` — replace:

```yaml
created: YYYY-MM-DD
source: ""            # _sources/docs/<id>.md (텍스트 보존 시) 또는 외부 URL
```

with:

```yaml
created: YYYY-MM-DD
reviewed: null        # 마지막 인간 확인일 YYYY-MM-DD — W2 리뷰 확인 시에만 갱신
source: ""            # _sources/docs/<id>.md (텍스트 보존 시) 또는 외부 URL
```

and replace `status: active        # active | superseded` with
`status: active        # active | superseded | archived`.

`knowledge/_templates/lesson.md` — replace:

```yaml
created: YYYY-MM-DD
topics: []
```

with:

```yaml
created: YYYY-MM-DD
reviewed: null        # 마지막 인간 확인일 YYYY-MM-DD — W2 리뷰 확인 시에만 갱신
topics: []
```

(lesson's status line already reads `# active | superseded | archived` — leave it.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `bash bin/test.sh`
Expected: `ALL PASS`

- [ ] **Step 5: Commit**

```bash
git add knowledge/_templates/decision.md knowledge/_templates/doc.md knowledge/_templates/lesson.md bin/test.sh
git commit -m "feat: 템플릿에 reviewed 키·archived 어휘 반영 (decision·doc·lesson)

Claude-Session: https://claude.ai/code/session_01A1xXaUjVNJidYjWW9pz2xj"
```

---

### Task 3: `knowledge/.obsidian/types.json` — Obsidian property type registry

**Files:**
- Create: `knowledge/.obsidian/types.json`
- Test: `bin/test.sh` (case 1 near the graph.json assert; case 3 near the graph.json preservation assert)

**Interfaces:**
- Consumes: key name `reviewed` from Task 1.
- Produces: nothing downstream (human-facing only; installed automatically by init.js's existing `knowledge/` tree walk via `planIfMissing` — NO init.js change in this task).

- [ ] **Step 1: Write the failing tests**

In `bin/test.sh` case 1, directly after `[ -f knowledge/.obsidian/graph.json ] || fail "graph.json 미설치"`, insert:

```bash
[ -f knowledge/.obsidian/types.json ] || fail "types.json 미설치"
node -e '
const t = require("./knowledge/.obsidian/types.json").types;
if (t.reviewed !== "date" || t.created !== "date") throw new Error("날짜 타입 미등록");
for (const k of ["topics", "topics_ref", "related", "symptoms", "attendees", "decisions"]) {
  if (t[k] !== "multitext") throw new Error(k + " 리스트 타입 미등록");
}
' || fail "types.json 프로퍼티 타입 검증 실패"
```

In case 3, directly after `grep -q '"scale": 2' knowledge/.obsidian/graph.json || fail ".obsidian 사용자 설정 덮어씀"`, insert:

```bash
printf '{"types": {"custom": "text"}}\n' > knowledge/.obsidian/types.json
node "$ROOT/bin/init.js" -y > out6.log
grep -q '"custom"' knowledge/.obsidian/types.json || fail "types.json 사용자 설정 덮어씀"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bash bin/test.sh`
Expected: `FAIL: types.json 미설치`

- [ ] **Step 3: Create the file**

Create `knowledge/.obsidian/types.json` with exactly:

```json
{
  "types": {
    "created": "date",
    "reviewed": "date",
    "topics": "multitext",
    "topics_ref": "multitext",
    "related": "multitext",
    "symptoms": "multitext",
    "attendees": "multitext",
    "decisions": "multitext"
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bash bin/test.sh`
Expected: `ALL PASS`

- [ ] **Step 5: Commit**

```bash
git add knowledge/.obsidian/types.json bin/test.sh
git commit -m "feat: Obsidian 프로퍼티 타입 레지스트리(types.json) 스캐폴딩

Claude-Session: https://claude.ai/code/session_01A1xXaUjVNJidYjWW9pz2xj"
```

---

### Task 4: Skill parity — `.claude/skills` copy, installer, packaging

**Files:**
- Modify: `.agents/skills/second-brain/SKILL.md` (step 6)
- Create: `.claude/skills/second-brain/SKILL.md` (byte-identical copy)
- Modify: `bin/init.js:142` (dirs array), `package.json:12-22` (`files`)
- Test: `bin/test.sh` (packaging guard array, new repo-level parity check, case 1 asserts)

**Interfaces:**
- Consumes: section title `## Status 라이프사이클과 회수 시맨틱` from Task 1.
- Produces: the path `.claude/skills/second-brain/SKILL.md` — Task 5's docs reference it.

- [ ] **Step 1: Write the failing tests**

In `bin/test.sh`, replace the packaging-guard array line
`for (const p of [".claude/hooks", ".claude/settings.json"]) {`
with
`for (const p of [".claude/hooks", ".claude/settings.json", ".claude/skills"]) {`.

Directly after the `echo "packaging guard OK"` line, insert:

```bash
# 두 SKILL.md 사본은 항상 동일해야 한다 — Claude(.claude/skills)와 Codex(.agents/skills)가 같은 스킬을 본다
diff -q "$ROOT/.claude/skills/second-brain/SKILL.md" "$ROOT/.agents/skills/second-brain/SKILL.md" > /dev/null \
  || fail "SKILL.md 두 사본 불일치 (.claude/skills vs .agents/skills)"
echo "skill parity OK"
```

In case 1, directly after `grep -q 'setup' .agents/skills/second-brain/SKILL.md || fail "Codex skill에 볼트 초기화 트리거 없음"`, insert:

```bash
[ -f .claude/skills/second-brain/SKILL.md ] || fail "Claude repo skill 없음"
grep -q 'second-brain-template' .claude/skills/second-brain/SKILL.md || fail "Claude repo skill에 마커 없음"
grep -q 'Status 라이프사이클' .claude/skills/second-brain/SKILL.md || fail "skill에 status 시맨틱 참조 없음"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bash bin/test.sh`
Expected: `FAIL: package.json files 누락` (with node's error above it naming `.claude/skills`)

- [ ] **Step 3: Extend SKILL.md step 6 and create the copy**

In `.agents/skills/second-brain/SKILL.md`, replace:

```
6. Use `status` and supersede chains for currency. If active decisions conflict,
   stop and ask the user exactly as W4 requires.
```

with:

```
6. Use `status` and supersede chains for currency, and consume every status per
   the "Status 라이프사이클과 회수 시맨틱" table in `SECOND-BRAIN.md`: superseded
   is history only, archived is excluded unless explicitly requested, and stale
   active notes (unconfirmed > 3개월) must carry a "⚠ 마지막 확인 N개월 전"
   annotation in every Context Brief. If active decisions conflict, stop and ask
   the user exactly as W4 requires.
```

Then create the copy:

```bash
mkdir -p .claude/skills/second-brain
cp .agents/skills/second-brain/SKILL.md .claude/skills/second-brain/SKILL.md
```

(Do NOT copy `agents/openai.yaml` — it is Codex-only UI metadata.)

- [ ] **Step 4: Wire installer and packaging**

In `bin/init.js`, replace:

```js
  for (const dir of ['.claude/commands', '.claude/hooks', '.codex/prompts']) {
```

with:

```js
  for (const dir of ['.claude/commands', '.claude/hooks', '.claude/skills', '.codex/prompts']) {
```

(planOwned appends the HTML-comment marker at install time to both copies identically, and skips any unmarked user file with a warning — same behavior the commands already have.)

In `package.json` `files`, insert `".claude/skills",` between `".claude/settings.json",` and `".codex/prompts",` — result:

```json
  "files": [
    "bin",
    "SECOND-BRAIN.md",
    "AGENTS.md",
    ".agents/skills/second-brain",
    ".claude/commands",
    ".claude/hooks",
    ".claude/settings.json",
    ".claude/skills",
    ".codex/prompts",
    "knowledge"
  ],
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `bash bin/test.sh`
Expected: `ALL PASS` (including `skill parity OK`)

- [ ] **Step 6: Commit**

```bash
git add .agents/skills/second-brain/SKILL.md .claude/skills/second-brain/SKILL.md bin/init.js package.json bin/test.sh
git commit -m "feat: Claude·Codex 겸용 스킬 사본 + 동기화 가드 (skill parity)

Claude-Session: https://claude.ai/code/session_01A1xXaUjVNJidYjWW9pz2xj"
```

---

### Task 5: AGENTS.md and README (4 language blocks)

**Files:**
- Modify: `AGENTS.md:16-21` (Command equivalents)
- Modify: `README.md` — per language block: EN 12–338, 中文 339–651, 日本語 653–976, 한국어 977–end. Three edits each: Structure tree, Cross-CLI interface list, Safety-defaults bullet.

**Interfaces:**
- Consumes: path `.claude/skills/second-brain/` (Task 4), threshold `3개월` / "3 months" (Task 1).
- Produces: nothing downstream.

- [ ] **Step 1: Edit AGENTS.md**

Replace:

```
Claude Code exposes these workflows as slash commands in `.claude/commands/`.
Codex discovers the repository skill at `.agents/skills/second-brain/SKILL.md`;
invoke it with natural language or `$second-brain`. `.codex/prompts/` is kept
only for deprecated custom-prompt compatibility.
```

with:

```
Claude Code exposes these workflows as slash commands in `.claude/commands/`
and auto-discovers the same repository skill at
`.claude/skills/second-brain/SKILL.md`. Codex discovers its copy at
`.agents/skills/second-brain/SKILL.md`; invoke it with natural language or
`$second-brain`. The two SKILL.md files are kept byte-identical (guarded by
`bin/test.sh`). `.codex/prompts/` is kept only for deprecated custom-prompt
compatibility.
```

- [ ] **Step 2: Edit the Korean README block (reference edit)**

(a) Structure tree — after the line
`.claude/settings.json 훅 등록 (기존 파일이 있으면 항목만 병합)`, insert:

```
.claude/skills/second-brain/ Claude 저장소 스킬 (자동 인식, Codex 사본과 동일)
```

(b) Cross-CLI list — replace `- Claude Code: \`.claude/commands/\` (자동 인식)` with:

```
- Claude Code: `.claude/commands/` + `.claude/skills/second-brain/` (둘 다 자동 인식)
```

(c) 안전·검색 기본값 — after the `**결정적 최신성 판정:**` bullet, insert:

```
- **오래됨은 표시로만:** active 노트가 3개월 넘게 미확인이면 회수 시 "⚠ 마지막 확인
  N개월 전"을 표기하고 W2 full 패스가 리뷰 후보로 보고한다. 시간 경과가 status를
  바꾸는 일은 없다 — 처분(유효 확인 → `reviewed` 갱신 / `archived` / supersede)은 인간만 한다.
```

- [ ] **Step 3: Edit the English README block**

(a) Structure tree — after `.claude/settings.json hook registration (merges one entry if the file already exists)`, insert:

```
.claude/skills/second-brain/ Claude repo skill (auto-detected, identical to the Codex copy)
```

(b) Cross-CLI list — replace `- Claude Code: \`.claude/commands/\` (auto-detected)` with:

```
- Claude Code: `.claude/commands/` + `.claude/skills/second-brain/` (both auto-detected)
```

(c) Safety and retrieval defaults — after the `**Deterministic currency:**` bullet, insert:

```
- **Staleness is a flag, not a transition:** an active note unconfirmed for over 3 months is
  annotated ("⚠ unconfirmed for N months") at recall time and reported as a review candidate by
  the full W2 pass. Time never changes a `status` — disposal (confirm → bump `reviewed` /
  `archived` / supersede) is always a human decision.
```

- [ ] **Step 4: Edit the 中文 and 日本語 README blocks**

Apply the same three edits to the 中文 block (339–651) and 日本語 block (653–976), translating the Korean reference text of Step 2 into each block's existing tone and terminology (each block already translates the same tree lines, the same Cross-CLI list, and the same safety bullets — mirror their phrasing; e.g. the tree anchor lines are `.claude/settings.json 挂钩注册…` / `.claude/settings.json フック登録…`, and the safety anchor bullets are `**确定性判断最新状态：**` / `**現在状態を決定的に判定：**`). Keep code-literals (`.claude/skills/second-brain/`, `reviewed`, `archived`, `W2`) untranslated.

- [ ] **Step 5: Verify**

Run: `bash bin/test.sh`
Expected: `ALL PASS` (README is not installed, but the run guards against accidental damage elsewhere).

Then verify all four blocks got all three edits:

```bash
grep -c '.claude/skills/second-brain/' README.md
```

Expected: `8` (tree line + cross-CLI line, × 4 languages).

- [ ] **Step 6: Commit**

```bash
git add AGENTS.md README.md
git commit -m "docs: 스킬 패리티·오래됨 규칙 문서 반영 (AGENTS.md + README 4개 언어판)

Claude-Session: https://claude.ai/code/session_01A1xXaUjVNJidYjWW9pz2xj"
```

---

### Task 6: Final verification against the spec

**Files:**
- Read: `docs/superpowers/specs/2026-08-24-status-lifecycle-design.md`, all files changed in Tasks 1–5.

**Interfaces:**
- Consumes: everything above.
- Produces: a verified branch ready for review/merge.

- [ ] **Step 1: Full test run**

Run: `bash bin/test.sh`
Expected: `ALL PASS`

- [ ] **Step 2: Spec sweep**

Check each spec requirement has landed (A1 vocab table, A2 `reviewed`, A3 two-consumer staleness rule, A4 semantics table, A5 integrity additions, A6 types.json, Part B copy + parity guard + installer + packaging + docs). Check the two SKILL.md copies:

```bash
diff .claude/skills/second-brain/SKILL.md .agents/skills/second-brain/SKILL.md
```

Expected: no output.

- [ ] **Step 3: Confirm no stray changes**

Run: `git diff main...HEAD --stat`
Expected: only the files named in Tasks 1–5 plus the spec and this plan. Report the result; do not push or open a PR without the user's go-ahead (per repo rules, code/rule changes ship via branch + PR).
