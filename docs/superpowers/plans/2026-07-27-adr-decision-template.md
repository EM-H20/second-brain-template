# 결정 노트 ADR 6섹션 고도화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `knowledge/_templates/decision.md`를 ADR 6섹션 구조로 재구성하고, 결정 노트가 요약 노트가 아닌 원본에서 파생되도록 `SECOND-BRAIN.md` W1·W7에 규칙을 추가한다.

**Architecture:** 코드 변경이 아니라 **템플릿·규칙 문서 변경**이다. 모든 슬래시 커맨드가 `SECOND-BRAIN.md`에 위임하고, `SECOND-BRAIN.md:113`이 다시 `_templates/decision.md`에 위임하므로 이 두 파일만 고치면 Claude Code·Codex·자연어 경로 전부에 자동 반영된다. frontmatter 스키마는 손대지 않으므로 W4 충돌 감지와 검색 경로는 그대로다.

**Tech Stack:** 순수 Markdown. 검증에만 bash + Node 내장 모듈(`bin/init.js`, `bin/test.sh`).

## Global Constraints

- **TDD 적용 방식:** 이 변경에는 실행 가능한 코드가 없다. 커밋할 테스트 파일을 새로 만들지 않는다 (소비자가 없는 테스트는 YAGNI). 대신 각 태스크는 **변경 전에 검증 명령을 먼저 실행해 실패(RED)를 눈으로 확인하고, 변경 후 같은 명령으로 통과(GREEN)를 확인**한다. 증거 없는 "완료" 선언 금지.
- **frontmatter 무변경:** `type`, `id`, `created`, `topics`, `status`, `supersedes`, `superseded_by`, `related` — 키·순서·주석 전부 현행 유지. `status`는 `active | superseded` 2개값 그대로.
- **`_templates/*`에 마커 금지:** `<!-- second-brain-template -->` 를 절대 넣지 않는다. 템플릿 내용은 새 노트로 그대로 복사되므로 마커가 생성된 노트로 새어나간다 (`bin/init.js:87-90`).
- **섹션 이름 정확히 이 6개, 이 순서:** `## 문제 정의 (Context)` / `## 결정 (Decision)` / `## 검토한 대안 (Alternatives)` / `## 결과 (Consequences)` / `## 영향 범위 (Scope)` / `## 출처 (References)`
- **빈 섹션 문구는 정확히 `논의 기록 없음`:** 섹션 삭제 금지, 내용 날조 금지.
- **커밋 메시지에 `Co-Authored-By` 태그 절대 금지.** Conventional Commits 형식 (`feat:`, `docs:`, `refactor:`).
- **볼트 오염 금지:** `knowledge/decisions/`는 `README.md` 하나만 있는 상태를 유지한다. 검증용 노트는 임시 디렉토리에만 쓴다.

---

### Task 1: 결정 템플릿을 ADR 6섹션으로 재구성

**Files:**
- Modify: `knowledge/_templates/decision.md` (전체 body 교체, frontmatter 유지)

**Interfaces:**
- Consumes: 없음 (첫 태스크)
- Produces: 6개 섹션 헤딩 문자열. Task 2의 규칙 문구와 Task 3의 grep 검증이 이 이름에 의존한다:
  `## 문제 정의 (Context)`, `## 결정 (Decision)`, `## 검토한 대안 (Alternatives)`, `## 결과 (Consequences)`, `## 영향 범위 (Scope)`, `## 출처 (References)`

- [ ] **Step 1: 현재 상태를 검증 명령으로 확인 (RED)**

Run:
```bash
grep -c "^## " knowledge/_templates/decision.md
grep -n "^## " knowledge/_templates/decision.md
```

Expected (변경 전):
```
4
14:## 결정 내용
17:## 근거
20:## 출처
23:## 영향 범위
```

섹션이 4개이고 `문제 정의`·`검토한 대안`·`결과`가 없음을 눈으로 확인한다. 이것이 RED다.

