# W7 문서 인제스천 + 버전 자동화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 일반 문서(기획서·스펙·리서치·아티클)를 가중치와 함께 지식화하는 W7 워크플로우 + graph.json 시각화 동봉 + GitHub Actions 버전 자동 범프.

**Architecture:** 순수 Markdown 규칙 확장 — `knowledge/docs/` 폴더와 doc frontmatter 스키마(연관 강도 `topics`/`topics_ref`, 권위 `authority`)를 추가하고 SECOND-BRAIN.md에 W7을 정의. 시각화는 Obsidian 네이티브 graph.json 동봉. CI는 셸-온리 워크플로우 1개.

**Tech Stack:** Markdown + YAML frontmatter, Obsidian graph.json, GitHub Actions (`actions/checkout`만 사용). 설치 스크립트(`bin/init.js`)는 수정하지 않는다.

**Spec:** `docs/superpowers/specs/2026-07-21-doc-ingestion-design.md`

## Global Constraints

- 의존성 0개 유지 — `package.json` 무변경, 서드파티 GitHub Action은 `actions/checkout`만 허용
- `bin/init.js` 수정 금지 — `knowledge/` 하위 신규 파일은 기존 `installIfMissing` 워커가 자동 복사됨
- authority 값은 정확히 `official | internal | external`, doc_type 값은 정확히 `spec | prd | design | research | article | other`
- external 문서는 결정(DEC) 추출 금지 — 논점만 기록 (스펙의 결정 추출 게이트)
- 커밋 메시지 형식 `<type>: <description>`, Co-Authored-By 태그 금지
- 워크플로우 yml에서 커밋 메시지를 셸에 넣을 때 반드시 `env:` 간접 참조 사용 (`${{ }}` 직접 삽입 금지 — 스크립트 인젝션 방지)
- 볼트 노트·템플릿의 파일명 규칙: ASCII kebab-case

---

### Task 1: 볼트 구조 — docs/ 폴더·doc 템플릿·graph.json·gitignore 픽스 (TDD)

**Files:**
- Create: `knowledge/docs/README.md`
- Create: `knowledge/_templates/doc.md`
- Create: `knowledge/.obsidian/graph.json`
- Modify: `knowledge/_templates/cluster-index.md` (문서 섹션 2개 추가)
- Modify: `knowledge/index.md` (폴더 안내에 docs/ 추가)
- Modify: `.gitignore` (앵커 버그 픽스)
- Test: `bin/test.sh` (케이스 1에 asserts 추가)

**Interfaces:**
- Produces: `knowledge/_templates/doc.md`의 frontmatter 키 이름(`doc_type`, `authority`, `source`, `topics`, `topics_ref`, `decisions`, `supersedes`, `superseded_by`) — Task 2의 SECOND-BRAIN.md 스키마 문구와 Task 3의 커맨드가 이 키 이름을 그대로 사용한다. 클러스터 템플릿의 신규 섹션명은 정확히 `## 핵심 문서`, `## 참고 문서`.

- [ ] **Step 1: 실패하는 테스트 추가**

`bin/test.sh` 케이스 1의 `[ -f knowledge/_templates/meeting-note.md ] || fail "_templates 없음"` 줄 바로 다음에 삽입:

```bash
[ -f knowledge/docs/README.md ] || fail "docs/ 스켈레톤 없음"
[ -f knowledge/_templates/doc.md ] || fail "doc 템플릿 없음"
[ -f knowledge/.obsidian/graph.json ] || fail "graph.json 미설치"
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `bash bin/test.sh`
Expected: FAIL — `docs/ 스켈레톤 없음` (SRC에 파일이 없어 설치본에도 없음)

- [ ] **Step 3: 신규 파일 3개 생성**

`knowledge/docs/README.md`:

```markdown
# docs/
외부에서 들어온 문서(DOC-NNNN)의 요약 노트 — 기획서·스펙·설계서·리서치·아티클.
frontmatter의 authority(권위)와 topics/topics_ref(연관 강도)가 검색·충돌 판정의 가중치 키.
```

`knowledge/_templates/doc.md`:

```markdown
---
type: doc
id: DOC-NNNN
doc_type: other       # spec | prd | design | research | article | other
authority: internal   # official | internal | external
created: YYYY-MM-DD
source: ""            # 원본 파일 경로 또는 URL
topics: []            # 핵심 연관 토픽 (검색 우선)
topics_ref: []        # 참고 연관 토픽 (검색 후순위)
decisions: []         # 이 문서에서 추출된 DEC-NNNN
status: active        # active | superseded
supersedes: null      # DOC-NNNN — 이 문서가 대체한 과거 문서
superseded_by: null   # DOC-NNNN — 이 문서를 대체한 새 문서
related: []
---

