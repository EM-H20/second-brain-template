#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
fail() { echo "FAIL: $1"; exit 1; }

# ── changelog.js 자체 검증 ─────────────────────────────
node "$ROOT/bin/changelog.js" --selfcheck || fail "changelog selfcheck 실패"
echo "changelog selfcheck OK"

# npm 패키지에 실리는 경로 가드 — files 누락은 로컬 설치 테스트로는 잡히지 않는다
node -e '
const files = require("'"$ROOT"'/package.json").files;
for (const p of [".claude/hooks", ".claude/settings.json"]) {
  if (!files.includes(p)) throw new Error("package.json files 에 " + p + " 누락");
}
' || fail "package.json files 누락"
echo "packaging guard OK"

# ── 케이스 1: 빈 프로젝트 ──────────────────────────────
mkdir "$TMP/fresh" && cd "$TMP/fresh"
node "$ROOT/bin/init.js" -y > out.log
[ -f SECOND-BRAIN.md ] || fail "SECOND-BRAIN.md 없음"
grep -q 'second-brain-template' SECOND-BRAIN.md || fail "SECOND-BRAIN.md에 마커 없음"
grep -q '신뢰할 수 없는 데이터' SECOND-BRAIN.md || fail "외부 입력 보안 규칙 없음"
grep -q 'lessons/' SECOND-BRAIN.md || fail "SECOND-BRAIN.md에 lessons 폴더 미기재"
grep -q 'type: lesson' SECOND-BRAIN.md || fail "SECOND-BRAIN.md에 lesson 스키마 없음"
grep -q 'W8' SECOND-BRAIN.md || fail "SECOND-BRAIN.md에 W8 워크플로우 없음"
grep -q 'W9' SECOND-BRAIN.md || fail "SECOND-BRAIN.md에 W9 워크플로우 없음"
# 아웃바운드 쓰기 게이트는 W9 안이 아니라 General rules 에 있어야 한다 —
# 다음에 추가될 아웃바운드 워크플로우가 이 게이트를 물려받아야 하기 때문이다.
grep -q '볼트 밖으로 쓰는 행위' SECOND-BRAIN.md || fail "SECOND-BRAIN.md에 아웃바운드 쓰기 게이트 없음"
grep -q '무결성 검사' SECOND-BRAIN.md || fail "SECOND-BRAIN.md에 W2 무결성 검사 없음"
grep -q 'capture' SECOND-BRAIN.md || fail "SECOND-BRAIN.md에 3-트리거 라우팅 없음"
# 세션 시작 규칙은 툴 중립이어야 한다 — 훅이 없는 CLI(Codex 등)가 지킬 근거가 여기 있다.
grep -q '세션 시작 컨텍스트' SECOND-BRAIN.md || fail "SECOND-BRAIN.md에 세션 시작 규칙 없음"
[ "$(cat CLAUDE.md)" = "@SECOND-BRAIN.md" ] || fail "CLAUDE.md가 import 한 줄이 아님"
[ -f .claude/commands/ingest-meeting.md ] || fail "커맨드 없음"
grep -q 'second-brain-template' .claude/commands/ingest-meeting.md || fail "커맨드에 마커 없음"
head -1 .claude/commands/ingest-meeting.md | grep -q -- '---' || fail "마커가 frontmatter를 깨뜨림"
# .mjs는 항상 모듈 모드로 파싱되므로 Annex B 문법(<!-- 를 한 줄 주석으로 허용)이
# 적용되지 않는다 — node --check 는 이제 HTML 마커가 붙으면 실제로 문법 오류로
# 잡아낸다. 그래도 회귀 방어의 진짜 가드는 아래 부재(absence) 단언이다: 위 grep은
# 마커가 "있다"는 것만 확인하는데, 훅 소스의 첫 주석 줄 자체가
# `// second-brain-template` 로 시작해서 실제로 어떤 마커가 붙었는지와 무관하게
# 항상 통과한다. 지우지 말 것.
[ -f .claude/hooks/session-context.mjs ] || fail "훅 스크립트 미설치"
node --check .claude/hooks/session-context.mjs || fail "훅 스크립트 문법 오류 (마커가 JS를 깨뜨림)"
grep -q '^// second-brain-template' .claude/hooks/session-context.mjs || fail "JS 마커가 // 주석이 아님"
if grep -q -- '<!-- second-brain-template -->' .claude/hooks/session-context.mjs; then
  fail "JS 소유 파일에 HTML 마커가 붙음"
