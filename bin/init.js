#!/usr/bin/env node
'use strict';
// second-brain-template installer — 의존성 0개 (node 내장 모듈만)
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..');
const DEST = process.cwd();
const MARKER = '<!-- second-brain-template -->';
const IMPORT_LINE = '@SECOND-BRAIN.md';

const installed = [];
const skipped = [];
const warned = [];

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

function write(to, content) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.writeFileSync(to, content);
}

// 템플릿 소유 파일: 마커를 끝에 찍어서 저장 (frontmatter 보호를 위해 반드시 끝에)
function installOwned(rel) {
  const to = path.join(DEST, rel);
  const content = fs.readFileSync(path.join(SRC, rel), 'utf8');
  write(to, content.trimEnd() + '\n\n' + MARKER + '\n');
  installed.push(rel);
}

// 사용자 소유 파일: 없을 때만 생성
function installIfMissing(rel) {
  const to = path.join(DEST, rel);
  if (fs.existsSync(to)) { skipped.push(rel); return; }
  write(to, fs.readFileSync(path.join(SRC, rel)));
  installed.push(rel);
}

// CLAUDE.md: 없으면 import 한 줄짜리 생성
function ensureClaudeMd() {
  const to = path.join(DEST, 'CLAUDE.md');
  if (fs.existsSync(to)) { skipped.push('CLAUDE.md'); return; }
  write(to, IMPORT_LINE + '\n');
  installed.push('CLAUDE.md');
}

// AGENTS.md: 없으면 템플릿 복사
function ensureAgentsMd() {
  const to = path.join(DEST, 'AGENTS.md');
  if (fs.existsSync(to)) { skipped.push('AGENTS.md'); return; }
  write(to, fs.readFileSync(path.join(SRC, 'AGENTS.md')));
  installed.push('AGENTS.md');
}

installOwned('SECOND-BRAIN.md');
for (const dir of ['.claude/commands', '.codex/prompts']) {
  for (const f of listFiles(path.join(SRC, dir))) installOwned(path.relative(SRC, f));
}
for (const f of listFiles(path.join(SRC, 'knowledge'))) installIfMissing(path.relative(SRC, f));
ensureClaudeMd();
ensureAgentsMd();

console.log('second-brain-template 설치 완료\n');
if (installed.length) console.log('설치/갱신:\n' + installed.map((f) => '  + ' + f).join('\n'));
if (skipped.length) console.log('유지(기존 파일):\n' + skipped.map((f) => '  = ' + f).join('\n'));
if (warned.length) console.log('경고:\n' + warned.map((f) => '  ! ' + f).join('\n'));
console.log(`
다음 단계:
  1. Obsidian → "보관함 폴더 열기" → knowledge/ 선택
  2. Claude Code에서 /ingest-meeting 으로 첫 회의록 넣기
  3. (선택) /setup-vault 로 프로젝트 정보 반영
`);
