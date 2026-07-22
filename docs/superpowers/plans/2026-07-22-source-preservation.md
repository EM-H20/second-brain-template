# 원본 보존(_sources/) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 인제스트한 원본 텍스트를 `knowledge/_sources/`에 verbatim 보존하고, 각 노트의 `source:` 필드가 그 경로를 가리키게 한다.

**Architecture:** 순수 Markdown 규칙 확장 — 볼트 노트 타입과 1:1 미러링하는 `_sources/meetings|docs|issues/` 폴더를 추가하고, 스키마에 `source:` 필드를, General rules에 "원본 보존" 전역 규칙 하나를 넣는다. 새 슬래시 커맨드·코드 없음. 설치 스크립트 무수정.

**Tech Stack:** Markdown + YAML frontmatter, Obsidian graph.json. `bin/init.js` 미변경.

**Spec:** `docs/superpowers/specs/2026-07-22-source-preservation-design.md`

## Global Constraints

- 텍스트(.md) 원본만 `_sources/`에 저장 — 바이너리(녹음·PDF·이미지)는 저장 안 함, `source:`에 외부 URL
- 폴더 미러링: `_sources/meetings/`, `_sources/docs/`, `_sources/issues/` (이 3종만; reports·decisions·clusters는 원본 없음)
- 저장 파일명 = 짝이 되는 노트의 정식 id/slug 그대로 (원본의 원래 이름 무시 — 기존 ASCII kebab-case 규칙 재사용)
- 원본은 가공 없이 verbatim 저장 (AI 재작성 금지 — ground truth)
- `source:`는 경로 문자열, 위키링크 아님 (그래프 오염 방지)
- `_sources/`는 frontmatter grep·Obsidian 그래프에서 제외
- `bin/init.js` 수정 금지 (knowledge/ 하위 신규 파일은 installIfMissing이 자동 복사)
- 커밋 메시지 `<type>: <description>`, Co-Authored-By 태그 금지

---

### Task 1: `_sources/` 스켈레톤 + 그래프 필터 + 테스트 (TDD)

**Files:**
- Create: `knowledge/_sources/README.md`
- Create: `knowledge/_sources/meetings/README.md`
- Create: `knowledge/_sources/docs/README.md`
- Create: `knowledge/_sources/issues/README.md`
- Modify: `knowledge/.obsidian/graph.json` (`search` 필터)
- Test: `bin/test.sh` (케이스 1에 asserts 추가)

**Interfaces:**
- Produces: `knowledge/_sources/{meetings,docs,issues}/` 폴더 경로 — Task 2·3의 스키마·규칙 문구가 이 경로를 그대로 참조한다.

- [ ] **Step 1: 실패하는 테스트 추가**

`bin/test.sh` 케이스 1의 `[ -f knowledge/.obsidian/graph.json ] || fail "graph.json 미설치"` 줄 바로 다음에 삽입:

```bash
[ -f knowledge/_sources/README.md ] || fail "_sources 스켈레톤 없음"
[ -f knowledge/_sources/meetings/README.md ] || fail "_sources/meetings 없음"
[ -f knowledge/_sources/docs/README.md ] || fail "_sources/docs 없음"
[ -f knowledge/_sources/issues/README.md ] || fail "_sources/issues 없음"
grep -q 'path:_sources' knowledge/.obsidian/graph.json || fail "graph 필터에 _sources 제외 없음"
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `bash bin/test.sh`
Expected: FAIL — `_sources 스켈레톤 없음` (SRC에 파일이 없어 설치본에도 없음)

- [ ] **Step 3: 스켈레톤 README 4개 생성**

`knowledge/_sources/README.md`:

```markdown
# _sources/
인제스트한 원본 텍스트를 verbatim(가공 없이 그대로)으로 보존하는 곳 — ground truth.
노트 타입별 미러링: meetings/ · docs/ · issues/. 파일명은 짝이 되는 노트의
id/slug과 동일하다. 이 폴더는 frontmatter 검색·Obsidian 그래프에서 제외된다.
```

`knowledge/_sources/meetings/README.md`:

```markdown
# _sources/meetings/
원본 회의 전사체. `meetings/` 노트와 1:1 (같은 파일명).
```

`knowledge/_sources/docs/README.md`:

```markdown
# _sources/docs/
원본 문서(기획서·스펙·리서치·아티클). `docs/` 노트와 1:1 (같은 파일명).
```

`knowledge/_sources/issues/README.md`:

```markdown
# _sources/issues/
원본 이슈·완료 리포트 문서. `issues/` 노트와 1:1 (같은 파일명).
```

- [ ] **Step 4: graph.json 검색 필터 수정**

`knowledge/.obsidian/graph.json`에서 (Edit 도구):

```
  "search": "",
```

→

```
  "search": "-path:_sources",
