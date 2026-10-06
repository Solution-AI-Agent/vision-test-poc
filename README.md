# Vision QA Lab

Vision 기반 Web QA 플랫폼, 독립 테스트용 샘플사이트, 실험 데이터와 영상·HTML 자료를 함께 제공하는 npm workspaces 모노리포입니다. API 키 없이 샘플사이트·저장된 실험 결과·영상을 확인할 수 있습니다. 새로운 Vision 실행에만 OpenRouter 설정이 필요합니다.

- 플랫폼: `apps/platform/` · 독립 샘플사이트: `sample-site/` · 공통 UI: `packages/ui/`
- [테스트 데이터·복원 안내](evidence/README.md) · [영상/HTML 자료](media/index.html)
- GitHub에서는 HTML 원문으로 보일 수 있습니다. 아래 `npm run media:serve` 명령으로 브라우저에서 열어주세요.

## Install and run the monorepo

Requires Node 24 and npm. One root lockfile installs all three npm workspaces:

| Workspace | Source | Purpose |
|---|---|---|
| `@vision-qa/platform` | `apps/platform/` | QA application, server and platform tests |
| `@vision-qa/sample` | `sample-site/` | Independent test-target store and order tests |
| `@vision-qa/ui` | `packages/ui/` | Shared shadcn components, utility and existing theme |

From a fresh clone, in the repository root:

```sh
npm ci
npx playwright install chromium
npm test
npm run build
npm run evidence:restore  # 저장된 테스트 결과와 /demo 원본 링크 복원
```

`npm test` runs every workspace: all platform and sample tests, plus shared UI type checking. `npm run build` type-checks the repository and builds both apps and shared UI. Dependencies are resolved by npm workspaces, not copied manually between apps.

Start the QA platform in one terminal:

```sh
npm start
# equivalent: npm run start --workspace @vision-qa/platform
```

Open **http://127.0.0.1:4310**. Start the independent sample in another terminal:

```sh
npm run sample:start
# equivalent: npm run start --workspace @vision-qa/sample
```

Open the source-defined store revisions directly: **http://127.0.0.1:4311/store/a** (normal) and **http://127.0.0.1:4311/store/b** (rendering mistakes). Neither requires a platform/test/operator call. See [sample source and differences](sample-site/README.md). Legacy **http://127.0.0.1:4311/order** uses separate operator controls at **http://127.0.0.1:4311/operator**. Stop either app independently; the sample does not require the QA platform. Both bind loopback for this local single-user PoC. Production start uses a Node launcher rather than shell environment assignment; it has been executed on macOS. Windows cmd execution remains untested, and this does not add a Windows Native QA driver.

Development: `npm run dev` for platform, `npm run sample:dev` for sample. App-only builds: `npm run platform:build` and `npm run sample:build`. Existing root start/dev/sample commands remain supported. `PORT` overrides platform 4310; `SAMPLE_PORT` overrides sample 4311, but the platform target allowlist remains the exact default sample URL.

With both servers running, `npm run sample:test` runs the same functional suite against both direct source revisions and all six legacy sample states. `npx playwright test --config evaluation/playwright.config.ts` checks the older platform screenshot fixtures; these do not invoke a paid model.

### Runtime data and evidence restoration

All platform launch commands read/write **repository-root `.data/` and `artifacts/`**, independent of workspace working directory. Existing local data stays in place. Recorded `/demo` responses are loaded from `.data/demo-evidence.json`; original run files referenced by `/artifacts/<run-id>/...` must be restored under `artifacts/<run-id>/...`. Restoring evidence must not relocate them into `apps/platform/`. The committed `evidence/` and `media/` directories contain the recorded data, final videos, HTML pages and source manifests. Run:

```sh
npm run evidence:check    # verify preserved source checksums
npm run evidence:restore  # import artifacts/ and .data/, no model calls
npm run media:serve       # http://127.0.0.1:4312/media/index.html
```