- [ ] **Step 2: 템플릿 파일을 아래 내용으로 통째 교체**

`knowledge/_templates/decision.md` 전문:

````markdown
---
type: decision
id: DEC-NNNN
created: YYYY-MM-DD
topics: []
status: active        # active | superseded
supersedes: null      # DEC-NNNN — 이 결정이 대체한 과거 결정
superseded_by: null   # DEC-NNNN — 이 결정을 대체한 새 결정
related: []           # 출처 회의 노트 등
---

# DEC-NNNN: {결정 한 줄 요약}

## 문제 정의 (Context)
{이 결정이 필요하게 된 배경. 무엇이 문제였고 왜 지금 정해야 했는가.}

## 결정 (Decision)
{무엇을 하기로 했는가. 명확하고 검증 가능하게.}

## 검토한 대안 (Alternatives)
{검토했으나 고르지 않은 옵션과 탈락 이유.
 요약 노트가 아니라 짝이 되는 원본(전사체·문서 원본)을 직접 읽고 채운다.
 원본에 논의 기록이 없으면 "논의 기록 없음"이라고 적는다 — 비워두거나 지어내지 않는다.}

## 결과 (Consequences)
**긍정**
- {이 결정으로 얻는 것}

**부정**
- {감수하는 비용·제약·리스크}

{원본에 논의 기록이 없는 쪽은 그 항목에 "논의 기록 없음"이라고 적는다.}

## 영향 범위 (Scope)
{이 결정이 코드/프로세스의 어디에 영향을 주는가. 경로·모듈·플로우 단위로.}

## 출처 (References)
- 회의: [[YYYY-MM-DD-...]]
````

- [ ] **Step 3: 같은 검증 명령 재실행 (GREEN)**

Run:
```bash
grep -c "^## " knowledge/_templates/decision.md
grep -n "^## " knowledge/_templates/decision.md
```

Expected (변경 후):
```
6
14:## 문제 정의 (Context)
17:## 결정 (Decision)
20:## 검토한 대안 (Alternatives)
25:## 결과 (Consequences)
34:## 영향 범위 (Scope)
37:## 출처 (References)
```

라인 번호는 달라도 되지만 **개수 6개와 6개 이름·순서는 정확히 일치**해야 한다.

- [ ] **Step 4: 제약 조건 3개를 명령으로 확인**

Run:
```bash
grep -c "second-brain-template" knowledge/_templates/decision.md
grep -n "^status:\|^supersedes:\|^superseded_by:\|^type:\|^id:" knowledge/_templates/decision.md
grep -c "근거" knowledge/_templates/decision.md
```

Expected:
```
0
2:type: decision
3:id: DEC-NNNN
6:status: active        # active | superseded
7:supersedes: null      # DEC-NNNN — 이 결정이 대체한 과거 결정
8:superseded_by: null   # DEC-NNNN — 이 결정을 대체한 새 결정
0
```

각각 마커 없음 / frontmatter 그대로 / `## 근거` 제거됨을 뜻한다.
(`grep -c`가 0을 반환하면 종료코드 1이라 `&&` 체이닝하지 말고 한 줄씩 실행할 것.)

- [ ] **Step 5: 설치기 회귀 확인**

Run:
```bash
bash bin/test.sh
```

Expected: 전체 통과. 실패하면 진행하지 말고 원인부터 파악한다.

- [ ] **Step 6: 커밋**

```bash
git add knowledge/_templates/decision.md
git commit -m "feat: 결정 노트 템플릿을 ADR 6섹션 구조로 재구성

기존 '## 근거' 한 덩어리를 Context(왜 필요했나)와
Alternatives(무엇을 버렸나)로 분해하고, Consequences를
긍정/부정으로 나눴다. 영향 범위는 /build가 쓰는 구현 지점
정보라 별도 섹션으로 유지한다.

빈 섹션은 삭제하지 않고 '논의 기록 없음'을 명시해
'검토 안 함'과 '기록 안 함'을 구분한다.

frontmatter 스키마 무변경 — W4 충돌 감지와 검색 경로에 파급 없음."
```

