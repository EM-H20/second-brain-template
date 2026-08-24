# Command-to-Skill Promotion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promote the 12 slash commands to 12 paired cross-CLI skills, retire the command/prompt surfaces with marker-verified installer cleanup, and update every documenting surface.

**Architecture:** Skills are byte-identical pairs (`.claude/skills/<name>/SKILL.md` ≡ `.agents/skills/<name>/SKILL.md`) with trigger-rich bilingual descriptions; bodies carry over verbatim from the commands. `bin/init.js` installs template-owned files by marker; a new hardcoded RETIRED list deletes old marker-bearing commands/prompts on re-run (never unmarked user files). `bin/test.sh` is the only harness — every change lands assert-first (RED→GREEN).

**Tech Stack:** Markdown + YAML frontmatter, Node (zero-dependency installer), bash test script.

**Spec:** `docs/superpowers/specs/2026-08-24-skill-promotion-design.md`

## Global Constraints

- Branch: `feat/skill-promotion` (exists; all commits go here).
- Test command: `bash bin/test.sh` from repo root; must end `ALL PASS`.
- The 13 skill names, used everywhere verbatim: `build capture check-conflict cluster find-similar-issue ingest-doc ingest-issue ingest-meeting maintain recall report setup-vault second-brain`.
- Every `.claude/skills/<name>/SKILL.md` must be byte-identical to `.agents/skills/<name>/SKILL.md` at every commit from Task 1 on.
- Skill descriptions are single-line YAML plain scalars — they must NOT contain the sequence `: ` (colon+space) anywhere.
- Skill bodies are the former command bodies VERBATIM — no rewording, `$ARGUMENTS` kept. Only the frontmatter is new.
- Retirement deletes ONLY files that contain the ownership marker for their type (`<!-- second-brain-template -->` for .md); unmarked files are never touched.
- The umbrella `second-brain` skill's content is not modified in any task.
- Commit format: `<type>: <description>` Korean description, blank line, trailer `Claude-Session: https://claude.ai/code/session_01A1xXaUjVNJidYjWW9pz2xj`.

---

### Task 1: Author the 12 skill pairs + generalized parity guard

**Files:**
- Create: `.agents/skills/<name>/SKILL.md` and `.claude/skills/<name>/SKILL.md` for the 12 promoted names (24 files)
- Modify: `bin/test.sh` (replace the single-pair parity check with a 13-skill loop)
- Test: `bin/test.sh`

**Interfaces:**
- Consumes: the 12 command files at `.claude/commands/<name>.md` (bodies copied verbatim; files themselves are deleted in Task 2, not here).
- Produces: the 13-pair skill layout and the parity-loop guard that Tasks 2–3 rely on.

- [ ] **Step 1: Write the failing test**

In `bin/test.sh`, replace this block (inserted by the earlier status-lifecycle work, directly after `echo "packaging guard OK"`):

```bash
# 두 SKILL.md 사본은 항상 동일해야 한다 — Claude(.claude/skills)와 Codex(.agents/skills)가 같은 스킬을 본다
diff -q "$ROOT/.claude/skills/second-brain/SKILL.md" "$ROOT/.agents/skills/second-brain/SKILL.md" > /dev/null \
  || fail "SKILL.md 두 사본 불일치 (.claude/skills vs .agents/skills)"
echo "skill parity OK"
```

with:

```bash
# 두 스킬 트리는 항상 같은 스킬 집합의 바이트 동일 사본이어야 한다 — Claude와 Codex가 같은 스킬을 본다
A_SKILLS=$(ls "$ROOT/.agents/skills")
C_SKILLS=$(ls "$ROOT/.claude/skills")
[ "$A_SKILLS" = "$C_SKILLS" ] || fail "스킬 집합 불일치 (.agents/skills vs .claude/skills)"
[ "$(echo "$A_SKILLS" | wc -l | tr -d ' ')" = "13" ] || fail "스킬 수가 13이 아님"
for s in $A_SKILLS; do
  diff -q "$ROOT/.claude/skills/$s/SKILL.md" "$ROOT/.agents/skills/$s/SKILL.md" > /dev/null \
    || fail "SKILL.md 사본 불일치: $s"
done
echo "skill parity OK (13)"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash bin/test.sh`
Expected: `FAIL: 스킬 수가 13이 아님` (both trees currently hold only `second-brain`)

