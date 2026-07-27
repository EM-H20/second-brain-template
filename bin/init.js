#!/usr/bin/env node
'use strict';
// second-brain-template installer — 의존성 0개 (node 내장 모듈만)
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const SRC = path.join(__dirname, '..');
const DEST = process.cwd();
const MARKER = '<!-- second-brain-template -->';
const IMPORT_LINE = '@SECOND-BRAIN.md';
const AGENTS_POINTER = '**Second brain vault rules:** `SECOND-BRAIN.md`를 전체 읽고 그대로 따를 것.';
const AUTO_YES = process.argv.includes('-y') || process.argv.includes('--yes');
// settings.json 병합 멱등성 판정 키 — 경로가 바뀌면 이 상수도 함께 바꿔야 한다
const HOOK_ID = '.claude/hooks/session-context.js';

if (path.resolve(SRC) === path.resolve(DEST)) {
  console.error('템플릿 저장소 자신에게는 설치할 수 없습니다. 대상 프로젝트 루트에서 실행하세요.');
  process.exit(1);
}

function listFiles(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.DS_Store') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listFiles(p));
    else out.push(p);
  }
  return out;
}

function assertSafePath(to) {
  const rel = path.relative(DEST, to);
  if (path.isAbsolute(rel) || rel === '..' || rel.startsWith('..' + path.sep)) {
    throw new Error('대상 프로젝트 밖에는 설치할 수 없습니다: ' + to);
  }

  let current = DEST;
  for (const part of rel.split(path.sep)) {
    if (!part) continue;
    current = path.join(current, part);
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) {
      throw new Error('심볼릭 링크 대상에는 설치할 수 없습니다: ' + path.relative(DEST, current));
    }
  }
}

function target(rel) {
  const to = path.join(DEST, rel);
  assertSafePath(to);
  return to;
}

function write(to, content) {
  assertSafePath(to);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.writeFileSync(to, content);
}

// 마커는 각 파일 형식의 주석 문법을 따라야 한다.
// .json 은 주석을 넣을 수 없으므로 이 방식 자체를 쓸 수 없다 (planSettings 참고).
function ownedMarker(rel) {
  if (/\.ya?ml$/.test(rel)) return '# second-brain-template';
  if (/\.js$/.test(rel)) return '// second-brain-template';
  return MARKER;
}

// ── 1단계: 현재 프로젝트 분석 (아무것도 쓰지 않음) ──────────────────

// 템플릿 소유 파일: 대상이 없거나 마커를 가진 경우에만 덮어씀
function planOwned(rel) {
  const to = target(rel);
  if (!fs.existsSync(to)) return { kind: 'owned', rel, label: '신규' };
  if (!fs.readFileSync(to, 'utf8').includes(ownedMarker(rel))) return { kind: 'warn', rel };
  return { kind: 'owned', rel, label: '갱신' };
}

// 사용자 소유 파일: 없을 때만 생성
function planIfMissing(rel) {
  return fs.existsSync(target(rel))
    ? { kind: 'keep', rel }
    : { kind: 'copy', rel, label: '신규' };
}

// 스캐폴딩 판정: _templates/ 아래이거나 파일명이 README.md
// 마커 방식(planOwned) 대신 경로로 판정하는 이유: _templates/*는 새 노트를
// 만들 때 내용이 그대로 복사되는 원본이라, 파일에 마커를 심으면 그 마커가
// 생성된 노트로 새어나간다. 새 knowledge/ 하위 폴더를 추가할 때도 이 규칙을
// 따를 것 — 마커를 붙이면 다시 그 오염이 재현된다.
function isScaffold(rel) {
  return rel.split(path.sep).includes('_templates') || path.basename(rel) === 'README.md';
}

// 스캐폴딩: 항상 최신본 유지. 내용이 다를 때만 .bak 백업 후 덮음
function planScaffold(rel) {
  const to = target(rel);
  if (!fs.existsSync(to)) return { kind: 'copy', rel, label: '신규' };
  const cur = fs.readFileSync(to, 'utf8');
  const src = fs.readFileSync(path.join(SRC, rel), 'utf8');
  if (cur === src) return { kind: 'keep', rel };
  return { kind: 'scaffold-update', rel, label: '갱신(.bak)' };
}

// CLAUDE.md: 없으면 import 한 줄짜리 생성, 있으면 한 줄 추가 (멱등)
function planClaudeMd() {
  const to = target('CLAUDE.md');
  if (!fs.existsSync(to)) return { kind: 'claude-create', rel: 'CLAUDE.md', label: '신규' };
  if (fs.readFileSync(to, 'utf8').includes(IMPORT_LINE)) return { kind: 'keep', rel: 'CLAUDE.md' };
  return { kind: 'claude-append', rel: 'CLAUDE.md', label: 'import 한 줄 추가' };
}