# DOC-NNNN: {문서 제목}

## 요약
{3~5문장. 이 문서가 무엇이고 왜 중요한가.}

## 핵심 내용 · 논점
- {논점 1}

## 추출된 결정
<!-- authority가 official/internal일 때만. external 문서는 결정을 만들지 않는다. -->
- [[DEC-NNNN-...]] — {요약}

## 열린 질문
- {}

## 원본 참조
- {경로 또는 URL}
```

`knowledge/.obsidian/graph.json`:

```json
{
  "collapse-filter": true,
  "search": "",
  "showTags": false,
  "showAttachments": false,
  "hideUnresolved": false,
  "showOrphans": true,
  "collapse-color-groups": false,
  "colorGroups": [
    { "query": "path:meetings", "color": { "a": 1, "rgb": 3900150 } },
    { "query": "path:decisions", "color": { "a": 1, "rgb": 2278750 } },
    { "query": "path:issues", "color": { "a": 1, "rgb": 15680580 } },
    { "query": "path:docs", "color": { "a": 1, "rgb": 11032055 } },
    { "query": "path:clusters", "color": { "a": 1, "rgb": 15381256 } },
    { "query": "path:reports", "color": { "a": 1, "rgb": 10265519 } }
  ],
  "collapse-display": true,
  "showArrow": false,
  "textFadeMultiplier": 0,
  "nodeSizeMultiplier": 1,
  "lineSizeMultiplier": 1,
  "collapse-forces": true,
  "centerStrength": 0.5,
  "repelStrength": 10,
  "linkStrength": 1,
  "linkDistance": 250,
  "scale": 1,
  "close": false
}
```

(색: meetings 파랑 #3B82F6, decisions 초록 #22C55E, issues 빨강 #EF4444, docs 보라 #A855F7, clusters 노랑 #EAB308, reports 회색 #9CA3AF — rgb는 10진 정수)

- [ ] **Step 4: 기존 파일 3개 수정**

`knowledge/_templates/cluster-index.md` — `## 관련 이슈` 섹션 앞에 삽입:

```markdown
## 핵심 문서
- [[DOC-NNNN-...]] — {요약} ({authority})

## 참고 문서
- [[DOC-NNNN-...]] — {요약}

```

`knowledge/index.md` — `- issues/ — 이슈·완료 리포트 (ISS)` 줄 다음에 삽입:

```markdown
- docs/ — 문서 요약 노트 (DOC) — 권위·연관 가중치
```

`.gitignore` — 전체를 다음으로 교체 (기존 `.obsidian/workspace.json` 패턴은 슬래시 때문에 루트 앵커라 `knowledge/.obsidian/`에 안 먹힘):

```
.DS_Store
**/.obsidian/workspace*.json
```

- [ ] **Step 5: 테스트 실행 — 통과 확인**

Run: `bash bin/test.sh`
Expected: 케이스 1~4 OK + `ALL PASS`

추가 확인: `git check-ignore knowledge/.obsidian/workspace.json` → 경로가 출력되어야 함(ignore 동작), `git check-ignore knowledge/.obsidian/graph.json` → 출력 없음(추적 대상).

- [ ] **Step 6: Commit**

```bash
git add knowledge/ .gitignore bin/test.sh && git commit -m "feat: docs/ vault section, doc template, graph colors, gitignore fix"
```

---

### Task 2: SECOND-BRAIN.md W7 정의 + 기존 워크플로우 통합 + AGENTS.md

**Files:**
- Modify: `SECOND-BRAIN.md` (레이아웃, 스키마, W2/W3/W4/W5 갱신, W7 신설)
- Modify: `AGENTS.md` (intent 표에 W7 행)

**Interfaces:**
- Consumes: Task 1의 frontmatter 키 이름·클러스터 섹션명 (`## 핵심 문서`/`## 참고 문서`)
- Produces: 워크플로우 이름 `W7 — Document ingestion (/ingest-doc)` — Task 3의 커맨드 파일이 "per SECOND-BRAIN.md workflow W7"로 참조한다.