---

### Task 2: SECOND-BRAIN.md W1·W7에 원본 직독 규칙 추가

**Files:**
- Modify: `SECOND-BRAIN.md:112-113` (W1 step 2)
- Modify: `SECOND-BRAIN.md:209-213` (W7 step 3)

**Interfaces:**
- Consumes: Task 1이 정한 섹션 이름 3개 — `Context`, `Alternatives`, `Consequences`
- Produces: W1·W7의 원본 직독 규칙. Task 3의 E2E 검증이 이 규칙의 준수 여부를 확인한다.

- [ ] **Step 1: 현재 상태 확인 (RED)**

Run:
```bash
grep -c "원본 전사체를 직접 읽고\|원본 문서를 직접 읽고" SECOND-BRAIN.md
```

Expected: `0` — 규칙이 아직 없다.

- [ ] **Step 2: W1 step 2 수정**

`SECOND-BRAIN.md:112-113`의 이 두 줄을:

```
2. For every decision made in the meeting, ALSO create a separate decision
   note in `decisions/` (template: `_templates/decision.md`). Link both ways.
```

아래 네 줄로 교체한다:

```
2. For every decision made in the meeting, ALSO create a separate decision
   note in `decisions/` (template: `_templates/decision.md`). Link both ways.
   결정 노트의 Context·Alternatives·Consequences는 요약된 회의 노트가 아니라
   원본 전사체를 직접 읽고 채운다 — 요약 단계에서 가장 먼저 소실되는 정보다.
```

- [ ] **Step 3: W7 step 3 수정**

`SECOND-BRAIN.md:209-213`의 이 다섯 줄을:

```
3. Decision extraction — ONLY for official/internal documents: create a
   decision note per decision (`_templates/decision.md`), run conflict
   detection (W4) BEFORE saving each one, link both ways
   (doc `decisions:` ↔ decision `related:`). external documents NEVER
   create decisions — record 논점 only.
```

아래 일곱 줄로 교체한다:

```
3. Decision extraction — ONLY for official/internal documents: create a
   decision note per decision (`_templates/decision.md`), run conflict
   detection (W4) BEFORE saving each one, link both ways
   (doc `decisions:` ↔ decision `related:`). external documents NEVER
   create decisions — record 논점 only.
   결정 노트의 Context·Alternatives·Consequences는 요약된 doc 노트가 아니라
   원본 문서를 직접 읽고 채운다.
```

- [ ] **Step 4: 검증 (GREEN)**

Run:
```bash
grep -n "원본 전사체를 직접 읽고\|원본 문서를 직접 읽고" SECOND-BRAIN.md
```

Expected: 2줄 히트. 하나는 W1 구역(라인 ~115), 하나는 W7 구역(라인 ~216).

이어서 W4·frontmatter 스키마가 안 건드려졌는지 확인:
```bash
grep -n "^- decision: \`id: DEC-NNNN\`" SECOND-BRAIN.md
grep -c "status: active | superseded" SECOND-BRAIN.md
```

Expected: 첫 명령은 `58:` 라인 히트, 둘째는 `1` 이상. 스키마가 그대로임을 뜻한다.

- [ ] **Step 5: 설치기 회귀 확인**

Run:
```bash
bash bin/test.sh
```

Expected: 전체 통과. `SECOND-BRAIN.md`는 템플릿 소유 파일이라 마커 기반 갱신 경로를 타므로 반드시 확인한다.

- [ ] **Step 6: 커밋**

