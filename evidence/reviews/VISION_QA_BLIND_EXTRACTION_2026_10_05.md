---
title: "Frozen blind extraction: accurate text but invalid localization"
tags: [vision-qa, controlled-experiment]
status: active
created: 2026-10-05
---

The authorized fixed pipeline was frozen at 03320fdae7c17fbb9145d37b72ea5650a112503a. Same HEAD before/after full 3-file/17-test package run and build, clean tree. SDK stub verified unchanged JPEG data URL, single image, no DOM/expected text in outgoing prompt. Synthetic correct/wrong/omitted/uncertain/malformed responses exercised the deterministic comparator. Original frozen criteria unchanged.

Batch `REPOS/vision-test-maker/artifacts/blind-extraction-2026-10-05T01-15-09-254Z/` used the exact prior JPEG bytes. Fixed interleaving recorded before dispatch. Same qwen/qwen3-vl-30b-a3b-instruct, 12 calls, one each, no retries, 30s/2048 tokens cap. Response-reported cost $0.010346. All 12 comparator outcomes inconclusive: returned receipt total y coordinates exceed 719, violating the frozen pixel bounds schema. Locations were not transformed or relaxed after seeing results.

Separately, receipt total text is correct 12/12, including $68.00 for all 3 wrong-total images. Clipped instruction images transcribe the two visible lines 3/3; other states transcribe three lines. The clipped region is nevertheless described complete. Correct text alone does not satisfy correctly extracted/localized/detected 3/3. Raw responses, final actual request texts/image hashes, transport, source/prompt/comparator/criteria hashes and maker adjudication retained in RESULTS.json and MAKER_REVIEW.json. This is a new pipeline batch, not aggregated with earlier success rates. No further paid blind diagnostic requested or performed.

POC-LEAD's newer instruction b19fdfa73151b1a2746ccd46590c5e741578a21b292cdc3195b3530acfea1c51 authorizes a separate selected-case demonstration: clearer rendering occlusion, normal once / up to two candidates once, then selected frozen state and normal 3 each, additional phase max 9 requests. This updates the deliverable priority; blind diagnostic failure does not end demo implementation. Separate sources, ledgers and outcomes preserve both.
