#!/usr/bin/env node
// second-brain-template 볼트 코어 도구 — 에이전트용 (사용자는 자연어만 쓴다). 의존성 0개.
// 읽기 전용: 어떤 명령도 노트를 수정하지 않는다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadVault, todayUTC } from './lib/notes.mjs';
import { search } from './lib/search.mjs';
import { renderSection, resolveNote } from './lib/section.mjs';
import { STATUS, check, renderCheck } from './lib/check.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const USAGE = `usage: node second-brain/tools/vault.mjs <command> [...]
  search <키워드...> [--type T] [--topic S] [--status S] [--all] [--offset N]
      frontmatter 필터 → 순위. 사용자 질문 원문 대신 핵심 키워드 1–3개를 넣는다.
      archived 는 기본 제외 — --all 로 포함 (--status archived 는 그것만)
  section <노트> [제목...] [--from 줄]
      제목 없이: 목차. 제목(부분 일치)을 주면 그 절만. <노트> = 경로 | 파일 이름 | id
  check [파일...] [--json]
      무결성 검사(읽기 전용). 파일은 콘텐츠 노트·index.md·clusters/_topics.md
공통: --vault <dir> (기본: 이 스크립트 기준 ../../knowledge), --today YYYY-MM-DD, --key=value 도 된다
종료 코드: 0 정상 · 1 check 오류 발견 또는 section 제목 없음 · 2 도구 실패(사용법·잘못된 인자·볼트나 노트 없음) — 2일 때만 손 검색으로 돌아간다
`;
const FLAGS = new Set(['all', 'json', 'help']);
const VALUED = new Set(['type', 'topic', 'status', 'offset', 'from', 'vault', 'today']);
const TYPES = Object.keys(STATUS);
const STATUSES = [...new Set(Object.values(STATUS).flat())];

// 잘못 쓴 인자를 조용히 무시하면 결과가 틀려도 알 수 없다 — 전부 오류로 멈춘다
function parseArgs(argv) {
  const pos = [];
  const opt = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { pos.push(a); continue; }
    const eq = a.indexOf('=');
    const k = eq < 0 ? a.slice(2) : a.slice(2, eq);
    if (FLAGS.has(k)) { if (eq >= 0) throw new Error(`--${k} 는 값을 받지 않음`); opt[k] = true; continue; }
    if (!VALUED.has(k)) throw new Error(`모르는 옵션: --${k}`);
    const v = eq < 0 ? argv[++i] : a.slice(eq + 1);
    if (v === undefined || v === '' || v.startsWith('--')) throw new Error(`--${k} 값 없음`);
    opt[k] = v;
  }
  if (opt.type && !TYPES.includes(opt.type)) throw new Error(`--type 은 ${TYPES.join('|')} 중 하나`);
  if (opt.status && !STATUSES.includes(opt.status)) throw new Error(`--status 는 ${STATUSES.join('|')} 중 하나`);
  for (const k of ['offset', 'from']) if (opt[k] !== undefined && !/^\d+$/.test(opt[k])) throw new Error(`--${k} 는 0 이상의 정수`);
  return { pos, opt };
}

function main(argv) {
  const { pos, opt } = parseArgs(argv);
  const [cmd, ...args] = pos;
  if (opt.help) { process.stdout.write(USAGE); return 0; }
  if (!cmd) { process.stderr.write(USAGE); return 2; }
  const root = path.resolve(opt.vault ?? path.join(HERE, '..', '..', 'knowledge'));
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) { process.stderr.write(`볼트 폴더 없음: ${root}\n`); return 2; }
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
    // 검사 대상이 아닌 인자를 조용히 걸러내면 "이상 없음"이 거짓으로 나온다 — 전부 오류로 멈춘다
    const known = new Set([...notes.map((n) => n.file), 'index.md', 'clusters/_topics.md']);
    const realRoot = fs.realpathSync(root);
    const files = args.length ? new Set(args.map((f) => {
      const abs = [path.resolve(f), path.resolve(root, f)].find((p) => fs.existsSync(p));
      if (!abs) throw new Error(`파일 없음: ${f}`);
      if (!fs.statSync(abs).isFile()) throw new Error(`파일이 아님: ${f}`);
      const rel = path.relative(realRoot, fs.realpathSync(abs)).split(path.sep).join('/').normalize('NFC');
      if (path.isAbsolute(rel) || rel.startsWith('..')) throw new Error(`볼트 밖 파일: ${f}`);
      if (!known.has(rel)) throw new Error(`검사 대상 노트가 아님: ${f} (콘텐츠 노트·index.md·clusters/_topics.md 만, 경로의 대소문자까지 정확히)`);
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
