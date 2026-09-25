// second-brain-template 무결성 검사 — W2 의 기계적 항목. 읽기 전용: 어떤 파일도 고치지 않는다. 의존성 0개.
import fs from 'node:fs';
import path from 'node:path';
import { LIFECYCLE_TYPES, asList, lifecycleIndex, listAllNames, parseDay, readNote, staleMonths } from './notes.mjs';

const STATUS = {
  decision: ['active', 'superseded', 'archived'], doc: ['active', 'superseded', 'archived'],
  lesson: ['active', 'superseded', 'archived'], issue: ['open', 'resolved'],
  'completion-report': ['resolved'], meeting: ['active'], report: ['active'], cluster: ['active'], index: ['active'],
};
const REQUIRED = {
  decision: ['id', 'supersedes', 'superseded_by'],
  doc: ['id', 'doc_type', 'authority', 'source'],
  lesson: ['id', 'trigger', 'source'],
  issue: ['id', 'symptoms', 'root_cause', 'resolution', 'source'],
  'completion-report': ['id', 'resolves', 'source'],
  meeting: ['attendees', 'decisions', 'action_items', 'source'],
  cluster: ['topic', 'members'],
  report: [], index: [],
};
const LINK_FIELDS = ['related', 'resolution', 'resolves'];
const CLUSTER_MAX = 12 * 1024;
const SUMMARY_MAX = 4 * 1024;

const linksIn = (text) => [...String(text ?? '').matchAll(/\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]/g)].map((m) => path.posix.basename(m[1].trim()));
const bodyOf = (n) => n.lines.slice(n.bodyStart).join('\n');

function readVocab(root) {
  try {
    const text = fs.readFileSync(path.join(root, 'clusters', '_topics.md'), 'utf8');
    return new Set([...text.matchAll(/^\s*(?:[-*]\s+)?`([a-z0-9][a-z0-9-]*)`/gm)].map((m) => m[1]));
  } catch { return new Set(); }
}

