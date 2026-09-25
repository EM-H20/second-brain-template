// 시험 볼트 생성기 — clean(대조군: 오류·경고 0) 과 dirty(문제마다 한 번씩)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const fm = (o) => '---\n' + o.trim() + '\n---\n';

const TOPICS = (slugs) => `# Topic Vocabulary (통제 어휘)

형식: \`slug\` — 정의

${slugs.map(([s, d]) => `- \`${s}\` — ${d}`).join('\n')}
`;

export const CLEAN = {
  'clusters/_topics.md': TOPICS([['auth', '로그인 없이 쓰는 식별 방식'], ['lost-items', '분실물 기능'], ['analytics', '방문 분석 도구']]),
  'index.md': fm(`
type: index
created: 2025-01-01
topics: []
status: active
related: []`) + `
# 볼트 인덱스

## 주제 클러스터
- [[cluster-auth]]
- [[cluster-lost-items]]
- [[cluster-analytics]]
`,
  'log.md': '- 2025-01-02 10:00 | W1 | 분실물 로그인 clarity | kickoff\n',
  'decisions/README.md': '분실물 로그인 clarity — 폴더 안내 (운영 파일)\n',
  '_templates/decision.md': fm('type: decision\nid: DEC-NNNN') + '# 분실물 로그인 clarity 템플릿\n',
  '_sources/issues/ISS-0001-clarity-재생이-전부-마스킹된다.md': '원본: 분실물 로그인 clarity 마스킹 원문\n',
  'meetings/2025-01-02-kickoff.md': fm(`
type: meeting
created: 2025-01-02
topics: [auth, lost-items]
attendees: [가, 나]
decisions: [DEC-0001]
action_items: 0
status: active
related: []
source: ""`) + `
# 2025-01-02 킥오프

## 요약
식별 방식과 분실물 범위를 논의했다.
`,
  'decisions/DEC-0001-세션-쿠키로-식별한다.md': fm(`
type: decision
id: DEC-0001
created: 2025-01-02
topics: [auth]
status: superseded
supersedes: null
superseded_by: DEC-0002
related: ["[[2025-01-02-kickoff]]"]`) + `
# DEC-0001: 세션 쿠키로 식별한다

## 결정 (Decision)
세션 쿠키로 사용자를 식별한다.
`,
  'decisions/DEC-0002-서버-발급-토큰으로-식별한다.md': fm(`
type: decision
id: DEC-0002
created: 2025-01-15
topics: [auth]
status: superseded
supersedes: DEC-0001
superseded_by: DEC-0003
related: []`) + `
# DEC-0002: 서버 발급 토큰으로 식별한다

## 결정 (Decision)
서버가 발급한 토큰으로 식별한다.
`,
  'decisions/DEC-0003-로그인-없이-서버-발급-쿠키-토큰으로-식별한다.md': fm(`
type: decision
id: DEC-0003
created: 2025-02-01
reviewed: 2025-02-01
topics: [auth]
status: active
supersedes: DEC-0002
superseded_by: null
related: []`) + `
# DEC-0003: 로그인 없이 서버 발급 쿠키 토큰으로 식별한다

## 문제 정의 (Context)
정보 중개 서비스라 로그인 없이 쓰게 한다.

## 결정 (Decision)
로그인 없이 서버가 발급한 쿠키 토큰으로 식별한다.
`,
  'decisions/DEC-0004-이메일-로그인을-도입한다.md': fm(`
type: decision
id: DEC-0004
created: 2025-01-03
topics: [auth]
status: archived
supersedes: null
superseded_by: null
related: []`) + `
# DEC-0004: 이메일 로그인을 도입한다

## 결정 (Decision)
이메일 로그인을 도입한다.
`,
  'decisions/DEC-0005-분실물은-축제-기능-뒤로-미룬다.md': fm(`
type: decision
id: DEC-0005
created: 2025-01-10
reviewed: null        # 마지막 인간 확인일
topics: [lost-items]
status: active        # active | superseded | archived
supersedes: null
superseded_by: null
related: ["[[2025-01-02-kickoff]]"]`) + `
# DEC-0005: 분실물은 축제 기능 뒤로 미룬다

## 결정 (Decision)
분실물은 축제 기능 뒤로 미룬다. 폐기가 아니다.

## 결과 (Consequences)
- 분실물 설계에 관한 기존 결정(DEC-0003)은 그대로 유효하다.
`,
  'decisions/DEC-0006-clarity로-공개-화면-재생을-기록한다.md': fm(`
type: decision
id: DEC-0006
created: 2025-02-10
topics: [analytics]
status: active
supersedes: null
superseded_by: null
related:
  - "[[DOC-0001-분석-도구-비교]]"`) + `
