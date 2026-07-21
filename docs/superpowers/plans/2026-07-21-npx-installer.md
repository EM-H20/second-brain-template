# npx Installer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `npx github:EM-H20/second-brain-template` 한 줄로 다른 프로젝트에 second brain 볼트를 설치할 수 있게 한다.

**Architecture:** 저장소 자체가 페이로드. 루트에 zero-dependency Node bin 스크립트를 추가하고, 규칙을 `SECOND-BRAIN.md`로 분리해 대상 프로젝트의 기존 `CLAUDE.md`와 충돌 없이 `@import` 한 줄로 연결한다. 템플릿 소유 파일은 마커 주석으로 식별해 재실행 시에만 덮어쓴다.

**Tech Stack:** Node 내장 모듈만 (`fs`, `path`). 테스트는 bash 스크립트. 외부 의존성 0개.

**Spec:** `docs/superpowers/specs/2026-07-21-npx-installer-design.md`

## Global Constraints

- 의존성 0개 — `package.json`에 `dependencies`/`devDependencies` 절대 추가 금지
- 설치 스크립트 출력 메시지는 한국어
- 마커 문자열은 정확히 `<!-- second-brain-template -->` — 커맨드 파일에 YAML frontmatter가 있으므로 마커는 반드시 파일 **끝에** 추가 (앞에 넣으면 frontmatter 파싱이 깨짐)
- `knowledge/` 아래 파일은 어떤 경우에도 덮어쓰지 않는다 (없을 때만 생성)
- 커밋 메시지에 Co-Authored-By 태그 금지 (사용자 전역 규칙)
- 커밋 메시지 형식: `<type>: <description>` (feat/fix/refactor/docs/chore)

---

### Task 1: 규칙 파일 분리 (CLAUDE.md → SECOND-BRAIN.md)

**Files:**
- Rename: `CLAUDE.md` → `SECOND-BRAIN.md` (git mv, 내용 그대로)
- Create: `CLAUDE.md` (import 한 줄)
- Modify: `AGENTS.md` (CLAUDE.md 참조 3곳 → SECOND-BRAIN.md)

**Interfaces:**
- Produces: 루트에 `SECOND-BRAIN.md` (전체 규칙), `CLAUDE.md` (내용은 정확히 `@SECOND-BRAIN.md` 한 줄). Task 2~4의 installer/테스트가 이 두 파일명을 그대로 사용한다.

- [ ] **Step 1: git mv로 규칙 파일 이동**

```bash
git mv CLAUDE.md SECOND-BRAIN.md
```

- [ ] **Step 2: 새 CLAUDE.md 생성 (import 한 줄)**

`CLAUDE.md` 전체 내용:

```markdown
@SECOND-BRAIN.md
```

- [ ] **Step 3: AGENTS.md의 CLAUDE.md 참조 수정**

`AGENTS.md`에서 세 곳 수정 (Edit 도구 사용):

1. 3행: `**The single source of truth for all rules in this repository is \`CLAUDE.md\`.**` → `**The single source of truth for all rules in this repository is \`SECOND-BRAIN.md\`.**`
2. 4행: `Read \`CLAUDE.md\` in full at the start of every session and follow it exactly.` → `Read \`SECOND-BRAIN.md\` in full at the start of every session and follow it exactly.`
3. 23행 부근: `the workflows in CLAUDE.md are triggered by intent` → `the workflows in SECOND-BRAIN.md are triggered by intent`

- [ ] **Step 4: 구조 검증**

```bash
cat CLAUDE.md && head -5 SECOND-BRAIN.md && grep -c 'CLAUDE.md' AGENTS.md
```

