# Standalone Atelier Goods sample

Ordinary direct browser visits (no QA platform, test execution or operator call required):

- **http://127.0.0.1:4311/store/a** — normal source revision
- **http://127.0.0.1:4311/store/b** — source revision with rendering mistakes

Both show the same store components and use the same input validation, authoritative pricing, order API and submission/reset logic. The page contains no QA result or defect names. 빨간 머그와 수량 2개를 선택하고, 받는 분과 유효한 테스트용 이메일을 입력한 뒤 **주문 확정하기**를 누르세요. The rendering differences are already visible before submission (product and chart) and after it (receipt, instructions and chart).

## Install and run

Node 24 and npm; from repository root:

```sh
npm ci
npm run sample:build
npm run sample:start
```

This separate server and Vite build run on 4311. It does not require the QA platform (4310) or an API key. Development: `npm run sample:dev`. `SAMPLE_PORT` overrides the server port, but platform allowlisting uses the exact default URLs. Build output is sample-site/dist; platform output is apps/platform/dist.

## Where the app-source mistakes occur

`presentation.ts` contains stable, URL-selected source revisions. Direct revisions initialize locally in `main.tsx`; they never request `/api/presentation` or `/api/operator`. Reloading or changing operator state cannot change /store/a or /store/b.

| Actual UI | Store A | Store B | Source |
|---|---|---|---|
| Receipt and community chart | chart follows receipt | wrong negative chart margin pulls the real chart over receipt amounts | `style.css`, `.sample-chart-integrated`; `CollectionChart` in `main.tsx` |
| Collection instructions | all three lines readable | wrong 26px height clips real instruction content | `presentation.ts` noticeHeight; collection section in `main.tsx` |
| Selected Red mug artwork | red SVG mug | wrong blue SVG color while selection/name/order remain red mug | `presentation.ts` mugColor; `ProductVisual` in `main.tsx` |
| Community chart | 80% bar four times longer than 20% | rendering widths reversed while labels/DOM values remain 80/20 | `presentation.ts` firstBar/secondBar; `CollectionChart` Canvas drawing |

The chart section is present in both revisions, with real labels and bars. There is no blank `sample-render-panel` or test-created overlay in this standalone app. This is an application layout/asset/chart regression sample, deliberately authored for demonstration; not a claim of naturally occurring defects. Its functional data is still correct, and screenshot or purpose-built visual assertions could detect these differences.

## Legacy operator compatibility

**http://127.0.0.1:4311/operator** still selects six source-defined layouts for **/order** only. State changes apply to freshly opened /order pages, reset restores normal. Its occluded state now uses the real chart's erroneous spacing, not a blank covering element. Other individual states are normal, receipt rotation/offset, clipped instructions, blue mug, reversed chart. `/store/a` and `/store/b` ignore this process-wide selection.

Orders are simulated with no real payment/external mutation or persistence. Red mug $12, notebook $32, clips $8; quantity 1–5. POST /api/orders validates input and calculates cents on the server; supplied prices are rejected. Business code `order.ts` never reads presentation or URL revision.

## Platform and historical records

Use the usual URL/scenario fields on 4310 with either direct store URL. 예시 시나리오: “빨간 머그 2개를 선택하고 테스트용 이름과 이메일을 입력해 모의 주문을 확정하세요. 상품 이미지, 영수증, 수령 안내와 차트를 확인하세요.” 기대 결과: “선택한 상품과 이미지가 일치하고 계산이 정확해야 합니다. 영수증과 필수 수령 안내를 읽을 수 있고, 차트 크기는 표시 값과 일치해야 합니다.” Do not supply defect names or answers.

Only exact 127.0.0.1:4311 paths /order, /store/a and /store/b without query/hash/credentials are allowlisted. Operator, API, other paths/ports and localhost aliases remain rejected. Capture/planning does not modify the sample DOM or CSS. Actual model detection on these new source revisions is **unverified**; this change makes zero paid requests. Platform /demo is explicitly an **older experiment archive**. Its stored results and older videos describe the previous 4310 fixture, not these source revisions.

## Verification

```sh
npm test
npm run build
npm run sample:test
```

The same functional assertions cover both direct URLs first (before any operator setup), then all six legacy states. Visits/inputs/checks only: no DOM/CSS injection, route-response replacement, test init scripts or rendering modifications. Direct requests are recorded and must remain on 4311, without operator/presentation requests. Functional checks cover input rules, product/quantity recalculation, semantic labels/values, actual API 201/calculated data, receipt/instructions DOM, confirmation and reset. There is no hidden color/bar-size/screenshot assertion in the functional suite.

Each run writes a new `artifacts/source-layout-sample-<timestamp>/` with checkout/confirmation PNG, WebM, request list, version and functional results. Captures are full-page browser images at 1280×720 viewport, not model inputs. Older evidence/media are preserved unchanged.

## npm workspace

This app is `@vision-qa/sample`, sharing `@vision-qa/ui` components and theme without importing the platform application. Root compatibility commands remain supported; direct workspace dev/build/start/test commands work as well.

## 한국어 화면

상품명·입력 라벨/예시·버튼·완료·영수증·수령 안내·차트·검증 오류·운영자 화면은 한국어이며 HTML lang=ko입니다. 한글은 Apple SD Gothic Neo / 맑은 고딕 / Noto Sans KR / 시스템 sans-serif로 표시합니다. 정상 수령 안내는 세 줄이며 잘못된 26px 높이에서는 나머지 한글 안내가 잘립니다. 통화와 계산은 기존 달러/센트 규칙을 유지합니다. 이전 영어 원본·영상은 보존하고 새 한글 화면의 모델 실측으로 사용하지 않습니다.