function summarySection(n) {
  let start = -1;
  for (let i = n.bodyStart; i < n.lines.length; i++) {
    if (start < 0 && /^#{2,3}\s+현재 상태 요약/.test(n.lines[i])) { start = i; continue; }
    if (start >= 0 && /^#{1,3}\s/.test(n.lines[i])) return n.lines.slice(start, i);
  }
  return start < 0 ? null : n.lines.slice(start);
}

// root: knowledge/ 경로, notes: loadVault 결과, opt: { today(UTC ms) }
// 반환: { errors: [{file, code, message}], warnings: [...] }
export function check(root, notes, opt = {}) {
  const errors = [];
  const warnings = [];
  const E = (file, code, message) => errors.push({ file, code, message });
  const W = (file, code, message) => warnings.push({ file, code, message });

  const indexPath = path.join(root, 'index.md');
  const indexNote = fs.existsSync(indexPath) ? readNote(root, indexPath) : null;
  const all = indexNote ? [...notes, indexNote] : notes;
  const names = listAllNames(root);
  const vocab = readVocab(root);
  const lifecycle = lifecycleIndex(notes);

  // E1–E3, E5, E7, E8: 노트 단위
  for (const n of all) {
    if (n.err) { E(n.file, 'E1', `frontmatter: ${n.err}`); continue; }
    const fm = n.fm;
    const t = fm.type;
    if (!STATUS[t]) { E(n.file, 'E2', `알 수 없는 type: ${t ?? '(없음)'}`); continue; }
    const required = ['created', 'status', ...(t === 'cluster' ? [] : ['topics']), ...REQUIRED[t]];
    for (const k of required) if (!(k in fm)) E(n.file, 'E2', `필수 키 없음: ${k}`);
    if (fm.status != null && !STATUS[t].includes(fm.status)) E(n.file, 'E2', `${t}에 허용되지 않는 status: ${fm.status}`);
    if ('reviewed' in fm) {
      if (!LIFECYCLE_TYPES.has(t)) E(n.file, 'E3', `reviewed는 decision·doc·lesson 전용 (type: ${t})`);
      else if (fm.reviewed !== null) {
        if (parseDay(fm.reviewed) === null) E(n.file, 'E3', `reviewed 날짜 형식 오류: ${fm.reviewed}`);
        else if (parseDay(fm.created) !== null && parseDay(fm.reviewed) < parseDay(fm.created)) E(n.file, 'E3', `reviewed(${fm.reviewed})가 created(${fm.created})보다 이르다`);
      }
    }
    for (const k of LINK_FIELDS) for (const target of linksIn(asList(fm[k]).join(' '))) if (!names.has(target)) E(n.file, 'E5', `${k}의 링크 대상 없음: [[${target}]]`);
    if (t === 'cluster' || t === 'index') for (const target of linksIn(bodyOf(n))) if (!names.has(target)) E(n.file, 'E5', `본문 링크 대상 없음: [[${target}]]`);
    for (const topic of [...asList(fm.topics), ...asList(fm.topics_ref)]) if (!vocab.has(topic)) E(n.file, 'E7', `_topics.md에 없는 토픽: ${topic}`);
    // 원본은 기본적으로 로컬 전용(_sources/.gitignore) — 없어도 검색·구조는 깨지지 않으므로 경고
    if (typeof fm.source === 'string' && fm.source.startsWith('_sources/') && !fs.existsSync(path.join(root, fm.source))) W(n.file, 'W8', `source 파일 없음: ${fm.source}`);
  }

  // E4: id
  const groups = new Map();
  for (const n of notes) {
    if (!n.fm || !n.id) continue;
    const fromName = n.base.match(/^((?:DEC|DOC|LSN|ISS)-\d{4})(?:-|$)/)?.[1];
    if (fromName && fromName !== n.id) E(n.file, 'E4', `파일명 id(${fromName})와 frontmatter id(${n.id}) 불일치`);
    const key = `${n.file.split('/')[0]}:${n.id}`;
    groups.set(key, [...(groups.get(key) ?? []), n]);
  }
  for (const g of groups.values()) {
    // 완료 리포트는 닫는 이슈와 같은 id 를 쓴다(여러 단계면 여러 개) — 리포트가 아닌 노트끼리 겹칠 때만 중복
    const main = g.filter((n) => n.type !== 'completion-report');
    if (main.length > 1) for (const n of main) E(n.file, 'E4', `id 중복: ${n.id} (${main.map((x) => x.base).join(', ')})`);
  }

  // E6: supersede 체인 대칭
  for (const n of notes) {
    if (!n.fm || !LIFECYCLE_TYPES.has(n.type)) continue;
    const { superseded_by: by, supersedes: sup } = n.fm;
    if (n.status === 'superseded' && !by) E(n.file, 'E6', 'status가 superseded인데 superseded_by 없음');
    if (by) {
      const b = lifecycle.get(String(by));
      if (!b) E(n.file, 'E6', `superseded_by 대상 없음: ${by}`);
      else if (String(b.fm.supersedes) !== n.id) E(n.file, 'E6', `비대칭: ${by}의 supersedes가 ${n.id}가 아님`);
    }
    if (sup) {
      const a = lifecycle.get(String(sup));
      if (!a) E(n.file, 'E6', `supersedes 대상 없음: ${sup}`);
      else if (String(a.fm.superseded_by) !== n.id) E(n.file, 'E6', `비대칭: ${sup}의 superseded_by가 ${n.id}가 아님`);
    }
  }

  // W9: 안 쓰는 어휘
  const used = new Set(notes.flatMap((n) => [...asList(n.fm?.topics), ...asList(n.fm?.topics_ref)]));
  for (const s of vocab) if (!used.has(s)) W('clusters/_topics.md', 'W9', `아무 노트도 안 쓰는 슬러그: ${s}`);

  // W10·W11: 클러스터
  const clusters = notes.filter((n) => n.type === 'cluster' && n.fm);
  const top = clusters.filter((c) => !c.base.includes('--'));
  const members = (topic) => notes.filter((n) => n.fm && n.type !== 'cluster' && asList(n.fm.topics).includes(topic));
  const clusterTopics = new Set(top.map((c) => String(c.fm.topic)));
  const indexLinks = new Set(indexNote ? linksIn(bodyOf(indexNote)) : []);
  for (const c of top) {
    // 완료 리포트를 멤버로 세는지는 볼트마다 관례가 다르다 — 두 방식 모두와 다를 때만 경고
    const m = members(String(c.fm.topic));
    const noReports = m.filter((n) => n.type !== 'completion-report').length;
    if (![m.length, noReports].includes(Number(c.fm.members))) W(c.file, 'W10', `members ${c.fm.members} ≠ 실제 ${noReports}(완료 리포트 포함 시 ${m.length})`);
    if (indexNote && !indexLinks.has(c.base)) W(c.file, 'W10', 'index.md에 링크되지 않은 클러스터');
  }
  for (const sub of clusters.filter((c) => c.base.includes('--'))) {
    const parentBase = sub.base.split('--')[0];
    const parent = clusters.find((c) => c.base === parentBase);
    if (!parent) { W(sub.file, 'W10', `부모 클러스터 없음: ${parentBase}`); continue; }
    const pl = new Set(linksIn(bodyOf(parent)));
    if (!pl.has(sub.base)) W(sub.file, 'W10', `부모(${parentBase})에서 링크되지 않은 하위 클러스터`);
    const dup = linksIn(bodyOf(sub)).filter((l) => pl.has(l) && !l.startsWith('cluster-'));
    if (dup.length) W(parent.file, 'W10', `하위 클러스터(${sub.base}) 멤버를 다시 나열: ${[...new Set(dup)].map((d) => `[[${d}]]`).join(', ')}`);
  }
  for (const n of notes) {
    if (!n.fm || n.type === 'cluster') continue;
    if (!asList(n.fm.topics).some((t) => clusterTopics.has(t))) W(n.file, 'W10', '어느 클러스터에도 잡히지 않은 노트');
  }
  for (const c of clusters) {
    if (c.bytes > CLUSTER_MAX) W(c.file, 'W11', `클러스터 ${(c.bytes / 1024).toFixed(0)}KB > 12KB — 세부를 멤버 노트나 하위 클러스터로 옮길 것`);
    const narrative = c.lines.filter((l) => /^#{2,3}\s+갱신/.test(l)).length;
    if (narrative) W(c.file, 'W11', `서술형 「갱신」 절 ${narrative}개 — 요약을 제자리에서 다시 쓸 것`);
    const summary = summarySection(c);
    if (summary) {
      const sb = Buffer.byteLength(summary.join('\n'));
      if (sb > SUMMARY_MAX) W(c.file, 'W11', `「현재 상태 요약」 ${(sb / 1024).toFixed(1)}KB > 4KB`);
      const date = summary.slice(0, 3).join(' ').match(/\d{4}-\d{2}-\d{2}/)?.[0];
      if (!c.base.includes('--') && date) {
        const newest = members(String(c.fm.topic)).map((n) => String(n.fm.created ?? '')).filter((d) => parseDay(d) !== null).sort().at(-1);
        if (newest && newest > date) W(c.file, 'W11', `「현재 상태 요약」(${date})이 최신 멤버(${newest})보다 오래됨`);
      }
    }
  }

  // W12: 리뷰 후보
  if (opt.today != null) for (const n of notes) {
    const m = staleMonths(n, opt.today);
    if (m) W(n.file, 'W12', `리뷰 후보: 마지막 확인 ${m}개월 전`);
  }
  return { errors, warnings };
}

const LABEL = {
  E1: 'frontmatter', E2: '스키마', E3: 'reviewed', E4: 'id', E5: '링크', E6: 'supersede', E7: '토픽 어휘',
  W8: 'source 경로', W9: '어휘', W10: '클러스터 정합', W11: '클러스터 형태', W12: '리뷰 후보',
};

// files: 결과를 이 파일들로 한정(볼트 기준 상대 경로). 반환: { text, errors, warnings }
export function renderCheck(result, files = null) {
  const keep = (x) => !files || files.has(x.file);
  const errors = result.errors.filter(keep);
  const warnings = result.warnings.filter(keep);
  if (!errors.length && !warnings.length) return { text: '무결성 이상 없음\n', errors, warnings };
  const out = [];
  for (const [title, list] of [['오류', errors], ['경고', warnings]]) {
    if (!list.length) continue;
    out.push(`## ${title}`);
    for (const code of Object.keys(LABEL)) {
      const items = list.filter((x) => x.code === code);
      if (!items.length) continue;
      out.push(`${code} ${LABEL[code]} (${items.length})`);
      for (const x of items) out.push(`  ${x.file} — ${x.message}`);
    }
  }
  out.push(`errors ${errors.length} · warnings ${warnings.length}`);
  return { text: out.join('\n') + '\n', errors, warnings };
}