```bash
git add SECOND-BRAIN.md
git commit -m "feat: 결정 노트 ADR 섹션은 요약이 아닌 원본에서 채우도록 W1/W7 규칙 추가

Context/Alternatives/Consequences는 요약 단계에서 가장 먼저
소실되는 정보다. 회의노트나 doc 노트에서 파생시키면 대안 논의가
이미 사라진 뒤라 섹션이 빈다.

전사체·문서 원본을 직접 읽고 채우도록 순서를 못박는다.
_sources/ 비스캔 규칙과 충돌하지 않는다 — 그 규칙은 검색 대상
제외를 뜻하고, 여기는 원본이 이미 컨텍스트에 있는 인제스트 시점이다."
```

---

### Task 3: 임시 설치본으로 E2E 검증

볼트를 오염시키지 않기 위해 **임시 디렉토리에 설치본을 만들어** 검증한다.
이 태스크는 커밋을 만들지 않는다.

**Files:**
- Create: `/private/tmp/claude-501/-Users-luca-Documents-GitHub-second-brain-template/c26d2f24-4f92-48c5-9373-4e8552dc5bb8/scratchpad/adr-e2e/` (임시, 마지막에 삭제)
- Read: `knowledge/_templates/decision.md`, `SECOND-BRAIN.md`

**Interfaces:**
- Consumes: Task 1의 6개 섹션 이름, Task 2의 원본 직독 규칙
- Produces: 없음 (검증 전용)

- [ ] **Step 1: 임시 프로젝트에 템플릿 설치**

`bin/init.js:9`는 `DEST = process.cwd()`라 대상 디렉토리 인자를 받지 않는다.
반드시 대상 디렉토리 **안에서** 실행해야 한다:

```bash
SB=/private/tmp/claude-501/-Users-luca-Documents-GitHub-second-brain-template/c26d2f24-4f92-48c5-9373-4e8552dc5bb8/scratchpad/adr-e2e
REPO=/Users/luca/Documents/GitHub/second-brain-template
rm -rf "$SB" && mkdir -p "$SB"
(cd "$SB" && node "$REPO/bin/init.js" -y 2>&1 | tail -20)
```

Expected: 설치 완료 메시지 + `$SB/knowledge/_templates/decision.md` 존재

- [ ] **Step 2: 설치된 템플릿이 6섹션인지 확인**

```bash
grep -c "^## " "$SB/knowledge/_templates/decision.md"
grep -c "second-brain-template" "$SB/knowledge/_templates/decision.md"
```

Expected: `6`, 그리고 `0` (마커가 설치본까지 새어나가지 않음).

- [ ] **Step 3: 합성 전사체 작성**

`$SB/transcript.md`에 아래 내용을 그대로 쓴다. 결정 2건이 들어 있고, 하나는 대안 논의가 **있고** 하나는 **없다**:

```markdown
# 2026-07-27 로그인 방식 킥오프

참석: 박PM, 김개발, 이디자인

박PM: 로그인 방식을 정해야 합니다. 소셜만 갈지, 이메일 가입도 열지.
김개발: 이메일 가입은 비밀번호 재설정에 인증 메일까지 다 만들어야 합니다. 2주는 더 걸려요.
박PM: 자체 세션 서버도 검토했는데 운영 부담이 커서 접었습니다.
김개발: 소셜만 하면 카카오·구글 두 개면 끝나죠.
박PM: 그럼 소셜 로그인만 지원하는 걸로 확정합니다.
김개발: 네 좋습니다.

이디자인: 아, 그리고 금요일 오후에는 배포하지 맙시다.
박PM: 그렇게 하죠. 확정입니다.
```

- [ ] **Step 4: 임시 볼트에서 W1 수행**

`$SB`의 `SECOND-BRAIN.md`를 읽고 W1을 `$SB/transcript.md`에 대해 실행한다.
결과물은 **전부 `$SB` 안에만** 쓴다. 원본 저장소의 `knowledge/`는 건드리지 않는다.

기대 산출물:
- `$SB/knowledge/meetings/2026-07-27-login-method-kickoff.md`
- `$SB/knowledge/decisions/DEC-0001-social-login-only.md`
- `$SB/knowledge/decisions/DEC-0002-no-friday-afternoon-deploy.md`

- [ ] **Step 5: 6섹션 구조 검증**

