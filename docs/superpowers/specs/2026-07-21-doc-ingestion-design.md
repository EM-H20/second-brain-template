# W7 문서 인제스천 + 버전 자동화 설계 — second-brain-template

날짜: 2026-07-21
상태: 승인됨 (스펙 리뷰 대기)

## 목표

1. 회의 전사체 외의 **일반 문서**(기획서·스펙·설계서·외부 리서치·아티클)를 볼트에
   지식화하는 워크플로우 **W7**을 추가한다 — 가중치·연결·시각화 포함.
2. GitHub Actions로 `package.json` **버전 자동 범프**를 설정한다.

## 결정 사항

| 결정 | 선택 |
|---|---|
| 가중치 축 | 주제 연관 강도 (`topics` 핵심 / `topics_ref` 참고) + 문서 권위 (`authority` 3단계) |
| 최신성 가중치 | 제외 — `created` + supersede 체인으로 충분 (YAGNI) |
| 문서 속 결정 처리 | DEC-NNNN 노트로 추출 (W1 패턴 재사용, W4 충돌 검사 탑승) |
| 시각화 | `knowledge/.obsidian/graph.json` 동봉 (폴더별 색 그룹) + 클러스터 허브 링크 규칙 |
| 저장 구조 | `knowledge/docs/DOC-NNNN-<slug>.md` 신설 (접근 A) |

---

## 1. 저장 구조

- 폴더: `knowledge/docs/` (+ `README.md` 플레이스홀더, 다른 폴더와 동일 패턴)
- 파일명: `DOC-NNNN-<slug>.md` — ASCII kebab-case, NNNN은 폴더 스캔 max+1, 재사용 금지
- 템플릿: `knowledge/_templates/doc.md` 신설

### frontmatter 스키마 (type: doc)

```yaml
type: doc
id: DOC-0001
doc_type: spec | prd | design | research | article | other
authority: official | internal | external
created: YYYY-MM-DD
source: <원본 파일 경로 또는 URL>
topics: [<topic-slug>, ...]        # 핵심 연관 — 연관 강도 "강"
topics_ref: [<topic-slug>, ...]    # 참고 연관 — 연관 강도 "약"
decisions: [DEC-NNNN, ...]         # 이 문서에서 추출된 결정
status: active | superseded
supersedes: DOC-NNNN | null        # 이 문서가 대체한 옛 문서
superseded_by: DOC-NNNN | null
related: ["[[note]]", ...]
```

`authority` 정의 (판정 기준):
- **official** — 확정·공식 문서: 확정 스펙, 계약서, 벤더 공식 문서, 표준(RFC 등)
- **internal** — 내부 작성 문서: 기획서, 설계 초안, 내부 리서치
- **external** — 서드파티 자료: 블로그, 아티클, 외부 리서치 보고서

본문 섹션 (템플릿): 요약 / 핵심 내용·논점 / 추출된 결정 (DEC 링크) / 열린 질문 / 원본 참조

## 2. 가중치 동작 규칙

### 연관 강도 (`topics` vs `topics_ref`)
- 검색·W3 브리프에서 `topics` 매치 문서를 먼저 읽고, `topics_ref` 매치는
  "참고 자료" 섹션으로 분리해 뒤에 배치한다.
- 클러스터 노트에도 "핵심 문서" / "참고 문서" 섹션으로 구분 기재한다.
- `_topics.md` 통제 어휘 규칙은 두 필드 모두에 동일 적용.

### 권위 (`authority`)
- **결정 추출 게이트**: `official`/`internal` 문서만 DEC 추출 대상.
  `external` 문서는 결정을 만들지 않고 논점·요약만 기록한다
  (외부 아티클이 프로젝트 결정을 오염시키는 것을 구조적으로 차단).
- **W4 충돌 표시 확장**: 문서 유래 결정이 기존 결정과 충돌하면 기존 충돌
  메시지에 양쪽의 출처 권위를 함께 표시한다. 자동 판정은 하지 않는다 —
  항상 사용자에게 묻는 기존 원칙 유지.

  > 이전 결정과 충돌합니다.
  > - 기존: DEC-0012 (2026-06-30) — "<summary>" [출처: 회의 / internal 문서 DOC-0003]
  > - 신규: "<summary>" [출처: official 문서 DOC-0007]
  > 어느 쪽으로 갈까요? (기존 유지 / 신규로 대체 / 둘 다 조건부 유지)

## 3. W7 워크플로우 (`/ingest-doc`)

W1 패턴 재사용. 입력: 파일 경로 또는 붙여넣은 텍스트 (비면 질문).

1. `doc_type`·`authority` 판정 — 모호하면 사용자에게 질문 (추측 금지)
2. `_templates/doc.md`로 문서 노트 생성 (다음 DOC-NNNN)
3. 결정 추출 (official/internal만): 결정마다 DEC 노트 생성, **저장 전 W4 충돌
   검사**, 양방향 링크 (`doc.decisions` ↔ `dec.related`)
4. 토픽 태깅: `_topics.md` 어휘 준수, 핵심(`topics`)/참고(`topics_ref`) 구분
5. 클러스터 갱신 (증분): 핵심 토픽 클러스터에 "핵심 문서", 참고 토픽에
   "참고 문서"로 기재
6. 같은 토픽의 기존 회의·결정·이슈에 `related` 링크
7. `log.md` 한 줄 기록 (기존 규칙 동일)