Expected: `CLAUDE.md`는 `@SECOND-BRAIN.md` 한 줄, `SECOND-BRAIN.md`는 기존 규칙 시작(`# Second Brain — Project Knowledge System`), AGENTS.md의 CLAUDE.md 참조 카운트 0.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "refactor: move vault rules to SECOND-BRAIN.md, CLAUDE.md imports it"
```

---

### Task 2: 설치 스크립트 — 빈 프로젝트 설치 (TDD)

**Files:**
- Create: `package.json`
- Create: `bin/init.js`
- Test: `bin/test.sh` (케이스 1)

**Interfaces:**
- Consumes: Task 1의 `SECOND-BRAIN.md`, 한 줄짜리 `CLAUDE.md`
- Produces: `bin/init.js` 내 함수 `listFiles(dir)`, `write(to, content)`, `installOwned(rel)`, `installIfMissing(rel)`, `ensureClaudeMd()`, `ensureAgentsMd()`, 상수 `MARKER`, `IMPORT_LINE`, 결과 배열 `installed`/`skipped`/`warned`. Task 3이 이 이름들을 그대로 확장한다.

- [ ] **Step 1: 실패하는 테스트 작성 — 케이스 1 (빈 프로젝트)**

`bin/test.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
fail() { echo "FAIL: $1"; exit 1; }

# ── 케이스 1: 빈 프로젝트 ──────────────────────────────
mkdir "$TMP/fresh" && cd "$TMP/fresh"
node "$ROOT/bin/init.js" > out.log
[ -f SECOND-BRAIN.md ] || fail "SECOND-BRAIN.md 없음"
grep -q 'second-brain-template' SECOND-BRAIN.md || fail "SECOND-BRAIN.md에 마커 없음"
[ "$(cat CLAUDE.md)" = "@SECOND-BRAIN.md" ] || fail "CLAUDE.md가 import 한 줄이 아님"
[ -f .claude/commands/ingest-meeting.md ] || fail "커맨드 없음"
grep -q 'second-brain-template' .claude/commands/ingest-meeting.md || fail "커맨드에 마커 없음"
head -1 .claude/commands/ingest-meeting.md | grep -q -- '---' || fail "마커가 frontmatter를 깨뜨림"
[ -f .codex/prompts/ingest-meeting.md ] || fail "codex 프롬프트 없음"
[ -f knowledge/clusters/_topics.md ] || fail "knowledge 스켈레톤 없음"
[ -f knowledge/_templates/meeting-note.md ] || fail "_templates 없음"
[ -f AGENTS.md ] || fail "AGENTS.md 없음"
[ ! -f package.json ] || fail "installer 기계장치 유출 (package.json)"
[ ! -f README.md ] || fail "README 유출"
[ ! -d docs ] || fail "docs/ 유출"
echo "케이스 1 OK"

echo "ALL PASS"
```

```bash
chmod +x bin/test.sh
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `bash bin/test.sh`
Expected: FAIL — `bin/init.js` 모듈 없음 에러 (`Cannot find module`)

- [ ] **Step 3: package.json + init.js 구현**

`package.json`:

```json
{
  "name": "second-brain-template",
  "version": "1.0.0",
  "description": "프로젝트 세컨드 브레인 템플릿 설치 스크립트 — 회의록에서 지식 볼트까지",
  "bin": { "second-brain-template": "bin/init.js" },
  "license": "MIT"
}
```

`bin/init.js`:

