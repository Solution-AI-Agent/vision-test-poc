# Vision QA Lab

Local Web Vision QA feasibility app for `vision-test`. The implementation is in the `poc-maker/vision-qa` worktree. Original uncommitted files in `REPOS/vision-test` are preserved.

## Run

Node 24 and npm are required.

```sh
npm ci
npx playwright install chromium
npm run dev
```

Open **http://127.0.0.1:4310**. For a production build: `npm run build`, then `npm start`. `PORT` can override 4310. This is a local single-user PoC, bound to loopback; not a multi-user hosted service.

1. Open **모델 & 설정**, enter an OpenRouter API key, a vision-capable model ID and its Midscene family, and apply limits.
2. **인증 연결 확인** tests the authentication endpoint only. It does not call an image model.
3. Use **자율 탐색** or **등록 시나리오**. The latter stores URL, task and expected result; it does not create user accounts.
4. Review the current screenshot and step log. Stop interrupts the pending model request and closes Chromium.
5. In **증거 & 검토**, inspect model-input and post-action screenshots, candidate observations, expected-behavior basis and reproduction steps. Human confirmation requires a review note. Export JSON or download the raw video.

Keys live only in the server process memory and are not returned to the client, written to disk or exported. Settings must be re-entered after server restart. Scenarios and reports persist in `.data/`; images and WebM recordings persist in `artifacts/`. These directories are gitignored. Treat exported reports and screenshots as potentially containing the target site's content. The UI clears key inputs after saving.

## Architecture and boundaries

React/Vite + Tailwind v4 and official shadcn/ui Radix Nova components form the UI. A local Express server owns session settings, scenario storage, execution and evidence. Only one run is active at once.

`Screenshot → Midscene aiQuery(domIncluded:false) → Zod plan validation → Playwright mouse/keyboard → next screenshot`

Midscene 1.14.0 first selects a concrete screenshot-grounded hypothesis/task/expected result in autonomous mode, then extracts one-step action plans and judgments from screenshots and observation history. Goal selection is logged and does not receive the registered scenario or search term. We deliberately orchestrate steps instead of unbounded `aiAct`, so external requests and coordinate actions have measurable independent limits. This is a Midscene-based planner, **not** a claim that its default `aiAct` loop has been benchmarked.

The product vision path never calls locators or requests DOM/accessibility trees. The exact image passed in each model request is saved as `model-request-N.png/jpg`. Each step links that image and its post-action screenshot. Brief visible observations/action reasons are recorded; hidden reasoning is not exported. Actual response model, request ID, duration, reported token use and reported cost are recorded when available. Costs are provider-response sums, not guaranteed billing totals. Missing costs are shown as unavailable, not zero.

The OpenRouter SDK has no automatic retries; Midscene parse/API retries are disabled. The app permits one explicit structured-output correction request per run, still within the actual request cap. Two identical before/after PNG screens trigger one autonomous goal replan; continued stagnation ends with an explicit inconclusive result. Dynamic content can prevent exact-byte stagnation detection, so hard limits remain the backstop. Actual outgoing request count, time, response tokens per call and actions are bounded. There is no dollar-denominated budget enforcement. Provider error bodies are replaced with a generic error before SDK/Midscene logging. Model compatibility, especially coordinate accuracy, remains model-specific.

Public HTTPS YouTube hosts are the current target scope. Top-level navigation is restricted to those hosts. Chromium uses an isolated unauthenticated context. The planning instructions allow only reversible search/browse/playback/scroll actions and forbid account changes. This is a PoC prompt boundary, not a general adversarial browsing security guarantee.

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

`server/vision.test.ts` uses a **stub model**, checks the actual Midscene request for an image and absence of a hidden DOM sentinel, forbids DOM extraction, executes the returned coordinate against a real local button and verifies the call cap. It does not prove OpenRouter compatibility or QA judgment quality.

UI validation outputs: `artifacts/ui-check/RESULT.json`, screenshots and raw WebM. YouTube baseline output: `artifacts/youtube-check/RESULT.json` and the referenced run directory. Further facts and limitations are recorded in `HANDOFF.md`.

## Remaining verification

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