The evidence commands call the included `evidence/restore.mjs` (check uses `--check`). Existing different runtime files are not overwritten by that importer. The media server mounts only `/media` and `/evidence` to those publication directories; `/` redirects to `/media/index.html`. Relative source links stay valid. It does not serve the repository root or `.data/`, and does not need either application running. Without restored records, the app shows that recorded evaluation is unavailable. The importer verifies all manifest-listed preserved files before restoring recorded data; it does not call a model. The media pages use relative links and need no files outside this clone.

Build outputs are `apps/platform/dist/` and `sample-site/dist/`. Do not copy old root `dist/` as a deployment build. The independent app's business logic and visible states are unchanged. No new paid evaluation or model-detection claim is part of the monorepo migration.

1. Open **모델 & 설정**, enter an OpenRouter API key, a vision-capable model ID and its Midscene family, and apply limits.
2. **인증 연결 확인** tests the authentication endpoint only. It does not call an image model.
3. Use **자율 탐색** or **등록 시나리오**. The latter stores URL, task and expected result; it does not create user accounts.
4. Review the current screenshot and step log. Stop interrupts the pending model request and closes Chromium.
5. In **증거 & 검토**, inspect model-input and post-action screenshots, candidate observations, expected-behavior basis and reproduction steps. Human confirmation requires a review note. Export JSON or download the raw video.

Keys live only in the server process memory and are not returned to the client, written to disk or exported. Settings must be re-entered after server restart. Scenarios and reports persist in `.data/`; images and WebM recordings persist in `artifacts/`. These live runtime directories are gitignored. The reviewed historical snapshot is committed in `evidence/`; restore it with `npm run evidence:restore`. Treat exported reports and screenshots as potentially containing the target site's content. The UI clears key inputs after saving.

## Architecture and boundaries

React/Vite + Tailwind v4 and official shadcn/ui Radix Nova components form the UI. A local Express server owns session settings, scenario storage, execution and evidence. Only one run is active at once.

`Screenshot → Midscene aiQuery(domIncluded:false) → Zod plan validation → Playwright mouse/keyboard → next screenshot`

Midscene 1.14.0 first selects a concrete screenshot-grounded hypothesis/task/expected result in autonomous mode, then extracts one-step action plans and judgments from screenshots and observation history. Goal selection is logged and does not receive the registered scenario or search term. We deliberately orchestrate steps instead of unbounded `aiAct`, so external requests and coordinate actions have measurable independent limits. This is a Midscene-based planner, **not** a claim that its default `aiAct` loop has been benchmarked.

The product vision path never calls locators or requests DOM/accessibility trees. The exact image passed in each model request is saved as `model-request-N.png/jpg`. Each step links that image and its post-action screenshot. Brief visible observations/action reasons are recorded; hidden reasoning is not exported. Actual response model, request ID, duration, reported token use and reported cost are recorded when available. Costs are provider-response sums, not guaranteed billing totals. Missing costs are shown as unavailable, not zero.

The OpenRouter SDK has no automatic retries; Midscene parse/API retries are disabled. The app permits one explicit structured-output correction request per run, still within the actual request cap. Two identical before/after PNG screens trigger one autonomous goal replan; continued stagnation ends with an explicit inconclusive result. Dynamic content can prevent exact-byte stagnation detection, so hard limits remain the backstop. Actual outgoing request count, time, response tokens per call and actions are bounded. There is no dollar-denominated budget enforcement. Provider error bodies are replaced with a generic error before SDK/Midscene logging. Model compatibility, especially coordinate accuracy, remains model-specific.

Text plans must include screenshot-selected input coordinates. The executor clicks that target, then types; these are two separately counted tool actions. A fresh image-only request checks the visible field value without prior action history. Tool completion, model visual confirmation and independent QA remain distinct. Missing/mismatching/uncertain confirmation or unchanged input screenshots prevent silent submission/success and cause a bounded replan or explicit inconclusive stop. This is a model visual read with a conservative unchanged-image guard, not an independent OCR guarantee. Confirmation requests and focus actions consume the same existing limits.

