import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadVault, parseDay } from '../second-brain/tools/lib/notes.mjs';
import { CAP, search, tokens } from '../second-brain/tools/lib/search.mjs';
import { CLEAN, makeVault } from './fixture.mjs';

const notes = loadVault(makeVault(CLEAN));
const today = parseDay('2025-03-01');
const run = (q, opt = {}) => search(notes, q, { today, ...opt });

test('토크나이저: 영숫자는 통째로, 한글은 두 글자씩', () => {
  assert.deepEqual(tokens('Clarity 마스킹'), ['clarity', '마스', '스킹']);
  assert.deepEqual(tokens('DEC-0061 api키'), ['dec', '0061', 'ap', 'pi', 'i키']);
});

test('정답 세트: 기대 id가 상위 3위 안', () => {
  const gold = [
    ['분실물', { type: 'decision' }, 'DEC-0005'],
    ['로그인 없이', { type: 'decision' }, 'DEC-0003'],
    ['clarity 마스킹', {}, 'ISS-0001'],
    ['분석 도구', { type: 'doc' }, 'DOC-0001'],
    ['결정 질문', { type: 'lesson' }, 'LSN-0001'],
  ];
  for (const [q, opt, id] of gold) assert.ok(run(q, opt).ranked.slice(0, 3).includes(id), `${q} → ${id}`);
});

test('id를 그대로 넣으면 그 노트가 1위', () => {
  assert.equal(run('DEC-0006').ranked[0], 'DEC-0006');
});

test('필터: type·topic·status, archived는 --all 일 때만', () => {
  assert.ok(run('로그인', { type: 'decision' }).ranked.every((id) => id.startsWith('DEC-')));
  assert.ok(!run('이메일 로그인').ranked.includes('DEC-0004'));
  assert.ok(run('이메일 로그인', { all: true }).ranked.includes('DEC-0004'));
  assert.deepEqual(run('식별', { status: 'superseded' }).ranked.sort(), ['DEC-0001', 'DEC-0002']);
  const byTopic = run('분석', { topic: 'analytics' }).ranked;
  assert.ok(byTopic.includes('DOC-0001') && byTopic.every((id) => !id.startsWith('LSN')));
});

test('--topic: 핵심 topics 노트가 topics_ref 노트보다 앞', () => {
  const r = run('식별 토큰 분석', { topic: 'auth' }).ranked;
  assert.ok(r.indexOf('DOC-0001') > r.indexOf('DEC-0003'));
});

test('status 표시: 대체 체인의 최신, 오래됨, authority', () => {
  assert.match(run('세션 쿠키').text, /DEC-0001 · decision · superseded → DEC-0003 \(active\)/);
  assert.match(search(notes, '분실물', { today: parseDay('2026-09-25') }).text, /DEC-0005 · decision · active ⚠ 마지막 확인 20개월 전/);
  assert.match(run('분석 도구').text, /DOC-0001 · doc · active \[official\]/);
});

test('매칭 줄은 파일 줄 번호와 함께 최대 2개', () => {
  const block = run('분실물 기존 결정').text.split(/\n(?=\d+\. )/).find((b) => b.includes('DEC-0005'));
  const lines = block.split('\n').filter((l) => /^ {4}L\d+: /.test(l));
  assert.ok(lines.length >= 1 && lines.length <= 2);
  assert.ok(lines.some((l) => l.includes('기존 결정(DEC-0003)은 그대로 유효하다')));
});

test('_sources·_templates·운영 파일의 같은 단어는 걸리지 않는다', () => {
  const r = run('분실물 로그인 clarity');
  assert.ok(r.ranked.length > 0);
  assert.doesNotMatch(r.text, /_sources\/|_templates\/|log\.md|README/);
});

test('깨진 노트도 broken으로 보인다', () => {
  const extra = loadVault(makeVault({ ...CLEAN, 'decisions/DEC-0099-분실물-깨짐.md': '---\ntype: decision\n# 분실물\n' }));
  assert.match(search(extra, '분실물', { today }).text, /DEC-0099-분실물-깨짐 · decision · broken\(frontmatter가 닫히지 않음\)/);
});

test('8KB 상한: 결과를 한 건 단위로 담고, --offset 으로 이어 읽으면 전부 복원', () => {
  const many = { ...CLEAN };
  for (let i = 0; i < 120; i++) many[`decisions/DEC-${String(2000 + i)}-분실물-${i}.md`] = `---\ntype: decision\nid: DEC-${2000 + i}\ncreated: 2025-01-10\ntopics: [lost-items]\nstatus: active\nsupersedes: null\nsuperseded_by: null\nrelated: []\n---\n# DEC-${2000 + i}: 분실물 변형 ${i}\n분실물 분실물 본문 ${'가나다라 '.repeat(30)}\n`;
  const big = loadVault(makeVault(many));
  const seen = [];
  let offset = 0;
  for (let guard = 0; guard < 50; guard++) {
    const r = search(big, '분실물', { today, offset });
    assert.ok(Buffer.byteLength(r.text) <= CAP, `page bytes ${Buffer.byteLength(r.text)}`);
    const shown = [...r.text.matchAll(/^\d+\. (\S+) /gm)].map((m) => m[1]);
    seen.push(...shown);
    const next = r.text.match(/^# next: --offset (\d+)$/m);
    if (!next) { assert.match(r.text, /complete=true/); break; }
    assert.match(r.text, /complete=false/);
    offset = Number(next[1]);
  }
  assert.deepEqual(seen, search(big, '분실물', { today }).ranked);
});

test('문장형 검색어에는 힌트, 결과 0건에도 힌트', () => {
  assert.match(run('분실물 기능은 왜 MVP에서 미뤘나요?').text, /# hint: 문장 대신 핵심 키워드/);
  assert.doesNotMatch(run('분실물').text, /# hint/);
  assert.match(run('존재하지않는단어').text, /hits 0 .*complete=true[\s\S]*# hint: 결과 없음/);
});

test('검색어 없이 필터만 주면 최신순 목록', () => {
  assert.deepEqual(run('', { type: 'decision', topic: 'auth' }).ranked, ['DEC-0003', 'DEC-0002', 'DEC-0001']);
});

test('--status archived 는 --all 없이도 archived 를 찾는다', () => {
  assert.ok(run('이메일', { status: 'archived' }).ranked.includes('DEC-0004'));
});

test('깨진 노트는 --status·--topic 필터에서도 사라지지 않는다', () => {
  const extra = loadVault(makeVault({ ...CLEAN, 'decisions/DEC-0099-분실물-깨짐.md': '---\ntype: decision\n# 분실물\n' }));
  assert.ok(search(extra, '분실물', { today, status: 'active' }).ranked.includes('DEC-0099-분실물-깨짐'));
  assert.ok(search(extra, '분실물', { today, topic: 'lost-items' }).ranked.includes('DEC-0099-분실물-깨짐'));
});

test('머리줄에 적용된 필터를 적는다', () => {
  assert.match(run('분실물', { type: 'decision', status: 'active' }).text, /^# search "분실물" · type=decision status=active · hits \d+/);
  assert.match(run('분실물').text, /^# search "분실물" · hits \d+/);
});
