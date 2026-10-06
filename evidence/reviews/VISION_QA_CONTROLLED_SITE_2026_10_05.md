---
title: "Controlled Order Site Implementation and Fixed Evaluation"
tags: [vision-test, implementation, controlled-experiment]
status: active
created: 2026-10-05
---

## Scope and freeze

Authorizing delegation: Buzz 7fc53ce63cf4cd97eb9a5b54fb110a5f9e97af9eb08c40fe1eea989dcf91e6e2; issue f154ae050327f118109d538a5e04e0f36e103ebefd88563db432efe0b66b0791. Plan PLANS/VISION_QA_DIFFERENTIATION_SITE_2026_10_05.md read before implementation. Existing worktree and prior artifacts/video preserved.

- Baseline task, acceptance and functional assertions frozen in commit ed76daf before site implementation/defect injection. Subsequent baseline formatting only; no assertions weakened or removed.
- Implementation commit ae27c5e5e11ce536c15a3f1f80e313e0dd886599. Same HEAD before/after full npm test (2 files / 14 tests), build, four-state DOM checks and screenshot matcher run. Worktree clean.
- Order route http://127.0.0.1:4310/fixture/order; operator http://127.0.0.1:4310/fixture/operator. Only exact order origin/path is added to Vision target allowlist; query/hash/other localhost paths/ports rejected by tests.
- Functional suite confirms inputs/confirmation/recipient/items/quantities/prices/total semantic data/full delivery DOM text/visible notice and receipt canvas, identical for all four states. Four PASS, no page errors; artifacts/fixture-check-ae27c5e/RESULT.json and normal/clipped/total/decoration PNGs. Raw UI videos there.
- Defects: CSS notice height44 (normal80) hides required Photo ID line while DOM remains intact; canvas draws total68 instead of48 while line prices/semantic total remain48. Benign palette control changes no text or values. Operator labels/state never enter order screenshot/prompt.
- Screenshot assertion against normal reference differentiates both defects; default pixel tolerance accepts the mild palette-only control. Initial test expected all three differences and failed only on the benign state; corrected to report observed tolerance behavior. It does not prove Playwright cannot test pixels.
- First checkpoint posted with normal/clipped/total PNGs: accepted Buzz 2fc0358212fb09d6111c9c301e3d5d845968de4aacdc57f9ef6c95621409fe8f, signed callback mention to POC-LEAD.

## Fixed live assessment

scripts/fixture-evaluate.ts is committed before paid calls. Same criteria/prompt per state; 4 states × 3 independent trials. New browser/agent each trial, no DOM/reference image/history/variant/oracle in model input. Playwright prepares confirmation via frozen workflow, Vision assesses it. This is registered visual acceptance, not autonomous defect discovery/action performance.

Model qwen/qwen3-vl-30b-a3b-instruct. Maximum 3 actual requests/30 seconds/2048 output tokens per request. Formatting-only correction can consume remaining cap; no judgment-seeking retry. Raw assistant content (excluding hidden reasoning), source/criteria/prompt hashes, exact model-input JPEGs, response IDs/models/usage/cost and trial status retained. 401/402 stops further paid attempts; pending cases labeled not-run. Key loaded from authorized human event into child process memory, not printed or saved to file. Operator reset to normal after evaluation.

Append actual matrix and independent-review needs below when complete.

## Pre-request failure isolated and repaired

- First evaluation folder `artifacts/controlled-evaluation-2026-10-05T00-03-40-752Z`: 12 setup failures, DOM PASS, 0 instrumented requests, no model judgments. Preserved unchanged. Generic error alone was not treated as proof of a cause.
- Reproduced locally with stub client, no paid API: `failed to get base URL of model (intent=default)`, stack `@midscene/shared/dist/es/env/parse-model-config.mjs:167`, then ModelConfigManager.initialize. Midscene validates base URL before calling even a supplied custom client.
- Added server/fixture-assessment.ts factory with explicit OpenRouter base URL/retry/timeout. No site, injected state, baseline assertions or judge prompt changed.
- Fixed commit `5a22c40956c4833b3331d1860be5e8745c6c7d8b`: clean worktree; full **2 files / 15 tests** and build passed; same HEAD before/after. New real-browser stub test actually completes an image-only aiQuery through this factory with one outgoing stub request and no hidden DOM sentinel.
- Lead follow-up a792c7b526ffed836a4d12118edd1ee71868d3eaf4249b04e4a935451b9bd879 independently classifies prior records as pipeline failure and authorizes original matrix after repair. New matrix started; no extra judgment-seeking repetition authorized or performed.