- [ ] **Step 3: Author the 12 skills in `.agents/skills/`**

For each name below, create `.agents/skills/<name>/SKILL.md` as: the frontmatter block given here, then a blank line, then the BODY of `.claude/commands/<name>.md` copied verbatim (everything after that file's closing `---` line, excluding the frontmatter). Do not alter body text.

`capture`:
```yaml
---
name: capture
description: 입력을 판단해 회의/문서/이슈/교훈 중 알맞은 곳에 저장 (기억해). Use when the user wants something remembered or filed into the vault and the note type should be inferred — a meeting transcript, a document, an issue, or a reusable lesson. Triggers include 기억해, 저장해, capture, "볼트에 넣어줘", and ambiguous ingest requests.
---
```

`recall`:
```yaml
---
name: recall
description: 주제 관련 결정·이슈·문서·교훈·충돌을 모아 Context Brief 작성 (꺼내줘). Use when the user asks what is known about a topic or needs project context before working — active decisions, docs, open/resolved issues, lessons, and conflicts in one brief. Triggers include 꺼내줘, recall, "관련 결정 뭐였지", and requests for context on a task.
---
```

`maintain`:
```yaml
---
name: maintain
description: 무결성 검사 + 클러스터 재구성 + 중복 토픽 병합 + 세션 교훈 수확 (정리해). Use when the user asks to tidy or audit the vault — full integrity check, review candidates, cluster rebuild, duplicate-topic merge, and a sweep of the session for lessons. Triggers include 정리해, maintain, vault cleanup, and vault audit requests.
---
```

`ingest-meeting`:
```yaml
---
name: ingest-meeting
description: 회의 전사체(.md/텍스트)를 구조화해 볼트에 저장하고, 결정 분리·클러스터 갱신·충돌 검사를 수행. Use when the input is a meeting transcript or minutes to store — extracts decisions into separate notes, updates clusters, and runs conflict detection. Triggers include 회의록, 전사체, meeting transcript, and "이 회의 내용 넣어줘".
---
```

`ingest-doc`:
```yaml
---
name: ingest-doc
description: 기획서·스펙·리서치·아티클 등 일반 문서를 지식화해 docs/에 저장 (권위·연관 가중치 + 결정 추출). Use when the input is a document — spec, PRD, design draft, research, or article — to summarize into the vault with authority weighting and decision extraction. Triggers include 문서 넣어줘, 기획서, 스펙, and document ingestion requests.
---
```

`ingest-issue`:
```yaml
---
name: ingest-issue
description: 이슈 또는 완료 리포트 파일을 지식화해 issues/에 저장 (재발 탐지의 재료). Use when the input is an issue writeup or a completion report — extracts symptom keywords for future recurrence detection and closes issues with cross-links. Triggers include 이슈 기록해, 완료 리포트, postmortem, and troubleshooting-record ingestion.
---
```

`find-similar-issue`:
```yaml
---
name: find-similar-issue
description: 현재 문제와 유사한 과거 이슈를 볼트에서 찾아 원인·해결책을 제시. Use when debugging or hitting an error to check whether the vault has seen it before — matches symptoms and topics, then surfaces the past root cause and fix. Triggers include 비슷한 이슈, "전에도 이런 일 있었나", and recurring-bug checks.
---
```

`check-conflict`:
```yaml
---
name: check-conflict
description: 새 의견/결정이 과거 활성 결정과 충돌하는지 검사하고, 충돌 시 선택지를 제시. Use before adopting a new decision or direction to test it against active decisions — on conflict, presents keep/supersede/conditional options per W4. Triggers include 충돌 검사, "예전 결정이랑 안 부딪혀?", and decision consistency checks.
---
```

`cluster`:
```yaml
---
name: cluster
description: 볼트 전체를 재스캔해 무결성을 검사하고 주제 클러스터를 재구성 + 중복 토픽 병합. Use for a full W2 pass over the vault — integrity findings, review candidates, cluster rebuild, topic merges. Triggers include 클러스터 재구성, 재스캔, and full vault rescan requests.
---
```

`build`:
```yaml
---
name: build
description: 볼트의 결정·회의·이슈를 컨텍스트로 모아 브리프를 만들고, 설치된 하네스 워크플로우로 구현을 진행. Use when implementing something that should honor stored decisions — assembles a Context Brief (active decisions, docs, issues, lessons) then hands off to the installed dev harness. Triggers include 볼트 기반으로 구현해, build from vault context.
---
```

`report`:
```yaml
---
name: report
description: 사용자가 준 양식에 맞춰 볼트 내용을 근거로 보고서를 작성해 reports/에 저장. Use when the user supplies a report format or template to fill strictly from vault content with note ids cited. Triggers include 보고서 만들어줘, 주간보고, and report generation from the vault.
---
```

`setup-vault`:
```yaml
---
name: setup-vault
description: 템플릿 clone 직후 1회 실행 — 프로젝트 정보 반영 및 볼트 초기화. Use once right after cloning or installing the template to initialise the vault and verify the knowledge/ skeleton, templates, vocabulary, and log exist. Triggers include 볼트 초기화, setup vault, and post-install verification.
---
```

- [ ] **Step 4: Mirror to `.claude/skills/`**

```bash
for s in build capture check-conflict cluster find-similar-issue ingest-doc ingest-issue ingest-meeting maintain recall report setup-vault; do
  mkdir -p .claude/skills/$s
  cp .agents/skills/$s/SKILL.md .claude/skills/$s/SKILL.md
done
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bash bin/test.sh`
Expected: `ALL PASS` with `skill parity OK (13)` (commands still exist and still install — their asserts are reworked in Task 2)

- [ ] **Step 6: Commit**

```bash
git add .agents/skills .claude/skills bin/test.sh
git commit -m "feat: 커맨드 12종을 크로스-CLI 스킬 쌍으로 승격 + 패리티 가드 일반화

Claude-Session: https://claude.ai/code/session_01A1xXaUjVNJidYjWW9pz2xj"
```

---

### Task 2: Retire commands/prompts — installer cleanup, packaging, test rework

**Files:**
- Delete: `.claude/commands/*.md` (12), `.codex/prompts/*` (13: 12 prompts + README.md)
- Modify: `bin/init.js` (dirs array, `.agents/skills` walk, RETIRED + planRetired + analysis line + applyAction + empty-dir cleanup, output text), `package.json` (`files`), `bin/test.sh` (packaging guard, case 1/2/3 rework, retirement scenario)
- Test: `bin/test.sh`

**Interfaces:**
- Consumes: the 13-pair layout and parity loop from Task 1.
- Produces: the retired surfaces and installer cleanup that Task 3's docs describe.

- [ ] **Step 1: Write the failing tests**

All edits in `bin/test.sh`:

(a) In the packaging-guard `node -e` block, replace
`for (const p of [".claude/hooks", ".claude/settings.json", ".claude/skills"]) {`
with
`for (const p of [".claude/hooks", ".claude/settings.json", ".claude/skills", ".agents/skills"]) {`.

(b) Case 1 — replace:

```bash
[ -f .claude/commands/ingest-meeting.md ] || fail "커맨드 없음"
grep -q 'second-brain-template' .claude/commands/ingest-meeting.md || fail "커맨드에 마커 없음"
head -1 .claude/commands/ingest-meeting.md | grep -q -- '---' || fail "마커가 frontmatter를 깨뜨림"
```

with:

```bash
[ -f .claude/skills/ingest-meeting/SKILL.md ] || fail "ingest-meeting 스킬 없음"
grep -q 'second-brain-template' .claude/skills/ingest-meeting/SKILL.md || fail "스킬에 마커 없음"
head -1 .claude/skills/ingest-meeting/SKILL.md | grep -q -- '---' || fail "마커가 frontmatter를 깨뜨림"
```

(c) Case 1 — delete the line:

```bash
[ -f .codex/prompts/ingest-meeting.md ] || fail "codex 프롬프트 없음"
```

(d) Case 1 — replace the block:

```bash
[ -f .claude/commands/ingest-doc.md ] || fail "ingest-doc 커맨드 미설치"
[ -f .codex/prompts/ingest-doc.md ] || fail "ingest-doc codex 프롬프트 미설치"
[ -f .claude/commands/capture.md ] || fail "capture 커맨드 미설치"
[ -f .claude/commands/recall.md ] || fail "recall 커맨드 미설치"
[ -f .claude/commands/maintain.md ] || fail "maintain 커맨드 미설치"
[ -f .codex/prompts/capture.md ] || fail "capture codex 프롬프트 미설치"
[ -f .codex/prompts/recall.md ] || fail "recall codex 프롬프트 미설치"
[ -f .codex/prompts/maintain.md ] || fail "maintain codex 프롬프트 미설치"
grep -q '\$ARGUMENTS' .codex/prompts/capture.md || fail "capture 인자 전달 없음"
grep -q '\$ARGUMENTS' .codex/prompts/recall.md || fail "recall 인자 전달 없음"
```

with:

```bash
for s in build capture check-conflict cluster find-similar-issue ingest-doc ingest-issue ingest-meeting maintain recall report setup-vault second-brain; do
  [ -f .claude/skills/$s/SKILL.md ] || fail "$s 스킬 미설치 (.claude)"
  [ -f .agents/skills/$s/SKILL.md ] || fail "$s 스킬 미설치 (.agents)"
done
grep -q '\$ARGUMENTS' .claude/skills/capture/SKILL.md || fail "capture 인자 전달 없음"
grep -q '\$ARGUMENTS' .claude/skills/recall/SKILL.md || fail "recall 인자 전달 없음"
[ ! -d .claude/commands ] || fail "구버전 커맨드 디렉터리가 설치됨"
[ ! -d .codex ] || fail "구버전 codex 프롬프트가 설치됨"
```

(e) Case 2 — delete the line `grep -q 'build.md' out.log || fail "스킵 경고 미출력"` (commands are no longer template-owned, so no skip warning exists), and replace `[ -f .claude/commands/report.md ] || fail "다른 커맨드 미설치"` with `[ -f .claude/skills/report/SKILL.md ] || fail "다른 스킬 미설치"`.

(f) Case 3 — replace `printf 'stale content\n' >> .claude/commands/report.md` with `printf 'stale content\n' >> .claude/skills/report/SKILL.md`, and `if grep -q 'stale content' .claude/commands/report.md; then fail "마커 있는 템플릿 파일이 갱신 안 됨"; fi` with `if grep -q 'stale content' .claude/skills/report/SKILL.md; then fail "마커 있는 템플릿 파일이 갱신 안 됨"; fi`.

(g) Case 3 — directly after the types.json preservation block (ends `grep -q '"custom"' knowledge/.obsidian/types.json || fail "types.json 사용자 설정 덮어씀"`) and before `echo "케이스 3 OK"`, insert:

```bash
# 은퇴: 마커 있는 구버전 커맨드/프롬프트는 재실행 시 정리되고, 마커 없는 사용자 파일은 산다
mkdir -p .claude/commands .codex/prompts
printf 'old command body\n\n<!-- second-brain-template -->\n' > .claude/commands/report.md
printf 'old prompt body\n\n<!-- second-brain-template -->\n' > .codex/prompts/recall.md
printf 'my own thing\n' > .claude/commands/mine.md
node "$ROOT/bin/init.js" -y > out7.log
[ ! -f .claude/commands/report.md ] || fail "마커 있는 구버전 커맨드가 정리되지 않음"
[ ! -f .codex/prompts/recall.md ] || fail "마커 있는 구버전 프롬프트가 정리되지 않음"
[ -f .claude/commands/mine.md ] || fail "마커 없는 사용자 커맨드가 삭제됨"
[ ! -d .codex ] || fail "빈 .codex 디렉터리가 정리되지 않음"
grep -q '정리(구버전 파일' out7.log || fail "분석 요약에 정리 줄 없음"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bash bin/test.sh`
Expected: `FAIL: package.json files 누락` (node error above it names `.agents/skills`)

- [ ] **Step 3: Delete the retired surfaces**

```bash
git rm -q .claude/commands/*.md
git rm -q -r .codex
rmdir .claude/commands 2>/dev/null || true
```

- [ ] **Step 4: Rewire `bin/init.js`**

(a) Replace:

```js
  for (const dir of ['.claude/commands', '.claude/hooks', '.claude/skills', '.codex/prompts']) {
    for (const f of listFiles(path.join(SRC, dir))) plan.push(planOwned(path.relative(SRC, f)));
  }
  for (const f of listFiles(path.join(SRC, '.agents/skills/second-brain'))) {
    plan.push(planOwned(path.relative(SRC, f)));
  }
```

with:

```js
  for (const dir of ['.claude/hooks', '.claude/skills', '.agents/skills']) {
    for (const f of listFiles(path.join(SRC, dir))) plan.push(planOwned(path.relative(SRC, f)));
  }
```

(b) Directly after the `planIfMissing` function definition, insert:

```js
// 은퇴한 구버전 파일 (v2.x 커맨드/프롬프트 → 스킬 승격): 소유 마커가 있을 때만
// 제거한다. 마커 없는 파일은 사용자 것이므로 절대 건드리지 않는다.
const RETIRED = [
  '.claude/commands/build.md', '.claude/commands/capture.md',
  '.claude/commands/check-conflict.md', '.claude/commands/cluster.md',
  '.claude/commands/find-similar-issue.md', '.claude/commands/ingest-doc.md',
  '.claude/commands/ingest-issue.md', '.claude/commands/ingest-meeting.md',
  '.claude/commands/maintain.md', '.claude/commands/recall.md',
  '.claude/commands/report.md', '.claude/commands/setup-vault.md',
  '.codex/prompts/README.md', '.codex/prompts/build.md', '.codex/prompts/capture.md',
  '.codex/prompts/check-conflict.md', '.codex/prompts/cluster.md',
  '.codex/prompts/find-similar-issue.md', '.codex/prompts/ingest-doc.md',
  '.codex/prompts/ingest-issue.md', '.codex/prompts/ingest-meeting.md',
  '.codex/prompts/maintain.md', '.codex/prompts/recall.md',
  '.codex/prompts/report.md', '.codex/prompts/setup-vault.md',
];
function planRetired(rel) {
  const to = target(rel);
  if (!fs.existsSync(to)) return null;
  if (!fs.readFileSync(to, 'utf8').includes(ownedMarker(rel))) return null;
  return { kind: 'retire', rel, label: '정리' };
}
```

(c) In `buildPlan()`, directly before `return plan;`, insert:

```js
  for (const rel of RETIRED) {
    const a = planRetired(rel);
    if (a) plan.push(a);
  }
```

(d) In `printAnalysis()`, directly after the `scaffolds` lines, insert:

```js
  const retired = plan.filter((a) => a.kind === 'retire').length;
  if (retired) console.log('  정리(구버전 파일, 마커 확인됨): ' + retired + '개');
```

(e) In `applyAction()`, replace:

```js
    write(to, JSON.stringify(cur, null, 2) + '\n');
  }
  // 'keep' / 'warn' / 'settings-unparsable': 아무것도 하지 않는다
```

with:

```js
    write(to, JSON.stringify(cur, null, 2) + '\n');
  } else if (a.kind === 'retire') {
    fs.rmSync(to);
  }
  // 'keep' / 'warn' / 'settings-unparsable': 아무것도 하지 않는다
```

(f) In the `confirm` callback, directly after `plan.forEach(applyAction);`, insert:

```js
  // 은퇴로 비워진 디렉터리 정리 — 비어 있을 때만 성공한다. 사용자 파일이 남아 있으면 그대로 둔다.
  for (const d of ['.claude/commands', '.codex/prompts', '.codex']) {
    try { fs.rmdirSync(target(d)); } catch (e) {}
  }
```

(g) Output text: replace the comment line `  // 1~2는 clone 직후 1회 하는 초기 세팅이라 슬래시 커맨드가 맞고,` with `  // 1~2는 clone 직후 1회 하는 초기 세팅이라 스킬 호출이 맞고,`, and replace
`  console.log('     (슬래시 커맨드 12개는 파워유저용 별칭 — README 참고)\n');`
with
`  console.log('     (스킬 13개는 /이름·$이름으로 직접 호출도 가능 — README 참고)\n');`

- [ ] **Step 5: Rewire `package.json`**

Replace the `files` array with:

```json
  "files": [
    "bin",
    "SECOND-BRAIN.md",
    "AGENTS.md",
    ".agents/skills",
    ".claude/hooks",
    ".claude/settings.json",
    ".claude/skills",
    "knowledge"
  ],
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `bash bin/test.sh`
Expected: `ALL PASS`

- [ ] **Step 7: Commit**

```bash
git add -A .claude/commands .codex bin/init.js package.json bin/test.sh
git commit -m "feat: 커맨드·codex 프롬프트 은퇴 — installer 마커 검증 정리 + 패키징 재배선

Claude-Session: https://claude.ai/code/session_01A1xXaUjVNJidYjWW9pz2xj"
```

---

### Task 3: Documentation — SECOND-BRAIN.md, AGENTS.md, README × 4

**Files:**
- Modify: `SECOND-BRAIN.md` (trigger-routing intro), `AGENTS.md` (Command equivalents section), `README.md` (4 language blocks × 4 edits)

**Interfaces:**
- Consumes: skill layout and retirement behavior from Tasks 1–2 (paths `.claude/skills/`, `.agents/skills/`, 13 skills, `/name`·`$name` invocation).
- Produces: nothing downstream.

- [ ] **Step 1: SECOND-BRAIN.md trigger-routing intro**

Replace:

```
The 9 slash commands remain as power-user aliases. Everyday interaction —
slash or natural language — routes through three verbs:
```

with:

```
The 12 workflows are individual repository skills, invocable directly
(`/name` in Claude Code, `$name` in Codex). Everyday interaction — skill
or natural language — routes through three verbs:
```

- [ ] **Step 2: AGENTS.md**

Replace the section:

```
## Command equivalents

Claude Code exposes these workflows as slash commands in `.claude/commands/`
and auto-discovers the same repository skill at
`.claude/skills/second-brain/SKILL.md`. Codex discovers its copy at
`.agents/skills/second-brain/SKILL.md`; invoke it with natural language or
`$second-brain`. The two SKILL.md files are kept byte-identical (guarded by
`bin/test.sh`). `.codex/prompts/` is kept only for deprecated custom-prompt
compatibility.
```

with:

```
## Skill equivalents

Every workflow is a repository skill, paired in `.claude/skills/<name>/`
(Claude Code) and `.agents/skills/<name>/` (Codex) — 13 skills in all: the
12 workflows plus the `second-brain` umbrella router for ambiguous intents.
Invoke as `/name` in Claude Code, `$name` or natural language in Codex.
Each pair's SKILL.md files are kept byte-identical (guarded by
`bin/test.sh`). The legacy `.claude/commands/` and `.codex/prompts/`
surfaces are retired; re-running the installer removes their
marker-bearing leftovers from older installs.
```

- [ ] **Step 3: Korean README block (reference edit)**

(a) Reference section intro — replace:

```
아래는 **Claude Code** 슬래시 커맨드다. **Codex에는 슬래시 커맨드가 없다** —
`$second-brain` 또는 자연어로 같은 워크플로우를 호출한다. 예: `/ingest-meeting`
→ "이 회의록 볼트에 넣어줘". 아래 모든 행이 그렇게 도달 가능하며, 라우팅은
커맨드 이름이 아니라 `SECOND-BRAIN.md`에 정의되어 있다.
```

with:

```
아래는 모두 **스킬**이다 — Claude Code에서는 `/이름`, Codex에서는 `$이름` 또는
자연어로 호출한다. 예: `/ingest-meeting` = `$ingest-meeting` = "이 회의록 볼트에
넣어줘". 라우팅은 스킬 이름이 아니라 `SECOND-BRAIN.md`에 정의되어 있고,
description 기반 자동 인식으로 자연어 발화에도 스스로 발동한다.
```

Table header `| 커맨드 | 역할 |` → `| 스킬 | 역할 |`. Section heading `## 🗂 커맨드 레퍼런스` → `## 🗂 스킬 레퍼런스`. Table rows stay unchanged.