// AGENTS.md: 없으면 템플릿 복사, 있으면 포인터 한 줄 추가 (멱등)
function planAgentsMd() {
  const to = target('AGENTS.md');
  if (!fs.existsSync(to)) return { kind: 'agents-copy', rel: 'AGENTS.md', label: '신규' };
  if (fs.readFileSync(to, 'utf8').includes('SECOND-BRAIN.md')) return { kind: 'keep', rel: 'AGENTS.md' };
  return { kind: 'agents-append', rel: 'AGENTS.md', label: '포인터 한 줄 추가' };
}

// .claude/settings.json 은 사용자 소유 파일이다 (permissions, 다른 플러그인의 훅, env).
// 통째로 덮지 않고 SessionStart 항목 하나만 멱등하게 병합한다 —
// planClaudeMd/planAgentsMd 가 CLAUDE.md·AGENTS.md 에 한 줄만 덧붙이는 것과 같은 방식.
function planSettings() {
  const rel = '.claude/settings.json';
  const to = target(rel);
  if (!fs.existsSync(to)) return { kind: 'copy', rel, label: '신규' };
  let cur;
  try {
    cur = JSON.parse(fs.readFileSync(to, 'utf8'));
  } catch (e) {
    return { kind: 'settings-unparsable', rel };
  }
  if (!cur || typeof cur !== 'object' || Array.isArray(cur)) return { kind: 'settings-unparsable', rel };
  const hooks = cur.hooks && typeof cur.hooks === 'object' && !Array.isArray(cur.hooks) ? cur.hooks : {};
  if (JSON.stringify(hooks).includes(HOOK_ID)) return { kind: 'keep', rel };
  return { kind: 'settings-merge', rel, label: 'SessionStart 훅 1개 추가 (.bak 백업)' };
}

function buildPlan() {
  const plan = [planOwned('SECOND-BRAIN.md')];
  for (const dir of ['.claude/commands', '.claude/hooks', '.codex/prompts']) {
    for (const f of listFiles(path.join(SRC, dir))) plan.push(planOwned(path.relative(SRC, f)));
  }
  for (const f of listFiles(path.join(SRC, '.agents/skills/second-brain'))) {
    plan.push(planOwned(path.relative(SRC, f)));
  }
  for (const f of listFiles(path.join(SRC, 'knowledge'))) {
    const rel = path.relative(SRC, f);
    if (rel === 'knowledge/_sources/.gitignore') continue;
    plan.push(isScaffold(rel) ? planScaffold(rel) : planIfMissing(rel));
  }
  plan.push({ ...planIfMissing('knowledge/_sources/.gitignore'), srcRel: 'bin/assets/sources.gitignore' });
  plan.push(planSettings());
  plan.push(planClaudeMd());
  plan.push(planAgentsMd());
  return plan;
}

function printAnalysis(plan) {
  const count = (label) => plan.filter((a) => a.label === label).length;
  const keeps = plan.filter((a) => a.kind === 'keep').length;
  console.log('현재 프로젝트 분석: ' + DEST + '\n');
  console.log('  신규 설치: ' + count('신규') + '개');
  if (count('갱신')) console.log('  갱신(마커 확인됨): ' + count('갱신') + '개');
  const scaffolds = plan.filter((a) => a.kind === 'scaffold-update').length;
  if (scaffolds) console.log('  갱신(.bak 백업): ' + scaffolds + '개');
  if (keeps) console.log('  유지(기존 파일, 건드리지 않음): ' + keeps + '개');
  plan.filter((a) => a.kind === 'claude-append' || a.kind === 'agents-append' || a.kind === 'settings-merge')
    .forEach((a) => console.log('  ' + a.rel + ': ' + a.label));
  plan.filter((a) => a.kind === 'settings-unparsable')
    .forEach((a) => console.log('  ! ' + a.rel + ' — JSON 파싱 실패, 훅 등록을 건너뜁니다'));
  plan.filter((a) => a.kind === 'warn')
    .forEach((a) => console.log('  ! ' + a.rel + ' — 마커 없는 기존 파일, 건너뜀 (필요하면 직접 병합)'));
}

// ── 2단계: 확인 후 적용 ────────────────────────────────────────────

function confirm(cb) {
  if (AUTO_YES) return cb(true);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  let answered = false;
  rl.question('\n설치를 진행할까요? (Y/n) ', (ans) => {
    answered = true;
    rl.close();
    const t = ans.trim().toLowerCase();
    cb(t === '' || t === 'y' || t === 'yes');
  });
  rl.on('close', () => { if (!answered) cb(false); });
}

