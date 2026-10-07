# Vision QA Lab

## 공통 Agent 지침과 로컬 저장

**모델 & 설정 → 공통 Agent 지침**에 일반 검사 기준을 최대 8,000자로 입력한 뒤 **지침·설정 저장**을 누르세요. 등록 시나리오의 화면 계획·판단과 자율 탐색의 목표 선택·재계획·판단에 적용됩니다. 실행 중에는 설정 변경이 차단되며 실행 요약과 JSON에 당시 지침을 보존합니다. 입력 결과의 중립적 전사와 Playwright 고정 비교군에는 지침을 넣지 않습니다.

모델·한도·지침은 `.data/settings.json`에 원자적으로 저장하고 재시작 후 복원합니다. 기존 시나리오·실행·검토 기록은 `.data/`, 이미지·녹화는 `artifacts/`에 유지됩니다. 별도 DB 설치나 기존 파일 이전은 필요 없습니다. API 키는 프로세스 메모리에만 보관하며 재시작 후 다시 입력합니다. 손상된 설정 파일은 덮어쓰지 않고 오류를 알립니다.

예시 지침: “현재 화면에서 읽기·식별을 방해하는 겹침, 잘림, 비정상적 변형과 이미지·문구의 모순을 살펴보고 실제 보이는 위치와 근거를 기록한다. 단순한 디자인 취향만으로 결함을 확정하지 않는다.”

이 기능은 사용자 지침 전달 기능이며 별도의 전면 시각 감사 단계를 추가한 것은 아닙니다. 지침을 넣었다는 사실만으로 모델의 실제 검출 성공을 보장하지 않으며, 실행의 ‘완료’는 선택한 업무의 종료 상태입니다.

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

Keys live only in the server process memory and are not returned to the client, written to disk or exported. Model settings, limits and common Agent instructions are saved in `.data/settings.json` and restored on restart; the API key must be re-entered. Scenarios and reports persist in `.data/`; images and WebM recordings persist in `artifacts/`. These live runtime directories are gitignored. The reviewed historical snapshot is committed in `evidence/`; restore it with `npm run evidence:restore`. Treat exported reports and screenshots as potentially containing the target site's content. The UI clears key inputs after saving.

## Architecture and boundaries

React/Vite + Tailwind v4 and official shadcn/ui Radix Nova components form the UI. A local Express server owns session settings, scenario storage, execution and evidence. Only one run is active at once.

`Screenshot → Midscene aiQuery 업무 분해 → aiInput / aiAct → aiString 값 확인 → aiAssert 결과 확인`

선택과 문자 입력을 분리합니다. 입력/선택 전에 현재 화면에서 컨트롤 종류와 값을 다시 확인하고, 편집 가능한 칸만 `aiInput`으로 보냅니다. 라디오·항목 버튼·드롭다운은 선택 행동으로 처리하며 이미 선택된 값은 상태 확인으로 완료합니다. 종류가 불분명하거나 선택 결과가 다르면 중단합니다. 이 확인도 모델 요청 한도에 포함되며 모델 오판 가능성은 남습니다.

Midscene 1.14.0이 화면에서 직접 입력칸을 찾고(`aiInput`, `deepLocate:true`, `mode:replace`), 클릭·스크롤은 `aiAct`로 수행합니다. 자체 좌표 클릭 루프는 현재 실행 경로에서 제거했습니다. 자율 모드의 업무 선택과 등록 시나리오는 같은 실행기를 사용합니다. 실행 목록의 입력을 확인하지 못하면 다음 단계로 넘어가지 않습니다. 입력 후 `aiString`에는 기대값을 주지 않고 실제 보이는 값만 읽게 하며 코드에서 비교합니다. 마지막 `aiAssert`는 원래 업무와 결과를 현재 화면에 대조합니다. 이것도 모델 판단이므로 무오류 보증은 아닙니다.