```js
#!/usr/bin/env node
'use strict';
// second-brain-template installer — 의존성 0개 (node 내장 모듈만)
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..');
const DEST = process.cwd();
const MARKER = '<!-- second-brain-template -->';
const IMPORT_LINE = '@SECOND-BRAIN.md';

const installed = [];
const skipped = [];
const warned = [];

if (path.resolve(SRC) === path.resolve(DEST)) {
  console.error('템플릿 저장소 자신에게는 설치할 수 없습니다. 대상 프로젝트 루트에서 실행하세요.');
  process.exit(1);
}

function listFiles(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.DS_Store') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listFiles(p));
    else out.push(p);
  }
  return out;
}

function write(to, content) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.writeFileSync(to, content);
}

// 템플릿 소유 파일: 마커를 끝에 찍어서 저장 (frontmatter 보호를 위해 반드시 끝에)
function installOwned(rel) {
  const to = path.join(DEST, rel);
  const content = fs.readFileSync(path.join(SRC, rel), 'utf8');
  write(to, content.trimEnd() + '\n\n' + MARKER + '\n');
  installed.push(rel);
}

// 사용자 소유 파일: 없을 때만 생성
function installIfMissing(rel) {
  const to = path.join(DEST, rel);
  if (fs.existsSync(to)) { skipped.push(rel); return; }
  write(to, fs.readFileSync(path.join(SRC, rel)));
  installed.push(rel);
}

// CLAUDE.md: 없으면 import 한 줄짜리 생성
function ensureClaudeMd() {
  const to = path.join(DEST, 'CLAUDE.md');
  if (fs.existsSync(to)) { skipped.push('CLAUDE.md'); return; }
  write(to, IMPORT_LINE + '\n');
  installed.push('CLAUDE.md');
}

// AGENTS.md: 없으면 템플릿 복사
function ensureAgentsMd() {
  const to = path.join(DEST, 'AGENTS.md');
  if (fs.existsSync(to)) { skipped.push('AGENTS.md'); return; }
  write(to, fs.readFileSync(path.join(SRC, 'AGENTS.md')));
  installed.push('AGENTS.md');
}

installOwned('SECOND-BRAIN.md');
for (const dir of ['.claude/commands', '.codex/prompts']) {
  for (const f of listFiles(path.join(SRC, dir))) installOwned(path.relative(SRC, f));
}
for (const f of listFiles(path.join(SRC, 'knowledge'))) installIfMissing(path.relative(SRC, f));
ensureClaudeMd();
ensureAgentsMd();

console.log('second-brain-template 설치 완료\n');
if (installed.length) console.log('설치/갱신:\n' + installed.map((f) => '  + ' + f).join('\n'));
if (skipped.length) console.log('유지(기존 파일):\n' + skipped.map((f) => '  = ' + f).join('\n'));
if (warned.length) console.log('경고:\n' + warned.map((f) => '  ! ' + f).join('\n'));
console.log(`
다음 단계:
  1. Obsidian → "보관함 폴더 열기" → knowledge/ 선택
  2. Claude Code에서 /ingest-meeting 으로 첫 회의록 넣기
  3. (선택) /setup-vault 로 프로젝트 정보 반영
`);
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

Run: `bash bin/test.sh`
Expected: `케이스 1 OK` + `ALL PASS`

- [ ] **Step 5: Commit**

```bash
git add package.json bin/ && git commit -m "feat: npx installer — fresh install path"
```

---

### Task 3: 설치 스크립트 — 충돌 병합 + 멱등성 (TDD)

**Files:**
- Modify: `bin/init.js` (`installOwned`, `ensureClaudeMd`, `ensureAgentsMd` 확장)
- Test: `bin/test.sh` (케이스 2, 3 추가)

**Interfaces:**
- Consumes: Task 2의 `bin/init.js` 전체 (함수명 동일 유지)
- Produces: 최종 `bin/init.js` — 마커 없는 기존 파일 스킵+경고, CLAUDE.md/AGENTS.md 멱등 append

- [ ] **Step 1: 실패하는 테스트 추가 — 케이스 2 (기존 CLAUDE.md/커맨드 충돌), 케이스 3 (재실행)**

`bin/test.sh`의 `echo "ALL PASS"` 줄 **앞에** 아래 블록 삽입:

```bash
# ── 케이스 2: 기존 CLAUDE.md + 자기 커맨드가 있는 프로젝트 ──
mkdir -p "$TMP/existing/.claude/commands" && cd "$TMP/existing"
printf '# My project rules\n' > CLAUDE.md
printf 'my own build command\n' > .claude/commands/build.md
printf '# My agents doc\n' > AGENTS.md
node "$ROOT/bin/init.js" > out.log
grep -q '# My project rules' CLAUDE.md || fail "기존 CLAUDE.md 내용 유실"
grep -q '@SECOND-BRAIN.md' CLAUDE.md || fail "import 줄 미추가"
grep -q 'my own build command' .claude/commands/build.md || fail "사용자 커맨드 클로버됨"
grep -q 'build.md' out.log || fail "스킵 경고 미출력"
grep -q 'SECOND-BRAIN.md' AGENTS.md || fail "AGENTS.md 포인터 미추가"
grep -q '# My agents doc' AGENTS.md || fail "기존 AGENTS.md 내용 유실"
[ -f .claude/commands/report.md ] || fail "다른 커맨드 미설치"
echo "케이스 2 OK"

