# Project Second Brain Template

회의 전사체 → 지식화 → 코드 작성 → 충돌 감지 → 보고서 → 이슈 재발 탐지까지
하나로 도는, 프로젝트별 세컨드 브레인 스타터 템플릿.

**의존성 제로.** API 키, 임베딩, 파이썬 스크립트 없음. 순수 Markdown + Claude Code 규칙/커맨드.
Obsidian으로 `knowledge/` 폴더를 열면 그래프 뷰로 지식 연결을 시각적으로 볼 수 있다.

## 빠른 시작

1. 이 템플릿을 clone 또는 다운로드해서 새 프로젝트 루트로 사용
2. Claude Code를 열고 `/setup-vault` 실행 (1회)
3. Obsidian → "보관함 폴더 열기" → `knowledge/` 선택
4. 첫 회의 전사체로 `/ingest-meeting` 실행

## 커맨드

| 커맨드 | 역할 |
|---|---|
| `/setup-vault` | clone 직후 1회 초기화 |
| `/ingest-meeting` | 전사체 → 회의노트 + 결정 분리 + 클러스터 갱신 + 충돌 검사 |
| `/cluster` | 볼트 전체 재클러스터링, 중복 토픽 병합 |
| `/build` | 볼트 컨텍스트 브리프 → 하네스(Superpowers/ECC) 워크플로우로 구현 |
| `/check-conflict` | 새 의견 vs 과거 활성 결정 충돌 검사 |
| `/report` | 사용자 양식대로 볼트 근거 보고서 생성 |
| `/ingest-issue` | 이슈/완료 리포트 지식화 |
| `/find-similar-issue` | 현재 문제와 유사한 과거 이슈 검색 |

## 구조

```
knowledge/
├── meetings/     회의노트 (YYYY-MM-DD-slug.md)
├── decisions/    결정 기록 (DEC-NNNN) — 충돌 감지의 기준점
├── issues/       이슈 + 완료 리포트 (ISS-NNNN) — 재발 탐지의 재료
├── reports/      생성된 보고서
├── clusters/     주제별 인덱스 + _topics.md (통제 어휘)
└── _templates/   노트 양식 (frontmatter 규격 포함)
CLAUDE.md         워크플로우 규칙 (W1~W6) — 시스템의 심장
.claude/commands/ 슬래시 커맨드 8개
```

## 하네스와의 관계

이 템플릿은 "무엇을 왜 만드는가"(컨텍스트)를 책임진다.
"어떻게 잘 만드는가"(TDD, 브레인스토밍, 디버깅)는 프로젝트에 설치된
하네스(Superpowers, ECC 등)가 책임진다. `/build`는 컨텍스트 브리프를 만든 뒤
하네스 워크플로우에 바통을 넘긴다. 하네스가 없어도 동작한다.


## 크로스-CLI 지원 (Claude Code + Codex)

규칙 원본은 `CLAUDE.md` 하나이며, `AGENTS.md` 는 Codex 등 다른 CLI 를
같은 규칙으로 안내하는 포인터다. 커맨드는 두 벌 제공:

- Claude Code: `.claude/commands/` (자동 인식)
- Codex: `.codex/prompts/` (버전에 따라 `~/.codex/prompts/` 로 복사 필요)

커맨드가 없는 CLI 에서도 자연어로 동작한다 — 워크플로우가 CLAUDE.md 에
의도 기준으로 정의되어 있기 때문. ("이 전사체 볼트에 넣어줘" = W1 전체 실행)


## 파일명 규칙 (한글/CJK 주의)

파일명은 반드시 ASCII kebab-case (`2026-07-15-auth-review.md`). 이유:
macOS(APFS)는 한글을 NFD(자모 분리), git/Linux는 NFC(완성형)로 정규화해서
기기 간 동기화 시 위키링크가 깨질 수 있다. 한글 제목은 frontmatter나
본문 H1에 적는다 — 노트 내용은 한글, 파일명만 영문.

## GitHub에 올릴 때 팁

리포 업로드 후 Settings → General → **Template repository** 체크.
이후 새 프로젝트마다 "Use this template" 버튼으로 깨끗한 사본을 만들 수
있어 clone 후 히스토리 끊는 작업이 필요 없다.
자동 백업을 원하면 Obsidian 커뮤니티 플러그인 Obsidian-Git으로
주기적 commit/push 설정 가능 (선택).

## 동작 원리 (스크립트 없이 어떻게?)

모든 노트의 frontmatter가 엄격한 규격(type, topics, symptoms, status,
supersedes 체인)을 따른다. Claude는 전체 파일을 읽는 대신 frontmatter를
grep해서 후보를 좁힌 뒤 필요한 노트만 연다. 클러스터링 일관성은
`clusters/_topics.md`(통제 어휘)가 잡아준다. Karpathy LLM Wiki 패턴과
같은 철학: 잘 구조화된 마크다운은 임베딩 없이도 LLM이 직접 다룰 수 있다.