fi
[ -f .claude/settings.json ] || fail "settings.json 미생성"
node -e '
const s = require("./.claude/settings.json");
if (!JSON.stringify(s.hooks.SessionStart).includes("session-context.mjs")) {
  throw new Error("SessionStart 훅 미등록");
}
' || fail "settings.json 에 훅 미등록"
grep -q '훅 등록됨' out.log || fail "설치 후 훅 안내 없음"
# 초기 세팅은 슬래시, 일상 사용은 자연어 — 첫 화면에서 이 경계가 흐려지면 Codex 사용자가 헤맨다
grep -q '기억해' out.log || fail "다음 단계에 자연어 사용법 없음"
grep -q '볼트 초기화해줘' out.log || fail "다음 단계에 Codex 초기화 경로 없음"
grep -q 'session-context.mjs' out.log || fail "훅 확인 방법 안내 없음"
[ -f .codex/prompts/ingest-meeting.md ] || fail "codex 프롬프트 없음"
[ -f .agents/skills/second-brain/SKILL.md ] || fail "Codex repo skill 없음"
grep -q 'second-brain-template' .agents/skills/second-brain/SKILL.md || fail "Codex repo skill에 마커 없음"
# Codex는 저장소 파일로 훅을 등록할 수 없으므로, 같은 규칙이 읽히는 두 경로에 있어야 한다
grep -q 'cluster-' .agents/skills/second-brain/SKILL.md || fail "Codex skill에 클러스터 우선 읽기 지시 없음"
# setup-vault 는 W 워크플로우가 아니라, 스킬이 직접 라우팅해야 Codex 에서 도달 가능하다
grep -q 'setup' .agents/skills/second-brain/SKILL.md || fail "Codex skill에 볼트 초기화 트리거 없음"
# Codex 는 description 으로 스킬을 고른다 — 여기 트리거가 없으면 W9 는 Codex 에서 도달 불가
grep -q 'issue candidate' .agents/skills/second-brain/SKILL.md || fail "Codex skill에 이슈 후보 트리거 없음"
grep -q 'W9' AGENTS.md || fail "AGENTS.md에 W9 라우팅 없음"
grep -q 'Session start' AGENTS.md || fail "AGENTS.md에 세션 시작 섹션 없음"
grep -q 'codex/hooks.json' AGENTS.md || fail "AGENTS.md에 Codex 훅 제약 설명 없음"
[ -f .agents/skills/second-brain/agents/openai.yaml ] || fail "Codex skill UI metadata 없음"
grep -q '^# second-brain-template' .agents/skills/second-brain/agents/openai.yaml || fail "Codex skill YAML 마커가 주석이 아님"
[ -f .claude/commands/ingest-doc.md ] || fail "ingest-doc 커맨드 미설치"
[ -f .codex/prompts/ingest-doc.md ] || fail "ingest-doc codex 프롬프트 미설치"
[ -f .claude/commands/issue-candidates.md ] || fail "issue-candidates 커맨드 미설치"
[ -f .codex/prompts/issue-candidates.md ] || fail "issue-candidates codex 프롬프트 미설치"
grep -q '\$ARGUMENTS' .codex/prompts/issue-candidates.md || fail "issue-candidates 인자 전달 없음"
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
grep -q '검토한 대안 (Alternatives)' knowledge/_templates/decision.md || fail "결정 템플릿에 Alternatives 섹션 없음"
grep -q '논의 기록 없음' knowledge/_templates/decision.md || fail "결정 템플릿에 빈 섹션 지침 없음"
grep -q '## 이슈 후보' knowledge/_templates/meeting-note.md || fail "회의 템플릿에 이슈 후보 섹션 없음"
# 전사체 참조는 언제나 노트의 마지막이다 (W9 1단계). 섹션을 재배치하다 이 순서가
# 뒤집히는 회귀는 존재 단언으로는 잡히지 않는다.
CAND_LINE="$(grep -n '## 이슈 후보' knowledge/_templates/meeting-note.md | cut -d: -f1)"
SRC_LINE="$(grep -n '## 원본 전사체' knowledge/_templates/meeting-note.md | cut -d: -f1)"
[ "$CAND_LINE" -lt "$SRC_LINE" ] || fail "이슈 후보 섹션이 원본 전사체보다 뒤에 있음"
[ -f knowledge/docs/README.md ] || fail "docs/ 스켈레톤 없음"
[ -f knowledge/_templates/doc.md ] || fail "doc 템플릿 없음"
[ -f knowledge/_templates/lesson.md ] || fail "lesson 템플릿 없음"
grep -q '^status: resolved' knowledge/_templates/completion-report.md || fail "완료 보고서 status 누락"
[ -f knowledge/lessons/README.md ] || fail "lessons/ 스켈레톤 없음"
[ -f knowledge/.obsidian/graph.json ] || fail "graph.json 미설치"
[ -f knowledge/_bases/README.md ] || fail "_bases 스켈레톤 없음"
[ -f knowledge/_bases/vault.base ] || fail "_bases/vault.base 미설치"
# 노트 타입을 추가하면 base 뷰도 따라와야 한다 — 이 루프가 그 드리프트를 잡는다
for t in decision issue doc lesson meeting; do
  grep -q "note.type == \"$t\"" knowledge/_bases/vault.base || fail "vault.base에 $t 뷰 없음"
