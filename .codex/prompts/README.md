# Codex custom prompts

`.claude/commands/` 와 동일한 워크플로우의 Codex 버전.
사용 중인 Codex 버전이 프로젝트 로컬 prompts 를 읽지 못하면
이 파일들을 `~/.codex/prompts/` 로 복사해서 사용:

    cp .codex/prompts/*.md ~/.codex/prompts/

호출: Codex 에서 `/ingest-meeting` 등 프롬프트 이름으로 실행.
규칙 원본은 CLAUDE.md (AGENTS.md 참조).
