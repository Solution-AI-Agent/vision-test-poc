# First runnable checkpoint — 2026-10-04

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
- No edited explanatory video yet. Real UI and YouTube baseline recordings are ready; record Vision runs after model setup, then combine only verified results.
- No claims of overall feasibility acceptance, defect recall or absence of YouTube bugs.

Run from this worktree with `npm run dev`, then open http://127.0.0.1:4310. `README.md` contains clean-install and reproduction commands.

## Revised planner after live findings

- Only verdict=candidate responses create defect candidates. Pass responses with a normal finding payload are retained in the step log and never promoted; regression-covered. The original normal-success candidate was independently classified as an app false positive, not a YouTube bug.
- Autonomous mode selects a screenshot-grounded hypothesis, concrete task, representative input and observable expected result before action planning. It does not receive the user scenario/task/query. Goal images and basis are reviewable in the evidence UI.
- One malformed-plan correction request is allowed per run. Repeated byte-identical before/after screens trigger one goal replan; continued stagnation stops as inconclusive, with all requests inside the existing cap. Exact-byte matching may miss stagnation on dynamic ads/video; hard limits still apply.
- Each new run records the startup source commit, working-tree dirty flag, combined runner/domain SHA-256 and prompt version. Prior runs predate this ledger; do not invent exact hashes for their intermediate working-tree states.
- Structured parsed model outputs are retained for format failures, without exposing API keys or hidden reasoning.
