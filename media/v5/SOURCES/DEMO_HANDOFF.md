# Working Vision differentiation demo

Open **http://127.0.0.1:4310/demo**. Select normal or rendering fault, then click Confirm order in the prefilled order site. The same order functionality succeeds; the selected fault leaves a large blank layout panel over receipt/collection content. Right panel shows actual saved model decisions, location/reason, original input image and JSON log. Toggle performs no paid model calls. Full-screen site: `/demo/order`. Original four-state site `/fixture/order` and all prior evidence remain unchanged.

## Verified selected case

Frozen confirmation source **373ecad3216c92f9ace7785df91c7c59ed9dcb6e**, same qwen/qwen3-vl-30b-a3b-instruct. One current screenshot plus common readability requirement, no DOM, fault flag, expected answer, history or reference image. Same meaningful baseline assertions for both states (only target URL differs): entered recipient, items/quantities/prices, semantic total, order completion, full instruction DOM text, rendered receipt element visibility.

- Normal: 3/3 DOM PASS, 3/3 actual Vision PASS.
- Selected blank-panel fault: 3/3 DOM PASS, 3/3 actual Vision candidate with location and unreadable receipt reason, matching originals. Candidate is not automatically a confirmed production defect; independent POC-LEAD review pending.
- Six confirmation requests, provider-reported cost **$0.00255091**, 3.550–6.123 seconds/trial.
- Additional case-selection phase total **9 requests / $0.00356816**: normal probe once, first smaller promotional-panel candidate once (missed), second larger blank-panel candidate once (detected), six confirmation calls. No format retry or extra calls. `.data/demo-call-ledger.json` prevents more within this phase. Cost is response-reported, not audited billing.
- Real Playwright reference screenshot suite detects this selected fault too. The demonstrated value is supplementing DOM/function assertions with current-screen natural-language judgment without a reference image; not something Playwright itself cannot test.

This is a selected, intentionally injected demo case. It is not held-out defect performance or autonomous discovery. First candidate miss and prior smaller defects remain disclosed. Model generalization, subtler defects and Windows remain unverified.

## Exact evidence and video sources

- `artifacts/demo-verify-2026-10-05T01-22-24-239Z/RESULTS.json`, per-trial files and `MAKER_REVIEW.json`: raw assistant content, actual request text/image hash, source/prompt/model, function PASS, cost/time. Normal/fault model JPEG hashes are identical within each three-run state and distinct across states.
- Representative same-run fault: `ae75c703-b63f-477b-84a0-0c9e753dd31a` -> `artifacts/<id>/model-request-1.jpg` (exact model bytes), `demo.png` (pre-request browser PNG), raw WebM. Same trial JSON contains DOM PASS and model candidate. Use its location “Your receipt section” and reason “obscured by a large dark green overlay … impossible to read item labels, amounts, or the total.” Do not mix PASS and Vision from different cases.
- Representative normal: `b7181596-c25a-4eb9-be43-56e76d685802`, same assets/log pattern.
- Probe misses: `artifacts/demo-probe-2026-10-05T01-20-29-400Z/`; second candidate `artifacts/demo-candidate-2026-10-05T01-21-26-894Z/`.
- Blind diagnostic: `artifacts/blind-extraction-2026-10-05T01-15-09-254Z/`: 12 requests / $0.010346. Total text correct including $68 3/3, but all returned total coordinates exceed frame bounds. Frozen comparator 12/12 inconclusive; no post-hoc coordinate conversion, no more blind paid calls. Do not aggregate these pipeline versions into a common success rate.
- Previous controlled matrix and YouTube recordings preserved, separate from this case.

## Re-run without a key

`npm install`, `npm run build`, `npm start`. Default server 127.0.0.1:4310. Restore local evidence manifest from preserved artifacts:

```
npx tsx scripts/demo-publish.ts artifacts/demo-probe-2026-10-05T01-20-29-400Z artifacts/demo-candidate-2026-10-05T01-21-26-894Z artifacts/demo-verify-2026-10-05T01-22-24-239Z
```

Manifest is a projection of actual records, not a hardcoded pass/fail decision. Evidence is local/ignored; source checkout without the artifact bundle shows empty state. API key is not needed to open or switch the demo. Bundle excludes API keys/settings. Run complete `npm test` and `npm run build`; actual screenshot comparison `npx playwright test --config evaluation/playwright.config.ts`. Tests launch local Chromium. UI check `npx tsx scripts/demo-ui-check.ts` records desktop/mobile, toggles, order confirmation and evidence links. No paid calls in these commands.

Only exact `/fixture/order` and `/demo/order` at 127.0.0.1:4310 are additional agent targets; dashboard/operator/arbitrary localhost/query strings remain excluded. A new live evaluation needs explicit new scope: this phase's 9-call cap is exhausted. Same scripts retain cap and no retries.
