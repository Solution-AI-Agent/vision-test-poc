---
title: "Independent acceptance of standalone visual-defect sample site"
tags: [vision-qa, standalone-site, independent-review]
status: active
created: 2026-10-05
---

## Decision

Accept the separate sample website implementation. QA platform remains on 4310; sample target is http://127.0.0.1:4311/order, operator http://127.0.0.1:4311/operator. No new paid Vision evaluation was performed; detection effectiveness on these new screens remains unverified. Prior `/demo` success and v5 video describe the prior selected case, not this new site.

## Independent checks

HEAD `045fdf3d93ff677f4669650aa4394856b01b752c` and clean tree confirmed before/after verification. Ran full 4-file/20-test suite, platform build, sample build, same six-state real-browser functional suite and existing screenshot regression suite 2/2. All passed. Function suite checks invalid input, product/quantity changes, calculated totals, real simulated-order API201, recipient/item/receipt text, notice DOM, chart labels, reset, invalid API400 and operator foreign-origin403. Page errors absent in all six states. No pixel assertion is used to force an ordinary functional failure.

Independent generated evidence: `REPOS/vision-test-maker/artifacts/standalone-sample-2026-10-05T12-09-24-086Z/RESULTS.json`, images and WebM. Existing screenshot regression output: `artifacts/lead-standalone-screenshot-045fdf3/`.

Viewed all six maker confirmation screenshots directly in `artifacts/standalone-sample-2026-10-05T11-57-19-450Z/`: normal readable receipt/red mug/proportional80:20 chart; visibly rotated and shifted receipt; receipt/graph occlusion; two missing visible instruction lines despite complete DOM; blue image labeled Red mug; 20 bar longer than80. Order data remain the same. These are full-page browser captures, not model request images.

Read sample server, order schema/calculations, UI, CSS, build config and baseline suite. Business rules never read injected state; rendering does. Separate Express process/build uses shared installed dependencies and shadcn primitives; sample browser requests use sample origin only. No target QA verdict or defect selector; selector is separate operator page.

Independently ran normal browser order workflow with requests to platform origin4310 blocked: PASS; observed origins only4311. Read existing platform scenarios and confirmed target scenario `60a1d425-906d-43ed-90f2-b76b0275d655`. Evidence `artifacts/lead-standalone-integration-045fdf3.json`. Maker's actual platform-shutdown proof `artifacts/standalone-independence-045fdf3.json` was reviewed; lead did not stop the user's platform again.

## Scope and use

Separate execution from repository root: `npm run sample:build` then `npm run sample:start`; platform separately uses `npm run build` and `npm start`. Set operator state, open/reload neutral `/order`, then test it through platform URL/scenario flow. State is local process-wide, so one operator at a time. Simulated orders do not charge or persist. Exact sample path allowlisting reviewed; no broad localhost allowance.

Sample-site issue can resolve for implementation and functional validation. Actual Vision evaluation, any new-site video, GitHub publication and PR merge are not claimed as complete by this acceptance.
