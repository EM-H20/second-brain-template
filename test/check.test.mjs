import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadVault, parseDay } from '../second-brain/tools/lib/notes.mjs';
import { check, renderCheck } from '../second-brain/tools/lib/check.mjs';
import { CLEAN, DIRTY, makeVault } from './fixture.mjs';

const run = (files, today = '2025-03-01') => {
  const root = makeVault(files);
  return check(root, loadVault(root), { today: parseDay(today) });
};
const has = (list, code, file, re) => list.some((x) => x.code === code && x.file === file && re.test(x.message));

test('대조군: 깨끗한 볼트는 오류·경고 0, "무결성 이상 없음"', () => {
  const r = run(CLEAN);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings, []);
  assert.equal(renderCheck(r).text, '무결성 이상 없음\n');
});

const d = run(DIRTY, '2025-06-01');

test('E1 frontmatter 없음·허용 밖 문법', () => {
  assert.ok(has(d.errors, 'E1', 'decisions/DEC-0101-no-frontmatter.md', /frontmatter 없음/));
  assert.ok(has(d.errors, 'E1', 'decisions/DEC-0102-bad-yaml.md', /여러 줄 문자열/));
});

test('E2 필수 키 누락·status 어휘·알 수 없는 type', () => {
  assert.ok(has(d.errors, 'E2', 'decisions/DEC-0103-missing-key.md', /필수 키 없음: superseded_by/));
  assert.ok(has(d.errors, 'E2', 'issues/ISS-0101-bad-status.md', /허용되지 않는 status: active/));
  assert.ok(has(d.errors, 'E2', 'docs/DOC-0101-unknown-type.md', /알 수 없는 type: memo/));
});

test('E3 reviewed: 허용되지 않는 타입, created보다 이른 날짜', () => {
  assert.ok(has(d.errors, 'E3', 'issues/ISS-0102-reviewed-on-issue.md', /decision·doc·lesson 전용/));
  assert.ok(has(d.errors, 'E3', 'decisions/DEC-0104-reviewed-before-created.md', /보다 이르다/));
});

test('E4 id 중복·파일명 불일치 (이슈+완료 리포트는 허용)', () => {
  assert.ok(has(d.errors, 'E4', 'decisions/DEC-0105-dup-a.md', /id 중복: DEC-0105/));
  assert.ok(has(d.errors, 'E4', 'decisions/DEC-0105-dup-b.md', /id 중복: DEC-0105/));
  assert.ok(has(d.errors, 'E4', 'decisions/DEC-0106-mismatch.md', /파일명 id\(DEC-0106\)와 frontmatter id\(DEC-0107\)/));
  assert.ok(!run(CLEAN).errors.some((x) => x.code === 'E4'));
  const staged = run({ ...CLEAN, 'issues/ISS-0001-clarity-재생이-전부-마스킹된다-2차-리포트.md': CLEAN['issues/ISS-0001-clarity-재생이-전부-마스킹된다-완료-리포트.md'] });
  assert.ok(!staged.errors.some((x) => x.code === 'E4'), '이슈 하나에 완료 리포트 여러 개는 허용');
});

test('E5 끊긴 링크 (frontmatter 링크 필드)', () => {
  assert.ok(has(d.errors, 'E5', 'decisions/DEC-0108-dangling.md', /\[\[DEC-9999-nowhere\]\]/));
});

test('E6 supersede 비대칭·후속 없는 superseded', () => {
  assert.ok(has(d.errors, 'E6', 'decisions/DEC-0109-old.md', /비대칭: DEC-0110의 supersedes가 DEC-0109가 아님/));
  assert.ok(has(d.errors, 'E6', 'decisions/DEC-0111-orphan-superseded.md', /superseded_by 없음/));
});

test('E7 어휘에 없는 토픽, W8 없는 source 파일(원본은 로컬 전용이라 경고)', () => {
  assert.ok(has(d.errors, 'E7', 'decisions/DEC-0112-unknown-topic.md', /nonexistent/));
  assert.ok(has(d.warnings, 'W8', 'issues/ISS-0103-missing-source.md', /_sources\/issues\/nope\.md/));
  assert.ok(!d.errors.some((x) => x.file === 'issues/ISS-0103-missing-source.md'));
});

test('W9 안 쓰는 슬러그, W10 클러스터 정합', () => {
  assert.ok(has(d.warnings, 'W9', 'clusters/_topics.md', /unused-slug/));
  assert.ok(has(d.warnings, 'W10', 'clusters/cluster-auth.md', /members 99 ≠ 실제/));
  const noReports = run({ ...CLEAN, 'clusters/cluster-analytics.md': CLEAN['clusters/cluster-analytics.md'].replace('members: 4', 'members: 3') });
  assert.ok(!noReports.warnings.some((x) => x.code === 'W10'), '완료 리포트를 세지 않는 관례도 허용');
  assert.ok(has(d.warnings, 'W10', 'clusters/cluster-auth.md', /index\.md에 링크되지 않은/));
  assert.ok(has(d.warnings, 'W10', 'clusters/cluster-auth--legacy.md', /부모\(cluster-auth\)에서 링크되지 않은/));
  assert.ok(has(d.warnings, 'W10', 'clusters/cluster-auth.md', /하위 클러스터\(cluster-auth--legacy\) 멤버를 다시 나열: \[\[DEC-0103-missing-key\]\]/));
  assert.ok(has(d.warnings, 'W10', 'decisions/DEC-0113-no-cluster.md', /어느 클러스터에도/));
});