Public HTTPS YouTube hosts and exact local targets `http://127.0.0.1:4310/fixture/order`, `http://127.0.0.1:4310/demo/order`, and `http://127.0.0.1:4311/order` are the current target scope. Other local ports/paths, fixture query/hash and the operator route are rejected for Vision navigation. Top-level navigation is restricted to those hosts. Chromium uses an isolated unauthenticated context. The planning instructions allow only reversible search/browse/playback/scroll actions and forbid account changes. This is a PoC prompt boundary, not a general adversarial browsing security guarantee.

The fixed comparison path is separate: homepage → `Midscene AI demo` search → visible results, using Playwright role/placeholder locators and a YouTube result-renderer boundary. It makes zero model calls. Compare it only to the default registered **search** scenario, not arbitrary workflows or autonomous exploration. No locator fallback exists in vision mode.

Windows Native is **planned/unverified**. The future platform boundary is capture + validated coordinate action; no Windows driver is claimed or shipped.

## Validation

```sh
npm test              # complete suite: validation boundaries + real Chromium / stub VLM transport
npm run build         # TypeScript and production UI
npm run test:ui       # running local app: settings, persistence, guards, themes, mobile, screenshot/video
npx tsx scripts/youtube-check.ts  # real public YouTube locator comparison, no VLM charge
npx tsx scripts/lifecycle-check.ts # missing-key session only: action cap and immediate stop
```

`apps/platform/server/vision.test.ts` uses a **stub model**, checks the actual Midscene request for an image and absence of a hidden DOM sentinel, forbids DOM extraction, executes the returned coordinate against a real local button and verifies the call cap. It does not prove OpenRouter compatibility or QA judgment quality.

UI validation outputs: `artifacts/ui-check/RESULT.json`, screenshots and raw WebM. YouTube baseline output: `artifacts/youtube-check/RESULT.json` and the referenced run directory. Further facts and limitations are recorded in `HANDOFF.md`.

## Historical experiments (recorded before this monorepo delivery)

The following sections preserve experiment versions and outcomes. Local `OUTBOX/` paths refer to the original workspace; portable copies are now under `evidence/` and `media/`. Final videos v4/v5 are included. The separate 4311 sample has functional tests and screenshots, but no new live Vision evaluation.

### Earlier fixed-code live snapshot

The user supplied a temporary key and requested `qwen/qwen3-vl-30b-a3b-instruct`. Final live runs used clean code commit `8fcac127a2e76abb5da45ecad8913367f9d33267`, prompt `goal-first-v3-protocol-and-replan`, and limits of 6 actions / 8 actual requests / 120 seconds / 2048 response tokens per request.

| Final mode | Observed result | Requests / actions | Time | Reported cost |
|---|---|---|---|---|
| Registered search | Actual related YouTube results reached; 0 defect candidates | 5 / 4 | 28.991 s | $0.00236504 |
| Autonomous | Screenshot-selected cooking search; failed to focus input, one replan did not recover; stopped inconclusive; 0 candidates | 6 / 4 | 43.431 s | $0.00283305 |

The complete package suite at that code commit passed **2 files / 10 tests**, and TypeScript + Vite build passed. Final UI evidence was captured after font/theme stabilization. Earlier failed runs and the initial app false positive are preserved. All eight live attempts total 42 actual requests and provider-reported $0.0198094. The separate locator baseline reached results; different execution times, ads and operation units prevent a general speed comparison.

**Autonomous defect discovery remains unproven.** The final autonomous run demonstrates goal selection and bounded failure handling, not successful task completion. YouTube has no complete defect ground truth: do not report recall/miss rates or treat zero findings as proof of no bugs. Windows execution and the edited explanatory video are not complete. `HANDOFF.md` identifies final run IDs, evidence and reproduction commands; raw UI/target recordings are available for video production.

## References

