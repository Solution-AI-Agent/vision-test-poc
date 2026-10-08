---
title: "UI-TARS 좌표 이력 수정 후 재시험: 키 이름 호환 오류"
tags: [vision-test, ui-tars, experiment, independent-review]
status: active
created: 2026-10-08
---

## 판단

좌표 혼용 수정은 모의 검증을 통과했다. 실제 주문은 키 이름 변환 오류로 더 앞에서 중단되어, 이메일 클릭과 주문 완료에 대한 수정 효과는 미검증이다. 운영 앱 반영 대신 최소 호환 수정 후 재검증을 권고한다.

## 독립 검증

- HEAD `00370aa0de4c02647b3ab72bebeab53e4932f4c1`, 작업 트리 clean. 같은 셸에서 HEAD를 기록하고 전체 테스트 platform83/sample3/shared UI typecheck 및 루트 빌드를 실행해 통과.
- SDK `@midscene/core/dist/es/ai-model/workflows/planning/custom-planning.mjs`와 `models/ui-tars/prompt.mjs`에서 변환 후 응답을 getSummary로 이력에 저장함을 확인. 실험 수정은 일치하는 SDK 응답을 모델 원응답으로 복원하며 실행 좌표는 유지한다. 모의 공급자 3요청 이력 검사로 확인.
- 원래 이메일 오클릭에 대한 모델 내부 원인은 여전히 추정이다. 혼용 존재 확인과 실제 오클릭의 인과관계 입증은 구분한다.

## 실제 1회 재시험

- 모의 preflight run `057c0e07-7da3-40f1-a174-1ecd88e4b3c0`: 무과금2요청/0행동, 실제 시험과 별개.
- 실제 원장: `REPOS/vision-test-maker/artifacts/7bb207d3-49a7-4cba-bd5b-fba458fd8a03/ACT_EXPERIMENT.json`.
- 2026-10-08T02:32:47.136Z–02:32:57.839Z, 10.703초, 3모델 호출, 행동시도3/실행2, 9,416토큰, 보고 비용 $0.0009694.
- UI-TARS 1.5 7B / 같은 사용자 한국어 업무 / Store D / 요청20·행동12·180초 한도 / 재시도0. 끝까지 실행한 한도 실패가 아니라 즉시 행동 오류로 중단됨.
- 클릭2회 후 요청3 `hotkey(key='up')` → SDK `KeyboardPress keyName='up'` → `keyboard.down: Unknown key: "up"`. 원응답은 수량1을 위쪽 화살표로2로 바꾸려는 설명을 포함.
- SDK 확인 경로: `@midscene/core/dist/es/ai-model/models/ui-tars/actions.mjs`의 transformHotkeyInput 결과 → `@midscene/web/dist/es/web-page.mjs` getKeyCommands → keyboard.press.
- `act-final.png` 직접 확인: 빨간 머그 선택, 수량1, 이름·이메일 placeholder, 주문 입력 폼. 모델 finished 없음, 최종 assertion 미실행. 주문 실패/결함 판독 미검증.

## 다음 행동

POC_MAKER에 명확한 키 별칭만 실행 규격으로 매핑하는 최소 수정 위임. 원응답/모델 이력/입력 텍스트 보존, 기존 ctrl a 조합 보존, 미지의 키 사전 차단, 모의 원응답과 실제 브라우저로 number입력1→2 검증. 유료 호출/운영 앱 반영 없이 전체 테스트와 빌드 보고를 받는다.

다중 이미지 요청의 transport.screenshot은 첫 이력 이미지이므로 현재 상태 증거로 쓰지 않는다. 이번 요청3의 현재 화면은 `model-request-3-image-3.jpg`; 최종 검토는 `act-final.png`를 사용했다. 실험 리포트에 현재 화면 경로를 별도로 명시하도록 요청했다.