test('W11 클러스터 형태: 크기·서술형 갱신 절·비대 요약·오래된 요약', () => {
  const f = 'clusters/cluster-auth.md';
  assert.ok(has(d.warnings, 'W11', f, /KB > 12KB/));
  assert.ok(has(d.warnings, 'W11', f, /서술형 「갱신」 절 1개/));
  assert.ok(has(d.warnings, 'W11', f, /「현재 상태 요약」 .*KB > 4KB/));
  assert.ok(has(d.warnings, 'W11', f, /\(2024-12-01\)이 최신 멤버\(2025-\d\d-\d\d\)보다 오래됨/));
});

test('W12 리뷰 후보', () => {
  assert.ok(has(d.warnings, 'W12', 'decisions/DEC-0114-stale.md', /마지막 확인 17개월 전/));
});

test('출력: 항목별로 묶고 끝에 합계, 파일 한정 모드', () => {
  const out = renderCheck(d).text;
  assert.match(out, /^## 오류\nE1 frontmatter \(2\)/);
  assert.match(out, /errors \d+ · warnings \d+\n$/);
  const one = renderCheck(d, new Set(['decisions/DEC-0108-dangling.md']));
  assert.equal(one.errors.length, 1);
  assert.equal(one.errors[0].code, 'E5');
});

test('index.md가 없어도 멈추지 않고, index 링크 경고만 건너뛴다', () => {
  const { 'index.md': _drop, ...noIndex } = CLEAN;
  const r = run(noIndex);
  assert.deepEqual(r.errors, []);
  assert.ok(!r.warnings.some((x) => /index\.md/.test(x.message)));
});

test('별칭·제목·경로가 붙은 wikilink도 대상 이름으로 해석한다', () => {
  const src = CLEAN['decisions/DEC-0005-분실물은-축제-기능-뒤로-미룬다.md'].replace(
    'related: ["[[2025-01-02-kickoff]]"]',
    'related: ["[[2025-01-02-kickoff|킥오프]]", "[[meetings/2025-01-02-kickoff#요약]]"]');
  const r = run({ ...CLEAN, 'decisions/DEC-0005-분실물은-축제-기능-뒤로-미룬다.md': src });
  assert.ok(!r.errors.some((x) => x.code === 'E5'), JSON.stringify(r.errors));
});

test('필수 키가 비어 있거나 created가 실제 날짜가 아니면 오류', () => {
  const k5 = 'decisions/DEC-0005-분실물은-축제-기능-뒤로-미룬다.md';
  const k6 = 'decisions/DEC-0006-clarity로-공개-화면-재생을-기록한다.md';
  const k3 = 'decisions/DEC-0003-로그인-없이-서버-발급-쿠키-토큰으로-식별한다.md';
  const r = run({ ...CLEAN,
    [k5]: CLEAN[k5].replace('status: active        # active | superseded | archived', 'status:'),
    [k6]: CLEAN[k6].replace('created: 2025-02-10', 'created: YYYY-MM-DD'),
    [k3]: CLEAN[k3].replace('created: 2025-02-01', 'created: 2025-02-30') });
  assert.ok(has(r.errors, 'E2', k5, /필수 키 비어 있음: status/));
  assert.ok(has(r.errors, 'E2', k6, /created 날짜 형식 오류/));
  assert.ok(has(r.errors, 'E2', k3, /created 날짜 형식 오류/));
});

test('「현재 상태 요약」 안의 ### 소제목까지 요약 크기로 잰다', () => {
  const k = 'clusters/cluster-lost-items.md';
  const big = CLEAN[k].replace('분실물은 축제 기능 뒤로 미뤘다.\n', `분실물은 축제 기능 뒤로 미뤘다.\n\n### 배경\n${'배경 설명이 길어진다.\n'.repeat(200)}`);
  assert.ok(has(run({ ...CLEAN, [k]: big }).warnings, 'W11', k, /「현재 상태 요약」 .*KB > 4KB/));
});

test('_sources·_templates 에만 있는 이름으로의 링크는 끊긴 링크', () => {
  const k = 'decisions/DEC-0005-분실물은-축제-기능-뒤로-미룬다.md';
  const r = run({ ...CLEAN, '_sources/docs/DOC-0009-삭제된-문서.md': '원본\n',
    [k]: CLEAN[k].replace('related: ["[[2025-01-02-kickoff]]"]', 'related: ["[[DOC-0009-삭제된-문서]]"]') });
  assert.ok(has(r.errors, 'E5', k, /DOC-0009-삭제된-문서/));
});

test('NFD 파일명으로의 NFC 링크는 끊긴 링크가 아니다', () => {
  const key = 'meetings/2025-01-02-kickoff.md';
  const k5 = 'decisions/DEC-0005-분실물은-축제-기능-뒤로-미룬다.md';
  const { [k5]: src, ...rest } = CLEAN;
  const r = run({ ...rest, [k5.normalize('NFD')]: src });
  assert.ok(!r.errors.some((x) => x.code === 'E5'), JSON.stringify(r.errors));
  assert.ok(Object.keys(CLEAN).includes(key));
});

test('YAML이 거부하는 frontmatter(흐름 목록 뒤 블록 항목)는 E1', () => {
  const k = 'decisions/DEC-0005-분실물은-축제-기능-뒤로-미룬다.md';
  const r = run({ ...CLEAN, [k]: CLEAN[k].replace('related: ["[[2025-01-02-kickoff]]"]', 'related: []\n  - "[[2025-01-02-kickoff]]"') });
  assert.ok(has(r.errors, 'E1', k, /블록 항목/));
});