## Fixed actual-model matrix: differentiation acceptance not met

- Completed folder `artifacts/controlled-evaluation-2026-10-05T00-07-05-778Z`, clean code5a22c40, same criteria/prompt hashes as failed preflight. Normal/clipped/total/decoration each 3 trials, all assessed with one actual request each. No format retries or paid follow-up matrix. All durations 3.199–13.998 seconds, below30 seconds.
- All twelve model verdicts PASS. Maker classification: normal no false positives3/3; benign no false positives3/3; clipped misses3/3; incorrect total misses3/3. Therefore neither injected defect meets the required detection criterion; no successful Vision-only case exists in this matrix.
- 12 actual requests / response-reported sum $0.00466121. Model/response IDs and usage in raw trial records. No guaranteed billing-total claim.
- Maker viewed actual clipped request image efd3d933 and total request image a323b3f8. Clipped input lacks the Photo ID line. Total input visibly says68 while raw observation claims48 and matching receipt. Within each state, all three actual JPEG input SHA256 hashes are identical; four states have distinct hashes. MAKER_REVIEW.json records these hashes and classifications separately from original model output. POC-LEAD independent adjudication pending.
- This is registered visual acceptance on DOM-prepared screenshots, not autonomous discovery. Current model/prompt/configuration failed the task; cause not established. Do not infer all Vision/Midscene cannot work or publish fabricated positive differentiation.
- Self-review found production nested routes would404 although dev worked. Added only exact order/operator SPA production routes (de88bb8); does not change measured presentation or prompt. Full2files/15tests and build passed with same HEAD de88bb8 before/after; a README-only edit occurred while these checks ran, no runtime source changed. Do not describe end working tree as clean at that checkpoint. Production DOM/screenshot checks follow below.

## Final production and source verification

- Production nested route self-review exposed Not Found (sendFile absolute path under hidden .buzz ancestor). Reproduced via HTTP400 body and real-browser log, then switched to known index.html relative to explicit dist root. No route broadening, screen or prompt changes.
- Final code `72a46631fa1ee54b037c7fa870b5f42961694382`: full2files/15tests and build passed with HEAD before/after matching and clean worktree. Production `npm start` on4310: identical four-state DOM suite PASS, no page errors, screenshot matcher PASS. Same HEAD before/after production checks. artifacts/fixture-production-72a4663/RESULT.json and PNG/WebM.
- Live evaluation remains attributed to 5a22c40; later runtime change is production HTML routing only, plus docs. Never attribute the paid matrix to the later tip.
- Earlier production-failure artifacts in fixture-production-de88bb8 remain local; no model calls occurred. Final bundle uses verified production outputs, while original matrix/preflight evidence remains unchanged.

## PR and evidence delivery

- Five outgoing commits inspected against actual origin/poc-maker/vision-qa for configured agent author/committer and signed-message headers; pushed72a4663 successfully. No invented human coauthor/DCO attribution.
- Same channel-linked PR update accepted a23646b1fdd1bf5a6779f2b7be8dc7125d38806e525890bd068f84efea5c2b50. `pr update` has no channel option (help checked); original channel-linked PR retained and current UUID explicitly included in body. No duplicate PR/project created.
- Final evidence archive OUTBOX/VISION_QA_CONTROLLED_SITE_EVIDENCE_72A4663.zip:109artifact files plus handoff/frozen criteria/baseline/reference/readme,7,910,455 bytes; key-pattern scan0 matches. Prior archive/evidence preserved. Final production server remains available on4310, operator resetnormal, no key persisted.

- Final callback result accepted28a21bf7efc31c0b64bf7cc111f7934c1721df029ae43b1b7a0a6400dc55fa7f with three PNGs; signed mention_pubkeys includes POC-LEAD. Matrix misses and inability to claim positive Vision differentiation stated explicitly. Final worktree clean at72a4663. Independent review remains pending; implementation issue/PR not closed or merged.
