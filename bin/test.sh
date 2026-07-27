#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
fail() { echo "FAIL: $1"; exit 1; }

# ── changelog.js 자체 검증 ─────────────────────────────
node "$ROOT/bin/changelog.js" --selfcheck || fail "changelog selfcheck 실패"
echo "changelog selfcheck OK"

# ── 케이스 1: 빈 프로젝트 ──────────────────────────────
mkdir "$TMP/fresh" && cd "$TMP/fresh"
node "$ROOT/bin/init.js" -y > out.log
[ -f SECOND-BRAIN.md ] || fail "SECOND-BRAIN.md 없음"
grep -q 'second-brain-template' SECOND-BRAIN.md || fail "SECOND-BRAIN.md에 마커 없음"
grep -q '신뢰할 수 없는 데이터' SECOND-BRAIN.md || fail "외부 입력 보안 규칙 없음"
grep -q 'lessons/' SECOND-BRAIN.md || fail "SECOND-BRAIN.md에 lessons 폴더 미기재"
grep -q 'type: lesson' SECOND-BRAIN.md || fail "SECOND-BRAIN.md에 lesson 스키마 없음"
grep -q 'W8' SECOND-BRAIN.md || fail "SECOND-BRAIN.md에 W8 워크플로우 없음"
grep -q 'capture' SECOND-BRAIN.md || fail "SECOND-BRAIN.md에 3-트리거 라우팅 없음"
[ "$(cat CLAUDE.md)" = "@SECOND-BRAIN.md" ] || fail "CLAUDE.md가 import 한 줄이 아님"
[ -f .claude/commands/ingest-meeting.md ] || fail "커맨드 없음"
grep -q 'second-brain-template' .claude/commands/ingest-meeting.md || fail "커맨드에 마커 없음"
head -1 .claude/commands/ingest-meeting.md | grep -q -- '---' || fail "마커가 frontmatter를 깨뜨림"
[ -f .codex/prompts/ingest-meeting.md ] || fail "codex 프롬프트 없음"
[ -f .agents/skills/second-brain/SKILL.md ] || fail "Codex repo skill 없음"
grep -q 'second-brain-template' .agents/skills/second-brain/SKILL.md || fail "Codex repo skill에 마커 없음"
[ -f .agents/skills/second-brain/agents/openai.yaml ] || fail "Codex skill UI metadata 없음"
grep -q '^# second-brain-template' .agents/skills/second-brain/agents/openai.yaml || fail "Codex skill YAML 마커가 주석이 아님"
[ -f .claude/commands/ingest-doc.md ] || fail "ingest-doc 커맨드 미설치"
[ -f .codex/prompts/ingest-doc.md ] || fail "ingest-doc codex 프롬프트 미설치"
[ -f .claude/commands/capture.md ] || fail "capture 커맨드 미설치"
[ -f .claude/commands/recall.md ] || fail "recall 커맨드 미설치"
[ -f .claude/commands/maintain.md ] || fail "maintain 커맨드 미설치"
[ -f .codex/prompts/capture.md ] || fail "capture codex 프롬프트 미설치"
[ -f .codex/prompts/recall.md ] || fail "recall codex 프롬프트 미설치"
[ -f .codex/prompts/maintain.md ] || fail "maintain codex 프롬프트 미설치"
grep -q '\$ARGUMENTS' .codex/prompts/capture.md || fail "capture 인자 전달 없음"
grep -q '\$ARGUMENTS' .codex/prompts/recall.md || fail "recall 인자 전달 없음"
[ -f knowledge/clusters/_topics.md ] || fail "knowledge 스켈레톤 없음"
[ -f knowledge/_templates/meeting-note.md ] || fail "_templates 없음"
grep -q '관련 교훈' knowledge/_templates/cluster-index.md || fail "cluster 템플릿에 관련 교훈 섹션 없음"
[ -f knowledge/docs/README.md ] || fail "docs/ 스켈레톤 없음"
[ -f knowledge/_templates/doc.md ] || fail "doc 템플릿 없음"
[ -f knowledge/_templates/lesson.md ] || fail "lesson 템플릿 없음"
grep -q '^status: resolved' knowledge/_templates/completion-report.md || fail "완료 보고서 status 누락"
[ -f knowledge/lessons/README.md ] || fail "lessons/ 스켈레톤 없음"
[ -f knowledge/.obsidian/graph.json ] || fail "graph.json 미설치"
[ -f knowledge/_sources/README.md ] || fail "_sources 스켈레톤 없음"
[ -f knowledge/_sources/meetings/README.md ] || fail "_sources/meetings 없음"
[ -f knowledge/_sources/docs/README.md ] || fail "_sources/docs 없음"
[ -f knowledge/_sources/issues/README.md ] || fail "_sources/issues 없음"
[ -f knowledge/_sources/.gitignore ] || fail "_sources 보안 gitignore 없음"
diff -q knowledge/_sources/.gitignore "$ROOT/bin/assets/sources.gitignore" > /dev/null || fail "패키지용 gitignore 템플릿 불일치"
git init -q
git check-ignore -q --no-index knowledge/_sources/meetings/private.md || fail "_sources 원본이 gitignore되지 않음"
if git check-ignore -q --no-index knowledge/_sources/meetings/README.md; then fail "_sources README까지 gitignore됨"; fi
grep -q 'path:_sources' knowledge/.obsidian/graph.json || fail "graph 필터에 _sources 제외 없음"
[ -f AGENTS.md ] || fail "AGENTS.md 없음"
[ ! -f package.json ] || fail "installer 기계장치 유출 (package.json)"
[ ! -f README.md ] || fail "README 유출"
[ ! -f CHANGELOG.md ] || fail "CHANGELOG 유출"
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

