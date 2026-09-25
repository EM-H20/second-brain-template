import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadVault } from '../second-brain/tools/lib/notes.mjs';
import { CAP, outline, renderSection, resolveNote } from '../second-brain/tools/lib/section.mjs';
import { CLEAN, makeVault } from './fixture.mjs';

const root = makeVault(CLEAN);
const notes = loadVault(root);
const open = (arg) => resolveNote(root, notes, arg);

test('노트 찾기: 파일 이름, id, 경로', () => {
  assert.equal(open('cluster-auth').note.base, 'cluster-auth');
  assert.equal(open('DEC-0005').note.id, 'DEC-0005');
  assert.equal(open('decisions/DEC-0006-clarity로-공개-화면-재생을-기록한다.md').note.id, 'DEC-0006');
  assert.equal(open('없는노트').error, 'not-found');
});

test('이슈와 완료 리포트가 같은 id면 이슈를 열고 리포트 경로를 알린다', () => {
  const r = open('ISS-0001');
  assert.equal(r.note.type, 'issue');
  assert.match(r.extra, /완료 리포트: issues\/ISS-0001-.*-완료-리포트\.md/);
});

test('id 중복이면 후보를 나열한다', () => {
  const dupRoot = makeVault({ ...CLEAN, 'decisions/DEC-0005-copy.md': CLEAN['decisions/DEC-0005-분실물은-축제-기능-뒤로-미룬다.md'] });
  const r = resolveNote(dupRoot, loadVault(dupRoot), 'DEC-0005');
  assert.equal(r.error, 'ambiguous');
  assert.equal(r.candidates.length, 2);
});

test('목차: 줄 범위와 크기, 코드 블록 안의 가짜 제목은 무시', () => {
  const heads = outline(open('cluster-analytics').note);
  assert.deepEqual(heads.map((h) => h.text), ['클러스터: 분석', '현재 상태 요약 (2025-02-14)', '하위 클러스터', '활성 결정', '핵심 문서']);
  const s = heads[1];
  const lines = open('cluster-analytics').note.lines;
  assert.match(lines[s.start - 1], /^## 현재 상태 요약/);
  assert.equal(lines[s.end].startsWith('## 하위 클러스터'), true);
  assert.match(renderSection(open('cluster-analytics').note, []).text, /^# outline clusters\/cluster-analytics\.md/);
});

test('절 추출: 부분 일치, 여러 절, 같은 제목 반복도 모두', () => {
  const t = renderSection(open('cluster-auth').note, ['현재 상태', '활성']).text;
  assert.match(t, /2절 · L\d+–L\d+ · complete=true/);
  assert.match(t, /로그인 없이 서버 발급 쿠키 토큰으로 식별한다/);
  assert.match(t, /\[\[DEC-0003-/);
  assert.doesNotMatch(t, /대체된 결정/);
  const rep = makeVault({ ...CLEAN, 'reports/2025-03-01-r.md': '---\ntype: report\ncreated: 2025-03-01\ntopics: [auth]\nstatus: active\nrelated: []\n---\n# R\n## 갱신 A\na\n## 기타\nx\n## 갱신 B\nb\n' });
  const rt = renderSection(resolveNote(rep, loadVault(rep), '2025-03-01-r').note, ['갱신']).text;
  assert.match(rt, /2절/);
  assert.ok(rt.includes('## 갱신 A') && rt.includes('## 갱신 B') && !rt.includes('## 기타'));
});

test('없는 제목이면 found=false와 목차', () => {
  const r = renderSection(open('cluster-auth').note, ['없는 절']);
  assert.equal(r.found, false);
  assert.match(r.text, /제목 없음 — 목차:[\s\S]*## 활성 결정/);
});

test('8KB 상한: --from 으로 이어 읽으면 절 전체가 복원된다', () => {
  const body = Array.from({ length: 400 }, (_, i) => `- 항목 ${i} ${'가나다라마바사 '.repeat(4)}`).join('\n');
  const big = makeVault({ ...CLEAN, 'clusters/cluster-big.md': `---\ntype: cluster\ntopic: auth\ncreated: 2025-01-01\nmembers: 0\nstatus: active\nrelated: []\n---\n# 큰 클러스터\n## 활성 결정\n${body}\n## 끝\n` });
  const note = resolveNote(big, loadVault(big), 'cluster-big').note;
  const got = [];
  let from = 0;
  for (let guard = 0; guard < 50; guard++) {
    const r = renderSection(note, ['활성 결정'], { from }).text;
    assert.ok(Buffer.byteLength(r) <= CAP, `page bytes ${Buffer.byteLength(r)}`);
    got.push(...r.split('\n').slice(1).filter((l) => l && !l.startsWith('# next:')));
    const next = r.match(/^# next: --from (\d+)$/m);
    if (!next) { assert.match(r, /complete=true/); break; }
    assert.match(r.split('\n')[0], /complete=false/);
    from = Number(next[1]);
  }
  const h = outline(note).find((x) => x.text === '활성 결정');
  assert.deepEqual(got, note.lines.slice(h.start - 1, h.end).filter(Boolean));
});

test('id는 대소문자를 가리지 않는다', () => {
  assert.equal(open('dec-0005').note.id, 'DEC-0005');
});

test('한 줄이 상한보다 길면 그 줄을 잘라 표시하고 상한을 지킨다', () => {
  const long = 'ㄱ'.repeat(6000);
  const r = makeVault({ ...CLEAN, 'reports/2025-03-02-long.md': `---\ntype: report\ncreated: 2025-03-02\ntopics: [auth]\nstatus: active\nrelated: []\n---\n# L\n## 본문\n${long}\n` });
  const t = renderSection(resolveNote(r, loadVault(r), '2025-03-02-long').note, ['본문']).text;
  assert.ok(Buffer.byteLength(t) <= CAP, `bytes ${Buffer.byteLength(t)}`);
  assert.match(t, /…\(L\d+ 줄이 너무 길어 잘림\)/);
});

test('완료 리포트가 여러 개인 이슈도 이슈를 열고 리포트를 모두 알린다', () => {
  const rep = 'issues/ISS-0001-clarity-재생이-전부-마스킹된다-완료-리포트.md';
  const two = makeVault({ ...CLEAN, 'issues/ISS-0001-clarity-재생이-전부-마스킹된다-2차-리포트.md': CLEAN[rep] });
  const r = resolveNote(two, loadVault(two), 'ISS-0001');
  assert.equal(r.note.type, 'issue');
  assert.ok(r.extra.includes('완료-리포트.md') && r.extra.includes('2차-리포트.md'), r.extra);
});

test('NFD 파일명 노트도 NFC 이름으로 연다', () => {
  const key = 'decisions/DEC-0005-분실물은-축제-기능-뒤로-미룬다.md';
  const { [key]: src, ...rest } = CLEAN;
  const nfd = makeVault({ ...rest, [key.normalize('NFD')]: src });
  assert.equal(resolveNote(nfd, loadVault(nfd), 'DEC-0005-분실물은-축제-기능-뒤로-미룬다').note.id, 'DEC-0005');
});
