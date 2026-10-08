---
title: "UI-TARS 단독 직접 행동 경로 최소 검증"
tags: [vision-test, ui-tars, experiment]
status: active
created: 2026-10-08
---

사용자 결정: Buzz event `18126c6a072506837154baee525859ef2afa19503ccb88d533c66cfd8f335c1d` — UI-TARS만 우선 사용. 다른 모델을 추가하는 후보 B는 진행하지 않는다.

## 가설과 범위

1. 앱의 별도 workflow aiQuery JSON 계획을 요구하지 않고 UI-TARS의 native aiAct 행동 경로에 사용자 업무를 전달하면 행동0 계획 오류를 벗어날 수 있다.
2. 해당 경로가 Store D에서 사용자 원문의 상품 선택·수량2·김성지·test@gmail.com·주문 확정을 실제 수행할 수 있다. 행동 실행과 결함 판독은 별도 판정한다.

근거: maker HEAD f76215d의 `apps/platform/server/midscene-workflow.ts`는 workflow aiQuery 이후에만 aiAct를 부른다. `ui-tars.ts`에 공개 UI-TARS 1.5 좌표 어댑터가 있다. 현재 aiQuery 실패는 `RESEARCH/UI_TARS_LOCAL_RETEST_FAILURE_2026_10_08.md` 참고. 직접 행동 경로의 실제 성공은 아직 미검증.

## 위임 및 수락

POC_MAKER 위임 메시지 `c8a78d619781141eb82318f29f1744ece37283bba4d38c2e3b94cadc66514a3d` 전송 accepted, mention_pubkeys로 전달 확인.

- 기존 worktree에서 독립 실험 경로 구현, 운영 경로/서버/설정은 유지.
- 다른 모델, DOM/고정 좌표 행동, 값 생성, 숨은 재시도 없이 사용자 한국어 원문 사용.
- 호출/행동/시간/중지와 잘림 차단 유지. 기존 입력 확인이 빠지는 부분은 명시하며 완료로 간주하지 않음.
- SDK 모의 공급자 검사, 패키지 전체 테스트와 빌드 및 정확한 실행 명령 보고.
- 구현 단계의 유료 호출 없음. Lead 독립 검토 후 1회 실제 시험을 목표로 요청20·행동12·180초 이내의 최소 실행안 마련. finished 선언만으로 수락하지 않고 주문 완료와 기대 화면을 증거로 확인.
- 최종 기대결과: 우측 주문요약의 선택 상품 이미지·수량·단가·배송비 여부. 결함 판독 실패와 주문 행동 실패를 분리 기록.

현재 상태: 구현 위임 전달 완료, 코드·모의 검증·실호출·로컬 앱 반영은 미완료. 원래 .env 보관/Git 제외 방침 유지.

## 2026-10-08 02:56 UTC 최종 갱신

위 ‘현재 상태’는 착수 시점 기록이다. 이후 실험 코드는 e210a62까지 구현·독립 검증했고, 전체 주문4회와 단일 수량 입력1회 실호출을 완료했다. 모두 각 한도에서 미완료로 판정해 운영 앱에는 반영하지 않았다. 현재 제한된 실험 작업은 종료하고 증거를 보존한다. UI-TARS 단독 요구와 .env 보관 방침은 유지한다. 원래 주문 완료·결함 검출 목표는 미달성이며 후속 수정이 필요하다. 최종 근거: `RESEARCH/UI_TARS_QUANTITY_ONLY_RESULT_2026_10_08.md`.
