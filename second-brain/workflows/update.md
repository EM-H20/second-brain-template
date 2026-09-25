### UPDATE — 템플릿 업데이트 반영 (`/update-vault`, "업데이트 반영해")

npx 업데이트는 규칙·스킬·도구만 바꾼다. 이 절차가 기존 볼트와 `AGENTS.md`를 새 규칙에 맞춘다.

1. `second-brain/state.json`을 읽는다. 없으면 "먼저 터미널에서 `npx github:EM-H20/second-brain-template`를
   실행하라"고 안내하고 멈춘다. `second-brain/migrations/*.md` 중 id가 `applied`에 없는 것을 id 순으로 모은다.
   없으면 "반영할 변경 없음 (v<previous> → v<installed>)" 한 줄로 끝낸다.
2. `node second-brain/tools/vault.mjs check --json`을 한 번 실행해 기준선으로 쓴다.
3. 대기 이관마다 노트를 읽고 순서대로:
   - 「필요한지 판별」을 실행한다. 불필요하면 `applied`에 id를 더하고 다음으로 간다.
   - 필요하면 「무엇이 바뀌었나」를 한 단락으로 말하고, 대상 목록과 첫 대상의 바뀔 모습을 보여 준 뒤
     「승인 단위」대로 묻는다 (전부 / 하나씩 / 건너뛰기).
   - 승인받은 것만 「적용 방법」대로 바꾸고, 바꾼 파일마다 `check <파일>` 을 실행해 「적용 후 확인」을 따진다.
   - `knowledge/log.md`에 `- YYYY-MM-DD HH:MM | update | <이관 id> | <바꾼 파일>` 한 줄을 남긴다.
   - 끝까지 적용했으면 `applied`에 id를 더한다. 건너뛰었거나 일부만 했으면 더하지 않는다 (다음 실행에서 이어 한다).
4. `state.json`은 `applied` 배열만 고치고 다른 키는 그대로 둔다 (유효한 JSON 유지).
5. 끝에 요약한다: 적용한 이관, 바꾼 파일 수, 남은 대기 이관, 경고 요약. 커밋은 하지 않는다 — 사용자가 한다.