- [ ] **Step 1: SECOND-BRAIN.md 편집 (Edit 도구, 정확한 문자열 교체 7건)**

1. 레이아웃 블록 — `├── issues/       # issues + completion reports   ISS-NNNN-<slug>.md` 줄 다음에 삽입:

```
├── docs/         # ingested documents            DOC-NNNN-<slug>.md
```

2. 공통 키 — `type: meeting | decision | issue | completion-report | report | cluster` → `type: meeting | decision | issue | completion-report | report | cluster | doc`

3. 타입별 키 목록 — cluster 항목(`- cluster: ...`) 다음에 추가:

```markdown
- doc: `id: DOC-NNNN`, `doc_type: spec | prd | design | research | article | other`,
  `authority: official | internal | external`, `source: <path or URL>`,
  `topics_ref: [...]` (참고 연관 — 검색 후순위), `decisions: [DEC-NNNN, ...]`,
  `supersedes: DOC-NNNN | null`, `superseded_by: DOC-NNNN | null`,
  `status: active | superseded`
```

4. W3 1번 항목 — `1. Identify relevant topics; collect the ACTIVE decisions, latest meeting` / `   context, and any open or resolved issues on those topics.` → 다음으로 교체:

```markdown
1. Identify relevant topics; collect the ACTIVE decisions, latest meeting
   context, relevant docs — `topics` matches first, ordered
   official → internal → external; `topics_ref` matches go to a separate
   reference section — and any open or resolved issues on those topics.
```

5. W4 충돌 메시지 블록 — 기존:

```markdown
> 이전 결정과 충돌합니다.
> - 기존: DEC-0012 (2026-06-30) — "<summary>"
> - 신규: "<summary>"
> 어느 쪽으로 갈까요? (기존 유지 / 신규로 대체 / 둘 다 조건부 유지)
```

→ 교체:

```markdown
> 이전 결정과 충돌합니다.
> - 기존: DEC-0012 (2026-06-30) — "<summary>" [출처: <회의 또는 DOC id + authority>]
> - 신규: "<summary>" [출처: <회의 또는 DOC id + authority>]
> 어느 쪽으로 갈까요? (기존 유지 / 신규로 대체 / 둘 다 조건부 유지)

결정의 출처가 문서(DOC)면 해당 문서의 `authority`를 반드시 함께 표시한다.
권위가 판정을 자동화하지는 않는다 — 항상 사용자가 결정한다.
```

6. W5 — `vault content ONLY — every claim must trace to a meeting, decision, or issue` / `note.` 부분의 `meeting, decision, or issue` → `meeting, decision, issue, or doc`

7. W2 클러스터 노트 설명 — `what this topic is, timeline of meetings that touched it, list of decisions` / `(active vs superseded), open issues, current state summary.` 중 `open issues, current state summary.` → `open issues, key/reference documents (핵심 문서 / 참고 문서), current state summary.`

- [ ] **Step 2: W7 섹션 신설 — W6 섹션 끝(`## General rules` 직전)에 삽입**

```markdown
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
   or edit the old document's content.

```

- [ ] **Step 3: AGENTS.md intent 표에 행 추가**

`| Ingest an issue / completion report | W6 |` 줄 다음에 삽입:

```markdown
| Ingest a document (기획서/스펙/아티클) | W7 |
```

- [ ] **Step 4: 검증**

```bash
grep -c 'W7' SECOND-BRAIN.md && grep -n 'docs/' SECOND-BRAIN.md | head -3 && grep -n 'W7' AGENTS.md && grep -n 'topics_ref' SECOND-BRAIN.md | head -3
```

Expected: SECOND-BRAIN.md에 W7 2회 이상, 레이아웃에 docs/ 존재, AGENTS.md에 W7 행 1개, topics_ref 스키마·W7 언급 존재.

- [ ] **Step 5: Commit**

```bash
git add SECOND-BRAIN.md AGENTS.md && git commit -m "feat: W7 document ingestion workflow with authority/relevance weighting"
```

---

### Task 3: /ingest-doc 커맨드 2벌 + README (TDD)

**Files:**
- Create: `.claude/commands/ingest-doc.md`
- Create: `.codex/prompts/ingest-doc.md`
- Modify: `README.md` (커맨드 표, 구조, 사용법 시나리오 6, mermaid, Obsidian 섹션)
- Test: `bin/test.sh` (케이스 1에 asserts 추가)

