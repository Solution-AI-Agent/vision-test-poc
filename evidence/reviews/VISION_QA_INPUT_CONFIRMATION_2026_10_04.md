---
title: "Vision QA Input Focus and Visual Confirmation Follow-up"
tags: [vision-test, midscene, validation, input-confirmation]
status: active
created: 2026-10-04
---

Scope authorized by POC-LEAD event `d944e7f95664ce77437050bf6e44dedb42d1f29c3db7c4250ab003a965d26c14`: screenshot-selected focus, visual input confirmation, local no-focus regression, then exactly one autonomous run with the same model and limits. Original artifacts preserved.

## Fixed code and local validation

- Code commit `82f28b93d54e210dfefd18cad30d7c1517ac296a`, clean working tree. HEAD before/after full validation equals this commit.
- Full package `npm test`: **2 files / 13 tests**, passed (19.90 seconds). TypeScript + Vite build passed. First sandboxed attempt could not launch Chromium due macOS MachPort permission; rerun with browser permissions passed, not a product failure.
- type actions now require screenshot-selected x/y; executor clicks target then inserts text. Each tool request consumes an action, and completion is recorded separately. Preflight requires room for both actions and a confirmation request.
- Fresh image-only confirmation has no prior action/observation history, reads visibleText and status. Exact target-text match and changed screen are needed. An unchanged screenshot overrides false model success. This is a model visual read, not independent OCR or guaranteed truth.
- Regression: real unfocused keyboard input yields an empty field. Selected-coordinate focus types successfully. A no-op focus fixture plus malicious stub success claim is rejected by unchanged-image guard; no subsequent submit/pass occurs. DOM values are local test oracles only, never product planner input.
- UI distinguishes requested tool calls, tool completion and model visual confirmation, links actual confirmation image/request number. Existing official shadcn Badge composition/theme retained.
- New prompt version `goal-first-v4-focus-and-visual-input`. `scripts/live-capture.ts` accepts a destination argument so new evidence does not overwrite earlier captures.

## One authorized live retry

- Started clean code server at http://127.0.0.1:4310. Temporary key loaded from the human authorization event into process memory only, with no printed key or key file.
- Requested model `qwen/qwen3-vl-30b-a3b-instruct`, family qwen3-vl. Bounds unchanged: 6 tool actions / 8 actual requests / 120 seconds / 2048 output tokens per request. Confirmation/focus/replan all count. Exactly one autonomous run requested; do not repeat failures.
- Append actual results below when complete.

## Input-confirmation follow-up: one live run

Code `82f28b93d54e210dfefd18cad30d7c1517ac296a` (clean at startup), prompt `goal-first-v4-focus-and-visual-input`, runner/domain hash `85d6c7947f5d68b6384e911446115f749050c46389c3c2cd0101b038ad5e1f20`. Full package suite **2 files / 13 tests** and build passed with the same HEAD before/after.

One authorized autonomous retry `882f0db4-631d-4d35-bb24-b5af2e688930`, same `qwen/qwen3-vl-30b-a3b-instruct`, 6 actions / 8 requests / 120 seconds / 2048 output tokens limits. Observed: **8 requests / 6 tool actions / 46.747 seconds / reported $0.00422962 / 0 candidates**. Focus click and typing each counted, input confirmation was request 4. The model selected `tutorials` without a seeded query. `model-request-4.jpg` visibly contains that text in the input; Maker directly confirmed it.

**Result perception still failed.** The final `model-request-8.jpg` and `5-decision.png` visibly show a tutorial-related video result plus an ad. The model incorrectly described search suggestions/no results, repeated Enter, and the controller ended at the action limit. Thus real input and result-screen arrival are observed, but the agent did not recognize task completion; autonomous QA judgment and defect discovery remain unproven. No additional live attempt was made. Original eight runs remain intact; all nine are 50 requests / provider-reported $0.02403902, not a common-version success-rate sample or billing total.

New evidence: `artifacts/live-check/INPUT_CONFIRMATION_SUMMARY.json`, unique run report, and `artifacts/input-confirmation-capture/` stabilized UI screenshots/video. Earlier UI captures remain unchanged. Local `OUTBOX/VISION_QA_INPUT_CONFIRMATION_EVIDENCE.zip` bundles only this follow-up and review note; original bundle remains intact. ZIP/WebM are not uploadable through this Buzz relay, so delivery attaches PNGs and gives local original paths.

The live-check exporter now waits for endedAt before saving a final report, because status can change before video/context close completes. The early snapshot is preserved separately as `..._EARLY_SNAPSHOT.json`; finalized data came from the API after termination, without another model call. Independent review should use the finalized report, not the early snapshot.

Maker inspected both actual request images 4 and 8 plus the final decision PNG. The initial intermediate interpretation that results had not arrived was corrected after this image comparison; model output alone was not used as ground truth.

## Review delivery

- PR tip `cb38ed4d4d4c84f6683c2238f650ebc2a4c329f0`; changes after tested/live code82f28b9 are only README.md, HANDOFF.md and scripts/live-check.ts final-export timing. Final worktree clean. Two outgoing commits inspected for agent attribution/signing headers against actual origin; pushed successfully. PR update accepted `900435fe81b24bf3bfe60f89acd7a33a702645570a1252019511fabdf1fae5c2`.
- New evidence bundle: 35 files plus handoff/readme, 6,009,810 bytes; selected bytes scanned for key pattern, 0 matches. No settings or secret store included.
- Final read-only UI capture completed in new artifacts/input-confirmation-capture directory and screenshot visually inspected. No extra model call or settings mutation.

- Result delivery accepted `bf05458f1f5007febc4993cd793712df70fa367bf725dd163f91d36abd24f70d`; signed mention_pubkeys includes POC-LEAD. Actual model-request JPG upload was rejected by relay metadata/canonical-channel validation, so no image bytes were edited: original JPGs remain local, and delivery attaches original input-after/decision PNGs plus UI evidence instead, explicitly labeling that distinction.
