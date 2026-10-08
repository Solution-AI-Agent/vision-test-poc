---
title: "독립 샘플 주문 검증2 로컬 재실행 실패 확인"
tags: [vision-test, ui-tars, diagnosis]
status: active
created: 2026-10-08
---

- 사용자 보고: Buzz event caa2c08551f0f6dc9f1358ed9653724f168c36a0db8f1e51f7d7de39878e71a7.
- 근거: `REPOS/vision-test-delivery/.data/runs.json`의 `ad5f5b5d-87db-4561-94dc-b22405caf588`, 2026-10-08T02:00:41.678Z–02:00:58.773Z, 소스 `72520e0421d14519a21212800e066677c10693a4`.
- UI-TARS 1.5 7B / vlm-ui-tars, 공급자 2호출, 행동0, 비용 $0.0005946. model-plan 응답은 stop/109토큰/상한1536, observation와 errors만 있고 data-json/steps 없음.
- 이전 `150bf07d-c806-4ec0-b565-5b16a4f8ffba`의 계획 parsedOutput과 직접 비교해 동일함을 확인. 키 인증/서버 연결이 아닌 기존 계획 형식 오류 재현.
- 현재 서버는 기존 `72520e0`; `dd845fc` 잘림 차단/진단 개선 및 `f76215d` 실험 도구는 미반영. 해당 변경도 계획 생성 자체를 복구하지 못했음. 앞선 실험 판단: `RESEARCH/UI_TARS_DEMAND_LIVE_RESULT_2026_10_08.md`.
- 실행 업무는 synthetic recipient/email 영문 저장 시나리오이며 최초 사용자의 김성지/test@gmail.com 한국어 원문이 아님. 이는 입력값 검증 조건 차이이고 이번 계획 JSON 누락의 입증된 원인은 아님.
- 이번 진단은 저장 기록만 읽음. 추가 모델 호출/재시작/설정 변경 없음.
- 운영 판단: HTTP 접속 확인을 근거로 해당 실패 시나리오 재실행을 안내한 것은 부적절했음. UI 접속 준비와 목표 업무 수락 검증을 분리하며, 동일 조건 재실행을 해결 행동으로 안내하지 않음.
- 권고: 계획·판독 모델과 UI-TARS 행동 모델을 분리하는 후보 B의 검증. 기존 UI-TARS 단독 구성 요구 변경 여부를 사용자에게 확인해야 함. 아직 구현·검증되지 않음.
