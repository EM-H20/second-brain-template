# npx 설치 스크립트 설계 — second-brain-template

날짜: 2026-07-21
상태: 승인됨

## 목표

다른 프로젝트의 터미널에서 한 줄로 이 second brain 템플릿을 설치할 수 있게 한다:

```bash
npx github:EM-H20/second-brain-template
```

기존 "GitHub Template repo / 클론" 사용 방식은 그대로 유지한다.

## 결정 사항

| 결정 | 선택 |
|---|---|
| 배포 방식 | GitHub 공개 저장소 + `npx github:` (npm publish 없음) |
| CLAUDE.md 충돌 처리 | 규칙을 별도 파일로 분리 + `@import` 한 줄 연결 |
| 재실행(업데이트) 정책 | 템플릿 소유 파일만 덮어씀, 사용자 데이터는 절대 건드리지 않음 |
| 구현 형태 | 이 저장소에 zero-dependency Node bin 스크립트 추가 (접근 A) |

## 구조 변경

### 1. 규칙 파일 분리

- 현재 루트 `CLAUDE.md`의 전체 내용(W1~W6 워크플로우, frontmatter 스키마, 일반 규칙)을
  루트 `SECOND-BRAIN.md`로 이동한다.
- `CLAUDE.md`는 `@SECOND-BRAIN.md` import 한 줄만 남긴다.
  → 클론 사용자와 npx 사용자가 동일한 레이아웃을 가진다.
- `AGENTS.md`는 `SECOND-BRAIN.md`를 가리키도록 수정한다 (Codex/Gemini/Cursor용
  tool-neutral 포인터 역할 유지).

### 2. 설치 스크립트

- `package.json`: `name`, `version`, `bin` 필드만. 의존성 0개.
- `bin/init.js`: Node 내장 모듈(`fs`, `path`)만 사용. `process.cwd()`를 대상
  프로젝트로, `__dirname/..`을 페이로드 소스로 사용한다.

## 파일별 소유권 규칙 (설치 스크립트 동작)

| 대상 | 정책 |
|---|---|
| `SECOND-BRAIN.md`, `.claude/commands/*.md`, `.codex/prompts/*` | **템플릿 소유** — 마커가 있으면 덮어씀 (업데이트 반영) |
| `knowledge/**` (폴더 스켈레톤, `_templates/`, `index.md`, `log.md`, `clusters/_topics.md`, 각 README) | **사용자 소유** — 없을 때만 생성, 절대 덮어쓰지 않음 |
| `CLAUDE.md` | 없으면 `@SECOND-BRAIN.md` 한 줄짜리로 생성. 있으면 그 한 줄을 끝에 추가. 이미 해당 줄이 있으면 스킵 (멱등) |
| `AGENTS.md` | 없으면 템플릿 복사. 있으면 포인터 한 줄 추가 (멱등) |
| `README.md`, `package.json`, `bin/`, `.git*`, `docs/`, `node_modules` | **복사 제외** |

## 안전장치: 마커

- 템플릿 소유 파일 상단에 HTML 주석 마커를 넣는다: `<!-- second-brain-template -->`
- 덮어쓰기는 **(a) 대상 파일이 없거나 (b) 대상 파일에 마커가 있을 때만** 수행한다.
- 대상 프로젝트에 이미 자기만의 `/build`, `/report` 커맨드 파일이 있으면
  (마커 없음) 클로버하지 않고 **경고 출력 후 스킵**한다.
- 결과: 재실행이 완전히 멱등이고, 사용자 파일을 파괴할 수 없다.

## 설치 완료 메시지

설치/스킵/경고 파일 목록을 출력한 뒤 다음 안내:

1. Obsidian에서 `knowledge/` 폴더를 vault로 열기
2. Claude Code에서 `/ingest-meeting`으로 첫 회의록 넣기
3. (선택) `/setup-vault`로 프로젝트 정보 반영

## 검증

`bin/test.sh` (또는 동급의 소형 node 스크립트) 1개 — 임시 디렉토리에 3케이스 실행 후 assert:

1. **빈 프로젝트**: 전체 스캐폴드 생성 + `CLAUDE.md`가 `@SECOND-BRAIN.md` 한 줄로 생성됨
2. **기존 CLAUDE.md 있는 프로젝트**: 기존 내용 보존 + import 줄 1회만 추가, 마커 없는 동명 커맨드 파일은 스킵되고 경고 출력
3. **재실행**: 템플릿 파일 갱신, `knowledge/` 사용자 파일(수정해둔 노트) 원본 유지, import 줄 중복 추가 없음

## 범위 밖

- npm publish (`create-second-brain` 패키지명) — 추후 원하면 `package.json` 그대로 publish만 하면 됨
- Claude Code 플러그인/marketplace 배포
- 대화형 프롬프트 (`--flags`) — 첫 버전은 인자 없이 단일 동작
