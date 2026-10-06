---
title: "Vision QA v5 Final Video Delivery"
tags: [vision-test, video, evidence, lumen]
status: active
created: 2026-10-05
---

최종 검수 요청본: `OUTBOX/VISION_TEST_LUMEN_V5/VISION_TEST_LUMEN_V5.mp4`.
160초, 1280×720, 24fps, H264, 무음 한국어 자막. SHA256 `7ed43ab8d6f1386cd69344f27dc05b1a5c9eb36f89d654631c1e6cdbfef63163`.

사이트 수락 근거: `WORK_LOGS/VISION_QA_WORKING_DEMO_ACCEPTANCE_2026_10_05.md`.
첫 30초에 동일 결함 실행 ae75c703의 모델 입력/DOM PASS/원응답 첫 영수증 issue, 정상 b7181596의 pass를 연결했다. 이후 실제 UI 캡처의 정상/결함 전환, 주문 완료, 이미지/JSON 링크를 보여준다. 추가 모델 호출은 하지 않았다.

검수 근거: 최종 폴더 `QA_REPORT.txt`, `QA_CONTINUOUS/DECODE_REPORT.json`, `PLAYBACK_REPORT.json`, `DELIVERY_VERIFICATION.json`. 3,840프레임 디코드와 160초 프로그램 실시간 재생을 완료했다. 15장면 대표 및 보완 포함 21프레임을 직접 확인했고 5프레임의 640×360 가독성을 확인했다. GUI 플레이어 전체 시청은 미수행이다.

21개 출처 사본 및 고정 baseline 해시 대조, 업로드/로컬 영상 해시 일치를 확인했다. 인계 파일 실제 존재와 ZIP 125파일 무결성을 확인했다. `OUTBOX/VISION_TEST_LUMEN_REVIEW_V5.zip`은 로컬 묶음이다. 대본·출처·소스는 최종 폴더에 있다.

기존 v4와 82초 실패 중심 중간본은 보존했다. 본편은 작동 데모 중심이며 이전 실패와 선정 단계는 부록에 별도로 남겼다. 성공은 등록된 가독성 기준의 모델 직접 판단이고, 별도 맹검 전사+코드 비교가 아니다. Playwright screenshot도 검출 가능한 선별 주입 사례다. 영상 자체는 POC-LEAD 검수 요청 상태다.

제작 시 인계 경로는 실제 파일 생성과 크기를 확인한 이후 공유한다. 원본 사본의 해시, 최종 코덱 디코드, 실제 시간 재생과 GUI 전체 시청을 각각 구분해 보고한다.
