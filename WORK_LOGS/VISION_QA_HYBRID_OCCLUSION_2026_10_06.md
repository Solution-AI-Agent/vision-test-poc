---
title: "Hybrid web overlap assistance: implementation and limited live review"
tags: [vision-qa, midscene, overlap, hybrid, validation]
status: active
created: 2026-10-06
---

User authorized the proposed optional geometry + Vision supplement in Buzz event c0b7763716e2a11e58ce0bc3ae97a25a4d3fdf55f0b970b929a547dd27a2c488, thread aa275e03078008a965732d6b98eb0705180cd649cef5ec83d9c15140fa64c868. Worked in existing delivery checkout; no agent delegation. Base GitHub main 7669192.

## Implemented

- Persisted opt-in `layoutAssist` (legacy/new default false), frozen per run.
- Read-only generic text/image/control geometry and multi-point hit tests. Require a solid painted unrelated subtree, group fragments by occluder. No sample selectors, case oracle, rendered DOM changes or hidden DOM text in model request.
- Scan/capture stability check, unchanged-frame deduplication, maximum 3 clusters, explicit modal/iframe/shadow/pointer-events limitations.
- Save candidate before model request. Midscene aiAsk reviews the exact full screenshot and crop containing both components; front-element position is geometry evidence. User task context excluded. Raw request/response/actual images remain recorded.
- Invalid answer, model clear/uncertain, insufficient budget or abort cannot erase a measured candidate. Valid direct JSON can be parsed if SDK aiAsk expects a String wrapper; schema and region identity remain mandatory.
- Korean UI separates browser measurement from model assertions. Red means model asserted overlap and consistent order; amber means unresolved/conflicting. Neither color means human-confirmed defect. Existing human review remains separate.
- Existing aiInput/aiAct/aiString/aiAssert action path and pure screenshot QA unchanged.

## Validation and failures retained

Full regression: platform 55 + sample 2 = 57 tests, UI type checks and both builds passed at functional commit 90a422b. Subsequent wording/primary evidence separation at 8b114b5: 11 relevant regression tests, both builds and real desktop/mobile UI review passed. Source files only changed in those displayed findings/labels and README. UI replay used stored original responses; did not modify user's saved runs/settings. Settings persistence and default-off covered by SettingsStore tests.

A production tsx callback serialization failure (`__name` absent in browser) was found after initial unit success. Six diagnostic runs failed before provider requests (0 calls). Fixed with a scoped helper in read-only serialized evaluation; added real tsx subprocess regression. No page globals or DOM/style mutation.

Actual provider: same qwen/qwen3-vl-30b-a3b-instruct, original sample unchanged. Initial A,D alternating batch: 6 requests; A zero geometry candidates and zero pure-QA candidates 3/3; D measured candidate 3/3 but model reversed front/back. Two SDK wrapper mismatches retained rather than misreported as clear. Expanded crop to include whole components (narrow crop could itself cut off image context), recorded measured front box and normalized valid JSON replies. Final D fixed batch: 3 requests, 1 clear and 2 positive claims, all 3 model explanations independently incorrect. Geometry candidate and localized evidence remained 3/3. No further paid retries.

**Independent result: candidate preservation/localization useful; correct VLM occlusion explanation remains unproven (0/3 accepted in final D batch).** Do not equate red model-assertion boxes to independently accepted visual detection. The chart covers the mug lower part and order text; the model claimed the reverse. Prompt strengthening and larger crops did not solve this.

Total 9 actual requests, provider-reported cost $0.00677097. Diagnostic runs intentionally cap at one request and end limited; not full-order tests. Original screenshots equal full images actually sent. Local final A/F/G no geometry candidates; F/G contain other defect types and are not declared normal overall. Tests cover transparent overlay, ordinary nested UI, semantic modal, opaque pointer-events:none warning, unstable frame, abort, budget, malformed answer, reversed order, valid direct SDK output, stored settings.

## Evidence and publication

`evidence/reviews/hybrid-occlusion-20261006/`: 111 files, initial failures, both live batches, actual PNG/JPEG/WebM/SVG, exact requests with image hashes, raw responses, independent review JSON, local A/D/F/G, UI replay and HTML gallery. `npm run evidence:check`: 3308 preserved files verified. New gallery loads 5 images with no browser error. API credential used in child environment only; not saved in source/evidence/logs.

Implementation commits ad6ff2f, c81cf51, 90a422b, 8b114b5; all authored by configured POC-LEAD, no invented coauthor/sign-off. Before publication remote remained 7669192. Evidence commit follows. No change to user-facing 4310/4311 servers; separate UI port 14360 used. Windows/corporate proxy not revalidated.