(b) Structure tree — replace:

```
.claude/commands/ 슬래시 커맨드 12개 (기존 9개 + capture/recall/maintain)
.claude/hooks/    세션 시작 훅 — 볼트 주제를 자동 주입 (Claude Code 전용)
.claude/settings.json 훅 등록 (기존 파일이 있으면 항목만 병합)
.claude/skills/second-brain/ Claude 저장소 스킬 (자동 인식, Codex 사본과 동일)
.agents/skills/second-brain/ Codex 저장소 스킬 (자동 인식)
.codex/prompts/   레거시 Codex 커스텀 프롬프트 (deprecated)
```

with:

```
.claude/hooks/    세션 시작 훅 — 볼트 주제를 자동 주입 (Claude Code 전용)
.claude/settings.json 훅 등록 (기존 파일이 있으면 항목만 병합)
.claude/skills/   Claude 저장소 스킬 13종 (자동 인식, /이름 호출)
.agents/skills/   Codex 저장소 스킬 13종 (자동 인식, $이름·자연어 — Claude 사본과 동일)
```

(c) Cross-CLI list — replace:

```
- Claude Code: `.claude/commands/` + `.claude/skills/second-brain/` (둘 다 자동 인식)
- Codex: `.agents/skills/second-brain/` (자동 인식, 자연어나 `$second-brain` 사용)
- 레거시 Codex 프롬프트: `.codex/prompts/` (deprecated, 수동 복사 후 `/prompts:name` 사용)
```

