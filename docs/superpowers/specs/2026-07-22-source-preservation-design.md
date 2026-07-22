# 원본 보존(_sources/) 설계 — second-brain-template

날짜: 2026-07-22
상태: 승인됨 (스펙 리뷰 대기)

## 목표

인제스트한 문서·전사체·이슈의 **원본 텍스트를 볼트 안에 보존**한다.
지금은 볼트에 AI가 압축한 노트만 남고 원본은 노션·외부 파일에 있어서,
요약 충실도를 대조할 ground truth가 볼트 밖에 있다. 원본을 `_sources/`에
verbatim으로 저장하고 노트의 `source:` 필드가 그 경로를 가리키게 한다.

## 결정 사항

| 결정 | 선택 |
|---|---|
| 저장 대상 | 텍스트(.md)만. 바이너리(녹음·PDF·이미지)는 저장 안 함, 외부 URL 유지 |
| 폴더 구조 | 볼트 노트 타입과 1:1 미러링 — `_sources/meetings|docs|issues/` |
| 파일명 | 노트의 정식 id/slug 그대로 (원본의 원래 이름은 버림 → 이름 정규화) |
| 원본 가공 | 없음 — verbatim 저장 (AI 재작성 금지, ground truth 보존) |
| `source:` 형식 | 경로 문자열 (위키링크 아님 — 그래프 오염 방지) |
| 검색·그래프 | `_sources/`는 frontmatter grep·Obsidian 그래프에서 제외 |

---

## 1. 저장 구조

```
knowledge/_sources/          # 언더스코어 = 노트 타입 아님 (_templates와 동급)
   ├── README.md             # 이 폴더의 역할 설명
   ├── meetings/             # 원본 전사체   ↔ meetings/ 노트
   ├── docs/                 # 원본 문서     ↔ docs/ 노트
   └── issues/               # 원본 이슈·완료리포트 ↔ issues/ 노트
```

각 하위 폴더는 `.gitkeep` 대신 한 줄짜리 `README.md`로 스켈레톤 유지
(다른 볼트 폴더와 동일 패턴, 빈 폴더가 git에 안 남는 문제 회피).

원본 3종류만 보존한다 (입구가 있는 타입):
- `reports/` — 볼트가 생성한 출력물이라 원본 없음
- `decisions/`, `clusters/` — 파생 노트라 원본 없음

## 2. 파일명 정규화 (핵심)

원본 파일의 원래 이름은 무시하고, **노트 생성 시 만든 정식 id/slug을 그대로
재사용**한다. 새 파일명 규칙을 만들지 않고 기존 규칙(ASCII kebab-case,
`SECOND-BRAIN.md`의 파일명 섹션)을 재사용한다.

- `meetings/2026-07-21-kickoff.md` ↔ `_sources/meetings/2026-07-21-kickoff.md`
- `docs/DOC-0001-payment-spec.md` ↔ `_sources/docs/DOC-0001-payment-spec.md`
- `issues/ISS-0003-login-timeout.md` ↔ `_sources/issues/ISS-0003-login-timeout.md`

결과: 원본이 `결제 모듈 기획서.md`처럼 한글·공백 이름이어도 저장본은 ASCII
정식명이 되어 CJK NFD/NFC 동기화 문제를 자동으로 피한다.

## 3. `source:` 필드 규칙

`source:`는 **원본(ground truth)의 위치**를 가리킨다:
- 텍스트 원본을 저장한 경우 → 로컬 `_sources/` 경로
  (예: `source: "_sources/docs/DOC-0001-payment-spec.md"`)
- 바이너리 등 저장하지 않은 경우 → 외부 URL/경로 그대로
  (예: `source: "https://notion.so/..."`)

외부 출처(노션 URL 등)를 함께 남기고 싶으면 노트 **본문의 원본 참조 섹션**에
적는다. frontmatter에는 `source:` 하나만 둔다 (스키마 최소 유지).

## 4. 스키마·템플릿 변경

`source:` 필드를 세 스키마에 추가한다 (doc은 W7에서 이미 있음):

