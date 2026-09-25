// second-brain-template 볼트 검색 — frontmatter 필터 → BM25 순위 → 8KB 상한 출력. 의존성 0개.
// 토크나이저 방식은 lpaiu-cs/osk-system 에서 차용 (MIT, Copyright (c) 2026 lpaiu-cs)
import { asList, latestOf, lifecycleIndex, staleMonths } from './notes.mjs';

export const CAP = 8192;
const KEY_WEIGHT = 3;
const HINT_SENTENCE = '# hint: 문장 대신 핵심 키워드 1–3개와 --type 을 쓰면 정확해진다';
const HINT_EMPTY = '# hint: 결과 없음 — 키워드를 줄이거나 --type/--topic/--status 를 빼 보라';

// 소문자화 → 글자·숫자·_ 외는 공백 → 영숫자 단어는 통째로, 그 밖(한글 등)은 두 글자씩 겹쳐 자른다
export function tokens(s) {
  const out = [];
  for (const w of String(s ?? '').toLowerCase().replace(/[^\p{L}\p{N}_]+/gu, ' ').split(/\s+/)) {
    if (!w) continue;
    if (/^[a-z0-9_]+$/.test(w) || w.length === 1) out.push(w);
    else for (let i = 0; i < w.length - 1; i++) out.push(w.slice(i, i + 2));
  }
  return out;
}

function looksLikeSentence(query, q) {
  return q.length > 12 || /[?？]\s*$|(요|까|니|냐|죠)\s*$/.test(query.trim());
}

function passesFilter(n, opt) {
  if (opt.type && n.type !== opt.type) return false;
  if (opt.status && n.status !== opt.status) return false;
  if (!opt.all && n.status === 'archived') return false;
  if (opt.topic && ![...asList(n.fm?.topics), ...asList(n.fm?.topics_ref), ...asList(n.fm?.topic)].includes(opt.topic)) return false;
  return true;
}

function docTokens(n) {
  const fm = n.fm ?? {};
  const key = [n.id ?? '', n.title, ...asList(fm.topics), ...asList(fm.symptoms), fm.trigger ?? '', fm.root_cause ?? ''].join(' ');
  const keyToks = tokens(key);
  const all = [];
  for (let i = 0; i < KEY_WEIGHT; i++) all.push(...keyToks);
  all.push(...tokens(asList(fm.topics_ref).join(' ')));
  all.push(...tokens(n.lines.slice(n.bodyStart).join('\n')));
  const tf = new Map();
  for (const t of all) tf.set(t, (tf.get(t) || 0) + 1);
  return { tf, len: all.length };
}

function statusLabel(n, index, today) {
  if (n.err) return `broken(${n.err.split(' — ')[0]})`;
  let s = n.status ?? '?';
  if (n.status === 'superseded') {
    const last = latestOf(n, index);
    if (last !== n) s += ` → ${last.id} (${last.status})`;
  }
  const m = staleMonths(n, today);
  if (m) s += ` ⚠ 마지막 확인 ${m}개월 전`;
  if (n.fm?.authority) s += ` [${n.fm.authority}]`;
  return s;
}

function matchLines(n, q) {
  if (!q.length) return [];
  const qs = new Set(q);
  const scored = [];
  for (let i = n.bodyStart; i < n.lines.length; i++) {
    const line = n.lines[i].trim();
    if (!line) continue;
    const c = new Set(tokens(line).filter((t) => qs.has(t))).size;
    if (c) scored.push({ i, line, c });
  }
  scored.sort((a, b) => b.c - a.c || a.i - b.i);
  return scored.slice(0, 2).map(({ i, line }) => `    L${i + 1}: ${[...line].slice(0, 160).join('')}`);
}

// notes: loadVault 결과. opt: { type, topic, status, all, offset, today(UTC ms) }
// 반환: { text, ranked: [id 또는 파일명], hits }
export function search(notes, query, opt = {}) {
  const today = opt.today;
  const index = lifecycleIndex(notes);
  const pool = notes.filter((n) => passesFilter(n, opt));
  const q = [...new Set(tokens(query))];
  const qid = String(query).trim().toUpperCase();
  let scored;
  if (!q.length) {
    scored = pool.map((n) => ({ n, s: 0, exact: 0, core: 0 }))
      .sort((a, b) => String(b.n.fm?.created ?? '').localeCompare(String(a.n.fm?.created ?? '')));
  } else {
    const docs = pool.map((n) => ({ n, ...docTokens(n) }));
    const N = docs.length || 1;
    const avg = docs.reduce((a, d) => a + d.len, 0) / N || 1;
    const df = new Map();
    for (const d of docs) for (const t of q) if (d.tf.has(t)) df.set(t, (df.get(t) || 0) + 1);
    scored = [];
    for (const d of docs) {
      let s = 0;
      let hit = false;
      for (const t of q) {
        const f = d.tf.get(t);
        if (!f) continue;
        hit = true;
        const idf = Math.log(1 + (N - df.get(t) + 0.5) / (df.get(t) + 0.5));
        s += idf * (f * 2.5) / (f + 1.5 * (0.25 + 0.75 * d.len / avg));
      }
      if (!hit) continue;
      const exact = d.n.id && d.n.id.toUpperCase() === qid ? 1 : 0;
      const core = opt.topic && asList(d.n.fm?.topics).includes(opt.topic) ? 1 : 0;
      scored.push({ n: d.n, s, exact, core });
    }
    scored.sort((a, b) => b.exact - a.exact || b.core - a.core || b.s - a.s);
  }
  const offset = Number(opt.offset) || 0;
  const blocks = [];
  let bytes = 0;
  for (const { n, s } of scored.slice(offset)) {
    const head = `${offset + blocks.length + 1}. ${n.id ?? n.base} · ${n.type ?? '?'} · ${statusLabel(n, index, today)}${q.length ? ` · score ${s.toFixed(2)}` : ''}`;
    const block = [head, `   ${n.file}`, `   ${[...n.title].slice(0, 120).join('')}`, ...matchLines(n, q)].join('\n') + '\n';
    const b = Buffer.byteLength(block);
    if (blocks.length && bytes + b > CAP - 400) break;
    blocks.push(block);
    bytes += b;
  }
  const complete = offset + blocks.length >= scored.length;
  const out = [`# search "${query}" · hits ${scored.length} · shown ${blocks.length}${offset ? ` (offset ${offset})` : ''} · complete=${complete}`];
  if (q.length && looksLikeSentence(query, q)) out.push(HINT_SENTENCE);
  if (!scored.length) out.push(HINT_EMPTY);
  const text = out.join('\n') + '\n' + blocks.join('') + (complete ? '' : `# next: --offset ${offset + blocks.length}\n`);
  return { text, ranked: scored.map(({ n }) => n.id ?? n.base), hits: scored.length };
}