with:

```
- Claude Code: `.claude/skills/` 13종 (자동 인식, `/이름` 호출)
- Codex: `.agents/skills/` 13종 (자동 인식, `$이름` 또는 자연어)
```

(d) Usage-section callout — in the Korean block, find the callout line beginning `> 💡` that says commands are just a convenience (커맨드는 편의 기능…), and swap the word for skills (스킬) leaving the rest of the sentence intact.

- [ ] **Step 4: English README block**

(a) Reference intro — replace:

```
These are **Claude Code** slash commands. **Codex has no slash commands** — call
the same workflows with `$second-brain` or plain natural language, e.g.
`/ingest-meeting` → "put this transcript in the vault". Every row below is
reachable that way; the routing lives in `SECOND-BRAIN.md`, not in the command
names.
```

with:

```
These are all **skills** — invoke as `/name` in Claude Code, `$name` or plain
natural language in Codex, e.g. `/ingest-meeting` = `$ingest-meeting` = "put
this transcript in the vault". Routing lives in `SECOND-BRAIN.md`, not in the
skill names, and description-based auto-detection also fires them from natural
speech.
```

Table header `| Command | Role |` → `| Skill | Role |`. Section heading `## 🗂 Command reference` → `## 🗂 Skill reference`. Rows unchanged.