# ── 케이스 3: 재실행 (업데이트) ────────────────────────
cd "$TMP/fresh"
printf 'user note\n' > knowledge/meetings/2026-07-21-test.md
printf 'edited by user\n' >> knowledge/index.md
printf 'stale content\n' >> .claude/commands/report.md
node "$ROOT/bin/init.js" > out2.log
[ "$(grep -c '@SECOND-BRAIN.md' CLAUDE.md)" = "1" ] || fail "import 줄 중복"
grep -q 'edited by user' knowledge/index.md || fail "사용자 수정 index.md 덮어씀"
[ -f knowledge/meetings/2026-07-21-test.md ] || fail "사용자 노트 유실"
if grep -q 'stale content' .claude/commands/report.md; then fail "마커 있는 템플릿 파일이 갱신 안 됨"; fi
echo "케이스 3 OK"
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `bash bin/test.sh`
Expected: 케이스 1 OK 후 케이스 2에서 FAIL (현재 `ensureClaudeMd`는 기존 파일을 스킵만 하므로 `import 줄 미추가`로 실패)

- [ ] **Step 3: init.js 확장 — 세 함수를 아래 최종본으로 교체**

`bin/init.js`에서 `installOwned`, `ensureClaudeMd`, `ensureAgentsMd`를 다음으로 교체 (나머지는 그대로):

```js
// 템플릿 소유 파일: 대상이 없거나 마커를 가진 경우에만 덮어씀 (마커는 반드시 끝에)
function installOwned(rel) {
  const to = path.join(DEST, rel);
  if (fs.existsSync(to) && !fs.readFileSync(to, 'utf8').includes(MARKER)) {
    warned.push(rel + ' — 마커 없는 기존 파일, 건너뜀 (필요하면 직접 병합)');
    return;
  }
  const content = fs.readFileSync(path.join(SRC, rel), 'utf8');
  write(to, content.trimEnd() + '\n\n' + MARKER + '\n');
  installed.push(rel);
}

// CLAUDE.md: 없으면 import 한 줄짜리 생성, 있으면 한 줄 추가 (멱등)
function ensureClaudeMd() {
  const to = path.join(DEST, 'CLAUDE.md');
  if (!fs.existsSync(to)) { write(to, IMPORT_LINE + '\n'); installed.push('CLAUDE.md'); return; }
  const content = fs.readFileSync(to, 'utf8');
  if (content.includes(IMPORT_LINE)) { skipped.push('CLAUDE.md'); return; }
  write(to, content.trimEnd() + '\n\n' + IMPORT_LINE + '\n');
  installed.push('CLAUDE.md (import 한 줄 추가)');
}

// AGENTS.md: 없으면 템플릿 복사, 있으면 포인터 한 줄 추가 (멱등)
function ensureAgentsMd() {
  const to = path.join(DEST, 'AGENTS.md');
  if (!fs.existsSync(to)) {
    write(to, fs.readFileSync(path.join(SRC, 'AGENTS.md')));
    installed.push('AGENTS.md');
    return;
  }
  const content = fs.readFileSync(to, 'utf8');
  if (content.includes('SECOND-BRAIN.md')) { skipped.push('AGENTS.md'); return; }
  write(to, content.trimEnd() + '\n\n**Second brain vault rules:** `SECOND-BRAIN.md`를 전체 읽고 그대로 따를 것.\n');
  installed.push('AGENTS.md (포인터 한 줄 추가)');
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

Run: `bash bin/test.sh`
Expected: `케이스 1 OK`, `케이스 2 OK`, `케이스 3 OK`, `ALL PASS`

- [ ] **Step 5: Commit**

```bash
git add bin/ && git commit -m "feat: installer conflict merge + idempotent re-run (marker safety)"
```

---

### Task 4: README 갱신 + 실전 npx 검증

**Files:**
- Modify: `README.md` (빠른 시작에 npx 방법 추가, CLAUDE.md → SECOND-BRAIN.md 참조 갱신)

**Interfaces:**
- Consumes: Task 1~3 전부 (푸시된 저장소로 실제 npx 실행)

- [ ] **Step 1: README.md 수정**

`## 빠른 시작` 섹션(9~14행)을 다음으로 교체:

