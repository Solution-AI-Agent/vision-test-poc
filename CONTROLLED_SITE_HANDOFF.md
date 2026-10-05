# Controlled order site — 2026-10-05

Run `npm ci`, `npx playwright install chromium`, `npm run dev`, then open http://127.0.0.1:4310/fixture/order. `npm run build` then `npm start` serves the same routes in production. Operator: http://127.0.0.1:4310/fixture/operator. This is a local single-user demonstration, not real payment or order persistence. Do not switch operator state during an assessment.

The operator controls normal, clipped delivery notice, incorrect canvas total, and harmless palette change. The order screenshot and visual prompt do not expose state names or injected-defect flags. Presentation values are fetched by the fixture; they are never supplied as DOM or oracle input to Vision. Original YouTube evidence and video v4 remain untouched.

## Frozen comparison

Commit `ed76daf` fixed `evaluation/CRITERIA.json` and `scripts/fixture-baseline.ts` before site/defect implementation. Assertions were not removed or weakened; later baseline edits only format code. Expected user task: enter recipient details, confirm a notebook ($32) plus two cable clips ($16), check fully readable delivery instructions and a consistent rendered total ($48).

The exact same meaningful Playwright DOM suite checks confirmation, recipient, items/quantities/line prices/shipping, correct semantic total, full notice DOM text, notice visibility and visible receipt canvas. All four states pass. It does not check glyph clipping or canvas pixel amounts. Canvas accessibility text/semantic total remain correct in the injected total state, while rendered total is $68. CSS height44 hides the Photo ID line but does not remove DOM text.

The normal-reference Playwright screenshot matcher separately differentiates both injected defects. Default pixel tolerance permits this mild palette control. This demonstrates that Playwright screenshot assertions can detect these issues; it is not a limitation of Playwright as a platform. Reference is a local macOS screenshot at 1280×720; regenerate only a NORMAL reference when explicitly changing rendering/environment, never replace it with defect output.

```sh
npx tsx scripts/fixture-check.ts artifacts/fixture-check-new
npx playwright test -c evaluation/playwright.config.ts
npm test
npm run build
```

## Fixed actual Vision result: acceptance unmet

Model `qwen/qwen3-vl-30b-a3b-instruct`, code `5a22c40956c4833b3331d1860be5e8745c6c7d8b` clean, same HEAD full **2 files / 15 tests** and build passed. Four states × three independent trials, each maximum 3 requests / 30 seconds / 2048 output tokens. No prior history/reference image/DOM/variant name/oracle supplied. Same criteria/prompt in every trial. Playwright prepares the confirmation; Vision assesses screenshot only. This is registered-criteria QA, not autonomous discovery or Vision action capability.

| State | DOM/function | Model verdict | Maker image/oracle classification |
|---|---|---|---|
| Normal | 3/3 PASS | 3/3 PASS | No false positives |
| Clipped notice | 3/3 PASS | 3/3 PASS | 3 missed defects |
| Incorrect canvas total | 3/3 PASS | 3/3 PASS | 3 missed defects |
| Palette control | 3/3 PASS | 3/3 PASS | No false positives |

**Neither injected case meets the required 3/3 detection criterion.** Do not create a green Vision success scene or claim differentiated value was proved. Actual total request image visibly says $68.00, but model raw observation asserts $48.00 and a matching receipt. The missing Photo ID notice is also missed. Criteria anchoring or model perception may contribute, but cause is not established. These results concern this model/prompt/configuration, not all Vision agents or Midscene.

12 actual requests, one per trial, provider-reported sum **$0.00466121**, all under 30 seconds. No format retries, paid reruns or site/prompt tuning after observed misses. Costs are response sums, not guaranteed billing totals. Source/criteria/prompt hashes, actual JPEG input bytes, raw assistant content (not hidden reasoning), model/request IDs, usage, durations and videos are preserved.

- Live matrix: `artifacts/controlled-evaluation-2026-10-05T00-07-05-778Z/RESULTS.json`
- Trial files and `MAKER_REVIEW.json` in that folder. Maker labels are separate from unmodified model output; independent POC-LEAD adjudication pending.
- Exact inputs/videos in `artifacts/<trial-id>/`; within each state all three model-input JPEG hashes are identical. Different states have different hashes.
- DOM screens: `artifacts/fixture-check-ae27c5e/`; initial previews in `artifacts/fixture-check/` preserved.
- Initial pipeline-failure matrix: `artifacts/controlled-evaluation-2026-10-05T00-03-40-752Z/`, 12 failures / 0 model requests. Offline stub reproduction found missing Midscene base URL; fixed in 5a22c40 with a real screenshot-transport regression. Not a model detection failure or key-expiry claim.

To run a newly authorized matrix, set `OPENROUTER_API_KEY` securely in process environment and run `npx tsx scripts/fixture-evaluate.ts`. Never commit a key or place it in logs. API 401/402 stops paid attempts; remaining states become not-run. Output directories are unique; existing evidence is preserved. Do not repeat this matrix to seek a favorable result without a new experimental decision.

Next choices for POC-LEAD: blind visible-text/number extraction followed by code comparison against the same criteria, or a different vision model on these unchanged stored screens. Neither diagnostic nor new paid comparison has been performed. Video needs new successful independent evidence before illustrating “Vision catches what DOM tests pass”; this matrix can illustrate the coverage gap and current perception failure only.
