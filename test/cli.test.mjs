import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CLEAN, DIRTY, makeVault } from './fixture.mjs';

const CLI = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'second-brain', 'tools', 'vault.mjs');
const clean = makeVault(CLEAN);
const dirty = makeVault(DIRTY);
const cli = (...args) => spawnSync('node', [CLI, ...args], { encoding: 'utf8' });

test('search: 결과를 출력하고 종료 코드 0', () => {
  const r = cli('search', '분실물', '--type', 'decision', '--vault', clean);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /^# search "분실물" · hits \d+/);
  assert.match(r.stdout, /DEC-0005 · decision · active/);
});

test('section: 찾으면 0, 제목 없으면 1, 노트 없으면 2', () => {
  assert.equal(cli('section', 'DEC-0005', '결과', '--vault', clean).status, 0);
  assert.equal(cli('section', 'DEC-0005', '없는 절', '--vault', clean).status, 1);
  assert.equal(cli('section', '없는노트', '--vault', clean).status, 2);
  assert.match(cli('section', 'ISS-0001', '--vault', clean).stdout, /^# 완료 리포트: issues\//);
});

test('check: 깨끗하면 0, 오류가 있으면 1, --json', () => {
  const ok = cli('check', '--vault', clean, '--today', '2025-03-01');
  assert.equal(ok.status, 0);
  assert.equal(ok.stdout, '무결성 이상 없음\n');
  const bad = cli('check', '--vault', dirty, '--json');
  assert.equal(bad.status, 1);
  const j = JSON.parse(bad.stdout);
  assert.ok(j.errors.length > 0 && Array.isArray(j.warnings));
});

test('check <파일>: 볼트 기준·현재 폴더 기준 경로 모두, 없는 파일은 거짓 통과 대신 오류', () => {
  const rel = cli('check', 'decisions/DEC-0108-dangling.md', '--vault', dirty);
  assert.equal(rel.status, 1);
  assert.match(rel.stdout, /E5/);
  const abs = cli('check', path.join(dirty, 'decisions/DEC-0110-new.md'), '--vault', dirty, '--today', '2025-01-11');
  assert.equal(abs.status, 0);
  const missing = cli('check', 'decisions/nope.md', '--vault', dirty);
  assert.equal(missing.status, 2);
  assert.match(missing.stderr, /파일 없음/);
});

test('사용법·잘못된 입력은 종료 코드 2', () => {
  assert.equal(cli().status, 2);
  assert.equal(cli('--help').status, 0);
  assert.equal(cli('bogus', '--vault', clean).status, 2);
  assert.equal(cli('search', 'x', '--vault', '/nonexistent/vault').status, 2);
  assert.match(cli('search', 'x', '--vault', clean, '--today', '2025/01/01').stderr, /--today 형식 오류/);
});