**Interfaces:**
- Consumes: Task 2의 `SECOND-BRAIN.md workflow W7`, Task 1의 템플릿 경로 `knowledge/_templates/doc.md`

- [ ] **Step 1: 실패하는 테스트 추가**

`bin/test.sh` 케이스 1의 `[ -f .codex/prompts/ingest-meeting.md ] || fail "codex 프롬프트 없음"` 줄 다음에 삽입:

```bash
[ -f .claude/commands/ingest-doc.md ] || fail "ingest-doc 커맨드 미설치"
[ -f .codex/prompts/ingest-doc.md ] || fail "ingest-doc codex 프롬프트 미설치"
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `bash bin/test.sh`
Expected: FAIL — `ingest-doc 커맨드 미설치`

- [ ] **Step 3: 커맨드 파일 2개 생성**

`.claude/commands/ingest-doc.md`:

```markdown
---
description: 기획서·스펙·리서치·아티클 등 일반 문서를 지식화해 docs/에 저장 (권위·연관 가중치 + 결정 추출)
---

Ingest a document per SECOND-BRAIN.md workflow W7.

Input: $ARGUMENTS (file path or pasted content; if empty, ask).

1. Determine `doc_type` (spec/prd/design/research/article/other) and
   `authority` (official/internal/external). Ask if ambiguous — never
   guess authority.
2. Create from `knowledge/_templates/doc.md` (next DOC-NNNN): summary,
   key points, open questions, source reference.
3. official/internal only: extract decisions into DEC notes — run
   conflict detection (W4) BEFORE saving each one, link both ways.
   external documents → 논점만, no decisions.
4. Weight topics: core → `topics`, peripheral → `topics_ref`
   (vocabulary per `clusters/_topics.md`).
5. Update matching cluster notes: "핵심 문서" / "참고 문서" sections.
6. Link related meetings/decisions/issues; append one line to
   `knowledge/log.md`.
```

`.codex/prompts/ingest-doc.md` (codex 스타일 — frontmatter 없음):

```markdown
Ingest a document per SECOND-BRAIN.md workflow W7.

Input: $ARGUMENTS (file path or pasted content; if empty, ask).

1. Determine `doc_type` (spec/prd/design/research/article/other) and
   `authority` (official/internal/external). Ask if ambiguous — never
   guess authority.
2. Create from `knowledge/_templates/doc.md` (next DOC-NNNN): summary,
   key points, open questions, source reference.
3. official/internal only: extract decisions into DEC notes — run
   conflict detection (W4) BEFORE saving each one, link both ways.
   external documents → 논점만, no decisions.
4. Weight topics: core → `topics`, peripheral → `topics_ref`
   (vocabulary per `clusters/_topics.md`).
5. Update matching cluster notes: "핵심 문서" / "참고 문서" sections.
6. Link related meetings/decisions/issues; append one line to
   `knowledge/log.md`.
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

Run: `bash bin/test.sh`
Expected: 케이스 1~4 OK + `ALL PASS`

- [ ] **Step 5: README.md 수정 (Edit 도구, 5건)**

1. mermaid 다이어그램 — `    V -->|"/report"| R["📄 보고서"]` 줄 다음에 삽입:

```
    D2["📑 문서(기획서·스펙)"] -->|"/ingest-doc"| V
```

2. 커맨드 표 — `/ingest-meeting` 행 다음에 삽입:

```markdown
| `/ingest-doc` | 기획서·스펙·아티클 등 문서 지식화 — 권위·연관 가중치 + 결정 추출 |
```

3. 구조 블록 — `├── issues/       이슈 + 완료 리포트 (ISS-NNNN) — 재발 탐지의 재료` 줄 다음에 삽입:

```
├── docs/         문서 요약 노트 (DOC-NNNN) — 권위·연관 가중치
```

4. 사용법 — `### 5. 보고할 때` 섹션의 마지막(`볼트에 없는 내용은 지어내지 않고 "없다"고 말한다.` 줄) 다음, `> 💡 커맨드는 편의일 뿐` 인용구 앞에 삽입 (아래 4-백틱 펜스 안의 내용 전체 — 안쪽 3-백틱 펜스도 README에 그대로 들어감):

````markdown
### 6. 문서를 받았을 때 — 기획서·스펙·아티클도 지식으로

