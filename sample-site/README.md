# 한국어 Atelier Goods 샘플 매장

QA 플랫폼과 독립된 일반 주문 사이트입니다. 같은 상품 선택·입력 검증·계산·주문 API·완료·초기화 코드에 앱 소스의 CSS/SVG/Canvas 오류만 적용합니다. 직접 주소는 플랫폼·운영자 API·테스트 실행 없이 일반 브라우저에서 열립니다. 대상 페이지에는 결함명·정답·QA 판정이 없습니다.

## 직접 방문과 정상 비교

주소 앞에 `http://127.0.0.1:4311`을 붙이세요.

| 경로 | 앱 소스의 화면 상태 | 정상 비교 |
|---|---|---|
| `/store/a` | 정상 상품·주문 요약·안내·차트 | 모든 개별 페이지의 대조군 |
| `/store/b` | 이전 복합 버전: 겹침·잘림·상품 이미지·차트 오류 (호환 보존) | A |
| `/store/c` | 실제 상품 요약/영수증의 크기·배치 뒤틀림: 과도한 폭·기울기·세로 압축 | A |
| `/store/d` | 실제 인기 상품 차트가 실제 주문 요약/영수증 위에 겹침 | A |
| `/store/e` | 실제 수령 안내 컨테이너 높이 오류로 필수 한글 안내가 잘림 | A |
| `/store/f` | 빨간 머그 선택·주문·데이터는 정상이나 실제 SVG 이미지가 파란색 | A |
| `/store/g` | DOM의 노트 80%/머그 20%는 정상이나 Canvas 막대가 반대로 표시 | A |

C~G는 각각 해당 결함 한 종류만 적용하며 A는 모두 정상입니다. 첫 방문부터 차이를 확인할 수 있고 주문 후에도 유지됩니다. 실제 상품·요약·안내·차트가 동일 구성요소이며 빈 덮개 요소나 테스트 주입은 없습니다.

빨간 머그와 수량 2개를 선택하고 테스트용 이름·유효한 이메일을 입력한 뒤 **주문 확정하기**를 누르세요. 모의 주문이며 실제 결제는 발생하지 않습니다. UI·label·placeholder·오류·영수증·운영자·HTML lang는 한국어입니다. 브랜드와 달러 가격/계산 규칙은 유지합니다.

## 설치와 별도 실행

Node 24 이상, 저장소 루트에서:

```sh
npm ci
npm run sample:build
npm run sample:start
```

샘플 서버는 4311이고 QA 플랫폼 4310이나 모델 키가 필요 없습니다. 개발용은 `npm run sample:dev`입니다. `SAMPLE_PORT`로 서버 포트를 변경할 수 있으나 플랫폼 allowlist는 기본 4311의 정확한 경로만 허용합니다. 샘플 빌드는 `sample-site/dist`, 플랫폼 빌드는 `apps/platform/dist`입니다. 통합 설치/빌드/테스트는 루트 `npm ci`, `npm run build`, `npm test`입니다.

## 앱 자체의 결함 발생 지점

- `presentation.ts`: `/store/a`~`/store/g`의 소스 버전 선택. `main.tsx`가 직접 URL에서 로컬 초기화하며 `/api/presentation`이나 `/api/operator`를 호출하지 않습니다. 운영자 상태·새로고침과 무관하게 버전이 고정됩니다.
- `main.tsx`의 실제 상품 요약/영수증 transform과 `style.css`의 `.sample-layout-distorted`: 과도한 폭과 기울기·압축.
- `style.css`의 `.sample-chart-integrated`: 정상에도 있는 차트의 잘못된 음수 margin이 요약/영수증에 겹침. 빈 overlay를 추가하지 않습니다.
- `CollectionInstructions`: 같은 한글 세 줄을 유지하지만 표시 높이가 84px 대신 26px이어서 핵심 안내를 읽을 수 없음. 주문 전에도 보입니다.
- `ProductVisual`: 선택값·상품명·가격·aria-label은 빨간 머그인데 SVG 색상만 파란색.
- `CollectionChart`: 값·라벨·aria-label은 노트 80%/머그 20%인데 Canvas에 쓰는 길이만 20/80으로 역전.

업무 정답은 `order.ts`와 `/api/orders`에 있고 시각 상태를 주문 데이터에 넣지 않습니다. 주문 API는 product/quantity/name/email만 받으며 클라이언트가 전달한 가격·상태는 거부합니다. 지침과 화면 결함은 기능 검사 통과와 별개입니다. Playwright screenshot 또는 별도 시각 assertion으로도 이러한 사례를 검사할 수 있습니다.

## 별도 운영자 화면과 기존 주소 호환

`http://127.0.0.1:4311/operator`에서 모든 직접 URL와 사례 목록을 열 수 있습니다. 여섯 운영자 상태(정상·뒤틀림·겹침·잘림·상품 이미지·차트)는 **기존 `/order`에만** 적용합니다. 운영자 선택은 새 `/order` 방문에 반영되고 정상 초기화가 가능합니다. 직접 `/store/a`~`/store/g`에는 영향을 주지 않습니다.

## 기능 검사와 일반 브라우저 원본

```sh
npx playwright install chromium
npm run sample:test
# QA 플랫폼을 끈 뒤 일반 브라우저 캡처
npx tsx scripts/direct-store-capture.ts
```

같은 `scripts/sample-baseline.ts` suite를 직접 URL 7개와 기존 운영자 여섯 상태(총 13개)에 사용합니다. 직접 URL은 운영자 설정보다 먼저 검사합니다. 방문/입력/클릭/검증만 하며 DOM/CSS 주입·route 응답 변경·init script는 없습니다. 검사 범위는 입력 오류, 상품/수량 변경·계산, 주문 API 201, 수신자·상품/명세·합계·영수증·안내 DOM, 차트 값/label, 주문 초기화입니다.

`scripts/sample-check.ts`는 기능 결과·요청 기록·주문 전후 PNG/WebM을 새로운 `artifacts/source-layout-sample-<timestamp>/`에 남깁니다. `direct-store-capture.ts`는 플랫폼이 꺼졌는지 확인하고 일곱 URL의 **첫 방문과 주문 완료** 일반 브라우저 PNG/WebM, 샘플 origin 요청만 사용했는지·운영자/표현 API 호출 0건·page error 여부를 `artifacts/direct-korean-store-<timestamp>/`에 기록합니다. 이 캡처는 모델 입력이나 실제 검출 증거가 아닙니다. 기존 원본을 덮어쓰지 않습니다.

## 플랫폼 대상 URL과 자연어 예시

플랫폼의 URL allowlist와 주문 actionScope는 정확히 `http://127.0.0.1:4311/order`와 `/store/a`~`/store/g`만 허용합니다. query/hash/사용자정보, `/store/h`, 운영자·API·다른 origin/포트·localhost 별칭은 제외됩니다. 플랫폼은 캡처/행동만 수행하며 사이트의 렌더링을 만들거나 바꾸지 않습니다.

예시: “빨간 머그 2개를 주문하고, 상품 그림과 선택한 상품이 일치하는지, 주문 요약과 필수 수령 안내가 겹치거나 잘리지 않는지, 인기 상품 비율의 값과 막대 크기가 일치하는지 확인하세요.”

**이 개별 한국어 페이지의 실제 Vision 검출은 미검증이며 추가 유료 호출은 없습니다.** 과거 영어 영상·4310 `/demo`의 저장 판정·이전 실측은 과거 실험 기록으로 보존하며 새 페이지의 성공으로 사용하지 않습니다.