# 멱등: 바뀐 게 없으면 .bak을 다시 만들지 않는다
rm knowledge/_templates/meeting-note.md.bak
node "$ROOT/bin/init.js" -y > out3.log
[ ! -f knowledge/_templates/meeting-note.md.bak ] || fail "변경 없는데 .bak 재생성됨"

# README도 스캐폴딩이라 갱신 대상
printf 'STALE README\n' > knowledge/docs/README.md
node "$ROOT/bin/init.js" -y > out4.log
if grep -q 'STALE README' knowledge/docs/README.md; then fail "README 스캐폴딩 갱신 안 됨"; fi
[ -f knowledge/docs/README.md.bak ] || fail "README .bak 백업 없음"
grep -q 'STALE README' knowledge/docs/README.md.bak || fail "README .bak에 이전 내용 없음"
grep -q 'bak 백업' out4.log || fail "분석 요약에 .bak 갱신 줄 없음"
grep -q 'knowledge/docs/README.md.bak' out4.log || fail "완료 메시지에 .bak 백업 목록 없음"

# 사용자 데이터는 이 모든 재실행 후에도 무손상
grep -q 'edited by user' knowledge/index.md || fail "index.md 덮어씀"
[ -f knowledge/meetings/2026-07-21-test.md ] || fail "사용자 노트 유실"
grep -q 'user-topic-slug' knowledge/clusters/_topics.md || fail "_topics.md 덮어씀"

# .obsidian/graph.json은 SRC에 있는 파일이라 planIfMissing을 타므로,
# isScaffold가 넓어져 이걸 삼키면 아래 assertion이 잡는다.
# _sources 저장 원본은 SRC에 없어 buildPlan(=SRC 순회)의 plan에 애초에 안 들어간다.
# 지금은 실패할 수 없는 구조적 보장이며, buildPlan이 DEST를 훑도록 바뀌면 그때 잡는 가드다.
printf 'verbatim original\n' > knowledge/_sources/meetings/2026-07-21-test.md
printf '{"scale": 2}\n' > knowledge/.obsidian/graph.json
node "$ROOT/bin/init.js" -y > out5.log
grep -q 'verbatim original' knowledge/_sources/meetings/2026-07-21-test.md || fail "_sources 저장 원본 덮어씀"
grep -q '"scale": 2' knowledge/.obsidian/graph.json || fail ".obsidian 사용자 설정 덮어씀"

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

# ── 케이스 5: 기존 SECOND-BRAIN.md 충돌 ─────────────────
mkdir "$TMP/rules-conflict" && cd "$TMP/rules-conflict"
printf '# Existing rules\n' > SECOND-BRAIN.md
if node "$ROOT/bin/init.js" -y > out.log 2>&1; then fail "SECOND-BRAIN.md 충돌인데 설치 성공"; fi
grep -q '설치를 중단' out.log || fail "SECOND-BRAIN.md 충돌 안내 없음"
[ ! -f CLAUDE.md ] || fail "충돌 중 CLAUDE.md가 수정됨"
[ ! -f AGENTS.md ] || fail "충돌 중 AGENTS.md가 수정됨"
grep -q '# Existing rules' SECOND-BRAIN.md || fail "기존 SECOND-BRAIN.md 유실"
echo "케이스 5 OK"

