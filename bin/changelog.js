#!/usr/bin/env node
'use strict';
// second-brain-template changelog generator — 의존성 0개 (node 내장 모듈만).
// git 태그 + conventional commit 기록으로 CHANGELOG.md를 매 릴리스마다 전체 재생성한다.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 출력에 보일 타입만. docs/chore/refactor/test/ci 는 노이즈라 제외한다.
const SHOWN = { feat: 'Features', fix: 'Fixes', perf: 'Performance' };

// "type(scope)!: subject" → {type, scope, subject} | null (비컨벤션은 null)
function parseCommit(subject) {
  const m = /^(\w+)(?:\(([^)]+)\))?!?:\s+(.+)$/.exec(subject);
  if (!m) return null;
  return { type: m[1], scope: m[2] || null, subject: m[3] };
}

// parse 후 SHOWN 타입만 버킷에 모은다. { feat: [...], fix: [...], perf: [...] }
function bucket(subjects) {
  const out = {};
  for (const s of subjects) {
    const p = parseCommit(s);
    if (!p || !SHOWN[p.type]) continue;
    (out[p.type] = out[p.type] || []).push(p);
  }
  return out;
}

// 버전 섹션 하나 렌더. SHOWN 커밋이 없으면 "" 반환 → 이 버전은 건너뛴다.
function renderVersion(version, date, buckets) {
  const types = Object.keys(SHOWN).filter((t) => buckets[t] && buckets[t].length);
  if (!types.length) return '';
  let s = `## [${version}] — ${date}\n`;
  for (const t of types) {
    s += `\n### ${SHOWN[t]}\n\n`;
    for (const c of buckets[t]) {
      s += `- ${c.scope ? `**${c.scope}:** ` : ''}${c.subject}\n`;
    }
  }
  return s + '\n';
}

// ── git I/O ──────────────────────────────────────────────
function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' });
}
function tags() {
  const out = git(['tag', '--sort=-v:refname']).trim();
  return out ? out.split('\n') : [];
}
function commitsInRange(from, to) {
  const range = from ? `${from}..${to}` : to;
  const out = git(['log', '--no-merges', '--format=%s', range]).trim();
  return out ? out.split('\n') : [];
}
function commitDate(ref) {
  return git(['log', '-1', '--format=%ad', '--date=short', ref]).trim();
}

// 모든 버전 섹션을 최신순으로 만든다. newVersion 은 아직 태그 안 된 대기 릴리스.
function build(newVersion) {
  const tagList = tags(); // 최신 → 과거
  const sections = [];
  if (newVersion) {
    const b = bucket(commitsInRange(tagList[0] || null, 'HEAD'));
    const sec = renderVersion(newVersion, commitDate('HEAD'), b);
    if (sec) sections.push(sec);
  }
  for (let i = 0; i < tagList.length; i++) {
    const b = bucket(commitsInRange(tagList[i + 1] || null, tagList[i]));
    const sec = renderVersion(tagList[i], commitDate(tagList[i]), b);
    if (sec) sections.push(sec);
  }
  return sections;
}

function render(sections) {
  return (
    '# Changelog\n\n' +
    'All notable feature/fix/perf changes, generated from git history by `bin/changelog.js`.\n\n' +
    (sections.join('') || '_No user-facing changes yet._\n')
  );
}

// ── self-check: 순수 함수 로직만 검증 (git 불필요) ────────
function selfcheck() {
  const assert = (c, m) => {
    if (!c) {
      console.error('SELFCHECK FAIL: ' + m);
      process.exit(1);
    }
  };
  assert(parseCommit('feat: add x').type === 'feat', 'feat 파싱');
  assert(parseCommit('fix(cli): y').scope === 'cli', 'scope 파싱');
  assert(parseCommit('feat!: breaking').subject === 'breaking', '! 접미 파싱');
  assert(parseCommit('random text') === null, '비컨벤션은 null');
  assert(!SHOWN[parseCommit('chore(release): v1.2.3').type], 'release 커밋은 출력 제외');
  assert(renderVersion('v1.0.0', '2026-01-01', bucket(['docs: a', 'chore: b'])) === '', 'docs-only 버전은 스킵');
  const r = renderVersion('v1.0.0', '2026-01-01', bucket(['feat: a', 'fix(x): b']));
  assert(r.includes('### Features') && r.includes('**x:** b'), 'feat/fix 렌더');
  console.log('SELFCHECK OK');
}

// ── main ─────────────────────────────────────────────────
const argv = process.argv.slice(2);
if (argv.includes('--selfcheck')) {
  selfcheck();
} else {
  const ni = argv.indexOf('--new');
  const newVersion = ni >= 0 ? argv[ni + 1] : null;
  fs.writeFileSync(path.join(__dirname, '..', 'CHANGELOG.md'), render(build(newVersion)));
  console.log('CHANGELOG.md updated');
}
