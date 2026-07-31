# _bases/

Obsidian **Bases** 뷰. frontmatter를 표로 보여준다 — 활성 결정, 열린 이슈,
권위별 문서, 교훈 등. `vault.base` 하나에 뷰가 여러 개 들어있고, Obsidian에서
열면 상단 탭으로 전환한다.

사람이 보는 용도다. 에이전트의 회수 경로는 언제나 frontmatter grep이며,
base 파일을 읽어서 노트를 찾지 않는다 (SECOND-BRAIN.md 참조).

- **필요 버전**: Obsidian 1.9+ (Bases는 코어 플러그인, 설정 → 코어 플러그인에서 켠다)
- Obsidian 없이도 볼트는 그대로 동작한다. 이 폴더를 지워도 아무것도 깨지지 않는다.
- 컬럼 정렬·너비는 Obsidian에서 조작하면 이 파일에 자동 저장된다.
- 새 노트 타입을 추가하면 뷰도 하나 추가하면 된다 — `note.type` 필터 한 줄이다.
