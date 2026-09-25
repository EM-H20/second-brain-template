// second-brain-template 볼트 노트 모델 — 순회, frontmatter 파서, status 해석. 의존성 0개.
//
// frontmatter 는 템플릿이 쓰는 YAML 부분집합만 받는다 (스키마가 STRICT 이므로 엄격한 쪽이 맞다):
// 스칼라, "큰따옴표"(JSON 이스케이프), '작은따옴표'('' 이스케이프), null·~·빈 값,
// [흐름, 목록], 다음 줄의 "- 항목" 블록 목록, 따옴표 밖의 " # 주석".
import fs from 'node:fs';
import path from 'node:path';

const SKIP_DIRS = new Set(['_sources', '_templates', '_bases']);
export const OPS_FILES = new Set(['index.md', 'log.md', 'README.md', '_topics.md']);
const FOLDER_TYPE = {
  meetings: 'meeting', decisions: 'decision', issues: 'issue', docs: 'doc',
  reports: 'report', clusters: 'cluster', lessons: 'lesson',
};
export const LIFECYCLE_TYPES = new Set(['decision', 'doc', 'lesson']);

function walk(dir, keep, out = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (keep.dir(e.name)) walk(p, keep, out); }
    else if (e.name.endsWith('.md') && keep.file(e.name)) out.push(p);
  }
  return out;
}

// 검색·검사 대상 콘텐츠 노트 (원본·템플릿·Bases·운영 파일 제외)
export function listNoteFiles(root) {
  return walk(root, { dir: (d) => !SKIP_DIRS.has(d), file: (f) => !OPS_FILES.has(f) }).sort();
}

// wikilink 해석용: knowledge/ 아래 모든 .md 이름
export function listAllNames(root) {
  return new Set(walk(root, { dir: () => true, file: () => true }).map((f) => path.basename(f, '.md')));
}

function stripComment(s) {
  let q = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '\\' && q === '"') { i++; continue; }
      if (c === q) q = null;
      continue;
    }
    if (c === '"' || c === "'") q = c;
    else if (c === '#' && (i === 0 || /\s/.test(s[i - 1]))) return s.slice(0, i).trimEnd();
  }
  return s.trimEnd();
}

function scalar(raw) {
  const v = raw.trim();
  if (v === '' || v === 'null' || v === '~') return null;
  if (v[0] === '"') {
    if (v.length < 2 || v.at(-1) !== '"') throw new Error('닫히지 않은 큰따옴표');
    return JSON.parse(v);
  }
  if (v[0] === "'") {
    if (v.length < 2 || v.at(-1) !== "'") throw new Error('닫히지 않은 작은따옴표');
    return v.slice(1, -1).replaceAll("''", "'");
  }
  if (/^[|>]/.test(v)) throw new Error('여러 줄 문자열은 지원하지 않음');
  if (v[0] === '{') throw new Error('중첩 맵은 지원하지 않음');
  return v;
}

function flowList(v) {
  const out = [];
  let cur = '';
  let q = null;
  const inner = v.slice(1, -1);
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if (q) {
      cur += c;
      if (c === '\\' && q === '"') { cur += inner[++i] ?? ''; continue; }
      if (c === q) q = null;
      continue;
    }
    if (c === '"' || c === "'") { q = c; cur += c; continue; }
    if (c === '[' || c === '{') throw new Error('중첩 목록은 지원하지 않음');
    if (c === ',') { if (cur.trim()) out.push(scalar(cur)); cur = ''; continue; }
    cur += c;
  }
  if (q) throw new Error('닫히지 않은 따옴표');
  if (cur.trim()) out.push(scalar(cur));
  return out;
}

