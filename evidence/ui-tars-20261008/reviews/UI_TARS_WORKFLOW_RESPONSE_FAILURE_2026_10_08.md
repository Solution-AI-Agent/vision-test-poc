---
title: "UI-TARS 실제 업무 계획 응답 누락 진단"
tags: [vision-test, ui-tars, diagnostics]
status: active
created: 2026-10-08
---

## 판단

72520e0421d14519a21212800e066677c10693a4에서 사용자가 실행한 두 D 시나리오는 업무 목록 생성 전에 실패했다. 출력 한도 소진이 아니라 Midscene aiQuery가 요구한 data-json과 앱의 steps 목록이 모델 응답에서 빠졌다. 모델 일반 능력이나 모든 JSON 요청의 불가능성을 입증하는 결과는 아니다.

## 근거

- 로컬 원장: REPOS/vision-test-delivery/.data/runs.json.
- 실행 e5336604-1853-42e7-b644-2d5c4b6715a9: family ui-tars-1.5, 2026-10-08T00:17:31.926Z, 2호출/0행동, 비용 $0.0005948.
- 실행 150bf07d-c806-4ec0-b565-5b16a4f8ffba: family vlm-ui-tars, 2026-10-08T00:18:16.689Z, 2호출/0행동, 비용 $0.000596.
- 두 실행의 요청2: provider Parasail, responseModel bytedance/ui-tars-1.5-7b, finishReason stop, completionTokens 109, maxTokens 1536. 동일 206자 응답은 observation(업무 설명)과 빈 errors 태그뿐. data-json과 steps 없음.
- 코드: apps/platform/server/midscene-workflow.ts:31은 agent.aiQuery 반환 후 workflowSchema.parse. 설치 node_modules/@midscene/core/dist/lib/ai-model/model-adapter/default-insight-protocol.js는 data-json 누락 시 Missing required field 오류를 발생시킨다. 따라서 Zod에서 steps를 검사하기 전 SDK 파싱에서 거부되는 경로다.
- 두 실행 요청1의 시각 QA는 유효 JSON을 반환했다. 하지만 chart가 없고 겹침도 없다고 답했다. e533.../model-request-1.jpg를 직접 열어 차트와 머그 하단을 가리는 겹침을 확인했다. 형식 준수와 시각 판단 정확성은 별개다.
- 오류 이전에는 SDK 행동 0회이므로 입력 위치 또는 좌표 변환의 실측 결과는 없다.

## 다음 행동 및 한계

이번 진단의 추가 유료 호출 0, 서버 재시작/설정 변경/소스 수정 0. POC_MAKER에 원응답 재생·공유 query 경로·기존 SDK의 객체형 demand 검토와 최소 수정 구현을 위임했다. Buzz 위임 event 3f3323402ff3aa4665b4ac5a0fa2911cfa9a10954c0f3fedf22010b85db89671. 자동 모델 전환, 누락 계획 생성, 숨은 재시도, 실측 없이 해결 주장 금지. 수정 후 독립 검토와 실제 공급자 검증은 미완료다.

전환 당시 근거는 evidence/reviews/ui-tars-switch-20261007/README.md의 모의 공급자 검증이며 실제 공급자 응답 준수는 미검증이었다. 이 결과를 사용자 설정 실수나 단순 토큰 문제로 돌리지 않는다.