(b) Structure tree — replace:

```
.claude/commands/ 12 slash commands (9 original + capture/recall/maintain)
.claude/hooks/    session-start hook — auto-injects vault topics (Claude Code only)
.claude/settings.json hook registration (merges one entry if the file already exists)
.claude/skills/second-brain/ Claude repo skill (auto-detected, identical to the Codex copy)
.agents/skills/second-brain/ Codex repo skill (auto-detected)
.codex/prompts/   Legacy Codex custom prompts (deprecated)
```

with:

```
.claude/hooks/    session-start hook — auto-injects vault topics (Claude Code only)
.claude/settings.json hook registration (merges one entry if the file already exists)
.claude/skills/   13 Claude repo skills (auto-detected, /name invocation)
.agents/skills/   13 Codex repo skills (auto-detected, $name or natural language — identical to the Claude copies)
```

(c) Cross-CLI list — replace:

```
- Claude Code: `.claude/commands/` + `.claude/skills/second-brain/` (both auto-detected)
- Codex: `.agents/skills/second-brain/` (auto-detected; use natural language or `$second-brain`)
- Legacy Codex prompts: `.codex/prompts/` (deprecated; requires manual copying and `/prompts:name`)
```

with:

```
- Claude Code: `.claude/skills/` — 13 skills (auto-detected, `/name` invocation)
- Codex: `.agents/skills/` — 13 skills (auto-detected, `$name` or natural language)
```

