# 재실행 시 스캐폴딩 갱신 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `npx` 재실행 시 `knowledge/` 아래 스캐폴딩(`_templates/*`, `**/README.md`)이 최신 템플릿본으로 갱신되게 하되, 내용이 바뀐 파일만 `.bak` 백업 후 덮고 진짜 사용자 데이터는 절대 건드리지 않는다.

**Architecture:** `bin/init.js`의 plan/apply 구조를 그대로 쓴다. `knowledge/` 순회 시 **경로 판정**(`_templates/` 아래거나 basename `README.md`)으로 스캐폴딩을 가려내 새 `planScaffold()`로 보내고, 나머지는 기존 `planIfMissing()` 유지. 스캐폴딩에는 마커를 붙이지 않는다 — `_templates/*`는 새 노트 생성 시 복사되는 원본이라 마커가 노트로 샐 수 있기 때문.

**Tech Stack:** Node 내장 모듈만 (`fs`, `path`). 테스트는 bash (`bin/test.sh`).

**Spec:** `docs/superpowers/specs/2026-07-22-installer-scaffolding-refresh-design.md`

## Global Constraints

- 의존성 0개 — `package.json`에 `dependencies`/`devDependencies` 절대 추가 금지
- 설치 스크립트 출력 메시지는 한국어
- 스캐폴딩 파일에는 마커(`<!-- second-brain-template -->`)를 **붙이지 않는다** (생성 노트 오염 방지). 판정은 경로로만 한다
- `knowledge/` 의 사용자 데이터는 어떤 경우에도 덮어쓰지 않는다: `index.md`, `log.md`, `clusters/_topics.md`, 실제 노트, `_sources/**` 저장 원본, `.obsidian/*`
- `.bak`은 **내용이 실제로 다를 때만** 생성한다 (동일하면 아무것도 쓰지 않음)
- 커밋 메시지에 Co-Authored-By 태그 금지
- 커밋 메시지 형식: `<type>: <description>`
- 작업 브랜치 `feat/installer-scaffolding-refresh` 는 이미 생성돼 있다

---

### Task 1: 스캐폴딩 갱신 + `.bak` 백업 (TDD)

**Files:**
- Modify: `bin/test.sh:54-64` (케이스 3 블록)
- Modify: `bin/init.js` (`planIfMissing` 뒤 함수 2개 추가, `buildPlan` 74행, `printAnalysis`, `applyAction`)

**Interfaces:**
- Produces: `bin/init.js` 내 함수 `isScaffold(rel) -> boolean`, `planScaffold(rel) -> {kind, rel, label?}`, 새 action kind 문자열 `'scaffold-update'`. Task 2가 이 이름들을 그대로 쓴다.

- [ ] **Step 1: 실패하는 테스트 작성 — 케이스 3 보강**

`bin/test.sh`의 케이스 3 블록에서, `printf 'stale content\n' >> .claude/commands/report.md` (58행) **바로 다음 줄에** 아래 3줄을 삽입:

```bash
printf 'STALE TEMPLATE\n' > knowledge/_templates/meeting-note.md
printf 'user log line\n' >> knowledge/log.md
printf 'user-topic-slug\n' >> knowledge/clusters/_topics.md
```

그리고 `echo "케이스 3 OK"` (64행) **바로 앞에** 아래 블록을 삽입:

```bash
if grep -q 'STALE TEMPLATE' knowledge/_templates/meeting-note.md; then fail "스캐폴딩 템플릿이 갱신 안 됨"; fi
diff -q knowledge/_templates/meeting-note.md "$ROOT/knowledge/_templates/meeting-note.md" > /dev/null || fail "템플릿이 최신본과 불일치"
[ -f knowledge/_templates/meeting-note.md.bak ] || fail ".bak 백업 없음"
grep -q 'STALE TEMPLATE' knowledge/_templates/meeting-note.md.bak || fail ".bak에 이전 내용 없음"
grep -q 'user log line' knowledge/log.md || fail "사용자 log.md 덮어씀"
grep -q 'user-topic-slug' knowledge/clusters/_topics.md || fail "사용자 _topics.md 덮어씀"
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `bash bin/test.sh`
Expected: `케이스 1 OK`, `케이스 2 OK` 후 **FAIL: 스캐폴딩 템플릿이 갱신 안 됨** (현재 `_templates/`는 `planIfMissing`이라 기존 파일을 그대로 둠)

- [ ] **Step 3: `isScaffold` + `planScaffold` 추가**

`bin/init.js`에서 `planIfMissing` 함수(47~51행) **바로 다음에** 아래를 삽입:

```js
// 스캐폴딩 판정: _templates/ 아래이거나 파일명이 README.md
function isScaffold(rel) {
  return rel.split(path.sep).includes('_templates') || path.basename(rel) === 'README.md';
}

// 스캐폴딩: 항상 최신본 유지. 내용이 다를 때만 .bak 백업 후 덮음
function planScaffold(rel) {
  const to = path.join(DEST, rel);
  if (!fs.existsSync(to)) return { kind: 'copy', rel, label: '신규' };
  const cur = fs.readFileSync(to, 'utf8');
  const src = fs.readFileSync(path.join(SRC, rel), 'utf8');
  if (cur === src) return { kind: 'keep', rel };
  return { kind: 'scaffold-update', rel, label: '갱신(.bak)' };
}
```

- [ ] **Step 4: `buildPlan` 라우팅 교체**

`bin/init.js` 74행의 아래 한 줄을

```js
  for (const f of listFiles(path.join(SRC, 'knowledge'))) plan.push(planIfMissing(path.relative(SRC, f)));
