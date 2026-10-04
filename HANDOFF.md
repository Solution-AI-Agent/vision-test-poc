# Implementation and live-validation handoff — 2026-10-04

## Implemented

- Official shadcn/ui Radix Nova + semantic mint theme, dark/light and mobile layouts.
- OpenRouter session key input/replacement/deletion, model ID/family, authentication check and bounded execution.
- Saved natural-language scenarios and autonomous exploration modes.
- Midscene image-only one-step planning/judgment, Zod validation, coordinate Playwright execution; no DOM/locator fallback in the Vision path.
- Distinct preparation, authentication, image-plan response and actual-action states. User-task result remains separate in each run.
- Live screenshot, step observations, actual model-input images, post-action/decision screenshots, stop, limits and categorized failures.
- Finding candidates and independent review statuses with mandatory rationale; JSON export and raw WebM downloads.
- Separate fixed Playwright YouTube search comparison.

## Evidence obtained

- The complete package suite passed before commit: **2 files / 8 tests**, including both runner modes on a **local fixture with a stub VLM**. Model-input bytes equal the linked request artifact, hidden DOM is not sent, coordinate click changes the real button, outgoing-call cap is enforced and finish screenshots follow model input. A stub result is not live VLM evidence.
- TypeScript + Vite production build passed.
- Real runner lifecycle checks passed: action-limit termination (1 action, 0 model calls) and immediate stop before capture (0 model calls); `artifacts/lifecycle-check/RESULT.json`.
- UI/API workflow passed in real Chromium: session-key masking/deletion, scenario persistence, missing-key rejection, target and origin guards, dark/light/mobile views and no page exceptions.
- **Real public YouTube baseline completed**: run `f0b467c9-1aa1-4714-87fc-717ac619514f`, search `Midscene AI demo`, 3 recorded operations, 0 model calls. Actual results were visually inspected; final screen contains a Midscene video result and an ad. This proves the comparison script's narrow search workflow only.
- Existing `REPOS/vision-test` uncommitted package files/dependencies remain untouched. This branch was created with `git worktree add --orphan` because the repository had no commits or remote refs.

Exact-commit validation and outgoing attribution are recorded outside this worktree in `WORK_LOGS/VISION_QA_IMPLEMENTATION_CHECKPOINT_2026_10_04.md` after committing.

## Local artifacts for review/video

- `artifacts/ui-check/`: UI screenshots, workflow JSON, raw WebM. Capture waits for fonts/theme stabilization.
- `artifacts/youtube-check/RESULT.json`: actual locator baseline report.
- `artifacts/f0b467c9-1aa1-4714-87fc-717ac619514f/`: baseline before/after PNGs and WebM.
- Stub runner artifact directories contain `STUB_REPORT.json` and explicitly identify **LOCAL FIXTURE / STUB VLM · NOT OPENROUTER**. Keep them labeled if used in any explanation.
- Reports and artifacts are deliberately untracked; source, scripts and run instructions are versioned. The final Buzz message attaches shareable evidence.

## Independent-review feedback addressed

POC-LEAD review: `WORK_LOGS/VISION_QA_CHECKPOINT_ONE_REVIEW_2026_10_04.md` / Buzz event `e4e296c042667669e713809472e3435f5395fafd1dae81d9e6c24f56f08400fe`.

- Missing key now displays **키 설정 필요 · Vision 대기**, never Ready to explore.
- Exact model-request image is linked to each plan/action, and a fresh decision-time screenshot is captured even for finish/limit decisions, preserving temporal order.
- Submission screenshots wait for fonts and theme stabilization.

## Not verified / remaining work

- **Live OpenRouter calls were authorized by the user after the first checkpoint.** Model: `qwen/qwen3-vl-30b-a3b-instruct`. Registered YouTube search reached results in 5 requests / 4 actions / 39.531 seconds, reported cost $0.00228389. Initial autonomous runs repeated actions and hit their limits; a first goal-first run selected its own cooking query but failed action-schema validation. Further revised-planner live results are appended below. Broader autonomous discovery and confirmed defect reproduction remain unproven.
- No financial budget enforcement: limits are time, actions, request count and response tokens. Displayed cost is only provider-reported data, not the billing ledger.
- No Windows execution driver or native test result. The UI says planned/unverified.
- No edited explanatory video yet. Real UI, YouTube baseline and live Vision recordings are available; combine only verified results.
- No claims of overall feasibility acceptance, defect recall or absence of YouTube bugs.

Run from this worktree with `npm run dev`, then open http://127.0.0.1:4310. `README.md` contains clean-install and reproduction commands.

## Revised planner after live findings

- Only verdict=candidate responses create defect candidates. Pass responses with a normal finding payload are retained in the step log and never promoted; regression-covered. The original normal-success candidate was independently classified as an app false positive, not a YouTube bug.
- Autonomous mode selects a screenshot-grounded hypothesis, concrete task, representative input and observable expected result before action planning. It does not receive the user scenario/task/query. Goal images and basis are reviewable in the evidence UI.
- One malformed-plan correction request is allowed per run. Repeated byte-identical before/after screens trigger one goal replan; continued stagnation stops as inconclusive, with all requests inside the existing cap. Exact-byte matching may miss stagnation on dynamic ads/video; hard limits still apply.
- Each new run records the startup source commit, working-tree dirty flag, combined runner/domain SHA-256 and prompt version. Prior runs predate this ledger; do not invent exact hashes for their intermediate working-tree states.
- Structured parsed model outputs are retained for format failures, without exposing API keys or hidden reasoning.

