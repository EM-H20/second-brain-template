# 결정 노트 ADR 고도화 설계 — second-brain-template

날짜: 2026-07-27
상태: 승인됨

## 목표

`knowledge/_templates/decision.md`를 ADR(Architecture Decision Record) 표준 구조로
고도화한다. 현재 템플릿은 "왜 이걸 골랐나"와 "무엇을 버렸나"를 `## 근거` 하나로
뭉개고 있어, 6개월 뒤 "이거 왜 A로 갔지, B 검토는 했나?"에 답하지 못한다.

frontmatter 스키마와 supersede 체인은 건드리지 않는다 — 그쪽은 이미 ADR 표준보다
강하다(양방향 `supersedes`/`superseded_by` + W4 충돌 감지).

## 현황 대조

| ADR 항목 | 현재 템플릿 | |
|---|---|---|
| ADR-[번호] | `id: DEC-NNNN` + H1 | 있음 |
| Date | `created:` | 있음 |
| References | `related:` + `## 출처` | 있음 |
| Superseded by | `supersedes` / `superseded_by` 양방향 체인 | 있음 (ADR 표준보다 강함) |
| Decision | `## 결정 내용` | 있음 |
| Status | `active \| superseded` | 부분 (Proposed/Deprecated 없음 — 도입 안 함) |
| Consequences | `## 영향 범위` (긍정/부정 구분 없음) | 부분 |
| **Context** | 없음 (`## 근거`에 섞임) | **없음** |
| **Alternatives Considered** | 없음 (`## 근거`에 섞임) | **없음** |

`knowledge/decisions/`에 실제 노트가 0개(README만)라 마이그레이션 비용이 없다.

## 결정 사항

| 결정 | 선택 | 이유 |
|---|---|---|
| 변경 범위 | 본문 섹션만. frontmatter 무변경 | W4·검색·SECOND-BRAIN.md 스키마·README 4개 언어판 전부 파급 0 |
| 빈 섹션 처리 | `"논의 기록 없음"` 명시 (섹션은 항상 유지) | 공백 자체가 "대안 검토 없이 결정했다"는 신호로 남는다. 삭제하면 "검토 안 함"과 "기록 안 함"이 구분되지 않는다 |
| `## 영향 범위` | 별도 섹션으로 유지 (6섹션) | 결과=무슨 일이 벌어지나 / 영향 범위=어디를 건드리나. W3 `/build`가 구현 지점 찾을 때 쓰는 유일한 정보라 Consequences에 흡수하면 손해 |
| 섹션 내용 출처 | 요약 노트가 아니라 **원본 직독** | Context·Alternatives·Consequences는 요약 단계에서 가장 먼저 소실되는 정보다 |
| 번호 체계 | `DEC-NNNN` 유지 (ADR-NNNN으로 안 바꿈) | 볼트 전체가 DEC id로 상호참조 중 |
| Status enum | `active \| superseded` 유지 | 회의에서 나온 결정은 이미 확정 상태로 들어온다. `proposed`는 W4가 active만 상대하므로 승격 전까지 아무 일도 안 하는 죽은 상태가 된다 (YAGNI) |

## 섹션 매핑 (4개 → 6개)

| 기존 | 신규 | |
|---|---|---|
| — | `## 문제 정의 (Context)` | 신규 |
| `## 결정 내용` | `## 결정 (Decision)` | 이름만 변경 |
| `## 근거` | `## 검토한 대안 (Alternatives)` | **분해** |
| — | `## 결과 (Consequences)` 긍정/부정 | 신규 |
| `## 영향 범위` | `## 영향 범위 (Scope)` | 유지 |
| `## 출처` | `## 출처 (References)` | 이름만 변경 |

`## 근거`는 사라진다. "왜 필요했나"는 Context로, "왜 이걸 골랐나"는 Alternatives로
분해 흡수된다 — ADR이 `근거` 한 덩어리보다 나은 이유가 정확히 이 분해다.

## 변경 1 — `knowledge/_templates/decision.md` (전문)

```markdown
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
```

빈 섹션 지침은 Alternatives·Consequences 두 곳에만 인라인으로 넣는다. 나머지 4개
섹션은 원래 비지 않는다.

**마커 금지:** `_templates/*`에는 `<!-- second-brain-template -->` 마커를 넣지 않는다.
`bin/init.js:87-90`에 이유가 적혀 있다 — 템플릿 내용은 새 노트로 그대로 복사되므로
마커를 심으면 생성된 노트로 새어나간다.

## 변경 2 — `SECOND-BRAIN.md` W1·W7에 원본 직독 규칙

