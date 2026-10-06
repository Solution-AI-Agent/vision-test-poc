---
title: "Controlled site checkpoint: fixture accepted, live assessment pending"
tags: [vision-qa, independent-review, controlled-fixture]
status: active
created: 2026-10-05
---

## Decision

The fixture and comparison design are suitable for the planned experiment. Vision differentiation is not yet demonstrated. No additional paid call was performed by the reviewer.

## Independently examined

- Worktree: `REPOS/vision-test-maker`; HEAD before and after package tests/build: `ae27c5e5e11ce536c15a3f1f80e313e0dd886599`.
- Full `npm test`: 2 files, 14 tests passed. `npm run build`: passed. Tracked tree unchanged; an untracked `.scratch-assessment-debug.ts` appeared during the check, consistent with concurrent maker work. Do not describe the final worktree as clean.
- `ed76daf` froze `evaluation/CRITERIA.json` and `scripts/fixture-baseline.ts` before fixture implementation. Diff to reviewed HEAD changes baseline formatting only; criteria unchanged.
- Reviewed baseline assertions, fixture implementation, evaluator prompt/data path, and screenshot comparator source.
- Viewed all four originals in `artifacts/fixture-check-ae27c5e/`. Normal shows complete delivery requirements and $48 receipt. Clipped hides the photo-ID instruction and clips collection-window text. Total shows $68 despite $32+$16+$0 line prices. Decoration preserves meaning with light purple styling.
- Stored `RESULT.json` records identical DOM suite PASS in all four states. Assertions cover recipient, line items, total semantic value, full delivery DOM text and receipt visibility. They do not establish rendered text readability or Canvas numeric correctness.
- Screenshot comparator source uses normal reference and expects differences for both defects; mild decoration is expected to remain within default tolerance. Reviewer did not independently execute this state-mutating comparison while maker evaluation was underway.
- `fixture-evaluate.ts` uses a common criteria prompt, current screenshot, `domIncluded:false`, and a throwing DOM-tree accessor. Operator state names are not interpolated into model prompt. This is DOM-prepared registered visual assessment, not autonomous discovery.

## Newly observed blocker snapshot

`artifacts/controlled-evaluation-2026-10-05T00-03-40-752Z/RESULTS.json` contains 12 failed attempts, all with zero recorded model calls and no verdict at review time. The first has DOM suite PASS, empty transport and generic `Browser/model assessment failed`. This is a pre-model pipeline failure, not evidence that the model missed all defects. Its cause is not yet established by this review. Preserve this batch, diagnose without exposing secrets, locally check the request path, and then perform the originally bounded evaluation with a new batch/version. Do not add success-seeking live retries.

## Next evidence gate

Maker supplies fixed source, unchanged criteria hash, raw model requests/responses and all 12 outcomes after pipeline repair. Lead independently compares actual model input images and verdicts before approving a video claim. LUMEN can use fixture originals for composition; PASS/detection and aggregate metrics remain pending.
