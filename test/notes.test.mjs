import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { latestOf, lifecycleIndex, listAllNames, loadVault, parseDay, parseFrontmatter, staleMonths } from '../second-brain/tools/lib/notes.mjs';
import { CLEAN, makeVault } from './fixture.mjs';

const fmOf = (src) => parseFrontmatter(src.split('\n'));

test('파서: 스칼라·따옴표·주석·흐름 목록·블록 목록·이스케이프', () => {
  const r = fmOf([
    '---',
    'type: decision        # active | superseded',
    'id: DEC-0001',
    'reviewed: null',
    'empty:',
    'title: "a # not comment"',
    "single: 'it''s'",
    'topics: [auth, "lost, items", \'x\']',
    'related:',
    '  - "[[DEC-0002-b]]"',
    '  - "[[DEC-0003-c]]"',
    'symptoms: ["href=\\"/\\" 링크", 두번째]',
    '---',
    '# 본문',
  ].join('\n'));
  assert.equal(r.err, null);
  assert.equal(r.bodyStart, 13);
  assert.deepEqual(r.fm, {
    type: 'decision', id: 'DEC-0001', reviewed: null, empty: null, title: 'a # not comment', single: "it's",
    topics: ['auth', 'lost, items', 'x'], related: ['[[DEC-0002-b]]', '[[DEC-0003-c]]'], symptoms: ['href="/" 링크', '두번째'],
  });
});

test('파서: 허용 밖 문법은 줄 번호와 함께 오류', () => {
  assert.match(fmOf('---\ntype: decision\ndescription: |\n  여러 줄\n---\n').err, /^L3: 여러 줄 문자열/);
  assert.match(fmOf('---\ntopics: [a, [b]]\n---\n').err, /중첩 목록/);
  assert.match(fmOf('---\ntitle: "닫히지 않음\n---\n').err, /큰따옴표/);
  assert.match(fmOf('---\n  nested: x\n---\n').err, /허용되지 않는 문법/);
  assert.equal(fmOf('# 앞머리 없음\n').err, 'frontmatter 없음');
  assert.equal(fmOf('---\ntype: x\n').err, 'frontmatter가 닫히지 않음');
});

test('순회: _sources·_templates·운영 파일은 빼고, 깨진 노트도 목록에 남긴다', () => {
  const root = makeVault({ ...CLEAN, 'decisions/DEC-0099-broken.md': '---\ntype: decision\n' });
  const files = loadVault(root).map((n) => n.file);
  assert.ok(files.includes('decisions/DEC-0005-분실물은-축제-기능-뒤로-미룬다.md'));
  assert.ok(files.includes('decisions/DEC-0099-broken.md'));
  for (const f of files) assert.doesNotMatch(f, /^(_sources|_templates)\/|(^|\/)(index|log|README|_topics)\.md$/);
  const broken = loadVault(root).find((n) => n.base === 'DEC-0099-broken');
  assert.equal(broken.type, 'decision');
  assert.equal(broken.err, 'frontmatter가 닫히지 않음');
});

test('supersede 체인: 끝까지 따라가고 순환에서 멈춘다', () => {
  const notes = loadVault(makeVault(CLEAN));
  const idx = lifecycleIndex(notes);
  assert.equal(latestOf(idx.get('DEC-0001'), idx).id, 'DEC-0003');
  const a = { id: 'A', fm: { superseded_by: 'B' } };
  const b = { id: 'B', fm: { superseded_by: 'A' } };
  assert.ok(['A', 'B'].includes(latestOf(a, new Map([['A', a], ['B', b]])).id));
});

test('오래됨: active decision·doc·lesson 만, max(created, reviewed) + 3개월 초과', () => {
  const n = (fm) => ({ fm: { type: 'decision', status: 'active', ...fm } });
  const today = parseDay('2025-09-25');
  assert.equal(staleMonths(n({ created: '2025-06-25' }), today), 0);
  assert.equal(staleMonths(n({ created: '2025-06-24' }), today), 3);
  assert.equal(staleMonths(n({ created: '2025-01-10' }), today), 8);
  assert.equal(staleMonths(n({ created: '2025-01-10', reviewed: '2025-08-01' }), today), 0);
  assert.equal(staleMonths(n({ created: '2020-01-01', status: 'superseded' }), today), 0);
  assert.equal(staleMonths({ fm: { type: 'issue', status: 'open', created: '2020-01-01' } }, today), 0);
});

test('CRLF 줄바꿈 노트도 LF와 똑같이 읽는다', () => {
  const lf = CLEAN['decisions/DEC-0005-분실물은-축제-기능-뒤로-미룬다.md'];
  const root = makeVault({ ...CLEAN, 'decisions/DEC-0005-분실물은-축제-기능-뒤로-미룬다.md': lf.replace(/\n/g, '\r\n') });
  const n = loadVault(root).find((x) => x.id === 'DEC-0005');
  assert.equal(n.err, null);
  assert.equal(n.fm.status, 'active');
  assert.equal(n.title, 'DEC-0005: 분실물은 축제 기능 뒤로 미룬다');
  assert.ok(n.lines.every((l) => !l.endsWith('\r')));
});