# DEC-0006: Clarity로 공개 화면 재생을 기록한다

## 결정 (Decision)
공개 화면은 마스킹 없이 재생을 기록한다.
`,
  'docs/DOC-0001-분석-도구-비교.md': fm(`
type: doc
id: DOC-0001
doc_type: research
authority: official
created: 2025-01-05
reviewed: 2025-02-20
source: "https://example.com/analytics"
topics: [analytics]
topics_ref: [auth]
decisions: []
status: active
supersedes: null
superseded_by: null
related: []`) + `
# DOC-0001: 분석 도구 비교

## 요약
Hotjar와 Clarity 분석 도구를 비교했다.
`,
  'issues/ISS-0001-clarity-재생이-전부-마스킹된다.md': fm(`
type: issue
id: ISS-0001
created: 2025-02-12
topics: [analytics]
symptoms: ["clarity 재생 마스킹", "href=\\"/\\" 링크"]
root_cause: "body에 마스킹 속성이 남아 있었다"   # 한 줄
status: resolved
resolution: "[[ISS-0001-clarity-재생이-전부-마스킹된다-완료-리포트]]"
related: []
source: "_sources/issues/ISS-0001-clarity-재생이-전부-마스킹된다.md"`) + `
# ISS-0001: Clarity 재생이 전부 마스킹된다

## 증상
재생 화면이 전부 가려진다.
`,
  'issues/ISS-0001-clarity-재생이-전부-마스킹된다-완료-리포트.md': fm(`
type: completion-report
id: ISS-0001
created: 2025-02-14
topics: [analytics]
status: resolved
resolves: "[[ISS-0001-clarity-재생이-전부-마스킹된다]]"
related: []
source: ""`) + `
# ISS-0001 완료 리포트

마스킹 속성을 제거했다.
`,
  'lessons/LSN-0001-결정-질문은-결정-노트-본문으로-답한다.md': fm(`
type: lesson
id: LSN-0001
created: 2025-01-20
reviewed: null
topics: [lost-items]
trigger: "결정 이유를 묻는 질문에 답할 때"
status: active
source: "2025-01-20"
supersedes: null
superseded_by: null
related: []`) + `
# LSN-0001: 결정 질문은 결정 노트 본문으로 답한다
`,
  'clusters/cluster-auth.md': fm(`
type: cluster
topic: auth
created: 2025-01-02
members: 5
status: active
related: []`) + `
# 클러스터: 인증

## 현재 상태 요약 (2025-02-01)
로그인 없이 서버 발급 쿠키 토큰으로 식별한다.

## 활성 결정
- [[DEC-0003-로그인-없이-서버-발급-쿠키-토큰으로-식별한다]] — 로그인 없이 식별

## 대체된 결정 (역사)
- [[DEC-0001-세션-쿠키로-식별한다]] → [[DEC-0002-서버-발급-토큰으로-식별한다]]
- [[DEC-0004-이메일-로그인을-도입한다]] (archived)
`,
  'clusters/cluster-lost-items.md': fm(`
type: cluster
topic: lost-items
created: 2025-01-02
members: 3
status: active
related: []`) + `
# 클러스터: 분실물

## 현재 상태 요약 (2025-01-20)
분실물은 축제 기능 뒤로 미뤘다.

## 활성 결정
- [[DEC-0005-분실물은-축제-기능-뒤로-미룬다]]

## 관련 교훈
- [[LSN-0001-결정-질문은-결정-노트-본문으로-답한다]]
`,
  'clusters/cluster-analytics.md': fm(`
type: cluster
topic: analytics
created: 2025-01-05
members: 4
status: active
related: []`) + `
# 클러스터: 분석

## 현재 상태 요약 (2025-02-14)
Clarity로 공개 화면 재생을 기록한다.

## 하위 클러스터
- [[cluster-analytics--replay]] — 재생 마스킹 이슈

## 활성 결정
- [[DEC-0006-clarity로-공개-화면-재생을-기록한다]]

## 핵심 문서
- [[DOC-0001-분석-도구-비교]] (official)

\`\`\`
## 코드 블록 안의 가짜 제목
\`\`\`
`,
  'clusters/cluster-analytics--replay.md': fm(`
type: cluster
topic: analytics
created: 2025-02-12
members: 2
status: active
related: []`) + `
# 하위 클러스터: 재생 마스킹

## 관련 이슈
- [[ISS-0001-clarity-재생이-전부-마스킹된다]] (resolved)
- [[ISS-0001-clarity-재생이-전부-마스킹된다-완료-리포트]]
`,
};