```

다음으로 교체:

```js
  for (const f of listFiles(path.join(SRC, 'knowledge'))) {
    const rel = path.relative(SRC, f);
    plan.push(isScaffold(rel) ? planScaffold(rel) : planIfMissing(rel));
  }
```

- [ ] **Step 5: `applyAction`에 `scaffold-update` 분기 추가**

`bin/init.js` `applyAction` 안에서 `copy` 분기 다음에 새 분기를 끼운다. 아래 두 줄을

```js
  } else if (a.kind === 'copy' || a.kind === 'agents-copy') {
    write(to, fs.readFileSync(path.join(SRC, a.rel)));
  } else if (a.kind === 'claude-create') {
```

다음으로 교체:

```js
  } else if (a.kind === 'copy' || a.kind === 'agents-copy') {
    write(to, fs.readFileSync(path.join(SRC, a.rel)));
  } else if (a.kind === 'scaffold-update') {
    write(to + '.bak', fs.readFileSync(to));
    write(to, fs.readFileSync(path.join(SRC, a.rel)));
  } else if (a.kind === 'claude-create') {
```

- [ ] **Step 6: `printAnalysis`에 요약 줄 추가**

`bin/init.js` `printAnalysis` 안에서 아래 줄(85행) 다음에

```js
  if (count('갱신')) console.log('  갱신(마커 확인됨): ' + count('갱신') + '개');
```

아래 두 줄을 삽입:

```js
  const scaffolds = plan.filter((a) => a.kind === 'scaffold-update').length;
  if (scaffolds) console.log('  갱신(.bak 백업): ' + scaffolds + '개');
```

- [ ] **Step 7: 테스트 실행 — 통과 확인**

Run: `bash bin/test.sh`
Expected: `케이스 1 OK`, `케이스 2 OK`, `케이스 3 OK`, `케이스 4 OK`, `ALL PASS`

- [ ] **Step 8: Commit**

```bash
git add bin/init.js bin/test.sh && git commit -m "feat: refresh knowledge scaffolding on re-run with .bak backup"
```

---

### Task 2: 멱등성 + README 분기 회귀 테스트

**Files:**
- Modify: `bin/test.sh` (케이스 3 블록 끝, `echo "케이스 3 OK"` 앞)

**Interfaces:**
- Consumes: Task 1의 `planScaffold` / `'scaffold-update'` 동작과 `printAnalysis`의 `갱신(.bak 백업)` 출력 줄

- [ ] **Step 1: 회귀 테스트 추가**

(Task 1이 동작을 이미 구현했으므로 이 블록은 통과가 정상이다. 목적은 멱등성과 README 분기를 **회귀로 고정**하는 것.)

`bin/test.sh`에서 `echo "케이스 3 OK"` **바로 앞에** 아래 블록을 삽입 (Task 1이 넣은 assertion 블록 다음):

```bash
# 멱등: 바뀐 게 없으면 .bak을 다시 만들지 않는다
rm knowledge/_templates/meeting-note.md.bak
node "$ROOT/bin/init.js" -y > out3.log
[ ! -f knowledge/_templates/meeting-note.md.bak ] || fail "변경 없는데 .bak 재생성됨"

# README도 스캐폴딩이라 갱신 대상
printf 'STALE README\n' > knowledge/docs/README.md
node "$ROOT/bin/init.js" -y > out4.log
if grep -q 'STALE README' knowledge/docs/README.md; then fail "README 스캐폴딩 갱신 안 됨"; fi
[ -f knowledge/docs/README.md.bak ] || fail "README .bak 백업 없음"
grep -q 'bak 백업' out4.log || fail "분석 요약에 .bak 갱신 줄 없음"

# 사용자 데이터는 이 모든 재실행 후에도 무손상
grep -q 'edited by user' knowledge/index.md || fail "index.md 덮어씀"
[ -f knowledge/meetings/2026-07-21-test.md ] || fail "사용자 노트 유실"
grep -q 'user-topic-slug' knowledge/clusters/_topics.md || fail "_topics.md 덮어씀"
```

- [ ] **Step 2: 테스트 실행 — 통과 확인**

Run: `bash bin/test.sh`
Expected: `ALL PASS`. (Task 1 구현이 옳으면 이 블록은 바로 통과한다 — 실패하면 멱등성이나 README 분기에 진짜 버그가 있는 것이므로 `planScaffold`의 내용 비교(`cur === src`)와 `isScaffold`의 basename 검사를 점검할 것.)

- [ ] **Step 3: Commit**

```bash
git add bin/test.sh && git commit -m "test: scaffolding refresh idempotency and README branch"
```

---

## 검증 요약 (전체 완료 기준)

1. `bash bin/test.sh` → 케이스 1~4 `ALL PASS`
2. `_templates/*`와 `**/README.md`는 재실행 시 최신본으로 갱신되고, 바뀐 경우에만 `.bak`이 남는다
3. `index.md`, `log.md`, `clusters/_topics.md`, 실제 노트는 어떤 재실행 후에도 원본 그대로다
4. 변경 없는 재실행은 `.bak`을 만들지 않는다 (멱등)