function applyAction(a) {
  const to = target(a.rel);
  if (a.kind === 'owned') {
    const content = fs.readFileSync(path.join(SRC, a.rel), 'utf8');
    write(to, content.trimEnd() + '\n\n' + ownedMarker(a.rel) + '\n');
  } else if (a.kind === 'copy' || a.kind === 'agents-copy') {
    write(to, fs.readFileSync(path.join(SRC, a.srcRel || a.rel)));
  } else if (a.kind === 'scaffold-update') {
    write(to + '.bak', fs.readFileSync(to));
    write(to, fs.readFileSync(path.join(SRC, a.rel)));
  } else if (a.kind === 'claude-create') {
    write(to, IMPORT_LINE + '\n');
  } else if (a.kind === 'claude-append') {
    write(to, fs.readFileSync(to, 'utf8').trimEnd() + '\n\n' + IMPORT_LINE + '\n');
  } else if (a.kind === 'agents-append') {
    write(to, fs.readFileSync(to, 'utf8').trimEnd() + '\n\n' + AGENTS_POINTER + '\n');
  } else if (a.kind === 'settings-merge') {
    const raw = fs.readFileSync(to);
    const cur = JSON.parse(raw.toString('utf8'));
    const src = JSON.parse(fs.readFileSync(path.join(SRC, '.claude/settings.json'), 'utf8'));
    if (!cur.hooks || typeof cur.hooks !== 'object' || Array.isArray(cur.hooks)) cur.hooks = {};
    cur.hooks.SessionStart = Array.isArray(cur.hooks.SessionStart) ? cur.hooks.SessionStart : [];
    cur.hooks.SessionStart.push(src.hooks.SessionStart[0]);
    write(to + '.bak', raw);
    write(to, JSON.stringify(cur, null, 2) + '\n');
  }
  // 'keep' / 'warn' / 'settings-unparsable': 아무것도 하지 않는다
}

const plan = buildPlan();
printAnalysis(plan);
if (plan.some((a) => a.rel === 'SECOND-BRAIN.md' && a.kind === 'warn')) {
  console.error('\n기존 SECOND-BRAIN.md와 충돌해 설치를 중단했습니다. 파일을 직접 병합한 뒤 다시 실행하세요.');
  process.exit(1);
}
confirm((ok) => {
  if (!ok) {
    console.log('\n설치를 취소했습니다. 변경된 파일은 없습니다.');
    return;
  }
  plan.forEach(applyAction);
  const done = plan.filter((a) => a.kind !== 'keep' && a.kind !== 'warn').length;
  console.log('\nsecond-brain-template 설치 완료 — ' + done + '개 파일 처리\n');
  const backups = plan.filter((a) => a.kind === 'scaffold-update');
  if (backups.length) {
    console.log('직전 버전으로 백업된 파일 (.bak, 다음 재실행 시 최신본으로 교체됨):');
    backups.forEach((a) => console.log('  ' + a.rel + '.bak'));
    console.log('');
  }
  const settings = plan.find((a) => a.rel === '.claude/settings.json');
  if (settings && (settings.kind === 'copy' || settings.kind === 'settings-merge')) {
    console.log('✓ 세션 컨텍스트 훅 등록됨\n');
    console.log('  이제 Claude Code 세션을 시작하면 볼트의 주제 목록과 최근 작업이');
    console.log('  자동으로 주입됩니다. /recall 을 치지 않아도 관련 결정·이슈·교훈이');
    console.log('  코드를 쓰기 전에 먼저 떠오릅니다.\n');
    if (settings.kind === 'settings-merge') {
      console.log('  기존 설정 백업: .claude/settings.json.bak\n');
    }
  } else if (settings && settings.kind === 'settings-unparsable') {
    console.log('! .claude/settings.json 을 파싱하지 못해 훅 등록을 건너뛰었습니다.');
    console.log('  훅 스크립트는 설치됐습니다. 아래를 "hooks" 에 직접 추가하세요:\n');
    console.log('  "SessionStart": [');
    console.log('    { "hooks": [{ "type": "command",');
    console.log('        "command": "node \\"${CLAUDE_PROJECT_DIR:-.}/.claude/hooks/session-context.js\\"", "timeout": 5 }] }');
    console.log('  ]\n');
  }
  console.log('다음 단계:');
  console.log('  1. Obsidian → "보관함 폴더 열기" → knowledge/ 선택');
  console.log('  2. Claude Code에서 /ingest-meeting 으로 첫 회의록 넣기');
  console.log('  3. (선택) /setup-vault 로 프로젝트 정보 반영');
});
