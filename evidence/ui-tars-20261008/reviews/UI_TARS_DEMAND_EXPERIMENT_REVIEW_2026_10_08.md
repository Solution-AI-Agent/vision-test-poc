---
title: "UI-TARS 요청 형식 비교 실험 독립 사전검증"
tags: [vision-test, ui-tars, experiment]
status: active
created: 2026-10-08
---

대상 f76215db83c9a3cda0f47d3762e1806b4f753d6f, REPOS/vision-test-maker. runner 공용 옵션 분리, workflow 문자열 보존, 실험 전용 객체형 demand, 비교 모듈·CLI·회귀검사를 직접 검토했다.

동일 셸에서 HEAD → npm test → npm run build → 저장 원장/이미지로 모의 비교 → HEAD를 실행했다. 시작·종료 HEAD 모두 f76215d. platform 72 + sample 3 PASS, 공유 UI 타입검사와 두 앱 빌드 PASS. 모의 비교는 demandOnlyDifference=true, providerCalls=2, 두 variant 각 1호출·0행동. mock의 단일 mock 단계는 필수 업무를 충족하지 않으며 공급자 성능 근거가 아니다.

모의 비교 결과: REPOS/vision-test-maker/artifacts/experiments/ui-tars-demand-2026-10-08T00-39-06-956Z/RESULT.json.
사용 이미지: REPOS/vision-test-delivery/artifacts/e5336604-1853-42e7-b644-2d5c4b6715a9/model-request-2.jpg.
SHA256 직접 확인: 534c9e544db54afac028fb664eb0a13ce314b419051fd518623f0e048f84444e.

CLI 자체의 원본 이미지 검사는 basename만 비교하므로 임의 다른 폴더의 같은 이름 파일까지 원본으로 증명하지 못한다. 이번 검토는 저장 런의 정확한 경로와 해시를 별도로 확인했으며, 실호출 안내도 동일 경로에 고정한다. 필수 업무 검사는 휴리스틱이므로 원문 steps의 독립 검토가 필요하다.

실호출 0. 별도 실험 환경의 OPENROUTER_API_KEY는 존재 여부만 검사했고 없음. 실행 중 앱 메모리에서 키를 추출하지 않았다. 사용자에게 로컬 터미널의 숨김 입력으로 키를 공급하는 단일 비교 실행 방법을 전달한다. 앱·서버·GitHub main 변경 없음. 실제 UI-TARS 계획 복구 판정은 여전히 미검증.
