---
title: "UI-TARS 응답 차단 수정 독립 검토"
tags: [vision-test, ui-tars, independent-review]
status: active
created: 2026-10-08
---

검토 커밋: dd845fc98550cfbc1798b13f70ae04fe07c4bb29, base 72520e0. 작업본 REPOS/vision-test-maker.

4파일 변경과 plan-response.test.ts를 직접 읽었다. 원응답·usage·finish reason 기록 후 SDK 반환 전에 length 응답을 차단한다. 부분 JSON과 닫힌 유효 JSON 모두 length이면 계획·행동 없이 실패한다. 누락 data-json은 별도 진단, control/goal 경로와 visual truncation을 포함한다.

동일 셸에서 HEAD 확인 → npm test → npm run build → HEAD 확인. 시작·끝 HEAD 모두 dd845fc98550cfbc1798b13f70ae04fe07c4bb29. platform 68, sample 3 PASS; 공유 UI 타입검사 및 두 앱 빌드 PASS. 번들 크기 경고만 존재. 실험은 모의 모델과 로컬 Chromium으로 수행했으며 유료 호출 0.

판정: 잘림 차단·진단 구분만 수락. UI-TARS 실제 계획 복구는 미해결. 기존 실행 서버·설정·키 및 GitHub main에 변경을 적용하지 않았다.

다음 작업은 POC_MAKER에 객체형 demand와 기존 문자열 demand를 비교하는 최대2호출·재시도0·행동0의 독립 실험 스크립트 준비로 위임했다(Buzz event 7255df5bbdf091b4d5e0041e81a04715cefb5a0e318369068b4cc46e9443c157). 아직 유료 실행하지 않는다. 원래 실패 업무를 고정해 형식 준수 여부를 보고, 사용자 최초 한국어 시나리오와 구분한다.