- [Midscene Playwright integration](https://www.midscenejs.com/integrate-with-playwright)
- [Midscene model configuration](https://www.midscenejs.com/model-config)
- Installed 1.14.0 source: `node_modules/@midscene/core/dist/es/agent/tasks.mjs` (`opt.domIncluded` guard), `ai-model/workflows/insight/extraction.mjs` (screenshot input).
- [Official shadcn Radix components](https://ui.shadcn.com/docs/components/radix/button); configuration: `components.json`.
- Assigned Buzz issue: `9e337825e69ad3451b39798622a0d693b335fcf02ba24f5595c0526ad7d1c40f`.

## Input-confirmation follow-up: one live run

Code `82f28b93d54e210dfefd18cad30d7c1517ac296a` (clean at startup), prompt `goal-first-v4-focus-and-visual-input`, runner/domain hash `85d6c7947f5d68b6384e911446115f749050c46389c3c2cd0101b038ad5e1f20`. Full package suite **2 files / 13 tests** and build passed with the same HEAD before/after.

One authorized autonomous retry `882f0db4-631d-4d35-bb24-b5af2e688930`, same `qwen/qwen3-vl-30b-a3b-instruct`, 6 actions / 8 requests / 120 seconds / 2048 output tokens limits. Observed: **8 requests / 6 tool actions / 46.747 seconds / reported $0.00422962 / 0 candidates**. Focus click and typing each counted, input confirmation was request 4. The model selected `tutorials` without a seeded query. `model-request-4.jpg` visibly contains that text in the input; Maker directly confirmed it.

**Result perception still failed.** The final `model-request-8.jpg` and `5-decision.png` visibly show a tutorial-related video result plus an ad. The model incorrectly described search suggestions/no results, repeated Enter, and the controller ended at the action limit. Thus real input and result-screen arrival are observed, but the agent did not recognize task completion; autonomous QA judgment and defect discovery remain unproven. No additional live attempt was made. Original eight runs remain intact; all nine are 50 requests / provider-reported $0.02403902, not a common-version success-rate sample or billing total.

New evidence: `artifacts/live-check/INPUT_CONFIRMATION_SUMMARY.json`, unique run report, and `artifacts/input-confirmation-capture/` stabilized UI screenshots/video. Earlier UI captures remain unchanged. Local `OUTBOX/VISION_QA_INPUT_CONFIRMATION_EVIDENCE.zip` bundles only this follow-up and review note; original bundle remains intact. ZIP/WebM are not uploadable through this Buzz relay, so delivery attaches PNGs and gives local original paths.

The live-check exporter now waits for endedAt before saving a final report, because status can change before video/context close completes. The early snapshot is preserved separately as `..._EARLY_SNAPSHOT.json`; finalized data came from the API after termination, without another model call. Independent review should use the finalized report, not the early snapshot.

## Controlled differentiation site — 2026-10-05

Order demo: http://127.0.0.1:4310/fixture/order; operator: http://127.0.0.1:4310/fixture/operator. Use port4310 for fixture Vision work. [CONTROLLED_SITE_HANDOFF.md](CONTROLLED_SITE_HANDOFF.md) contains frozen criteria, reproduction, full matrices and source versions. Same functional DOM suite passes normal, clipped notice, wrong canvas total and harmless palette states. Separate normal-reference Playwright screenshot assertions distinguish both injected defects.

The fixed actual-model 4×3 evaluation **did not prove Vision differentiation**: all twelve responses were PASS, including six missed injected defects. Normal/benign states had no false positives. 12 actual requests / reported $0.00466121, no paid reruns. Model input and raw judgment mismatch are preserved for independent review. This is registered-criteria screenshot assessment, not autonomous discovery. Previous YouTube evidence and LUMEN video v4 remain intact; new differentiation video needs verified successful evidence before claiming a Vision-only detection.

## Selected-case differentiation demo

Open http://127.0.0.1:4310/demo and switch normal/fault, then confirm the prefilled order. Same meaningful functional suite passed for both; actual Vision recognized the selected large receipt-occlusion case 3/3 while normal passed 3/3. Saved original image/raw log links are shown in the UI; toggling does not call a model. See [DEMO_HANDOFF.md](DEMO_HANDOFF.md) for exact runs, local artifact restoration and limitations. The first candidate was missed; original four-state matrix remains a failed detection experiment. The later blind diagnostic remained inconclusive due to invalid localization. This selected demo is not held-out performance or autonomous discovery, and Playwright screenshot comparison detects it too.

## Independent sample target (current deliverable)

The QA platform remains on 4310. A separate ordinary store runs at **http://127.0.0.1:4311/order** with its own process/API/build. Operator **http://127.0.0.1:4311/operator** selects normal, misalignment, occlusion, clipping, wrong product image, or reversed chart presentation. Run `npm run sample:build` then `npm run sample:start`; see [sample-site/README.md](sample-site/README.md). The platform can target the exact 4311/order URL through its usual scenario workflow. New sample model detection is unverified; previous /demo evidence and v5 remain historical originals.

## Current sample and older experiment archive

The standalone direct store revisions reproduce mistakes from their own CSS/asset/chart source: the real community chart overlaps the real receipt, collection text is clipped, the selected red mug is shown blue, and 80/20 chart widths are reversed. No blank covering panel is rendered by the standalone app and no test runner injects its layout. Stable /store/a and /store/b choose app-source versions; legacy /order operator states remain available. Business logic is identical in both versions.

Platform `/demo` is labelled **previous experiment records** and links to the current separate sample. Stored judgments, media v4/v5 and evidence remain unchanged historical artifacts; they do not establish model detection on the new revisions. No paid model evaluation was performed for this change.

### 한국어 샘플 테스트

현재 /store/a와 /store/b의 상품·입력·영수증·수령 안내·차트·오류·운영자 화면은 한국어입니다. 예시: “빨간 머그 2개를 선택하고 테스트용 이름과 이메일을 입력해 주문을 확정한 뒤, 이미지와 영수증·수령 안내·차트가 일치하고 읽을 수 있는지 확인하세요.” 이전 영어 영상과 모델 판정은 과거 자료로만 보존합니다.

플랫폼을 종료하고 샘플 서버만 실행한 상태에서 `npx tsx scripts/direct-store-capture.ts`를 실행하면 운영자 호출 없는 일반 브라우저 방문·주문 화면을 새 artifacts 폴더에 남깁니다. 캡처는 모델 입력이나 검출 성공 증거가 아닙니다.


### 사내 프록시와 실행 점검 (Windows PowerShell)

앱 시작 전 환경변수만 설정하면 인증 확인과 실제 Midscene/OpenRouter 이미지 요청, Chromium 외부 탐색에 반영됩니다. 프록시가 없으면 직접 접속하며, 프록시 오류에서 직접 접속으로 자동 우회하지 않습니다. `HTTP_PROXY`, `HTTPS_PROXY`, `NO_PROXY`의 소문자도 지원하며 동시에 있으면 소문자가 우선입니다. HTTPS_PROXY가 비어 있으면 HTTP_PROXY를 사용합니다. 로컬 `127.0.0.1`, `localhost`, `::1`은 항상 직접 연결합니다. `NO_PROXY`는 쉼표로 구분하는 호스트/도메인 패턴(예: `*.internal.example`)·포트 또는 `*`입니다.

```powershell
$env:HTTP_PROXY = "http://proxy.company.example:8080"
$env:HTTPS_PROXY = "http://proxy.company.example:8080"
$env:NO_PROXY = "localhost,127.0.0.1,::1,*.internal.example"
# 사내 CA가 필요한 경우, IT가 제공한 신뢰할 PEM 인증서를 앱 시작 전에 지정
$env:NODE_EXTRA_CA_CERTS = "C:\certs\company-ca.pem"
npm ci
npx playwright install chromium
npm run build
npm run doctor
npm start
# 샘플 서버는 별도 터미널에서 실행
npm run sample:start
```

`npm run doctor`는 API 키 없이 로컬 Chromium 시작 → 화면 캡처 → FFmpeg 동영상 생성과 Node/Playwright 버전을 JSON으로 점검합니다. 임시 파일은 제거하며 모델·외부 네트워크를 호출하지 않습니다. 프록시의 설정 여부만 표시하고 주소·인증값은 표시하지 않습니다. 따라서 doctor PASS는 OpenRouter 연결/이미지 실행의 성공을 뜻하지 않습니다. 브라우저 또는 동영상 설치 실패에는 `npx playwright install chromium`을 먼저 실행하세요.

실행 관찰에는 실패 단계·안전한 코드·조치가 남습니다. API 키·프록시 주소/인증·공급자 오류 원문을 공유하지 말고 오류 코드와 doctor 결과를 전달하세요. 인증 확인은 키 권한 요청만 확인하며 실제 모델 실행과 구분합니다. Windows 사내망에서 실제 동작은 사용자 환경에서 확인해야 합니다. 이번 구현 검증은 Mac의 로컬 모의 프록시입니다.

Node fetch는 명시적 Undici dispatcher를 사용하므로 Node 24.0에서 시작 후 `NODE_USE_ENV_PROXY` 변경에 의존하지 않습니다. Chromium은 별도 Playwright proxy 옵션을 사용합니다. HTTP/HTTPS 프록시가 다르면 브라우저는 시작 대상 URL의 scheme에 맞는 프록시를 사용하며 해당 탐색의 다른 외부 리소스에도 같은 브라우저 프록시가 적용됩니다. PAC/OS 자동 프록시·NTLM/Kerberos 자동 인증은 지원 범위가 아닙니다. URL의 기본 인증은 지원합니다. 사내 인증서의 Chromium 신뢰는 Windows/브라우저 신뢰 저장소에 별도로 설치해야 하며 `NODE_EXTRA_CA_CERTS`는 Node용입니다. TLS 검증을 끄는 설정은 사용하지 않습니다.

근거: [Node의 프록시 지원과 시작 시점](https://nodejs.org/docs/latest-v24.x/api/http.html#built-in-proxy-support), [Undici EnvHttpProxyAgent](https://github.com/nodejs/undici/blob/main/docs/docs/api/EnvHttpProxyAgent.md), [Playwright proxy 옵션](https://playwright.dev/docs/api/class-browsertype#browser-type-launch-option-proxy). 테스트 전용 자체 서명 인증서/키는 `apps/platform/server/test-fixtures/`에 있으며 격리된 모의 TLS 서버에서만 신뢰합니다. 실제 API 인증값이 아니고 개발 환경의 전역 신뢰 저장소에 설치하지 않습니다.


### 결함별 한국어 직접 테스트 주소

정상 [매장 A](http://127.0.0.1:4311/store/a)와 기존 [복합 매장 B](http://127.0.0.1:4311/store/b)는 유지합니다. 개별 테스트는 [C: 크기/배치 뒤틀림](http://127.0.0.1:4311/store/c), [D: 실제 차트 겹침](http://127.0.0.1:4311/store/d), [E: 필수 안내 잘림](http://127.0.0.1:4311/store/e), [F: 상품 이미지 불일치](http://127.0.0.1:4311/store/f), [G: 차트 의미 불일치](http://127.0.0.1:4311/store/g)입니다. 각 페이지에는 한 종류만 적용되며 첫 방문부터 나타납니다. 플랫폼·운영자 호출·테스트 주입 없이 앱 자체 소스에서 재현됩니다.

실행: `npm run sample:build` → `npm run sample:start`. 사례 목록은 별도 [운영자 화면](http://127.0.0.1:4311/operator), 소스 발생 지점·정상 비교·검사 범위는 [샘플 안내](sample-site/README.md#개별-결함-직접-url-현재-버전)를 참고하세요. 같은 기능 suite는 `npm run sample:test`로 직접 7주소+운영자 6상태를 확인합니다. 새 페이지의 실제 Vision 검출은 미검증이며 추가 유료 호출은 없습니다.