done
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
[ ! -f .claude/settings.json.bak ] || fail "이미 등록된 훅인데 settings .bak 재생성됨"

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

# ── 케이스 8: settings.json 병합 ────────────────────────
# 8a. 기존 permissions 를 보존하며 훅 항목만 추가한다
mkdir -p "$TMP/settings/.claude" && cd "$TMP/settings"
printf '{\n  "permissions": { "allow": ["Bash(ls *)"] }\n}\n' > .claude/settings.json
node "$ROOT/bin/init.js" -y > out.log
node -e '
const s = require("./.claude/settings.json");
if (!s.permissions.allow.includes("Bash(ls *)")) throw new Error("permissions 유실");
if (!JSON.stringify(s.hooks.SessionStart).includes("session-context.mjs")) throw new Error("훅 미추가");
' || fail "settings 병합 실패"
[ -f .claude/settings.json.bak ] || fail "settings .bak 백업 없음"
grep -q 'permissions' .claude/settings.json.bak || fail ".bak 에 원본 내용 없음"
grep -q 'SessionStart 훅' out.log || fail "확인 전 분석 요약에 settings 줄 없음"
grep -q '훅 등록됨' out.log || fail "설치 후 훅 안내 없음"
grep -q 'settings.json.bak' out.log || fail "백업 경로 안내 없음"

# 8b. 재실행해도 중복 추가하지 않고 .bak 도 만들지 않는다
rm .claude/settings.json.bak
node "$ROOT/bin/init.js" -y > out2.log
[ ! -f .claude/settings.json.bak ] || fail "이미 등록됐는데 .bak 재생성"
node -e '
const s = require("./.claude/settings.json");
if (s.hooks.SessionStart.length !== 1) throw new Error("훅 항목 중복 추가");
' || fail "훅 병합 멱등성 깨짐"

# 8c. 사용자가 이미 다른 SessionStart 훅을 쓰고 있으면 그것을 보존한다
mkdir -p "$TMP/settings2/.claude" && cd "$TMP/settings2"
printf '{"hooks":{"SessionStart":[{"hooks":[{"type":"command","command":"echo mine"}]}]}}\n' > .claude/settings.json
node "$ROOT/bin/init.js" -y > out.log
node -e '
const s = require("./.claude/settings.json");
const j = JSON.stringify(s.hooks.SessionStart);
if (!j.includes("echo mine")) throw new Error("기존 훅 유실");
if (!j.includes("session-context.mjs")) throw new Error("우리 훅 미추가");
if (s.hooks.SessionStart.length !== 2) throw new Error("항목 수 이상: " + s.hooks.SessionStart.length);
' || fail "기존 SessionStart 훅 보존 실패"

# 8d. 깨진 JSON 은 건드리지 않고 복붙 안내로 폴백한다
mkdir -p "$TMP/settings3/.claude" && cd "$TMP/settings3"
printf '{ broken json\n' > .claude/settings.json
node "$ROOT/bin/init.js" -y > out.log
grep -q 'broken json' .claude/settings.json || fail "깨진 settings 를 덮어씀"
[ ! -f .claude/settings.json.bak ] || fail "깨진 settings 인데 .bak 생성"
grep -q '파싱하지 못해' out.log || fail "폴백 안내 없음"
grep -q 'CLAUDE_PROJECT_DIR' out.log || fail "복붙 스니펫 없음"
[ -f .claude/hooks/session-context.mjs ] || fail "폴백인데 훅 스크립트도 미설치"

# 8e. 순수 객체가 아닌 JSON(null)은 크래시하지 않고 파싱 실패와 동일하게 폴백한다
mkdir -p "$TMP/settings4/.claude" && cd "$TMP/settings4"
printf 'null\n' > .claude/settings.json
if node "$ROOT/bin/init.js" -y > out.log 2>&1; then EC=0; else EC=$?; fi
[ "$EC" = "0" ] || fail "settings 가 null 이면 installer 가 비정상 종료"
[ -f CLAUDE.md ] || fail "settings 가 null 이라 나머지 설치(CLAUDE.md)가 중단됨"
[ "$(cat .claude/settings.json)" = "null" ] || fail "settings 가 null 인데 파일이 변경됨"
[ ! -f .claude/settings.json.bak ] || fail "settings 가 null 인데 .bak 생성"
grep -q '파싱하지 못해' out.log || fail "null settings 에 폴백 안내 없음"
if grep -q '훅 등록됨' out.log; then fail "null settings 인데 성공했다고 안내함"; fi