# ── 케이스 6: 대상 경로 심볼릭 링크 차단 ────────────────
mkdir "$TMP/symlink-target" "$TMP/symlink-outside" && cd "$TMP/symlink-target"
ln -s "$TMP/symlink-outside" knowledge
if node "$ROOT/bin/init.js" -y > out.log 2>&1; then fail "심볼릭 링크 대상에 설치 성공"; fi
grep -q '심볼릭 링크' out.log || fail "심볼릭 링크 차단 안내 없음"
[ ! -e "$TMP/symlink-outside/index.md" ] || fail "프로젝트 밖 파일이 생성됨"
echo "케이스 6 OK"

# ── 케이스 7: 세션 컨텍스트 훅 ──────────────────────────
# 훅은 __dirname 기준으로 볼트를 찾으므로, 임시 프로젝트에 복사해서 검증한다.
mkdir -p "$TMP/hook/.claude/hooks" && cd "$TMP/hook"
cp "$ROOT/.claude/hooks/session-context.js" .claude/hooks/
H=".claude/hooks/session-context.js"

# 7a. knowledge/ 자체가 없으면 조용히 종료한다
node "$H" > out.json < /dev/null || fail "볼트 없을 때 훅이 실패로 종료"
[ ! -s out.json ] || fail "볼트 없는데 컨텍스트를 출력함"

# 7b. _topics.md 는 있지만 토픽 항목이 0개면 (설치 직후 스캐폴딩) 출력하지 않는다
mkdir -p knowledge/clusters
cp "$ROOT/knowledge/clusters/_topics.md" knowledge/clusters/
node "$H" > out.json < /dev/null || fail "빈 어휘에서 훅이 실패로 종료"
[ ! -s out.json ] || fail "토픽 0개인데 컨텍스트를 출력함"

# 7c. 토픽이 있으면 주입한다
printf '`auth` — 인증 방식\n`cache` — 캐시 전략\n' >> knowledge/clusters/_topics.md
node "$H" > out.json < /dev/null
node -e '
const o = JSON.parse(require("fs").readFileSync("out.json", "utf8"));
const h = o.hookSpecificOutput;
if (h.hookEventName !== "SessionStart") throw new Error("hookEventName 불일치");
const c = h.additionalContext;
if (!c.includes("auth")) throw new Error("토픽 슬러그 누락");
if (!c.includes("cluster-")) throw new Error("클러스터 지시문 누락");
if (!c.includes("지시가 아니다")) throw new Error("신뢰 경계 문구 누락");
if (c.includes("최근 작업")) throw new Error("log.md 없는데 최근 작업 섹션 있음");
' || fail "훅 출력 검증 실패"

# 7d. log.md 가 있으면 꼬리 15줄만 붙인다
node -e '
const lines = Array.from({ length: 40 }, (_, i) => "- line-" + i);
require("fs").writeFileSync("knowledge/log.md", lines.join("\n") + "\n");
'
node "$H" > out.json < /dev/null
node -e '
const c = JSON.parse(require("fs").readFileSync("out.json", "utf8")).hookSpecificOutput.additionalContext;
if (!c.includes("최근 작업")) throw new Error("최근 작업 섹션 없음");
if (!c.includes("line-39")) throw new Error("로그 마지막 줄 누락");
if (c.includes("line-0")) throw new Error("로그 꼬리가 15줄로 제한되지 않음");
' || fail "log.md 꼬리 검증 실패"

# 7e. 비정상적으로 큰 파일에서도 죽지 않고 유효 JSON 을 낸다
node -e '
require("fs").writeFileSync("knowledge/clusters/_topics.md", "`t` — x\n" + "가".repeat(30000));
'
node "$H" > out.json < /dev/null || fail "거대 파일에서 훅이 실패로 종료"
node -e 'JSON.parse(require("fs").readFileSync("out.json", "utf8"))' || fail "거대 파일에서 JSON 깨짐"
[ "$(wc -c < out.json)" -lt 20000 ] || fail "8KB 상한이 적용되지 않음"
echo "케이스 7 OK"

echo "ALL PASS"