const ok = (id, extra = '') => fm(`
type: decision
id: ${id}
created: 2025-01-10
topics: [auth]
status: active
supersedes: null
superseded_by: null
related: []${extra}`) + `\n# ${id}\n`;

const bloated = `
# 클러스터: 인증

## 현재 상태 요약 (2024-12-01)
${'요약이 계속 불어난다. 결정의 경위와 세부가 요약 절에 쌓였다.\n'.repeat(80)}
## 갱신 (2025-03-01) — 서술형 갱신 절
${'갱신 서술이 위로 쌓인다.\n'.repeat(260)}
## 활성 결정
- [[DEC-0103-missing-key]]
`;

export const DIRTY = {
  'clusters/_topics.md': TOPICS([['auth', '인증'], ['unused-slug', '아무도 안 씀']]),
  'index.md': fm('type: index\ncreated: 2025-01-01\ntopics: []\nstatus: active\nrelated: []') + '\n# 인덱스\n(클러스터 링크 없음)\n',
  'decisions/DEC-0101-no-frontmatter.md': '# 앞머리 없는 노트\n',
  'decisions/DEC-0102-bad-yaml.md': fm('type: decision\nid: DEC-0102\ndescription: |\n  여러 줄\nstatus: active') + '# DEC-0102\n',
  'decisions/DEC-0103-missing-key.md': fm('type: decision\nid: DEC-0103\ncreated: 2025-01-10\ntopics: [auth]\nstatus: active\nsupersedes: null\nrelated: []') + '# DEC-0103\n',
  'issues/ISS-0101-bad-status.md': fm('type: issue\nid: ISS-0101\ncreated: 2025-01-10\ntopics: [auth]\nsymptoms: []\nroot_cause: ""\nstatus: active\nresolution: null\nrelated: []\nsource: ""') + '# ISS-0101\n',
  'docs/DOC-0101-unknown-type.md': fm('type: memo\nid: DOC-0101\ncreated: 2025-01-10\ntopics: [auth]\nstatus: active') + '# DOC-0101\n',
  'issues/ISS-0102-reviewed-on-issue.md': fm('type: issue\nid: ISS-0102\ncreated: 2025-01-10\nreviewed: 2025-01-11\ntopics: [auth]\nsymptoms: []\nroot_cause: ""\nstatus: open\nresolution: null\nrelated: []\nsource: ""') + '# ISS-0102\n',
  'decisions/DEC-0104-reviewed-before-created.md': ok('DEC-0104').replace('created: 2025-01-10', 'created: 2025-02-01\nreviewed: 2025-01-01'),
  'decisions/DEC-0105-dup-a.md': ok('DEC-0105'),
  'decisions/DEC-0105-dup-b.md': ok('DEC-0105'),
  'decisions/DEC-0106-mismatch.md': ok('DEC-0107'),
  'decisions/DEC-0108-dangling.md': ok('DEC-0108').replace('related: []', 'related: ["[[DEC-9999-nowhere]]"]'),
  'decisions/DEC-0109-old.md': ok('DEC-0109').replace('status: active', 'status: superseded').replace('superseded_by: null', 'superseded_by: DEC-0110'),
  'decisions/DEC-0110-new.md': ok('DEC-0110'),
  'decisions/DEC-0111-orphan-superseded.md': ok('DEC-0111').replace('status: active', 'status: superseded'),
  'decisions/DEC-0112-unknown-topic.md': ok('DEC-0112').replace('topics: [auth]', 'topics: [nonexistent]'),
  'issues/ISS-0103-missing-source.md': fm('type: issue\nid: ISS-0103\ncreated: 2025-01-10\ntopics: [auth]\nsymptoms: []\nroot_cause: ""\nstatus: open\nresolution: null\nrelated: []\nsource: "_sources/issues/nope.md"') + '# ISS-0103\n',
  'decisions/DEC-0113-no-cluster.md': ok('DEC-0113').replace('topics: [auth]', 'topics: []'),
  'decisions/DEC-0114-stale.md': ok('DEC-0114').replace('created: 2025-01-10', 'created: 2024-01-01'),
  'clusters/cluster-auth.md': fm('type: cluster\ntopic: auth\ncreated: 2025-01-01\nmembers: 99\nstatus: active\nrelated: []') + bloated,
  'clusters/cluster-auth--legacy.md': fm('type: cluster\ntopic: auth\ncreated: 2025-01-01\nmembers: 1\nstatus: active\nrelated: []') + '\n# 하위: 레거시\n- [[DEC-0103-missing-key]]\n',
};

export function makeVault(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vault-'));
  for (const [rel, content] of Object.entries(files)) {
    const p = path.join(root, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
  }
  return root;
}
