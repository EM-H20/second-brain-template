// second-brain-template 볼트 노트 모델 — 순회, frontmatter 파서, status 해석. 의존성 0개.
//
// frontmatter 는 템플릿이 쓰는 YAML 부분집합만 받는다 (스키마가 STRICT 이므로 엄격한 쪽이 맞다):
// 스칼라, "큰따옴표"(JSON 이스케이프), '작은따옴표'('' 이스케이프), null·~·빈 값,
// [흐름, 목록], 값이 빈 키 다음 줄의 "- 항목" 블록 목록, " # 주석".
// 실제 YAML 파서가 거부하는 모양(": "가 든 평문, `·@·*로 시작하는 값, 흐름 목록 뒤 블록 항목 등)은 오류로 본다.
import fs from 'node:fs';
import path from 'node:path';

const SKIP_DIRS = new Set(['_sources', '_templates', '_bases']);
export const OPS_FILES = new Set(['index.md', 'log.md', 'README.md', '_topics.md']);
const FOLDER_TYPE = {
  meetings: 'meeting', decisions: 'decision', issues: 'issue', docs: 'doc',
  reports: 'report', clusters: 'cluster', lessons: 'lesson',
};
export const LIFECYCLE_TYPES = new Set(['decision', 'doc', 'lesson']);

// 폴더를 읽지 못하면 조용히 건너뛰지 않는다 — "없음"으로 보고되면 거짓 결과가 된다.
// 심볼릭 링크 폴더는 따라가되, 이미 본 실제 경로는 다시 들어가지 않는다(순환 방지).
function walk(dir, keep, out = [], seen = new Set()) {
  const real = fs.realpathSync(dir);
  if (seen.has(real)) return out;
  seen.add(real);
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) {
    if (e.code === 'ENOENT') return out;
    throw e;
  }
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    let isDir = e.isDirectory();
    let isFile = e.isFile();
    if (e.isSymbolicLink()) {
      try { const st = fs.statSync(p); isDir = st.isDirectory(); isFile = st.isFile(); } catch { continue; } // 끊긴 링크
    }
    if (isDir) { if (keep.dir(e.name)) walk(p, keep, out, seen); }
    else if (isFile && e.name.endsWith('.md') && keep.file(e.name)) out.push(p);
  }
  return out;
}

// 검색·검사 대상 콘텐츠 노트 (원본·템플릿·Bases·운영 파일 제외)
export function listNoteFiles(root) {
  return walk(root, { dir: (d) => !SKIP_DIRS.has(d), file: (f) => !OPS_FILES.has(f) }).sort();
}

// wikilink 해석용: 원본·템플릿·Bases 를 뺀 모든 .md 이름(NFC) — 원본의 같은 이름 사본으로 끊긴 링크가 가려지지 않게
export function listAllNames(root) {
  return new Set(walk(root, { dir: (d) => !SKIP_DIRS.has(d), file: () => true }).map((f) => path.basename(f, '.md').normalize('NFC')));
}

const QUOTE_HINT = '따옴표로 감쌀 것';