// 기대값은 실제 YAML 파서(Ruby Psych) 판정 — YAML이 거부하면 오류, 받아들이면 같은 값.
// 앵커·여러 줄 문자열은 YAML은 받지만 이 부분집합 밖이라 오류로 둔다.
const PARSE_CASES = [
  ['흐름 목록 뒤 블록 항목', 'related: []\n  - "[[x]]"', /블록 항목/],
  ['값 안의 ": "', 'root_cause: 원인: 타임아웃', /따옴표/],
  ['콜론으로 끝나는 값', 'root_cause: 원인:', /따옴표/],
  ['백틱으로 시작', 'trigger: `rg` 쓸 때', /따옴표/],
  ['@로 시작', 'trigger: @user', /따옴표/],
  ['%로 시작', 'trigger: %done', /따옴표/],
  ['*로 시작', 'root_cause: **굵게**', /따옴표/],
  ['"- "로 시작', 'x: - a', /따옴표/],
  ['"? "로 시작', 'x: ? a', /따옴표/],
  ['탭 들여쓰기', 'a:\n\t- b', /탭/],
  ['빈 흐름 항목', 'a: [x, , y]', /빈 목록 항목/],
  ['닫는 따옴표 뒤 잡음', 'x: "a" b', /따옴표 뒤/],
  ['흐름 목록 안 주석', 'x: [a #b]', /따옴표/],
  ['따옴표 없는 wikilink 목록', 'x: [[[a]]]', /따옴표로 감쌀/],
  ['앵커', 'x: &a b', /지원하지 않음/],
  ['여러 줄 문자열', 'x: a\n  b', /허용되지 않는 문법/],
  ['끝 쉼표', 'a: [x, y, ]', { a: ['x', 'y'] }],
  ['목록 안 아포스트로피', "symptoms: [can't log in, ok]", { symptoms: ["can't log in", 'ok'] }],
  ['평문 아포스트로피 + 주석', "root_cause: don't retry # memo", { root_cause: "don't retry" }],
  ['공백 없는 #', 'x: C#', { x: 'C#' }],
  ['URL 안의 #', 'source: https://example.com/a#b', { source: 'https://example.com/a#b' }],
  ['작은따옴표 이스케이프', "x: 'it''s'", { x: "it's" }],
  ['따옴표 안 쉼표', 'x: ["a, b", c]', { x: ['a, b', 'c'] }],
  ['값 없이 주석만', 'x: # only comment', { x: null }],
  ['-로 시작하는 단어', 'x: -abc', { x: '-abc' }],
];

test('파서: 실제 YAML 파서(Ruby Psych) 판정과 같은 결과', () => {
  for (const [name, body, want] of PARSE_CASES) {
    const r = fmOf(`---\n${body}\n---\n`);
    if (want instanceof RegExp) assert.match(r.err ?? '(오류 없음)', want, name);
    else {
      assert.equal(r.err, null, `${name}: ${r.err}`);
      assert.deepEqual(r.fm, want, name);
    }
  }
});

test('BOM이 붙은 노트도 읽는다', () => {
  const key = 'decisions/DEC-0005-분실물은-축제-기능-뒤로-미룬다.md';
  const n = loadVault(makeVault({ ...CLEAN, [key]: '\uFEFF' + CLEAN[key] })).find((x) => x.base.startsWith('DEC-0005'));
  assert.equal(n.err, null);
  assert.equal(n.id, 'DEC-0005');
});

test('NFD 파일명도 NFC 이름으로 다룬다', () => {
  const key = 'decisions/DEC-0005-분실물은-축제-기능-뒤로-미룬다.md';
  const { [key]: src, ...rest } = CLEAN;
  const root = makeVault({ ...rest, [key.normalize('NFD')]: src });
  const n = loadVault(root).find((x) => x.id === 'DEC-0005');
  assert.equal(n.base, 'DEC-0005-분실물은-축제-기능-뒤로-미룬다');
  assert.equal(n.file, key);
  assert.ok(listAllNames(root).has('DEC-0005-분실물은-축제-기능-뒤로-미룬다'));
});

test('읽을 수 없는 폴더는 조용히 건너뛰지 않고 오류', { skip: process.getuid?.() === 0 }, () => {
  const root = makeVault(CLEAN);
  fs.chmodSync(path.join(root, 'lessons'), 0o000);
  try { assert.throws(() => loadVault(root), /EACCES|EPERM/); }
  finally { fs.chmodSync(path.join(root, 'lessons'), 0o755); }
});

test('심볼릭 링크 폴더를 따라가고 순환 링크에서 멈춘다', () => {
  const root = makeVault(CLEAN);
  const ext = makeVault({ 'x/DEC-0100-외부.md': '---\ntype: decision\nid: DEC-0100\n---\n# 외부\n' });
  fs.symlinkSync(path.join(ext, 'x'), path.join(root, 'decisions', 'linked'));
  fs.symlinkSync(root, path.join(root, 'decisions', 'loop'));
  const files = loadVault(root).map((n) => n.file);
  assert.ok(files.includes('decisions/linked/DEC-0100-외부.md'));
  assert.equal(files.filter((f) => f.includes('DEC-0005')).length, 1);
});

test('날짜 해석: 없는 날짜는 거부', () => {
  assert.equal(parseDay('2025-02-30'), null);
  assert.equal(parseDay('2025-02-28'), Date.UTC(2025, 1, 28));
});
