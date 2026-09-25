// second-brain-template 절 읽기 — 목차, 제목으로 절만 추출, 8KB 상한과 이어 읽기. 의존성 0개.
import fs from 'node:fs';
import path from 'node:path';
import { readNote } from './notes.mjs';

export const CAP = 8192;

// arg: 경로 | 파일 이름(확장자 생략 가능) | id(DEC-0061)
// 반환: { note, extra } 또는 { error: 'not-found' | 'ambiguous', candidates }
export function resolveNote(root, notes, arg) {
  for (const p of [arg, path.join(root, arg)]) {
    if (p.endsWith('.md') && fs.existsSync(p) && fs.statSync(p).isFile()) return { note: readNote(root, path.resolve(p)), extra: null };
  }
  const name = arg.replace(/\.md$/, '').normalize('NFC');
  const byName = notes.filter((n) => n.base === name);
  if (byName.length === 1) return { note: byName[0], extra: null };
  const byId = notes.filter((n) => (n.id && n.id.toUpperCase() === name.toUpperCase()) || n.base.toUpperCase().startsWith(`${name.toUpperCase()}-`));
  if (byId.length === 1) return { note: byId[0], extra: null };
  // 이슈 + 완료 리포트(여러 단계면 여러 개)는 같은 id 를 쓴다 → 이슈를 열고 리포트를 알린다
  const main = byId.filter((n) => n.type !== 'completion-report');
  const reports = byId.filter((n) => n.type === 'completion-report');
  if (main.length === 1 && reports.length >= 1) return { note: main[0], extra: `완료 리포트: ${reports.map((n) => n.file).join(', ')}` };
  if (!byId.length && !byName.length) return { error: 'not-found', candidates: [] };
  return { error: 'ambiguous', candidates: [...byName, ...byId].map((n) => n.file) };
}

// 반환: [{ level, text, start, end, bytes }] — start·end 는 1-based 파일 줄 번호(end 포함)
export function outline(note) {
  const heads = [];
  let fence = false;
  for (let i = note.bodyStart; i < note.lines.length; i++) {
    const l = note.lines[i];
    if (/^\s*(```|~~~)/.test(l)) { fence = !fence; continue; }
    if (fence) continue;
    const m = l.match(/^(#{1,3})\s+(.+?)\s*$/);
    if (m) heads.push({ level: m[1].length, text: m[2], start: i + 1 });
  }
  for (let k = 0; k < heads.length; k++) {
    const next = heads.slice(k + 1).find((h) => h.level <= heads[k].level);
    heads[k].end = next ? next.start - 1 : note.lines.length;
    heads[k].bytes = Buffer.byteLength(note.lines.slice(heads[k].start - 1, heads[k].end).join('\n'));
  }
  return heads;
}

const kb = (b) => `${(b / 1024).toFixed(1)}KB`;

// 한 줄이 상한을 넘으면 바이트 기준으로 잘라 표시한다 (출력 8KB 보장)
function fitLine(line, ln) {
  const limit = CAP - 400;
  if (Buffer.byteLength(line) <= limit) return line;
  let out = '';
  let b = 0;
  for (const ch of line) {
    const cb = Buffer.byteLength(ch);
    if (b + cb > limit - 60) break;
    out += ch;
    b += cb;
  }
  return `${out} …(L${ln} 줄이 너무 길어 잘림)`;
}

function renderOutline(note) {
  const rows = outline(note).map((h) => `L${h.start}–L${h.end} · ${kb(h.bytes)} · ${'#'.repeat(h.level)} ${h.text}`);
  return `# outline ${note.file} · ${kb(note.bytes)}\n${rows.join('\n')}\n`;
}

// queries: 제목 부분 일치(대소문자 무시) 목록. opt.from: 이 줄부터 이어 읽기
// 반환: { text, found }
export function renderSection(note, queries, opt = {}) {
  if (!queries.length) return { text: renderOutline(note), found: true };
  const qs = queries.map((q) => q.toLowerCase());
  const picked = outline(note).filter((h) => qs.some((q) => h.text.toLowerCase().includes(q)));
  if (!picked.length) {
    return { text: `# section ${note.file}: "${queries.join('", "')}" 제목 없음 — 목차:\n${renderOutline(note)}`, found: false };
  }
  const ranges = picked.map((h) => [h.start, h.end]).sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const r of ranges) {
    const last = merged.at(-1);
    if (last && r[0] <= last[1] + 1) last[1] = Math.max(last[1], r[1]);
    else merged.push([...r]);
  }
  const from = Number(opt.from) || 0;
  const out = [];
  let bytes = 0;
  let next = null;
  for (const [s, e] of merged) {
    for (let ln = Math.max(s, from); ln <= e; ln++) {
      const line = fitLine(note.lines[ln - 1], ln) + '\n';
      const b = Buffer.byteLength(line);
      if (out.length && bytes + b > CAP - 300) { next = ln; break; }
      out.push(line);
      bytes += b;
    }
    if (next) break;
  }
  const where = merged.map(([s, e]) => `L${s}–L${e}`).join(', ');
  const head = `# section ${note.file} · ${picked.length}절 · ${where}${from ? ` (from L${from})` : ''} · complete=${next ? 'false' : 'true'}`;
  return { text: `${head}\n${out.join('')}${next ? `# next: --from ${next}\n` : ''}`, found: true };
}