같은 주제의 새 문서가 기존 문서를 대체하면 결정과 동일한 supersede 체인 사용
(`status: superseded`, 내용 보존).

## 4. 기존 워크플로우 통합

- **W2 (클러스터)**: 전체 재빌드 시 `docs/` frontmatter도 스캔. 클러스터
  노트 구조에 문서 섹션 추가 (`_templates/cluster-index.md` 수정).
- **W3 (build)**: 컨텍스트 수집 시 관련 문서 포함 — `topics` 핵심 매치를
  authority 순(official → internal → external)으로 먼저, `topics_ref`는 참고
  섹션. 컨텍스트 브리프에 DOC id 인용.
- **W5 (report)**: 근거 인용 대상에 DOC id 추가.
- **W6 (유사 이슈)**: 변경 없음 (문서는 증상 검색 대상 아님).

## 5. 시각화

### graph.json 동봉
- 파일: `knowledge/.obsidian/graph.json` — Obsidian이 볼트 열 때 자동 적용
- colorGroups (경로는 볼트 루트=knowledge/ 기준):
  - `path:meetings` 파랑, `path:decisions` 초록, `path:issues` 빨강,
    `path:docs` **보라**, `path:clusters` 노랑, `path:reports` 회색
- 노드 크기는 Obsidian이 링크 수로 자동 결정 — 클러스터 허브 구조 덕에
  활발한 주제·핵심 문서가 저절로 커진다

### .gitignore 수정 (버그 픽스)
현재 `.obsidian/workspace.json` 패턴은 슬래시 포함으로 **루트에 앵커**되어
`knowledge/.obsidian/`의 workspace 파일이 ignore되지 않는다.
→ `**/.obsidian/workspace*.json`으로 교체 (workspace.json + workspace-mobile.json 커버).

## 6. 문서 반영 범위

- `SECOND-BRAIN.md`: vault layout에 `docs/` 추가, frontmatter 스키마에 doc
  타입 추가, W7 섹션 신설, W2·W3·W4·W5 해당 부분 갱신
- 커맨드 2벌: `.claude/commands/ingest-doc.md` + `.codex/prompts/ingest-doc.md`
  (기존 커맨드와 동일한 얇은 래퍼 스타일 + frontmatter description)
- `AGENTS.md`: intent 표에 "문서 인제스천 → W7" 행 추가
- `README.md`: 커맨드 표, 구조 다이어그램, 사용법 시나리오(6번: 문서를
  받았을 때), Obsidian 섹션에 graph.json 언급
- 설치 스크립트: **수정 불필요** — `knowledge/` 하위 신규 파일(docs/README,
  doc 템플릿, .obsidian/graph.json)은 기존 `installIfMissing` 워커가 자동 복사.
  커맨드 파일은 `installOwned` 대상 폴더라 자동 포함.
- `bin/test.sh`: 케이스 1에 신규 파일 설치 확인 assert 추가
  (`knowledge/docs/README.md`, `knowledge/_templates/doc.md`,
  `knowledge/.obsidian/graph.json`, `.claude/commands/ingest-doc.md`)

---

## 7. GitHub Actions 버전 자동 범프

`npx github:`는 항상 main HEAD를 가져오므로 버전이 설치에 영향을 주진 않지만,
버전·태그는 변경 추적과 npx 캐시 무효화 안전판 역할을 한다.

- 파일: `.github/workflows/version-bump.yml`
- 트리거: `push` to `main`
- 동작:
  1. 직전 커밋 메시지가 `chore(release):`로 시작하면 스킵 (루프 방지 2중 안전판 —
     GITHUB_TOKEN 푸시는 워크플로우를 재트리거하지 않지만 명시적으로도 가드)
  2. 커밋 메시지 규칙으로 범프 수준 결정: `feat:` → minor, 그 외(`fix:`,
     `docs:`, `chore:`, `refactor:` 등) → patch. major는 자동화하지 않음(수동)
  3. `npm version <level> --no-git-tag-version` → `package.json`만 변경
  4. `chore(release): vX.Y.Z` 커밋 + `vX.Y.Z` git 태그 + push
- 권한: `permissions: contents: write`, 기본 `GITHUB_TOKEN` 사용 (시크릿 불필요)
- 외부 서드파티 액션 미사용 — `actions/checkout` + 셸 스크립트만 (의존성 최소 원칙)
- `.github/`은 설치 페이로드에 포함되지 않음 (installer는 지정 폴더만 복사)

## 검증

1. `bash bin/test.sh` — 기존 4케이스 + 케이스 1 신규 파일 asserts 통과
2. `/ingest-doc` 수동 시연: 샘플 기획서 텍스트 → DOC 노트 + DEC 추출 +
   클러스터 갱신 + log 기록 확인 (템플릿 저장소가 아닌 임시 설치본에서)
3. Obsidian으로 `knowledge/` 열어 색 그룹 적용 확인 (수동, 선택)
4. 버전 범프: 스펙 커밋 푸시 후 Actions 실행 로그와 `package.json`
   버전·태그 생성 확인

## 범위 밖

- npm publish 자동화, CHANGELOG 생성
- major 버전 자동 범프
- Dataview 대시보드 (플러그인 의존이라 제외)
- 문서 원본 파일 자체를 볼트에 복사·보관하는 기능 (노트는 요약+링크만)