## Final fixed-code results

Code: `8fcac127a2e76abb5da45ecad8913367f9d33267`, clean at startup. Runner/domain SHA-256: `718b306ce1f4e635b70b59d84d82852639760fa68de46f89426f6a2d02465aec`. Prompt: `goal-first-v3-protocol-and-replan`. Model: `qwen/qwen3-vl-30b-a3b-instruct`. Full suite **2 files / 10 tests** and build passed at this exact code commit; subsequent handoff changes are documentation only.

- Registered `044ecb6b-dfb3-4c61-970b-d0dc653f3201`: completed, 5 requests / 4 actions / 28.991 seconds / reported $0.00236504 / 0 candidates. Final `4-decision.png` visibly contains the entered search term and related Midscene video results. Pass stops the task without executing the proposed redundant wait.
- Autonomous `5739f389-9faa-4528-8979-92e3d968b3ea`: limited/inconclusive, 6 requests / 4 actions / 43.431 seconds / reported $0.00283305 / 0 candidates. The model independently selected `cooking tutorial`, typed without focusing the search input, then pressed Enter; unchanged screens caused one replan, followed by an explicit inconclusive stop. There is no successful autonomous completion or confirmed defect claim.
- All eight live attempts: 42 actual requests, provider-reported total $0.0198094. The earlier repetitions, schema/protocol failures and normal-result false positive remain reviewable. `artifacts/live-check/FINAL_SUMMARY.json` identifies every run and its available source ledger; older runs have no exact source ledger.
- `artifacts/live-capture/` includes stabilized settings/workspace/scenario/autonomous evidence screenshots and raw UI WebM. `VISION_QA_LIVE_EVIDENCE.zip` bundles original live reports, request/decision/action images, target videos and the locator baseline. It contains no settings/key store. Extract at this project root to preserve report artifact paths.

To reproduce a charged run after entering a key/model/limits in the app:

```sh
npx tsx scripts/live-check.ts scenario
npx tsx scripts/live-check.ts autonomous
npx tsx scripts/live-capture.ts  # read-only stabilized UI capture
```

`test:ui` and `lifecycle-check.ts` change/delete session settings: use a separate no-key session for those checks. The temporary key is not persisted, so restart requires re-entry. Do not reuse old cost/time numbers for a new run. Independent review, autonomous input/coordinate reliability and actual defect reproduction remain next-stage work; this handoff does not close the overall PoC acceptance.

## Input focus and visual confirmation follow-up

Independent review `WORK_LOGS/VISION_QA_FIXED_CODE_REVIEW_2026_10_04.md` found an empty input misdescribed as filled. New type plans require screenshot-selected x/y; focus click and insertText are each logged/counted. A separate image-only query reads the actual field value, with no prior observation/action history. Only exact text match with a changed screen is accepted as model visual confirmation; unchanged screens override even a false model success claim. Missing/uncertain confirmation prevents submission and ends inconclusive or uses the one available autonomous replan. Tool requests, tool completion and visual confirmation are separate in the report/UI.

Local regressions reproduce silent loss from unfocused typing, demonstrate selected-coordinate focus, and inject a false confirmation after a no-op click; the unchanged-screen guard rejects that claim. Product vision inputs contain no DOM; DOM field values are test oracles only. The fresh live run is recorded separately below; all prior reports/captures remain preserved.

## Input-confirmation follow-up: one live run

Code `82f28b93d54e210dfefd18cad30d7c1517ac296a` (clean at startup), prompt `goal-first-v4-focus-and-visual-input`, runner/domain hash `85d6c7947f5d68b6384e911446115f749050c46389c3c2cd0101b038ad5e1f20`. Full package suite **2 files / 13 tests** and build passed with the same HEAD before/after.

One authorized autonomous retry `882f0db4-631d-4d35-bb24-b5af2e688930`, same `qwen/qwen3-vl-30b-a3b-instruct`, 6 actions / 8 requests / 120 seconds / 2048 output tokens limits. Observed: **8 requests / 6 tool actions / 46.747 seconds / reported $0.00422962 / 0 candidates**. Focus click and typing each counted, input confirmation was request 4. The model selected `tutorials` without a seeded query. `model-request-4.jpg` visibly contains that text in the input; Maker directly confirmed it.

**Result perception still failed.** The final `model-request-8.jpg` and `5-decision.png` visibly show a tutorial-related video result plus an ad. The model incorrectly described search suggestions/no results, repeated Enter, and the controller ended at the action limit. Thus real input and result-screen arrival are observed, but the agent did not recognize task completion; autonomous QA judgment and defect discovery remain unproven. No additional live attempt was made. Original eight runs remain intact; all nine are 50 requests / provider-reported $0.02403902, not a common-version success-rate sample or billing total.

New evidence: `artifacts/live-check/INPUT_CONFIRMATION_SUMMARY.json`, unique run report, and `artifacts/input-confirmation-capture/` stabilized UI screenshots/video. Earlier UI captures remain unchanged. Local `OUTBOX/VISION_QA_INPUT_CONFIRMATION_EVIDENCE.zip` bundles only this follow-up and review note; original bundle remains intact. ZIP/WebM are not uploadable through this Buzz relay, so delivery attaches PNGs and gives local original paths.

The live-check exporter now waits for endedAt before saving a final report, because status can change before video/context close completes. The early snapshot is preserved separately as `..._EARLY_SNAPSHOT.json`; finalized data came from the API after termination, without another model call. Independent review should use the finalized report, not the early snapshot.
