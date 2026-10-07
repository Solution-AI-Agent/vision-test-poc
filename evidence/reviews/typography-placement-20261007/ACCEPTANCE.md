---
title: "한국어 글자 및 배치 오류 사례 확장 검수"
tags: [vision-test, sample-site, typography, qa]
status: active
created: 2026-10-07
---

사용자 요청 7c0f15f2: 폰트 쏠림·오브젝트 배치 오류 등 독립 오류 사례 확장.

코드 커밋 33eddf2ddb2c861cb26cf53d78fff8e6bd636a7f. 기존 구조를 재사용하여 /store/h 글자 압축·오른쪽 쏠림, /store/i 한글 줄간격 붕괴, /store/j 실제 상품 SVG 위치·회전 오류, /store/k 차트 라벨 위치·각도 오류를 추가했다. 정상 A와 기존 B~G 및 운영자 여섯 상태는 유지했다. 기능·주문 계산은 동일하다. 플랫폼의 정확한 URL 허용 범위를 K까지 확장하고 L/query/hash/다른 host 거부를 검사했다.

전체 workspace 12파일/58테스트(플랫폼55+샘플3), 공유 UI 타입, 두 앱 빌드 PASS. 초기 sandbox Chromium 실행 제한으로 실패한 실행은 성공 증거에서 제외하고 허용된 환경에서 전체 재실행했다.

격리 production 샘플 14311에서 직접 A~K 11주소 및 기존6상태 동일 기능 suite 17/17 PASS. 정상 A와 H~K는 모바일390×844에서도 같은 suite 5/5 PASS. 원래4310/4311 서버는 변경하지 않았다. 직접 경로 요청은 샘플 origin뿐이며 operator/presentation 호출0. 주문 수량2, $24, API201 및 초기화를 검증했다.

데스크톱 첫 방문/주문 완료와 모바일 첫 방문 원본을 직접 검토했다. J는 모바일에서 의도된 위치 이동의 결과로 일부 잘리기도 한다. 모바일 요약/차트는 스크롤 후 보이며 첫 viewport 표시를 주장하지 않는다. 이 자료는 브라우저 full-page 캡처이지 모델 입력이 아니다. 새 H~K 실제 Vision 검출은 미검증, 추가 모델 호출0. 특히 기울어진 디자인의 의도는 정상 기준과 제품 요구사항을 함께 판단해야 한다.

증거: REPOS/vision-test-delivery/evidence/reviews/typography-placement-20261007/ . 원본 PNG/WebM·RESULTS·테스트/빌드 로그·해시·갤러리를 포함했다. 갤러리 Chromium 검사에서20이미지 로딩, 페이지오류0, 모바일수평넘침없음.