```markdown
## 빠른 시작

**방법 A — 기존 프로젝트에 설치 (npx):**

```bash
cd my-project
npx github:EM-H20/second-brain-template
```

기존 `CLAUDE.md`가 있어도 안전하다 — 규칙은 `SECOND-BRAIN.md`로 들어가고
`@SECOND-BRAIN.md` import 한 줄만 추가된다. 템플릿 업데이트를 받으려면
같은 명령을 재실행 (`knowledge/` 노트는 절대 건드리지 않음).

**방법 B — 템플릿으로 새 프로젝트 시작:**

1. 이 템플릿을 clone 또는 "Use this template"으로 복사해 새 프로젝트 루트로 사용
2. Claude Code를 열고 `/setup-vault` 실행 (1회)

**공통 다음 단계:**

3. Obsidian → "보관함 폴더 열기" → `knowledge/` 선택
4. 첫 회의 전사체로 `/ingest-meeting` 실행
```

`## 구조` 코드블록의 `CLAUDE.md` 줄(39행 부근)을 다음 두 줄로 교체:

```
SECOND-BRAIN.md   워크플로우 규칙 (W1~W6) — 시스템의 심장
CLAUDE.md         @SECOND-BRAIN.md import 한 줄 (기존 프로젝트와 충돌 방지)
```

`## 크로스-CLI 지원` 섹션의 `규칙 원본은 \`CLAUDE.md\` 하나이며` → `규칙 원본은 \`SECOND-BRAIN.md\` 하나이며`로 수정.

- [ ] **Step 2: 로컬 테스트 재실행 + 커밋 + 푸시**

```bash
bash bin/test.sh && git add README.md && git commit -m "docs: npx install instructions" && git push origin main
```

Expected: `ALL PASS` 후 푸시 성공

- [ ] **Step 3: 저장소 공개 여부 확인**

```bash
gh repo view EM-H20/second-brain-template --json visibility -q .visibility
```

Expected: `PUBLIC`. `PRIVATE`이면 사용자에게 공개 전환을 요청 (npx github:는 공개 저장소여야 인증 없이 동작): `gh repo edit EM-H20/second-brain-template --visibility public` — 단, 실행 전 반드시 사용자 확인.

- [ ] **Step 4: 실전 e2e — 진짜 npx로 설치**

npm이 git 저장소를 팩킹할 때 `.claude/`, `.codex/` 닷 디렉토리가 포함되는지 실증하는 단계 (이게 이 태스크의 존재 이유):

```bash
cd "$(mktemp -d)" && npx --yes github:EM-H20/second-brain-template && ls .claude/commands/ knowledge/ && cat CLAUDE.md
```

Expected: 설치 완료 메시지, 커맨드 8개, knowledge 스켈레톤, `CLAUDE.md` = `@SECOND-BRAIN.md`. 만약 `.claude/`가 누락되면 npm 팩킹이 닷 디렉토리를 제외한 것 — `package.json`에 `"files": ["bin", "SECOND-BRAIN.md", "AGENTS.md", ".claude", ".codex", "knowledge"]`를 추가하고 재푸시 후 재검증.

---

## 검증 요약 (전체 완료 기준)

1. `bash bin/test.sh` → 3케이스 ALL PASS
2. 임시 디렉토리에서 `npx --yes github:EM-H20/second-brain-template` 실제 성공
3. `knowledge/` 사용자 파일이 어떤 시나리오에서도 변경되지 않음 (케이스 3이 보증)