결정 노트가 **요약 노트로부터 파생되는 것을 막는** 순서 제약이다. 템플릿의 인라인
지침이 작성 시점에 작동하지만, 규칙 원본은 `SECOND-BRAIN.md`여야 Codex 등 다른 CLI도
동일하게 따른다.

W1 step 2 (현재):

```
2. For every decision made in the meeting, ALSO create a separate decision
   note in `decisions/` (template: `_templates/decision.md`). Link both ways.
```

W1 step 2 (신규) — 한 줄 추가:

```
2. For every decision made in the meeting, ALSO create a separate decision
   note in `decisions/` (template: `_templates/decision.md`). Link both ways.
   결정 노트의 Context·Alternatives·Consequences는 요약된 회의 노트가 아니라
   원본 전사체를 직접 읽고 채운다 — 요약 단계에서 가장 먼저 소실되는 정보다.
```

W7 step 3 (신규) — 마지막에 한 줄 추가:

```
3. Decision extraction — ONLY for official/internal documents: create a
   decision note per decision (`_templates/decision.md`), run conflict
   detection (W4) BEFORE saving each one, link both ways
   (doc `decisions:` ↔ decision `related:`). external documents NEVER
   create decisions — record 논점 only.
   결정 노트의 Context·Alternatives·Consequences는 요약된 doc 노트가 아니라
   원본 문서를 직접 읽고 채운다.
```

순서 변경:

```
기존)  전사체 → 회의노트(요약) → 결정 노트
신규)  전사체 → 회의노트(요약)
        └───── 원본 직독 ─────→ 결정 노트
                                (Context / Alternatives / Consequences)
```

`_sources/` 비스캔 규칙과 충돌하지 않는다. 그 규칙은 **검색(retrieval)** 대상에서
제외한다는 뜻이고, 여기는 인제스트 시점이라 원본이 이미 컨텍스트에 있다.

### 리포트·이슈 원본에 대한 메모

W6(이슈·완료 리포트 인제스트)는 현재 결정 노트를 만들지 않는다. 따라서 이번 규칙의
직접 적용 대상은 W1(전사체)·W7(문서 원본) 둘뿐이다. 규칙 문구는 "짝이 되는 원본"으로
일반화해 두었으므로, 나중에 W6가 결정을 추출하게 되면 수정 없이 그대로 적용된다.

## 파급 범위

```
_templates/decision.md
 └─ SECOND-BRAIN.md:113  (W1 "template: _templates/decision.md")
      ├─ /ingest-meeting  → W1 결정 추출
      ├─ /ingest-doc      → W7 결정 추출
      ├─ /capture         → 라우팅
      └─ Codex · 자연어    → 같은 규칙 참조
```

커맨드 파일 12개는 전부 `SECOND-BRAIN.md`에 위임하므로 무수정이다.

**무수정 확정:** frontmatter 스키마(`SECOND-BRAIN.md:58`), W4 충돌 감지, 검색 경로,
README 4개 언어판, `.claude/commands/*` 12개, `.agents/skills/second-brain/`,
`.codex/prompts/*`, `bin/init.js`.

**기존 설치본 전파:** `_templates/`는 스캐폴딩이라 `npx github:EM-H20/second-brain-template`
재실행 시 최신본으로 자동 갱신되고 기존 파일은 `.bak`으로 백업된다
(`bin/init.js:96 planScaffold`). `SECOND-BRAIN.md`는 템플릿 소유 파일이라 마커 확인 후
갱신된다(`planOwned`).

## 검증

`knowledge/decisions/`가 비어 있어 회귀 위험이 0이다. 짧은 합성 전사체 1건으로 확인한다:

1. 대안 논의가 **있는** 결정 1건 + **없는** 결정 1건을 담은 전사체를 `/ingest-meeting`에 투입
2. 생성된 결정 노트 2개가 6섹션 구조인지 확인
3. 대안 논의가 없던 결정의 `## 검토한 대안`이 `"논의 기록 없음"`으로 나오는지 확인
   (빈 섹션도, 지어낸 대안도 아니어야 함)
4. frontmatter가 기존 스키마와 동일한지 확인 (`status: active`, supersede 체인 유지)
5. `bin/test.sh` 통과 — 설치기 회귀 없음 확인

## 범위 밖

- `status`에 `proposed` / `deprecated` 추가 (제안→승인 플로우가 필요해지면 그때)
- `alternatives` 등을 frontmatter 배열 필드로 구조화 (grep 축으로 쓸 일이 생기면 그때)
- `issue.md` / `doc.md` / `lesson.md` 등 다른 템플릿의 구조 변경
- W6에서 결정 추출 (이슈·완료 리포트 → DEC 노트)
- 기존 결정 노트 마이그레이션 (대상 0건)