(d) Usage-section callout — find the `> 💡 Commands are just a convenience — **natural language is the interface.**` line and change `Commands` to `Skills`, rest intact.

- [ ] **Step 5: 中文 and 日本語 README blocks**

Apply the same four edits to the 中文 (≈339–651) and 日本語 (≈653–976) blocks, translating the Korean reference text of Step 3 into each block's existing tone (each block already contains the same reference intro, table header, tree lines, cross-CLI list, and 💡 callout in its own language — locate by the same structure). Keep code literals (`.claude/skills/`, `.agents/skills/`, `/이름`→`/name`, `$name`, skill names) untranslated.

- [ ] **Step 6: Verify**

Run: `bash bin/test.sh`
Expected: `ALL PASS`

Then:

```bash
grep -c '.claude/commands' README.md
```

Expected: `0` (no language block still documents the retired surface). Also `grep -c '.codex/prompts' README.md` → `0`.

- [ ] **Step 7: Commit**

```bash
git add SECOND-BRAIN.md AGENTS.md README.md
git commit -m "docs: 스킬 승격 반영 — 레퍼런스·구조 트리·크로스-CLI (4개 언어판)

Claude-Session: https://claude.ai/code/session_01A1xXaUjVNJidYjWW9pz2xj"
```

---

### Task 4: Final verification against the spec

**Files:**
- Read: `docs/superpowers/specs/2026-08-24-skill-promotion-design.md`, all files changed in Tasks 1–3.

**Interfaces:**
- Consumes: everything above.
- Produces: a verified branch ready for review/merge.

- [ ] **Step 1: Full test run**

Run: `bash bin/test.sh`
Expected: `ALL PASS` (including `skill parity OK (13)`)

- [ ] **Step 2: Spec sweep**

Confirm each spec requirement landed: D1 (13 pairs, descriptions, verbatim bodies), D2 (RETIRED 25 paths, marker-verified, empty-dir cleanup), D3 (wiring), D4 (test rework incl. retirement scenario), D5 (docs). Spot-check one pair:

```bash
diff .claude/skills/capture/SKILL.md .agents/skills/capture/SKILL.md
```

Expected: no output.

- [ ] **Step 3: Confirm no stray changes**

Run: `git diff main...HEAD --stat`
Expected: only the files named in Tasks 1–3 plus the spec and this plan. Report the result; do not push or open a PR without the user's go-ahead.
