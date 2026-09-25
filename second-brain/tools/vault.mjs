#!/usr/bin/env node
// second-brain-template 볼트 코어 도구 — 에이전트용 (사용자는 자연어만 쓴다). 의존성 0개.
// 읽기 전용: 어떤 명령도 노트를 수정하지 않는다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadVault, todayUTC } from './lib/notes.mjs';
import { search } from './lib/search.mjs';
import { renderSection, resolveNote } from './lib/section.mjs';
import { check, renderCheck } from './lib/check.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const USAGE = `usage: node second-brain/tools/vault.mjs <command> [...]
  search <키워드...> [--type T] [--topic S] [--status S] [--all] [--offset N]
      frontmatter 필터 → 순위. 사용자 질문 원문 대신 핵심 키워드 1–3개를 넣는다
  section <노트> [제목...] [--from 줄]
      제목 없이: 목차. 제목(부분 일치)을 주면 그 절만. <노트> = 경로 | 파일 이름 | id
  check [파일...] [--json]
      무결성 검사(읽기 전용). 오류가 있으면 종료 코드 1
공통: --vault <dir> (기본: 이 스크립트 기준 ../../knowledge), --today YYYY-MM-DD
`;
const FLAGS = new Set(['all', 'json', 'help']);

function parseArgs(argv) {
  const pos = [];
  const opt = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { pos.push(a); continue; }
    const k = a.slice(2);
    if (FLAGS.has(k)) opt[k] = true;
    else if (i + 1 < argv.length) opt[k] = argv[++i];
    else throw new Error(`--${k} 값 없음`);
  }
  return { pos, opt };
}

function main(argv) {
  const { pos, opt } = parseArgs(argv);
  const [cmd, ...args] = pos;
  if (opt.help) { process.stdout.write(USAGE); return 0; }
  if (!cmd) { process.stderr.write(USAGE); return 2; }
  const root = path.resolve(opt.vault ?? path.join(HERE, '..', '..', 'knowledge'));
  if (!fs.existsSync(root)) { process.stderr.write(`볼트 없음: ${root}\n`); return 2; }
  const today = todayUTC(opt);
  const notes = loadVault(root);
  if (cmd === 'search') {
    process.stdout.write(search(notes, args.join(' '), { ...opt, today }).text);
    return 0;
  }
  if (cmd === 'section') {
    if (!args.length) { process.stderr.write(USAGE); return 2; }
    const r = resolveNote(root, notes, args[0]);
    if (r.error) {
      process.stdout.write(r.error === 'not-found' ? `# 노트 없음: ${args[0]}\n` : `# 여러 노트가 걸림: ${args[0]}\n${r.candidates.map((c) => `  ${c}`).join('\n')}\n`);
      return 2;
    }
    const s = renderSection(r.note, args.slice(1), opt);
    process.stdout.write((r.extra ? `# ${r.extra}\n` : '') + s.text);
    return s.found ? 0 : 1;
  }
  if (cmd === 'check') {
    // 볼트 안에서 찾지 못한 파일을 조용히 걸러내면 "이상 없음"이 거짓으로 나온다 — 오류로 멈춘다
    const files = args.length ? new Set(args.map((f) => {
      const abs = [path.resolve(f), path.resolve(root, f)].find((p) => fs.existsSync(p));
      if (!abs) throw new Error(`파일 없음: ${f}`);
      const rel = path.relative(root, abs).split(path.sep).join('/');
      if (rel.startsWith('..')) throw new Error(`볼트 밖 파일: ${f}`);
      return rel;
    })) : null;
    const r = renderCheck(check(root, notes, { today }), files);
    process.stdout.write(opt.json ? JSON.stringify({ errors: r.errors, warnings: r.warnings }, null, 2) + '\n' : r.text);
    return r.errors.length ? 1 : 0;
  }
  process.stderr.write(`알 수 없는 명령: ${cmd}\n${USAGE}`);
  return 2;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (e) {
  process.stderr.write(`vault.mjs 오류: ${e.message}\n`);
  process.exitCode = 2;
}