```

- [ ] **Step 5: 테스트 실행 — 통과 확인**

Run: `bash bin/test.sh`
Expected: 케이스 1~4 OK + `ALL PASS`

추가 확인: `node -e "JSON.parse(require('fs').readFileSync('knowledge/.obsidian/graph.json'))"` → 에러 없이 종료(유효 JSON).

- [ ] **Step 6: Commit**

```bash
git add knowledge/_sources knowledge/.obsidian/graph.json bin/test.sh && git commit -m "feat: _sources/ skeleton for original preservation, exclude from graph"
```

---

### Task 2: `source:` 필드 — 스키마 + 템플릿 4개

**Files:**
- Modify: `SECOND-BRAIN.md` (frontmatter 스키마)
- Modify: `knowledge/_templates/meeting-note.md`
- Modify: `knowledge/_templates/issue.md`
- Modify: `knowledge/_templates/completion-report.md`
- Modify: `knowledge/_templates/doc.md`

**Interfaces:**
- Consumes: Task 1의 `_sources/{meetings,docs,issues}/` 경로
- Produces: 네 노트 타입(meeting/issue/completion-report/doc)의 frontmatter에 `source:` 키 — Task 3의 워크플로우 규칙이 이 키를 채운다.

- [ ] **Step 1: SECOND-BRAIN.md 스키마 편집 (Edit 도구, 4건)**

1. meeting 키 — 다음 줄:

```
- meeting: `attendees: []`, `decisions: [DEC-NNNN, ...]`, `action_items: n`
```

→ 교체:

```
- meeting: `attendees: []`, `decisions: [DEC-NNNN, ...]`, `action_items: n`,
  `source: "_sources/meetings/<id>.md" | "<external URL>"`
```

2. issue 키 — 다음 3줄:

```
- issue: `id: ISS-NNNN`, `symptoms: [<keyword>, ...]`,
  `root_cause: <one line>`, `status: open | resolved`,
  `resolution: "[[ISS-NNNN-...]]" | null` (link to completion report)
```

→ 교체 (마지막 줄에 `source:` 추가):

```
- issue: `id: ISS-NNNN`, `symptoms: [<keyword>, ...]`,
  `root_cause: <one line>`, `status: open | resolved`,
  `resolution: "[[ISS-NNNN-...]]" | null` (link to completion report),
  `source: "_sources/issues/<id>.md" | "<external URL>"`
```

3. completion-report 키 — 다음 2줄:

```
- completion-report: `id: ISS-NNNN` (same id as the issue it closes),
  `resolves: "[[ISS-NNNN-...]]"`
```

→ 교체:

```
- completion-report: `id: ISS-NNNN` (same id as the issue it closes),
  `resolves: "[[ISS-NNNN-...]]"`, `source: "_sources/issues/<id>.md" | "<external URL>"`
```

4. doc 키 — 다음 줄:

```
  `authority: official | internal | external`, `source: <path or URL>`,
```

→ 교체:

```
  `authority: official | internal | external`,
  `source: "_sources/docs/<id>.md" (local, 텍스트 저장 시) | "<external URL>"`,
```

- [ ] **Step 2: SECOND-BRAIN.md 스키마 설명 한 줄 추가**

타입별 키 목록의 마지막 항목(doc의 `status: active | superseded` 줄) 다음에 빈 줄 + 설명 삽입:

```markdown

`source:` (meeting/issue/completion-report/doc): 원본의 위치. 텍스트 원본을
보존하면 로컬 `_sources/<type>/<id>.md` 경로, 바이너리 등 미보존이면 외부 URL.
(decision·report·cluster는 파생/생성물이라 `source` 없음.)
```

- [ ] **Step 3: 템플릿 frontmatter에 `source:` 추가 (3개)**

`knowledge/_templates/meeting-note.md` — `related: []          # ["[[2026-07-01-kickoff]]", ...]` 줄 다음(닫는 `---` 앞)에 삽입:

```yaml
source: ""           # _sources/meetings/<id>.md (텍스트 보존 시) 또는 외부 URL
```

`knowledge/_templates/issue.md` — `related: []` 줄 다음(닫는 `---` 앞)에 삽입:

```yaml
source: ""            # _sources/issues/<id>.md (텍스트 보존 시) 또는 외부 URL
```

`knowledge/_templates/completion-report.md` — `related: []` 줄 다음(닫는 `---` 앞)에 삽입:

```yaml
source: ""             # _sources/issues/<id>.md (텍스트 보존 시) 또는 외부 URL
```

- [ ] **Step 4: 템플릿 본문·주석 갱신 (2개)**

`knowledge/_templates/meeting-note.md` — 본문 마지막 블록:

```
## 원본 전사체
> 원본 파일: {경로 또는 "채팅으로 붙여넣음"}
```

→ 교체:

```
## 원본 전사체
> 원본은 `_sources/meetings/<이 노트와 같은 파일명>.md`에 verbatim 보존됨
> (frontmatter `source:` 참조).
```

`knowledge/_templates/doc.md` — 다음 줄:

```
source: ""            # 원본 파일 경로 또는 URL
```

→ 교체:

```
source: ""            # _sources/docs/<id>.md (텍스트 보존 시) 또는 외부 URL
```

- [ ] **Step 5: 검증 + 테스트**

```bash
grep -c 'source:' knowledge/_templates/meeting-note.md knowledge/_templates/issue.md knowledge/_templates/completion-report.md knowledge/_templates/doc.md
grep -n '_sources/' SECOND-BRAIN.md | head
bash bin/test.sh
```