# 8f. hooks 가 객체가 아닌 경우(문자열) 크래시하지 않고 안전하게 객체로 교체해 병합한다
mkdir -p "$TMP/settings5/.claude" && cd "$TMP/settings5"
printf '{"hooks":"x"}\n' > .claude/settings.json
if node "$ROOT/bin/init.js" -y > out.log 2>&1; then EC=0; else EC=$?; fi
[ "$EC" = "0" ] || fail "settings.hooks 가 문자열이면 installer 가 비정상 종료"
[ -f CLAUDE.md ] || fail "settings.hooks 가 문자열이라 나머지 설치가 중단됨"
[ -f .claude/settings.json.bak ] || fail "settings.hooks 문자열 케이스에 .bak 백업 없음"
grep -q '"hooks":"x"' .claude/settings.json.bak || fail ".bak 에 원본 내용 없음"
node -e '
const s = require("./.claude/settings.json");
if (!JSON.stringify(s.hooks.SessionStart).includes("session-context.mjs")) throw new Error("훅이 성공했다고 안내하는데 실제로는 누락됨");
' || fail "settings.hooks 문자열인데 훅이 조용히 유실됨"

# 8g. hooks 가 배열인 경우 크래시/조용한 유실 없이 안전하게 객체로 교체해 병합한다
mkdir -p "$TMP/settings6/.claude" && cd "$TMP/settings6"
printf '{"hooks":[]}\n' > .claude/settings.json
if node "$ROOT/bin/init.js" -y > out.log 2>&1; then EC=0; else EC=$?; fi
[ "$EC" = "0" ] || fail "settings.hooks 가 배열이면 installer 가 비정상 종료"
[ -f CLAUDE.md ] || fail "settings.hooks 가 배열이라 나머지 설치가 중단됨"
[ -f .claude/settings.json.bak ] || fail "settings.hooks 배열 케이스에 .bak 백업 없음"
node -e '
const s = require("./.claude/settings.json");
if (!JSON.stringify(s.hooks.SessionStart).includes("session-context.mjs")) throw new Error("hooks 가 배열이라 JSON.stringify 가 훅을 조용히 삭제함");
' || fail "settings.hooks 배열인데 훅이 조용히 유실됨"

echo "케이스 8 OK"

# ── 케이스 7: 세션 컨텍스트 훅 ──────────────────────────
# 훅은 __dirname 기준으로 볼트를 찾으므로, 임시 프로젝트에 복사해서 검증한다.
mkdir -p "$TMP/hook/.claude/hooks" && cd "$TMP/hook"
cp "$ROOT/.claude/hooks/session-context.mjs" .claude/hooks/
H=".claude/hooks/session-context.mjs"

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

# 7f. log.md 가 8KB를 초과해도 마지막 줄을 보여준다 (첫 8KB 아님)
node -e '
const lines = Array.from({ length: 2000 }, (_, i) => "- early-" + i);
lines.push("- FINAL_MARKER_LINE");
require("fs").writeFileSync("knowledge/log.md", lines.join("\n"));
'
node "$H" > out.json < /dev/null
node -e '
const c = JSON.parse(require("fs").readFileSync("out.json", "utf8")).hookSpecificOutput.additionalContext;
if (!c.includes("FINAL_MARKER_LINE")) throw new Error("최근 작업에 마지막 줄 없음");
if (c.includes("early-0")) throw new Error("최근 작업에 파일 시작 줄 있음");
' || fail "로그 8KB 초과 꼬리 검증 실패"

echo "케이스 7 OK"

# ── 케이스 9: ESM 대상 프로젝트 (package.json "type": "module") ──
# .mjs 는 대상의 "type" 설정과 무관하게 항상 모듈로 로드된다. .js + require() 였다면
# "ReferenceError: require is not defined in ES module scope" 로 죽고 아무것도
# 출력하지 못한다 — 이 케이스가 그 회귀를 잡는다.
mkdir "$TMP/esm" && cd "$TMP/esm"
printf '{"type": "module"}\n' > package.json
node "$ROOT/bin/init.js" -y > out.log
printf '`esm-check` — ESM 대상 검증용\n' >> knowledge/clusters/_topics.md
node .claude/hooks/session-context.mjs > out.json < /dev/null || fail "ESM 대상 프로젝트에서 훅 실행 실패"
node -e '
const o = JSON.parse(require("fs").readFileSync("out.json", "utf8"));
if (o.hookSpecificOutput.hookEventName !== "SessionStart") throw new Error("hookEventName 불일치");
if (!o.hookSpecificOutput.additionalContext.includes("esm-check")) throw new Error("ESM 대상에서 컨텍스트 누락");
' || fail "ESM 대상 프로젝트 훅 출력 검증 실패"
echo "케이스 9 OK"

echo "ALL PASS"
