#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
fail() { echo "FAIL: $1"; exit 1; }

# ── 케이스 1: 빈 프로젝트 ──────────────────────────────
mkdir "$TMP/fresh" && cd "$TMP/fresh"
node "$ROOT/bin/init.js" > out.log
[ -f SECOND-BRAIN.md ] || fail "SECOND-BRAIN.md 없음"
grep -q 'second-brain-template' SECOND-BRAIN.md || fail "SECOND-BRAIN.md에 마커 없음"
[ "$(cat CLAUDE.md)" = "@SECOND-BRAIN.md" ] || fail "CLAUDE.md가 import 한 줄이 아님"
[ -f .claude/commands/ingest-meeting.md ] || fail "커맨드 없음"
grep -q 'second-brain-template' .claude/commands/ingest-meeting.md || fail "커맨드에 마커 없음"
head -1 .claude/commands/ingest-meeting.md | grep -q -- '---' || fail "마커가 frontmatter를 깨뜨림"
[ -f .codex/prompts/ingest-meeting.md ] || fail "codex 프롬프트 없음"
[ -f knowledge/clusters/_topics.md ] || fail "knowledge 스켈레톤 없음"
[ -f knowledge/_templates/meeting-note.md ] || fail "_templates 없음"
[ -f AGENTS.md ] || fail "AGENTS.md 없음"
[ ! -f package.json ] || fail "installer 기계장치 유출 (package.json)"
[ ! -f README.md ] || fail "README 유출"
[ ! -d docs ] || fail "docs/ 유출"
echo "케이스 1 OK"

echo "ALL PASS"