Expected: 각 템플릿에 `source:` 1개 이상, SECOND-BRAIN.md에 `_sources/` 스키마 참조 존재, `ALL PASS`.

- [ ] **Step 6: Commit**

```bash
git add SECOND-BRAIN.md knowledge/_templates && git commit -m "feat: add source field to meeting/issue/completion/doc schemas"
```

---

### Task 3: 원본 보존 워크플로우 규칙 + 검색 제외 + README

**Files:**
- Modify: `SECOND-BRAIN.md` (General rules에 규칙 추가, 검색 규칙에 제외 한 줄)
- Modify: `README.md` (구조 블록, 동작 원리)

**Interfaces:**
- Consumes: Task 1의 `_sources/` 경로, Task 2의 `source:` 필드

- [ ] **Step 1: SECOND-BRAIN.md 검색 규칙에 제외 문구 추가**

다음 3줄:

```
Frontmatter is how you find things without reading every file.
When searching the vault, ALWAYS scan frontmatter first (grep the YAML
blocks), then open only the notes whose frontmatter matches.
```

→ 마지막에 한 문장 추가:

```
Frontmatter is how you find things without reading every file.
When searching the vault, ALWAYS scan frontmatter first (grep the YAML
blocks), then open only the notes whose frontmatter matches.
`_sources/`는 스키마 없는 원본 보존본이므로 검색 대상이 아니다 — 절대 스캔하지 않는다.
```

- [ ] **Step 2: General rules에 "원본 보존" 규칙 추가**

`- **Work log (append-only).**`로 시작하는 항목 **앞**(즉 General rules의 첫 항목으로) 삽입:

```markdown
- **원본 보존.** 인제스트한 원본이 텍스트면, 노트 생성 직후 그 내용을 가공 없이
  (verbatim) `_sources/<type>/<노트와 동일한 id-slug>.md`에 저장하고 노트의
  `source:`를 그 경로로 설정한다 (type = meetings / docs / issues, W1·W6·W7 공통).
  원본이 바이너리(녹음·PDF·이미지)면 저장을 건너뛰고 `source:`에 외부 URL을 적는다.
  붙여넣은 텍스트도 원본으로 저장한다. 저장 파일명은 짝 노트의 정식 id/slug과 동일
  (원본의 원래 이름은 쓰지 않는다 — ASCII kebab-case 규칙 재사용).
```

- [ ] **Step 3: README.md 구조 블록 수정**

다음 2줄:

```
└── _templates/   노트 양식 (frontmatter 규격 포함)
SECOND-BRAIN.md   워크플로우 규칙 (W1~W7) — 시스템의 심장
```

→ 교체:

```
├── _templates/   노트 양식 (frontmatter 규격 포함)
└── _sources/     원본 텍스트 verbatim 보존 (meetings/docs/issues 미러)
SECOND-BRAIN.md   워크플로우 규칙 (W1~W7) — 시스템의 심장
```

- [ ] **Step 4: README.md 동작 원리에 한 줄 추가**

`## ⚙️ 동작 원리` 섹션의 마지막 문단 끝(`잘 구조화된 마크다운은 임베딩 없이도 LLM이 직접 다룰 수 있다.**`) 다음에 문단 삽입:

```markdown

인제스트한 **원본 텍스트는 `_sources/`에 그대로(verbatim) 보존**되고 각 노트의
`source:` 필드가 그 경로를 가리킨다. AI 요약은 손실적이라, 원본이 볼트 안에 있으면
요약 충실도를 언제든 대조할 수 있는 ground truth가 된다. `_sources/`는 검색·그래프에서
제외되어 볼트를 가볍게 유지한다.
```

- [ ] **Step 5: 검증 + 테스트**

```bash
grep -n '원본 보존' SECOND-BRAIN.md && grep -n '_sources' README.md && bash bin/test.sh
```

Expected: General rules에 원본 보존 규칙 존재, README에 `_sources` 언급, `ALL PASS`.

- [ ] **Step 6: Commit + Push**

```bash
git add SECOND-BRAIN.md README.md && git commit -m "feat: source-preservation workflow rule and docs" && git push origin main
```

(push는 version-bump 워크플로우를 트리거 — 정상. 대기 불필요.)

---

## 검증 요약 (전체 완료 기준)

1. `bash bin/test.sh` → 4케이스 ALL PASS (`_sources/` 스켈레톤 4개 + graph 필터 assert 포함)
2. `knowledge/.obsidian/graph.json` 유효 JSON, `search` = `-path:_sources`
3. 네 템플릿(meeting/issue/completion-report/doc) frontmatter에 `source:` 존재
4. SECOND-BRAIN.md: General rules에 "원본 보존" 규칙, 검색 규칙에 `_sources/` 제외 문구
5. (수동, 선택) 임시 설치본에서 한글 이름 원본으로 `/ingest-doc` → `_sources/docs/DOC-0001-*.md`에 정식명 verbatim 저장 + 노트 `source:`가 그 경로를 가리킴