- `_templates/meeting-note.md`: frontmatter에 `source: ""` 추가. 기존 본문
  "## 원본 전사체" 섹션의 안내 문구를 `_sources/` 경로 기준으로 갱신.
- `_templates/issue.md`: frontmatter에 `source: ""` 추가.
- `_templates/completion-report.md`: frontmatter에 `source: ""` 추가.
- `_templates/doc.md`: `source` 주석을 로컬 경로 우선으로 갱신
  (`# _sources/ 로컬 경로 (텍스트 저장 시) 또는 외부 URL`).

`SECOND-BRAIN.md` 공통 키 설명에 `source:` 한 줄 추가:
```
source: "_sources/<type>/<id>.md" | "<external URL>"   # 원본 위치
```

## 5. 워크플로우 변경 (W1 / W6 / W7)

세 인제스천 워크플로우에 공통 단계 추가 — 노트 생성 직후:

> 원본이 텍스트면 그 내용을 **가공 없이 그대로**
> `_sources/<type>/<노트와 동일한 id-slug>.md`에 저장하고, 노트의
> `source:`를 그 경로로 설정한다. 원본이 바이너리면 저장을 건너뛰고
> `source:`에 외부 URL을 적는다. 붙여넣은 텍스트도 그대로 저장한다
> (파일이 없어도 입력 내용 자체가 원본).

- W1 (meeting) → `_sources/meetings/`
- W6 (issue, completion-report) → `_sources/issues/`
- W7 (doc) → `_sources/docs/`

`log.md` 기록은 기존과 동일 (원본 저장을 별도 로그로 남기지 않음 —
노트 생성 로그에 포함).

## 6. 검색·그래프 제외

- **frontmatter grep**: `_sources/`는 스키마 없는 raw 원본이므로 W-검색이
  절대 스캔하지 않는다. `SECOND-BRAIN.md` frontmatter 검색 규칙에 명시.
  (워크플로우는 애초에 타입별 폴더만 grep하므로 자연히 제외되지만, 명문화.)
- **Obsidian 그래프**: `knowledge/.obsidian/graph.json`의 `"search"` 필터를
  `""` → `"-path:_sources"`로 변경해 원본 노드를 그래프에서 숨긴다.

## 7. 설치 / 테스트

- **설치 스크립트 무수정** — `_sources/` 이하 신규 파일은 기존
  `installIfMissing` 워커가 자동 복사 (`knowledge/` 하위이므로).
- **`bin/test.sh` 케이스 1**에 스켈레톤 설치 assert 추가:
  `knowledge/_sources/README.md`, `knowledge/_sources/meetings/README.md`,
  `knowledge/_sources/docs/README.md`, `knowledge/_sources/issues/README.md`.
- **README.md**: 구조 블록에 `_sources/` 추가, Obsidian/동작원리 섹션에
  "원본이 `_sources/`에 verbatim 보존되고 `source:`로 연결" 한 줄.

## 검증

1. `bash bin/test.sh` — 기존 4케이스 + `_sources/` 스켈레톤 asserts 통과
2. graph.json이 유효 JSON이고 `search`가 `-path:_sources`인지 확인
3. (수동, 선택) 임시 설치본에서 `/ingest-doc`로 한글 이름 원본을 인제스트 →
   `_sources/docs/DOC-0001-*.md`에 정식명으로 verbatim 저장되고 노트
   `source:`가 그 경로를 가리키는지 확인
4. (수동, 선택) Obsidian으로 `knowledge/` 열어 `_sources/` 노드가 그래프에
   안 보이는지 확인

## 범위 밖

- 바이너리(녹음·PDF·이미지) 볼트 저장
- 원본↔노트 자동 동기화(원본 수정 시 노트 재생성)
- 원본 전문 검색(full-text) 기능 — `_sources/`는 보존·대조용, 검색은
  frontmatter 노트가 담당
- 기존에 이미 만들어진 노트의 소급 원본 채우기(백필 마이그레이션)
