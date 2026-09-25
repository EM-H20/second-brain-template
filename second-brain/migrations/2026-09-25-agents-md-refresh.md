---
id: 2026-09-25-agents-md-refresh
title: AGENTS.md를 최신 규칙으로 (관리 블록 도입)
since: v1.12
---

## 무엇이 바뀌었나
설치기는 처음 설치할 때 복사한 `AGENTS.md`를 이후 업데이트에서 갱신하지 않았다. 그래서 옛 지시
("세션 시작 때 `SECOND-BRAIN.md`를 전부 읽어라", "`knowledge/log.md` 꼬리를 읽어라")가 남아 Codex가
읽기 경로 다이어트와 볼트 도구를 쓰지 않는다. 이제 템플릿이 관리하는 부분을
`<!-- second-brain-template:begin full -->` … `<!-- second-brain-template:end -->` 로 감싸면
이후 업데이트는 설치기가 자동으로 한다.

## 필요한지 판별
프로젝트 루트 `AGENTS.md`에 `<!-- second-brain-template:begin` 이 없고, 템플릿 사본이라는 신호(`# Agent Rules` 제목과
"The single source of truth for all rules in this repository is `SECOND-BRAIN.md`" 문장)가 있으며, 다음 중 하나라도 해당하면 필요하다:
"in full at the start of every session" 이 있다 / "tail of `knowledge/log.md`" 가 있다 /
`second-brain/tools/vault.mjs` 언급이 없다. `AGENTS.md`가 없거나 관리 블록이 이미 있으면 불필요. 템플릿 사본 신호가 없는 사용자 자신의 `AGENTS.md`라면
전체 교체 대신 끝에 `pointer` 블록(`<!-- second-brain-template:begin pointer -->` / 포인터 한 줄 / end 마커)만 덧붙이자고 제안한다.

## 적용 방법
`second-brain/AGENTS.template.md`(최신 템플릿 본문, 끝의 마커 주석 줄 제외)와 `AGENTS.md`를 비교한다.
템플릿에서 온 부분(“# Agent Rules” 부터 템플릿 문단들)을 최신 본문으로 바꾸고, 그 전체를
`<!-- second-brain-template:begin full -->` 와 `<!-- second-brain-template:end -->` 로 감싼다.
사용자가 직접 더한 문단은 블록 밖(앞이나 뒤)에 그대로 둔다. 어느 문단이 사용자 것인지 애매하면 묻는다.

## 승인 단위
파일 하나 — 바뀌기 전후 diff 전체를 보여 주고 한 번 승인받는다.

## 적용 후 확인
`AGENTS.md`에 begin/end 마커가 한 쌍 있고, "in full at the start of every session"·"tail of `knowledge/log.md`" 가 없으며,
`second-brain/tools/vault.mjs` 언급이 있다.
