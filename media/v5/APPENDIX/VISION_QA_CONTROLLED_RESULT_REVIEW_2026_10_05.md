---
title: "Controlled matrix independently reviewed: both defects missed"
tags: [vision-qa, independent-review]
status: active
created: 2026-10-05
---

## Decision

Site implementation and comparison harness verified; Vision differentiation acceptance failed for the fixed model/prompt configuration. Both injected states missed 3/3; normal and mild palette control correctly passed 3/3 each. This establishes neither useful defect detection nor general impossibility of Vision QA.

## Evidence

- Source matrix: `REPOS/vision-test-maker/artifacts/controlled-evaluation-2026-10-05T00-07-05-778Z/RESULTS.json`, clean live source `5a22c40956c4833b3331d1860be5e8745c6c7d8b`.
- Read all 12 verdicts and programmatically verified each matches its raw data-json. Read all clipped-state observations and inspected total-state raw statements. Viewed actual request JPEG for each state; independently hashed all 12 inputs: three identical within each state and distinct across states.
- Total-state image visibly contains $68, while the first raw output states “The total is $48.00.” Clipped-state responses transcribe two delivery lines but still pass despite the required third line being invisible. These are different observable mistakes: inaccurate amount reading and failure to enforce completeness. A single anchoring cause is not established.
- Independent per-run classification and hashes: `OUTBOX/VISION_QA_CONTROLLED_INDEPENDENT_REVIEW_2026_10_05.json`.
- Independently summed 12 actual calls / $0.00466121 response-reported cost. The initial 12 pre-model failures remain a separate batch and are not included as model trials.
- On HEAD `72a46631fa1ee54b037c7fa870b5f42961694382`, independently ran full 2-file/15-test package suite, build, all four DOM workflows, and actual reference screenshot comparison. All checks passed; HEAD unchanged and tracked/untracked tree clean before and after. New evidence in `artifacts/lead-fixture-check-72a4663/` and `artifacts/lead-fixture-screenshot-72a4663/`.
- Diff from live source changes production HTML route handling and two documents only; fixture rendering and evaluation prompt unchanged.

## Next action

Bounded follow-up specified in `PLANS/VISION_QA_BLIND_EXTRACTION_2026_10_05.md`: same stored pixels and model, neutral visible-value extraction, deterministic comparison outside the model, 12-request ceiling and no retries. It is a pipeline revision experiment and does not prove a cause. Video may demonstrate the DOM coverage gap now, but cannot yet claim Vision caught it. LUMEN must retain failed outcomes and distinguish any later extraction-plus-code success from original model judgment.
