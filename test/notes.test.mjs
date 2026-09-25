import { test } from 'node:test';
import assert from 'node:assert/strict';
import { latestOf, lifecycleIndex, loadVault, parseDay, parseFrontmatter, staleMonths } from '../second-brain/tools/lib/notes.mjs';
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
