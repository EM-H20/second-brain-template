# Legacy Codex custom prompts

현재 Codex의 기본 인터페이스는 저장소에서 자동 발견되는
`.agents/skills/second-brain/SKILL.md`다. 자연어 또는 `$second-brain`으로 호출한다.

이 폴더는 구버전 호환용이다. Custom prompts는 deprecated이며 프로젝트 로컬
폴더를 읽지 않는다. 꼭 필요하면 원하는 파일만 `~/.codex/prompts/`로 복사하고
Codex를 재시작한 뒤 `/prompts:ingest-meeting`처럼 호출한다.

규칙 원본은 항상 `SECOND-BRAIN.md`다.
