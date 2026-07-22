# 재실행 시 스캐폴딩 갱신 설계 — second-brain-template

날짜: 2026-07-22
상태: 승인됨

## 문제

`npx github:EM-H20/second-brain-template` 를 이미 설치된 프로젝트에서 재실행하면
**템플릿 소유 파일**(`SECOND-BRAIN.md`, `.claude/commands/*`, `.codex/prompts/*`)은
마커 기반으로 최신본이 반영된다. 그러나 `knowledge/` 아래는 전부 `planIfMissing`
(없을 때만 생성)으로 묶여 있어, 템플릿이 계속 진화시키는 **스캐폴딩**이 첫 설치
버전에 얼어붙는다.

실증: v1.0.3 → v1.1.1 릴리스에서 바뀐 파일 대부분이 `knowledge/` 아래였다.

```
knowledge/_templates/meeting-note.md      (source: 필드 추가)
knowledge/_templates/doc.md / issue.md / completion-report.md
knowledge/_sources/**/README.md           (신규)
```

규칙(`SECOND-BRAIN.md`)은 "`source:` 필드 써라"로 갱신되는데, 정작 그 필드가 든
노트 템플릿 파일은 옛 버전 그대로 남아 규칙과 어긋난다.

핵심: `knowledge/` 안에 성격이 다른 두 부류가 섞여 있다 —
(a) 진짜 사용자 데이터(노트, `log.md`, `index.md`, `_topics.md`) vs
(b) 템플릿이 진화시키는 스캐폴딩(`_templates/*`, 각종 `README.md`).
지금은 둘 다 "절대 안 건드림"이라 (b)가 갱신을 못 받는다.

## 결정 사항

| 결정 | 선택 |
|---|---|
| 업데이트 진입점 | **npx 재실행** 하나로 단일화. `/setup-vault`는 개인화(프로젝트명·설명) 전용으로 유지, 업데이트 로직 넣지 않음 |
| 스캐폴딩 갱신 정책 | **A안 — 항상 최신본으로 갱신.** `_templates/*`는 규칙상 편집 금지 파일이라 의미상 템플릿 소유 |
| 사용자 편집 보호 | **바뀐 파일에만 `<파일>.bak` 백업** 후 덮음. 내용 동일하면 아무것도 안 함 |
| 갱신 판정 | **경로 기반** — `_templates/` 아래이거나 basename `README.md`. 마커 안 씀 |
| `.bak` 보관 정책 | **직전 버전 1개만, most-recent-wins.** 다음 갱신 때 그대로 덮어쓴다 — 버전 히스토리가 아니다. 히스토리가 필요하면 git이 담당 (`sed -i.bak`과 동일한 의미론, 의도된 동작이며 버그 아님) |

### 왜 마커 대신 경로 판정인가

`_templates/*.md`는 워크플로우가 새 노트를 만들 때 그대로 복사되는 원본이다.
파일 끝에 `<!-- second-brain-template -->` 마커를 넣으면 그 마커가 생성 노트로
새어 오염될 위험이 있다. 스캐폴딩은 마커 없이 **경로**로만 식별한다.

## 파일 분류 (재실행 동작)

**① 절대 안 건드림 (진짜 사용자 데이터):**
- `knowledge/index.md`, `knowledge/log.md`, `knowledge/clusters/_topics.md`
- 모든 실제 노트 (`meetings/`, `decisions/`, `issues/`, `docs/`, `reports/`,
  `clusters/cluster-*.md`)
- `knowledge/_sources/**` 안에 저장된 원본, `knowledge/.obsidian/*`
- 마커 없는 사용자 커맨드 파일 (기존대로 skip + 경고)

**② 최신본으로 갱신 (스캐폴딩, 편집 금지 파일):**
- `knowledge/_templates/*.md` (6개: cluster-index, completion-report, decision,
  doc, issue, meeting-note)
- `knowledge/**/README.md` (10개)

판정 규칙: 경로가 `_templates/` 아래이거나 basename === `README.md` → 스캐폴딩(②).
그 외 `knowledge/` 전부 → 사용자 데이터(①).
(`_topics.md`·`index.md`·`log.md`는 둘 다 아니라 자동으로 ①에 남는다.)

## 구현 (bin/init.js)

변경 파일은 `bin/init.js` 와 `bin/test.sh` 둘뿐. 나머지 로직 무변경.

1. **새 분류 함수 `planScaffold(rel)`** — `planIfMissing` 옆에 추가:
   - 대상 없음 → `{ kind: 'copy', ..., label: '신규' }` (기존 신규 생성과 동일)
   - 대상 있고 SRC와 내용 동일 → `{ kind: 'keep' }` (변화 없음, `.bak` 없음)
   - 대상 있고 내용 다름 → `{ kind: 'scaffold-update', ..., label: '갱신(.bak)' }`

2. **`buildPlan()` 라우팅** — `knowledge/` 순회(74행)에서 경로 판정으로
   `planScaffold` 또는 `planIfMissing` 선택.

3. **`applyAction()` 에 `scaffold-update` 케이스** — 기존 내용을 `to + '.bak'`에
   쓴 뒤 SRC 내용을 그대로 복사(마커 안 붙임).

4. **`printAnalysis()`** — "갱신(.bak 백업): N개" 한 줄 추가.

## 검증 (bin/test.sh 케이스 3 보강)

재실행 케이스에 아래를 추가한다:

1. 재실행 전에 `knowledge/_templates/meeting-note.md`를 낡은 내용으로 덮어둔다
   (업스트림 갱신/사용자 편집 시뮬레이션).
2. 재실행 후:
   - `_templates/meeting-note.md`가 SRC 최신본과 일치한다.
   - `_templates/meeting-note.md.bak`에 낡은 내용이 보존돼 있다.
   - 사용자 편집분(`index.md`에 추가한 줄), 실제 노트, `log.md`는 **무손상**이다.
3. 아무것도 바꾸지 않은 채 한 번 더 재실행하면 새 `.bak`이 생기지 않는다(멱등).

## 범위 밖

- 버전 추적 / 변경분 diff / 파일별 마이그레이션 프롬프트 (C안)
- 이름 바뀌거나 삭제된 옛 템플릿 파일 정리
- `.gitignore`에 `*.bak` 자동 추가 (사용자 gitignore는 installer가 관리하지 않음)
- `/setup-vault` 수정 — 손대지 않음. README/커맨드에 "업데이트 = npx 재실행"
  안내 한 줄은 추후 별도로.