// lines: 파일 전체 줄 배열. 반환: { fm, bodyStart(0-based 줄 번호), err }
export function parseFrontmatter(lines) {
  if (lines[0]?.trimEnd() !== '---') return { fm: null, bodyStart: 0, err: 'frontmatter 없음' };
  const end = lines.findIndex((l, i) => i > 0 && l.trimEnd() === '---');
  if (end < 0) return { fm: null, bodyStart: 0, err: 'frontmatter가 닫히지 않음' };
  const fm = {};
  let last = null;
  for (let i = 1; i < end; i++) {
    const line = stripComment(lines[i]);
    if (!line.trim()) continue;
    try {
      const kv = line.match(/^([A-Za-z_][\w-]*):(?:\s+(.*))?$/);
      if (kv) {
        last = kv[1];
        const v = (kv[2] ?? '').trim();
        if (v.startsWith('[')) {
          if (!v.endsWith(']')) throw new Error('닫히지 않은 목록');
          fm[last] = flowList(v);
        } else fm[last] = scalar(v);
        continue;
      }
      const item = line.match(/^\s*-\s+(.*)$/);
      if (item && last && (fm[last] === null || Array.isArray(fm[last]))) {
        if (!Array.isArray(fm[last])) fm[last] = [];
        fm[last].push(scalar(item[1]));
        continue;
      }
      throw new Error('허용되지 않는 문법');
    } catch (e) {
      return { fm: null, bodyStart: end + 1, err: `L${i + 1}: ${e.message} — ${lines[i].trim().slice(0, 60)}` };
    }
  }
  return { fm, bodyStart: end + 1, err: null };
}

export function readNote(root, abs) {
  const text = fs.readFileSync(abs, 'utf8').replace(/\r\n/g, '\n');
  const lines = text.split('\n');
  const { fm, bodyStart, err } = parseFrontmatter(lines);
  const file = path.relative(root, abs).split(path.sep).join('/');
  const base = path.basename(abs, '.md');
  const folderType = FOLDER_TYPE[file.split('/')[0]] ?? null;
  const h1 = lines.slice(bodyStart).find((l) => /^#\s+\S/.test(l));
  return {
    file, abs, base, lines, bodyStart, err, fm,
    type: fm?.type ?? folderType,
    status: fm?.status ?? null,
    id: fm?.id ? String(fm.id) : null,
    title: h1 ? h1.replace(/^#\s+/, '').trim() : base,
    bytes: Buffer.byteLength(text),
  };
}

export function loadVault(root) {
  return listNoteFiles(root).map((abs) => readNote(root, abs));
}

export const asList = (v) => (v == null ? [] : Array.isArray(v) ? v.map(String) : [String(v)]);

// id → 노트 (supersede 체인용: decision·doc·lesson)
export function lifecycleIndex(notes) {
  const m = new Map();
  for (const n of notes) if (n.id && LIFECYCLE_TYPES.has(n.type) && !m.has(n.id)) m.set(n.id, n);
  return m;
}

// superseded_by 체인의 끝 (순환·끊김 방어)
export function latestOf(note, index) {
  let n = note;
  const seen = new Set();
  while (n.fm?.superseded_by && !seen.has(n.id)) {
    seen.add(n.id);
    const next = index.get(String(n.fm.superseded_by));
    if (!next) break;
    n = next;
  }
  return n;
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
export function parseDay(s) {
  const v = s == null ? '' : String(s);
  return DAY_RE.test(v) ? Date.UTC(+v.slice(0, 4), +v.slice(5, 7) - 1, +v.slice(8, 10)) : null;
}
export function todayUTC(opt = {}) {
  if (opt.today) {
    const t = parseDay(opt.today);
    if (t === null) throw new Error(`--today 형식 오류: ${opt.today} (YYYY-MM-DD)`);
    return t;
  }
  const d = new Date();
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}
function addMonths(t, m) {
  const d = new Date(t);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + m, d.getUTCDate());
}

// 「오래됨」: active decision·doc·lesson 이고 오늘 > max(created, reviewed) + 3개월 → 경과 개월 수, 아니면 0
export function staleMonths(note, today) {
  const fm = note.fm;
  if (!fm || fm.status !== 'active' || !LIFECYCLE_TYPES.has(fm.type)) return 0;
  const days = [fm.created, fm.reviewed].map(parseDay).filter((x) => x !== null);
  if (!days.length) return 0;
  const ref = Math.max(...days);
  if (today <= addMonths(ref, 3)) return 0;
  let m = 3;
  while (addMonths(ref, m + 1) <= today) m++;
  return m;
}
