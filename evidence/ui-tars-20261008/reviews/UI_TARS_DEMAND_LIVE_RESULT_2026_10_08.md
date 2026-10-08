---
title: "UI-TARS 문자열·객체형 업무 요청 실제 비교 결과"
tags: [vision-test, ui-tars, experiment, model-response]
status: active
created: 2026-10-08
---

## 판단

객체형 demand 후보 A는 이번 표본에서 실패하여 앱 적용을 채택하지 않는다. 기존 문자열 요청은 계획 누락을 재현했고 객체형 요청은 관찰 문장 반복으로 출력 한도를 소진했다. 형식 변경만으로 UI-TARS의 계획 생성 문제가 해결된다는 가설은 이번 실험에서 지지되지 않았다.

## 조건과 근거

- 사용자 키 저장/사용 지시: Buzz event 2433b7c39016a7d6011e62c1722c882a81dd5d1f04941584596112e91d71fac1. 키 원문은 이 문서에 기록하지 않는다.
- 실행 작업본 HEAD 시작·종료 모두 f76215db83c9a3cda0f47d3762e1806b4f753d6f, apps/scripts clean.
- 로컬 REPOS/vision-test-maker/.env 생성: mode 600, .gitignore의 .env* 적용, Git 미추적. node --env-file=.env로 별도 실험 프로세스에 로드했다.
- 실험 스크립트: REPOS/vision-test-maker/scripts/ui-tars-demand-compare.ts.
- 원본 결과: REPOS/vision-test-maker/artifacts/experiments/ui-tars-demand-2026-10-08T00-45-37-298Z/RESULT.json.
- 이미지 SHA256: 534c9e544db54afac028fb664eb0a13ce314b419051fd518623f0e048f84444e. 두 실제 요청의 imageUnchanged=true, demandOnlyDifference=true.
- 모델 bytedance/ui-tars-1.5-7b, family ui-tars-1.5, provider Parasail, 출력 한도 1536. 원래 실패했던 영문 synthetic recipient/email 업무를 그대로 사용했다. 최초 한국어 사용자 시나리오 주문 시험이 아니다.
- 모의 사전검증 통과 후 실제 공급자 2호출, 재시도 0, 페이지 행동 0. 추가 실호출 없음.

| 변형 | 공급자 종료 | 출력 토큰 | 독립 결과 | 보고 비용 |
|---|---|---:|---|---:|
| 기존 문자열 | stop | 109 | observation+errors만 존재, data-json/steps 없음. MODEL_STRUCTURED_OUTPUT_MISSING | $0.0002749 |
| 객체형 A | length | 1536 | 관찰 문장을 반복하며 토큰 소진, data-json/steps 없음. MODEL_OUTPUT_TRUNCATED | $0.0005586 |

총 공급자 보고 비용 $0.0008335, 응답 대기 합 20.758초. 객체형 응답은 “사용자가 주문을 진행하는 과정을 모방하고 있습니다.”를 반복했다. 추가된 잘림 차단은 동작했고 두 응답 모두 schema 미통과 및 행동 0회다. 새로운 오류 숨김이나 부분 계획 강제 통과를 하지 않았다.

## 한계와 다음 판단

각 변형 1회이며 일반적인 UI-TARS 능력·모든 프롬프트·다른 공급자의 성공률로 일반화하지 않는다. 실제 주문·입력 좌표·결함 판독 개선도 검증하지 않았다. 단순 출력 한도 증대는 관찰된 반복 자체의 해결 근거가 없다.

권고는 수정 후 재검증. 다음 구조 후보는 계획/판독 모델과 UI-TARS 조작 모델의 역할 분리이며, 기존 단일 모델 요구의 변경이므로 확정하지 않는다. 현재 서버·앱 기본 동작·GitHub main은 변경하지 않았다.
