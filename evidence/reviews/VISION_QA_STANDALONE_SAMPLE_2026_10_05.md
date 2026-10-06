---
title: "Independent six-state sample store separated from QA platform"
tags: [vision-qa, sample-site, visual-semantics]
status: active
created: 2026-10-05
---

## Deliverable and boundaries

User corrected the product boundary: QA platform stays on 4310, while test website is a separate product/process on 4311. POC-LEAD assigned issue 23cef413b01655a8b31d4685debf57226d22453a08a76f3f6ee4bb12252d4771; plans VISION_QA_STANDALONE_SAMPLE_SITE_2026_10_05.md and VISION_QA_SAMPLE_VISUAL_SEMANTIC_DEFECTS_2026_10_05.md define scope. Implemented in existing worktree/branch, preserved original checkout, platform /demo and recordings/videos.

Source: 045fdf3d93ff677f4669650aa4394856b01b752c. sample-site/ owns server, local order API, entry point and separate Vite build. Root installed dependencies and official shadcn source/theme are shared at build time; runtime does not import platform server or call port 4310. Operator state is process-local and only presentation API uses it; order.ts validates schema and calculates server totals without state access. No payment/external mutation/persisted orders.

- Target http://127.0.0.1:4311/order; operator http://127.0.0.1:4311/operator.
- Platform http://127.0.0.1:4310 unchanged. Usual URL/scenario registration accepts only exact additional 4311/order with no credentials/query/hash. Operator/API paths and arbitrary localhost remain excluded.
- Scope-specific planner policy allows synthetic input/simulated submission/reset only for the exact independent target. Public YouTube keeps its previous action restrictions. Prompt version bumped to goal-first-v5-exact-simulated-order-scope; no real model invocation.

## Six controlled renderings

Normal; receipt rotation/offset; post-submission blank receipt overlay; clipped collection instructions; selected/ordered Red mug drawn clearly blue; Canvas community chart reverses visual 80/20 bar lengths while labels/accessibility/DOM values stay correct. All have the same catalog, quantities, validation, order POST, calculated cents and reset flow. Target contains no operator controls, QA verdict or defect labels. SVG mug is native vector artwork; Canvas chart is local rendering, not model output.

## Verification at fixed source

Before/after same 045fdf3, clean tracked/untracked tree: full 4-file/20-test repository suite, platform build, standalone build. Unit/stub tests cover exact URL scope, scoped simulated action permission, server authoritative totals and invalid caller prices/flags. Existing full Playwright screenshot suite 2/2 passes in artifacts/standalone-platform-regression-045fdf3; historical platform visuals unaffected.

Stopped the actual platform listener (no memory-only key configured), verified 4310 connection refusal and 4311 HTTP200. While platform stayed stopped, ran entire same six-state sample suite: all six PASS, invalid API400, foreign operator Origin403, page errors0. Then restored production platform on4310 while sample process remained on4311. Evidence: artifacts/standalone-independence-045fdf3.json and artifacts/standalone-sample-2026-10-05T11-57-19-450Z/RESULTS.json.

Same suite checks disabled empty/invalid inputs, product changes and price recalculation, selected mug accessible identity, quantity2 and server201 calculated total24, recipient, product/receipt DOM values, full instruction DOM string, correct 80/20 chart text/accessibility, receipt region visibility and Start another order. No pixel/asset/color/bar-width assertion is removed or case-specialized. Ordinary DOM/function suite purposefully does not test visual semantic consistency; screenshot/purpose-built visual checks could.

Actual platform UI: selected registered-scenario tab, entered target URL/task/generic expectations and saved scenario201; operator URL rejected400. Scenario id60a1d425-906d-43ed-90f2-b76b0275d655, name “독립 샘플 주문 검증”. No run clicked, key false, no model call. Evidence artifacts/standalone-platform-integration-045fdf3/RESULTS.json and scenario.png. Existing scenarios preserved.

Viewed normal, all five fault confirmation screens, product-image checkout, chart screen, mobile normal. Screens are full-page captures at a 1280x720 viewport, not model request images. Red/blue difference and reversed chart clear; normal correctly proportioned. Mobile is UI inspection only. Checkout and confirmation PNGs, raw WebM and operator/mobile captures kept under final sample artifact folder.

## Failures preserved and limits

Initial uncommitted local run caught reset button triggering immediate resubmission through reused form-associated DOM. Prevented reset default activation; same real-browser reset regression now passes. Separate Vite source scan initially omitted external shared UI classes; explicit Tailwind sources fixed styling. Old debug captures retained in artifacts/standalone-sample-2026-10-05T11-51-50-950Z; subsequent preliminary six-state pass in 11-53-47-435Z retained. Integration driver initially omitted switching from autonomous to scenario tab; corrected actual tab selector, no product change.

Initial multi-operation server launch permission review timed out; split local file changes from a minimal server launch and one permitted retry succeeded. No unsafe-action inference or unresolved permission blocker.

New site's model detection is NOT tested, no additional paid calls or new video render. Old accepted /demo model evidence and v5 belong to their older site/version. Both servers running; sample defaults reset normal after checks. Operator state is shared locally between tabs; reload target after selecting. Independent lead validation pending.

## Primary component references

Existing shadcn skill and installed radix-nova primitives reused; official docs read before composition: https://ui.shadcn.com/docs/components/radix/card, /field, /input, /button, /toggle-group, /alert. Existing root src/index.css tokens retained with explicit build sources; no preset overwrite.
