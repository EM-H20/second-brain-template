#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
fail() { echo "FAIL: $1"; exit 1; }

# ── 케이스 1: 빈 프로젝트 ──────────────────────────────
mkdir "$TMP/fresh" && cd "$TMP/fresh"
node "$ROOT/bin/init.js" -y > out.log
[ -f SECOND-BRAIN.md ] || fail "SECOND-BRAIN.md 없음"
grep -q 'second-brain-template' SECOND-BRAIN.md || fail "SECOND-BRAIN.md에 마커 없음"
[ "$(cat CLAUDE.md)" = "@SECOND-BRAIN.md" ] || fail "CLAUDE.md가 import 한 줄이 아님"
[ -f .claude/commands/ingest-meeting.md ] || fail "커맨드 없음"
grep -q 'second-brain-template' .claude/commands/ingest-meeting.md || fail "커맨드에 마커 없음"
head -1 .claude/commands/ingest-meeting.md | grep -q -- '---' || fail "마커가 frontmatter를 깨뜨림"
[ -f .codex/prompts/ingest-meeting.md ] || fail "codex 프롬프트 없음"
[ -f .claude/commands/ingest-doc.md ] || fail "ingest-doc 커맨드 미설치"
[ -f .codex/prompts/ingest-doc.md ] || fail "ingest-doc codex 프롬프트 미설치"
[ -f knowledge/clusters/_topics.md ] || fail "knowledge 스켈레톤 없음"
[ -f knowledge/_templates/meeting-note.md ] || fail "_templates 없음"
[ -f knowledge/docs/README.md ] || fail "docs/ 스켈레톤 없음"
[ -f knowledge/_templates/doc.md ] || fail "doc 템플릿 없음"
[ -f knowledge/.obsidian/graph.json ] || fail "graph.json 미설치"
[ -f knowledge/_sources/README.md ] || fail "_sources 스켈레톤 없음"
[ -f knowledge/_sources/meetings/README.md ] || fail "_sources/meetings 없음"
[ -f knowledge/_sources/docs/README.md ] || fail "_sources/docs 없음"
[ -f knowledge/_sources/issues/README.md ] || fail "_sources/issues 없음"
grep -q 'path:_sources' knowledge/.obsidian/graph.json || fail "graph 필터에 _sources 제외 없음"
[ -f AGENTS.md ] || fail "AGENTS.md 없음"
[ ! -f package.json ] || fail "installer 기계장치 유출 (package.json)"
[ ! -f README.md ] || fail "README 유출"
[ ! -d docs ] || fail "docs/ 유출"
echo "케이스 1 OK"

# ── 케이스 2: 기존 CLAUDE.md + 자기 커맨드가 있는 프로젝트 ──
mkdir -p "$TMP/existing/.claude/commands" && cd "$TMP/existing"
printf '# My project rules\n' > CLAUDE.md
printf 'my own build command\n' > .claude/commands/build.md
printf '# My agents doc\n' > AGENTS.md
node "$ROOT/bin/init.js" -y > out.log
grep -q '# My project rules' CLAUDE.md || fail "기존 CLAUDE.md 내용 유실"
grep -q '@SECOND-BRAIN.md' CLAUDE.md || fail "import 줄 미추가"
grep -q 'my own build command' .claude/commands/build.md || fail "사용자 커맨드 클로버됨"
grep -q 'build.md' out.log || fail "스킵 경고 미출력"
grep -q 'SECOND-BRAIN.md' AGENTS.md || fail "AGENTS.md 포인터 미추가"
grep -q '# My agents doc' AGENTS.md || fail "기존 AGENTS.md 내용 유실"
[ -f .claude/commands/report.md ] || fail "다른 커맨드 미설치"
node "$ROOT/bin/init.js" -y > out2.log
[ "$(grep -c '@SECOND-BRAIN.md' CLAUDE.md)" = "1" ] || fail "append 재실행 시 import 줄 중복"
[ "$(grep -c 'SECOND-BRAIN.md' AGENTS.md)" = "1" ] || fail "append 재실행 시 AGENTS 포인터 중복"
echo "케이스 2 OK"

# ── 케이스 3: 재실행 (업데이트) ────────────────────────
cd "$TMP/fresh"
printf 'user note\n' > knowledge/meetings/2026-07-21-test.md
printf 'edited by user\n' >> knowledge/index.md
printf 'stale content\n' >> .claude/commands/report.md
printf 'STALE TEMPLATE\n' > knowledge/_templates/meeting-note.md
printf 'user log line\n' >> knowledge/log.md
printf 'user-topic-slug\n' >> knowledge/clusters/_topics.md
node "$ROOT/bin/init.js" -y > out2.log
[ "$(grep -c '@SECOND-BRAIN.md' CLAUDE.md)" = "1" ] || fail "import 줄 중복"
grep -q 'edited by user' knowledge/index.md || fail "사용자 수정 index.md 덮어씀"
[ -f knowledge/meetings/2026-07-21-test.md ] || fail "사용자 노트 유실"
if grep -q 'stale content' .claude/commands/report.md; then fail "마커 있는 템플릿 파일이 갱신 안 됨"; fi
if grep -q 'STALE TEMPLATE' knowledge/_templates/meeting-note.md; then fail "스캐폴딩 템플릿이 갱신 안 됨"; fi
diff -q knowledge/_templates/meeting-note.md "$ROOT/knowledge/_templates/meeting-note.md" > /dev/null || fail "템플릿이 최신본과 불일치"
[ -f knowledge/_templates/meeting-note.md.bak ] || fail ".bak 백업 없음"
grep -q 'STALE TEMPLATE' knowledge/_templates/meeting-note.md.bak || fail ".bak에 이전 내용 없음"
grep -q 'user log line' knowledge/log.md || fail "사용자 log.md 덮어씀"
grep -q 'user-topic-slug' knowledge/clusters/_topics.md || fail "사용자 _topics.md 덮어씀"
echo "케이스 3 OK"

# ── 케이스 4: y/n 프롬프트 분기 ────────────────────────
mkdir "$TMP/prompt" && cd "$TMP/prompt"
printf 'n\n' | node "$ROOT/bin/init.js" > out.log
grep -q '취소' out.log || fail "n 입력 시 취소 메시지 없음"
[ ! -f SECOND-BRAIN.md ] || fail "n 입력인데 설치됨"
grep -q '신규 설치' out.log || fail "설치 전 분석 요약 미출력"
printf 'y\n' | node "$ROOT/bin/init.js" > out.log
[ -f SECOND-BRAIN.md ] || fail "y 입력인데 설치 안 됨"
[ -f knowledge/clusters/_topics.md ] || fail "y 입력 설치 불완전"
echo "케이스 4 OK"

echo "ALL PASS"
