---
title: "Vision QA 첫 체크포인트 독립 검토"
tags: [vision-test, qa, review]
status: active
created: 2026-10-04
---

## 판단

첫 UI 방향과 모의 공급자 기반 파이프라인 검증은 다음 단계로 진행 가능하다. 실제 OpenRouter/YouTube Vision QA 및 Windows 검증은 미완료다. 최신 코드 전체 또는 최종 제품 합격을 뜻하지 않는다.

## 근거와 검사 상태

- 원본 보고: Buzz event 02313dfab38a42c539cfee78bb8b9531bda070789459d87e2c91cb00dd23846f.
- 공유된 설정/워크스페이스 PNG 두 장을 다운로드해 직접 확인했다. 설정/실행/증거 내비게이션, 다크 테마와 정보 계층이 구성되어 있다.
- http://127.0.0.1:4310 을 Playwright로 읽기 전용 확인했다. 설정·실행 데이터 변경은 하지 않았다. 초기 캡처에서 일부 컨트롤 글자가 어둡게 보였으나 폰트 및 테마 전환 안정화 후 촬영에서는 정상 색으로 확인됐다. 발표용 이미지는 안정화 후 다시 캡처해야 한다.
- npm test 전체 실행: 2 files, 5 tests passed. Git HEAD는 unborn이며 커밋 없는 작업 트리였다. 테스트 전후 아래 9개 소스 해시 동일. 이후 구현 담당자가 편집을 계속했으므로 이 통과를 이후 코드에 소급하지 않는다.
- 모의 공급자 테스트는 Midscene 이미지 블록 전송, 숨겨진 DOM sentinel 비전송, 요소 트리 호출 차단, 좌표 클릭, 모델 호출 한도를 확인했다. 모델의 실제 시각 인지·결함 발견 능력을 검증한 것은 아니다.
- UI/API 체크 로그는 구현 담당자 산출물 artifacts/ui-check/RESULT.json을 읽었으며 API 설정·삭제·시나리오 저장 등의 동작을 이 리뷰에서 재실행하지 않았다.

검사 시점 소스 SHA-256:

```text
server/runner.ts faa924f34a466c69779f61bfe62f5c2a217083c5f55f56ef42a70ee858b5477c
server/domain.ts c3da8755c0b120c17803150533dfa577131cc24de003d4ca492e6d2ba3168ad2
server/index.ts b3a7d5f83afb3036a007b38f24d2f0d57369dccb57a854ce28ddf9e3662eaf0e
src/App.tsx 724c68fe2fc86f74ed4c444646763afd8ea9e1b73e829f63e15619bab2cf9637
src/index.css 51c3686568d67bf1a83e8defd6b4bcc6a4a76e4d05ecb213a374214657844827
server/domain.test.ts 481c75edfed22bfe52526a48d45d14ebceac36ecca25af9af85b072a523f2e6b
server/vision.test.ts bcd3b97c0feafa20c1582ab113728e08c5a9f0fd8c60f052f38d43437a22fd3f
package.json 41c3e9bda0313f5b487c9ad4f6598db09d64ac6addfa3adac33c6b1a640cf4f6
package-lock.json 68ab9793877fc091bfe51f7447fdd5c6772c13a90efd07e4b1f196eee53e1e2e
```

## 보완 및 다음 검사

- 최초 읽은 runner는 보고용 캡처와 aiQuery 내부 캡처가 별개였다. 리뷰 도중 실제 요청 이미지 저장 및 step.before 연결이 추가되는 것을 소스에서 확인했다. 구현 진행 사실이며 아직 최신 버전 테스트를 독립 실행하지 않았다.
- 최초 읽은 상태 갱신은 화면 계획과 행동 여부를 분리하지 않고 UI 설정 상태가 실행 이후 자동 갱신되지 않았다. 이후 visionActed 및 설정 상태 polling이 추가되는 것을 확인했다. 실패/중지/완료별 의미는 다음 체크포인트에서 검증해야 한다.
- src/App.tsx의 상단 Ready to explore는 키 미설정에도 표시된다. 준비 필요/대기/실행 중 등 실제 상태를 표시하도록 요청한다.
- 실제 planner 입력 이미지 hash와 단계/결함 후보의 관찰 시점이 일치하는지 검증한다. finish의 after에 더 이른 캡처가 연결되지 않도록 한다.
- 서버 세션 키 미설정/예산 미확정. 사용자에게 아직 키 입력을 재요청하지 않는다. 최종 로컬 실행 URL과 설정 준비가 검증되면 사용자가 직접 설정하도록 안내한다.
- 영상 제작은 실제 검증 증거 확보 후 진행한다. 스텁을 실제 VLM 결과로 편집하지 않는다.