The production Vision path disables DOM extraction and has no locator fallback. Midscene owns localization and execution. Every transmitted image, including deep-locate crops, is saved without re-encoding as `model-request-N[-image-M].jpg/png`. Request count, duration, response usage/cost, SDK actions and before/after frames are retained. Native XML responses are preserved with the transport record; historical runs keep their original engine/version.

Every actual model request and SDK action consumes the configured limits. An `Input` counts as one SDK action (including its internal focus/replacement), unlike the historical custom executor's three calls. Stop/time limits abort provider requests and close Chromium. Provider retries and caches are disabled. Midscene can replan only within the same request/action/time limits. There is no dollar-denominated budget enforcement. Raw provider error bodies are redacted. Independent visual QA remains a separate reviewer and does not inherit task completion as visual correctness.

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

정상 [매장 A](http://127.0.0.1:4311/store/a)와 기존 [복합 매장 B](http://127.0.0.1:4311/store/b)는 유지합니다. 개별 테스트는 [C: 크기/배치 뒤틀림](http://127.0.0.1:4311/store/c), [D: 실제 차트 겹침](http://127.0.0.1:4311/store/d), [E: 필수 안내 잘림](http://127.0.0.1:4311/store/e), [F: 상품 이미지 불일치](http://127.0.0.1:4311/store/f), [G: 차트 의미 불일치](http://127.0.0.1:4311/store/g), [H: 글자 쏠림](http://127.0.0.1:4311/store/h), [I: 줄간격 붕괴](http://127.0.0.1:4311/store/i), [J: 상품 그림 정렬 이탈](http://127.0.0.1:4311/store/j), [K: 차트 라벨 위치 이탈](http://127.0.0.1:4311/store/k)입니다. 각 페이지에는 한 종류만 적용되며 첫 방문부터 나타납니다. 플랫폼·운영자 호출·테스트 주입 없이 앱 자체 소스에서 재현됩니다.

실행: `npm run sample:build` → `npm run sample:start`. 사례 목록은 별도 [운영자 화면](http://127.0.0.1:4311/operator), 소스 발생 지점·정상 비교·검사 범위는 [샘플 안내](sample-site/README.md#개별-결함-직접-url-현재-버전)를 참고하세요. 같은 기능 suite는 `npm run sample:test`로 직접 7주소+운영자 6상태를 확인합니다. 개별 페이지의 실제 검출 재현에서는 미탐이 확인됐습니다. 자세한 프로토콜·원응답·오탐은 [실측 기록](evidence/recordings/lead-live-authorized-20261006/README.md)에 있습니다.


## 독립 시각 QA와 붉은 영역 표시

등록 시나리오와 자율 탐색은 업무 계획과 별도로 **첫 화면·행동 후 화면·업무 종료 화면**을 공통 기준으로 검사합니다. 같은 화면의 캡처 바이트가 이전 검사와 같으면 기록을 재사용합니다. 페이지별 결함명·정답·고정 좌표는 검사에 전달하지 않습니다.

공통 기준은 가독성, 비정상적 변형/깨짐, 구성요소 겹침, 이미지와 설명의 모순, 차트와 값의 모순입니다. 모델은 관찰 근거·기대 상태·사용자 영향·다른 가능한 해석과 화면 안의 정규화 영역을 반환해야 합니다. 취향·의도적인 장식·로딩·화면 밖 정보만으로 결함을 만들지 않도록 지시합니다.

후보가 있으면 이전 지적을 전달하지 않은 새 캡처로 한 번 더 검사합니다. 같은 기준과 겹치는 영역의 재관찰은 **반복 관찰된 후보**이며 사람의 확정 판정은 아닙니다. 불일치나 호출 한도 부족은 의심/재확인 미완료로 남깁니다. 모든 검사와 재확인은 기존 모델 호출·시간 한도에 포함됩니다. 검사 단계가 추가되므로 같은 한도에서 가능한 업무 행동 수는 줄 수 있습니다.

실행 관찰에서 요약과 최근 표시 캡처를, 증거 검토에서 항목별 근거·붉은 박스·원본·재확인 화면을 볼 수 있습니다. 영역 주석은 원본 모델 입력을 내장한 SVG로 저장/다운로드하며 대상 앱 DOM을 수정하지 않습니다. 유효하지 않은 좌표는 임의로 보정하지 않고 판단 불가로 표시합니다. 기존 실행 기록에는 검사를 소급 적용하지 않습니다.

`실행 종료`는 전체 QA 합격이 아닙니다. `검사한 화면에서 시각 후보 없음`도 사이트 전체의 정상 보증이 아닙니다. 이 추가 경로는 모의 공급자로 정상·후보 재현·불일치·잘못된 좌표·한도를 검증했습니다. 2026-10-06 실제 재현에서 기존 단일 화면 검사는 C/D/G를 놓쳤습니다. 정상 기준 이미지를 제공한 별도 비교는 일부 차이를 지적했지만 미탐·오탐도 남았습니다. 기능 수정·붉은 박스 표시 지원은 검출 신뢰성의 입증과 다릅니다.

### 한국어 요약과 Midscene 입력 동작

새 관찰·업무·후보는 간단한 한국어로 요청하고 과거 외국어 원문은 보존합니다. 실행 화면의 **Midscene 업무 진행**에서 대기/수행/입력값 확인/미확인을 구분합니다. 위치 찾기·값 읽기·결과 확인·시각 QA는 모두 호출 한도에 포함됩니다. 여러 필드와 제출을 수행하려면 충분한 호출 한도를 설정해야 합니다.

이전 자체 좌표 실행기의 수량 개선과 전체 주문 실패는 [이전 원장](evidence/recordings/lead-live-authorized-20261006/SUMMARY.json)에 그대로 보존합니다. 새 native 실행 결과와 합쳐 성공률을 계산하지 않습니다. 시각 결함 미탐은 행동 API 교체만으로 해결됐다고 주장하지 않습니다.

### Native Midscene 실제 검증 (2026-10-06)

`07d3b39`의 통합 실행에서 같은 30B 모델이 수량 1→2, 받는 분·이메일 입력, 스크롤·클릭과 주문 완료/$24 영수증까지 수행했습니다. 모델이 분해한 업무 목록을 사용했고 DOM locator·고정 좌표를 넣지 않았습니다. **21요청·5 SDK 행동·응답 보고 비용 $0.01177221**입니다. 테스트 한도는 30요청·16행동·240초·2048토큰이었으며 기본/사용자 저장 한도를 자동으로 늘리지는 않습니다. 다단계 업무는 모델 & 설정에서 이 한도를 참고해 조정하세요.

[실제 화면과 모든 시도](evidence/recordings/midscene-native-20261006/REVIEW.html) · [원장 요약](evidence/recordings/midscene-native-20261006/SUMMARY.json)

앞선 일반 위치 찾기와 통합 초기 버전은 실패했고 완료 오판도 있었으므로 함께 공개합니다. 최종 정상 화면에서도 시각 QA의 가림 오탐이 남았습니다. 이번 수락 범위는 native 동작 연결과 해당 주문의 실제 완료이며, 일반 업무 성공률·시각 QA 신뢰성·Windows 실환경 검증으로 확대하지 않습니다.

### 모델 응답 대기와 전체 실행 시간

개별 모델 요청의 기존 30초 제한을 제거했습니다. Midscene 요청 타이머를 끄고, 공급자 클라이언트·HTTP 응답 대기를 더 짧게 끊지 않도록 맞췄습니다. 실행 전체의 중지 신호가 실제 요청을 취소합니다. 브라우저 접속 실패·연결 실패 및 회사 프록시/공급자 자체의 제한은 별개입니다.

- **전체 시간 기본값: 900초(15분)**. 설정에서 10–7200초 또는 **0(앱 전체 시간 제한 없음)**을 선택할 수 있습니다.
- 시간 제한을 꺼도 **중지 버튼·최대 행동·최대 모델 호출**은 적용합니다. 요청·행동 한도 값은 자동으로 늘리지 않습니다.
- 이전 버전의 기본값120초로 저장된 설정은 최초 로딩 시900초로 이관하며, 기존 값은 `.data/settings.before-timeout-v2.json`에 보존합니다. 다른 사용자 설정값은 유지합니다. 업데이트 후 직접120초를 저장하면 이후에도120초로 유지합니다.
- 기술적으로 OpenAI SDK 타이머는 Node의 최대 안전 타이머 값(약24.9일)으로 설정하며, 일반 실행의 종료는 앱의 전체 실행 타이머/중지로 제어합니다. 무한 네트워크 연결 보장을 뜻하지 않습니다.

앞선30B 통합 주문의143.8초 중 모델/API 응답 대기는135.543초(94.3%)였습니다. 이 중 독립 시각 QA6요청이95.993초로 전체의66.8%입니다. 정밀 위치 탐색·값 읽기·계획·최종 확인도 순차 요청하므로 클릭5회가 곧 모델 호출5회를 뜻하지 않습니다. 당시에는21요청이 필요했습니다. 네트워크·프록시·공급자 대기열·추론의 비중을 이 원장만으로 분리할 수 없으며 Windows 환경의 시간으로 일반화하지 않습니다.

실행 원장을 읽는 분석 명령(모델 호출 없음):
```sh
node --import tsx scripts/runtime-profile.ts evidence/recordings/midscene-native-20261006/INTEGRATED_V3.json
```

제한 변경으로 응답 도중의 종료를 줄이지만 모델 처리 자체를 빠르게 하지는 않습니다. 다음 최적화 우선순위는 **업무 조작과 시각 QA의 검사 시점 분리**입니다. 입력마다 전체5종 검사를 반복하는 대신 주요 화면 변화·업무 종료에 집중하면 줄일 수 있으나, 중간 결함 검출 범위와 정상 대조를 함께 검증해야 합니다. 이번 변경에서는 시각 검사를 줄이거나 판단 기준을 완화하지 않았습니다.

[시간 제한 검증·지연 분석 자료](evidence/reviews/runtime-timeout-20261006/README.md)

### 검사 구조를 유지하는 속도 설정

**모델 & 설정 → 모델 응답 속도 우선순위 → 응답 생성 속도 우선 → 설정 적용**으로 같은 모델의 OpenRouter 공급자를 throughput 기준으로 선택할 수 있습니다. 첫 토큰 대기가 중요하면 `첫 응답 대기 시간 우선`도 선택할 수 있습니다. 기존·신규 설치 기본값은 `기존 자동 선택`이며 기존 설정을 임의로 변경하지 않습니다. 선택값은 로컬에 저장되고 실행 당시 설정에 남습니다.

모델, 정밀 위치 찾기, 입력값 확인, 시각 QA 항목/횟수와 이미지 해상도는 유지합니다. 공급자 요금과 출력은 달라질 수 있고 빨라짐이 보장되지는 않습니다. 이번 고정 이미지 소규모 비교는 평균 11.55초→7.71초, 보고 비용 약15% 증가였으며 전체 업무 시간이 같은 비율로 줄었다는 뜻은 아닙니다. `첫 응답 대기 시간 우선`은 요청 전달을 회귀 검사했으며 실제 속도 비교 대상은 아니었습니다.

실행 JSON의 `transport`에 공급자·선택 기준·입출력/캐시 토큰·보고 비용·요청 시간이 기록됩니다(공급자가 제공한 항목만). [공식 라우팅 설명](https://openrouter.ai/docs/guides/routing/provider-selection) · [실측 원본과 겹침 미탐 검토](evidence/reviews/speed-occlusion-20261006/README.md)

겹침 D는 이번 실제 모델 검사에서도 미탐입니다. 속도 설정은 검출 개선 기능이 아니며, 더 강한 경계 관찰 문구만 넣은 추가 시험도 잘못된 지적을 만들어 기본 프롬프트에 반영하지 않았습니다.

### 선택형 웹 겹침 보조 검사 (혼합 검사)

**모델 & 설정 → 웹 겹침 보조 검사 → 웹 위치 + 화면 혼합 검사 → 지침·설정 저장**으로 켭니다. 기존 설정과 신규 설치에서는 꺼져 있으며, 해당 실행의 설정에 사용 여부가 기록됩니다. Midscene의 입력·클릭·업무 검증 경로는 유지합니다.

브라우저의 문자/이미지/입력 요소 위치와 여러 지점의 앞쪽 불투명 요소를 읽어 겹침 후보를 묶습니다. 케이스명·특정 CSS 클래스·고정 좌표를 사용하거나 대상 DOM을 변경하지 않습니다. 안정된 같은 화면의 전체 캡처와 후보 주변 이미지를 Midscene에 전달하며, 숨겨진 DOM 문구·업무 이력·정답은 보내지 않습니다. 위치 기반 보조를 사용하므로 **순수 Vision 검사가 아닙니다**.

- **빨간 실선:** 위치 후보에 대해 모델이 앞뒤 요소·가림·영향을 주장한 후보. 모델 설명은 틀릴 수 있으며 사람이 확정한 결함은 아닙니다. 측정 사실과 모델 주장은 별도로 표시합니다.
- **주황 점선:** 모델 미실행/실패/불확실 또는 위치와 화면 판단의 불일치. 근거가 있는 의심을 버리지 않고 검토 대상으로 유지합니다.
- 원본 PNG와 주석 SVG, 후보 위치, 모델 원응답을 보존합니다. 판독 오류나 호출 한도 때문에 후보가 사라지지 않습니다. 기존 검토 버튼으로 사람이 결함/오탐을 판정합니다.

동일 프레임은 중복 검토하지 않으며 후보가 없는 화면에서는 이 기능의 모델 요청을 추가하지 않습니다. 후보가 있는 화면당 최대 3개 영역을 한 요청으로 검토하며 기존 전체 시간·호출·중지 한도를 공유합니다. 기존 독립 시각 QA와 서로 다른 검사이므로 결과가 충돌할 수도 있습니다.

검사 범위는 현재 1280×720 뷰포트입니다. 화면 밖, iframe/Shadow DOM 내부, `pointer-events:none` 불투명 레이어 등은 이 히트테스트만으로 확인할 수 없습니다. 의미가 명시된 모달은 내부만 검사합니다. 범위 제한·촬영 중 변화·미실행은 별도로 표시합니다. 일반 중첩/투명 장식을 제외해도 의도된 배치가 후보로 잡힐 수 있으므로 후보 없음이나 모델의 동의를 사이트 전체 정상/결함 보증으로 해석하지 않습니다.

2026-10-06 실측 범위: 정상 A와 D를 교차한 초기 6요청과 확대/포맷 보완 후 D 3요청을 별도로 보존했습니다. 최종 D는 위치 기반 의심이 **3/3 보존**됐지만, 모델은 한 번 정상이라고 하고 두 번 앞뒤 관계를 잘못 설명해 **올바른 모델 설명은 0/3**으로 독립 판정했습니다. 빨간 박스를 모델 검출 성공이나 확정 결함의 증거로 사용하지 않습니다. 이번 보완은 모델이 놓친 겹침을 검토 대상에서 누락시키지 않는 기능이며, 모델 판독의 신뢰성 해결과 다릅니다. 실행은 첫 화면 진단으로 호출 1회 후 제한 종료했고 전체 주문 성공 시험이 아닙니다. 총 9요청의 보고 비용은 $0.00677097이며 초기 6건/0요청 런처 실패도 포함해 공개합니다. [혼합 검사 결과·원본](evidence/reviews/hybrid-occlusion-20261006/REVIEW.html)