```bash
for f in "$SB"/knowledge/decisions/DEC-*.md; do
  echo "--- $f"
  grep -c "^## " "$f"
  grep "^## " "$f"
done
```

Expected: 두 파일 모두 `6`, 그리고 6개 이름이 이 순서로:
```
## 문제 정의 (Context)
## 결정 (Decision)
## 검토한 대안 (Alternatives)
## 결과 (Consequences)
## 영향 범위 (Scope)
## 출처 (References)
```

- [ ] **Step 6: 빈 섹션 처리 검증 — 이번 검증의 핵심**

```bash
sed -n '/## 검토한 대안/,/## 결과/p' "$SB"/knowledge/decisions/DEC-0001-*.md
sed -n '/## 검토한 대안/,/## 결과/p' "$SB"/knowledge/decisions/DEC-0002-*.md
```

Expected:
- **DEC-0001** (소셜 로그인): 실제 대안 2개가 탈락 이유와 함께 적혀 있어야 한다 — 이메일 가입(2주 추가 소요), 자체 세션 서버(운영 부담).
- **DEC-0002** (금요일 배포): 정확히 `논의 기록 없음` 이 적혀 있어야 한다.

**실패 조건 — 아래 중 하나라도 해당하면 Task 1의 템플릿 지침 문구를 고쳐야 한다:**
- DEC-0002의 대안 섹션이 비어 있음 → 지침이 안 먹힘
- DEC-0002에 전사체에 없는 대안이 적힘 → **날조**, 가장 심각
- DEC-0002의 대안 섹션 자체가 없음 → 섹션 삭제 금지 규칙 위반

- [ ] **Step 7: frontmatter 무변경 검증**

```bash
sed -n '1,10p' "$SB"/knowledge/decisions/DEC-0001-*.md
```

Expected: `type: decision`, `id: DEC-0001`, `created: 2026-07-27`, `topics: [...]`,
`status: active`, `supersedes: null`, `superseded_by: null`, `related: [...]`.
새 키가 추가되었거나 `status`가 `proposed` 같은 값이면 실패다.

- [ ] **Step 8: 원본 저장소 볼트가 깨끗한지 확인**

```bash
cd /Users/luca/Documents/GitHub/second-brain-template
ls knowledge/decisions/
git status --short
```

Expected: `README.md` 하나만. `git status`는 클린(또는 Task 1·2 커밋만 반영된 상태).
결정 노트가 여기 생겼다면 즉시 삭제한다.

- [ ] **Step 9: 임시 디렉토리 정리**

```bash
rm -rf "$SB"
```

- [ ] **Step 10: 결과 보고**

Step 5·6·7의 실제 출력을 근거로 통과/실패를 보고한다. 출력 없이 "통과"라고 쓰지 않는다.

---

## 완료 조건

- `knowledge/_templates/decision.md`가 6섹션, 마커 없음, frontmatter 무변경
- `SECOND-BRAIN.md` W1·W7에 원본 직독 규칙 각 1줄
- `bash bin/test.sh` 통과
- E2E에서 대안 논의 없는 결정이 `논의 기록 없음`으로 나옴 (날조 없음)
- `knowledge/decisions/`에 `README.md` 외 파일 없음
- 커밋 2개, `Co-Authored-By` 태그 없음

## 범위 밖 (건드리지 말 것)

- `README.md` 4개 언어판 — 결정 노트 body 구조를 언급하지 않으므로 수정 불필요
- `.claude/commands/*` 12개 — 전부 `SECOND-BRAIN.md`에 위임하므로 무수정
- `.agents/skills/second-brain/`, `.codex/prompts/` — 동일
- `bin/init.js` — 스캐폴딩 갱신 경로가 이미 `_templates/`를 처리함
- `issue.md` / `doc.md` / `lesson.md` 등 다른 템플릿
- `status`에 `proposed` 추가, frontmatter 배열 필드 구조화, W6 결정 추출