// 평문 스칼라: YAML이 거부하는 모양은 거부한다(따옴표 안내), 지원하지 않는 문법도 거부한다
function plain(v, flow) {
  if (v === '' || v === 'null' || v === '~') return null;
  if (/^[&!]/.test(v)) throw new Error('앵커·태그는 지원하지 않음');
  if (/^[|>]/.test(v)) throw new Error('여러 줄 문자열은 지원하지 않음');
  if (v[0] === '{') throw new Error('중첩 맵은 지원하지 않음');
  if (/^[`@%*]/.test(v)) throw new Error(`"${v[0]}"로 시작하는 값은 ${QUOTE_HINT}`);
  if (/^[-?:](\s|$)/.test(v)) throw new Error(`"${v[0]} "로 시작하는 값은 ${QUOTE_HINT}`);
  if (/:(\s|$)/.test(v)) throw new Error(`": "가 들었거나 ":"로 끝나는 값은 ${QUOTE_HINT}`);
  if (flow && /[[\]{}]/.test(v)) throw new Error(`괄호가 든 목록 항목은 ${QUOTE_HINT}`);
  return v;
}

// s[i] 의 따옴표로 시작하는 문자열 → [값, 닫는 따옴표 다음 위치]
function quoted(s, i) {
  if (s[i] === '"') {
    let j = i + 1;
    while (j < s.length && s[j] !== '"') j += s[j] === '\\' ? 2 : 1;
    if (j >= s.length) throw new Error('닫히지 않은 큰따옴표');
    try { return [JSON.parse(s.slice(i, j + 1)), j + 1]; } catch { throw new Error('큰따옴표 안의 이스케이프를 해석할 수 없음'); }
  }
  let out = '';
  for (let j = i + 1; j < s.length; j++) {
    if (s[j] !== "'") { out += s[j]; continue; }
    if (s[j + 1] === "'") { out += "'"; j++; continue; }
    return [out, j + 1];
  }
  throw new Error('닫히지 않은 작은따옴표');
}

// s[0] === '[' → [목록, 닫는 괄호 다음 위치]. 따옴표는 항목 첫 글자일 때만 따옴표다
function flowList(s) {
  const out = [];
  let i = 1;
  const ws = () => { while (i < s.length && /\s/.test(s[i])) i++; };
  ws();
  if (s[i] === ']') return [out, i + 1];
  for (;;) {
    ws();
    if (i >= s.length) throw new Error('닫히지 않은 목록');
    const c = s[i];
    if (c === ',') throw new Error('빈 목록 항목');
    if (c === ']') return [out, i + 1];
    if (c === '"' || c === "'") {
      const [v, j] = quoted(s, i);
      out.push(v);
      i = j;
    } else if (c === '[' || c === '{') {
      throw new Error(`wikilink·중첩 목록은 ${QUOTE_HINT} ("[[노트]]")`);
    } else {
      let j = i;
      while (j < s.length && s[j] !== ',' && s[j] !== ']') j++;
      if (j >= s.length) throw new Error('닫히지 않은 목록');
      const raw = s.slice(i, j).trimEnd();
      if (/\s#/.test(raw)) throw new Error(`" #"이 든 목록 항목은 ${QUOTE_HINT}`);
      out.push(plain(raw, true));
      i = j;
    }
    ws();
    if (s[i] === ',') { i++; continue; }
    if (s[i] === ']') return [out, i + 1];
    throw new Error(`목록 항목 뒤에는 쉼표나 ]가 와야 함 — ${QUOTE_HINT}`);
  }
}

// 키 뒤(또는 "- " 뒤)의 값 → { value, kind: 'empty' | 'scalar' | 'flow' }
function parseValue(raw) {
  const s = raw.trim();
  if (s === '' || s[0] === '#') return { value: null, kind: 'empty' };
  if (s[0] === '"' || s[0] === "'") {
    const [v, j] = quoted(s, 0);
    if (s.slice(j).trim() && !/^\s+#/.test(s.slice(j))) throw new Error(`닫는 따옴표 뒤에 값이 더 있음 — ${QUOTE_HINT}`);
    return { value: v, kind: 'scalar' };
  }
  if (s[0] === '[') {
    const [v, j] = flowList(s);
    if (s.slice(j).trim() && !/^\s+#/.test(s.slice(j))) throw new Error('닫는 괄호 뒤에 값이 더 있음');
    return { value: v, kind: 'flow' };
  }
  const m = s.match(/\s#/);
  return { value: plain((m ? s.slice(0, m.index) : s).trimEnd(), false), kind: 'scalar' };
}

// lines: 파일 전체 줄 배열. 반환: { fm, bodyStart(0-based 줄 번호), err }
export function parseFrontmatter(lines) {
  if (lines[0]?.trimEnd() !== '---') return { fm: null, bodyStart: 0, err: 'frontmatter 없음' };
  const end = lines.findIndex((l, i) => i > 0 && l.trimEnd() === '---');
  if (end < 0) return { fm: null, bodyStart: 0, err: 'frontmatter가 닫히지 않음' };
  const fm = {};
  let last = null;
  let lastKind = null;
  for (let i = 1; i < end; i++) {
    const line = lines[i];
    const t = line.trim();
    if (!t || t[0] === '#') continue;
    try {
      if (/^[ \t]*\t/.test(line)) throw new Error('탭 들여쓰기는 YAML에서 허용되지 않음');
      const kv = line.match(/^([A-Za-z_][\w-]*):(?:[ \t]+(.*))?$/);
      if (kv) {
        last = kv[1];
        const { value, kind } = parseValue(kv[2] ?? '');
        fm[last] = value;
        lastKind = kind;
        continue;
      }
      const item = line.match(/^ *-(?: +(.*))?$/);
      if (item && last) {
        if (lastKind === 'flow' || lastKind === 'scalar') throw new Error('블록 항목(- ...)은 값이 빈 키 아래에만 올 수 있음');
        const { value, kind } = parseValue(item[1] ?? '');
        if (kind === 'empty') throw new Error('빈 목록 항목');
        if (kind === 'flow') throw new Error('중첩 목록은 지원하지 않음');
        if (!Array.isArray(fm[last])) fm[last] = [];
        fm[last].push(value);
        lastKind = 'block';
        continue;
      }
      throw new Error('허용되지 않는 문법 (여러 줄 값·중첩 맵 등)');
    } catch (e) {
      return { fm: null, bodyStart: end + 1, err: `L${i + 1}: ${e.message} — ${t.slice(0, 60)}` };
    }
  }
  return { fm, bodyStart: end + 1, err: null };
}

export function readNote(root, abs) {
  const text = fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const lines = text.split('\n');
  const { fm, bodyStart, err } = parseFrontmatter(lines);
  const file = path.relative(root, abs).split(path.sep).join('/').normalize('NFC');
  const base = path.basename(abs, '.md').normalize('NFC');
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
// 형식과 달력 모두 맞아야 한다 (2025-02-30 → null)
export function parseDay(s) {
  const v = s == null ? '' : String(s);
  if (!DAY_RE.test(v)) return null;
  const [y, m, d] = [+v.slice(0, 4), +v.slice(5, 7), +v.slice(8, 10)];
  const t = Date.UTC(y, m - 1, d);
  const back = new Date(t);
  return back.getUTCFullYear() === y && back.getUTCMonth() === m - 1 && back.getUTCDate() === d ? t : null;
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