```
/ingest-doc 결제모듈_기획서.md
```

권위(official/internal/external)와 주제 연관(핵심 `topics` / 참고 `topics_ref`)을
가중치로 매긴다. 공식·내부 문서 속 결정은 DEC 노트로 추출되어 충돌 감지를
통과해야 하고, 외부 아티클은 논점만 남긴다 — 외부 자료가 결정을 오염시키지 않는다.
````

5. Obsidian 섹션 — `4. 그래프 뷰 열기: \`Cmd/Ctrl + G\`` 줄 다음에 삽입:

```markdown

폴더별 색 그룹(회의=파랑, 결정=초록, 이슈=빨강, 문서=보라, 클러스터=노랑)은
`knowledge/.obsidian/graph.json`으로 미리 설정되어 있다 — 볼트를 열면 바로 적용된다.
```

- [ ] **Step 6: Commit**

```bash
git add .claude/commands/ingest-doc.md .codex/prompts/ingest-doc.md README.md bin/test.sh && git commit -m "feat: /ingest-doc command (claude + codex) and README docs"
```

---

### Task 4: GitHub Actions 버전 자동 범프 + 푸시 + 실전 검증

**Files:**
- Create: `.github/workflows/version-bump.yml`

**Interfaces:**
- Consumes: Task 1~3 커밋 전부 (한 번의 push로 워크플로우 실행 트리거)

- [ ] **Step 1: 워크플로우 파일 생성**

`.github/workflows/version-bump.yml`:

```yaml
name: version-bump

on:
  push:
    branches: [main]

permissions:
  contents: write

jobs:
  bump:
    if: ${{ !startsWith(github.event.head_commit.message, 'chore(release):') }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Determine bump level
        id: level
        env:
          MSG: ${{ github.event.head_commit.message }}
        run: |
          case "$MSG" in
            feat:*|"feat("*) echo "level=minor" >> "$GITHUB_OUTPUT" ;;
            *)               echo "level=patch" >> "$GITHUB_OUTPUT" ;;
          esac

      - name: Bump, commit, tag, push
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          NEW="$(npm version "${{ steps.level.outputs.level }}" --no-git-tag-version)"
          git add package.json
          git commit -m "chore(release): $NEW"
          git tag "$NEW"
          git push origin main --follow-tags
```

(주의: `MSG`는 반드시 `env:` 간접 참조 — 커밋 메시지를 `${{ }}`로 run 블록에 직접 넣으면 스크립트 인젝션. `steps.level.outputs.level`은 워크플로우 자체 생성값이라 안전. GITHUB_TOKEN 푸시는 워크플로우를 재트리거하지 않아 루프 없음 + `if:` 가드 2중 안전판.)

- [ ] **Step 2: 전체 테스트 + 커밋 + 푸시**

```bash
bash bin/test.sh && git add .github/ && git commit -m "ci: auto version bump on main push" && git push origin main
```

Expected: `ALL PASS` 후 푸시 성공. 이 푸시의 head 커밋은 `ci:`로 시작 → patch 범프 예상.

- [ ] **Step 3: Actions 실행 확인**

```bash
RUN_ID=$(gh run list --workflow version-bump.yml -L 1 --json databaseId -q '.[0].databaseId') && gh run watch "$RUN_ID" --exit-status
```

Expected: 워크플로우 성공 종료 (exit 0). 실패 시 `gh run view "$RUN_ID" --log-failed`로 로그 확인 후 수정.

- [ ] **Step 4: 범프 결과 검증**

```bash
git fetch origin --tags && git log origin/main -1 --oneline && git tag -l 'v*'
```

Expected: 최신 커밋 `chore(release): v1.0.1`, 태그 `v1.0.1` 존재. 로컬 반영: `git pull --ff-only origin main` 후 `grep '"version"' package.json` → `1.0.1`.

---

## 검증 요약 (전체 완료 기준)

1. `bash bin/test.sh` → 4케이스 ALL PASS (docs 스켈레톤·doc 템플릿·graph.json·ingest-doc 커맨드 설치 확인 포함)
2. `git check-ignore knowledge/.obsidian/workspace.json` 동작 (gitignore 픽스)
3. GitHub Actions 실행 성공 + `chore(release): vX.Y.Z` 커밋·태그 자동 생성
4. (수동, 선택) 임시 설치본에서 `/ingest-doc` 시연 + Obsidian 색 그룹 확인
