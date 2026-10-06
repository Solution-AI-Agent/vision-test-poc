---
title: "Working differentiation demo independently accepted"
tags: [vision-qa, independent-review, demo]
status: active
created: 2026-10-05
---

## Decision

Accept the selected Web demonstration: the same meaningful DOM/function suite passes, while actual screenshot-based Vision identifies receipt occlusion in three fixed confirmation trials and passes three normal trials. This is direct model judgment, not the separate blind-extraction/code-comparison experiment. Site: http://127.0.0.1:4310/demo . Video completion remains pending.

## Evidence reviewed

- Live source `373ecad3216c92f9ace7785df91c7c59ed9dcb6e`, matrix `REPOS/vision-test-maker/artifacts/demo-verify-2026-10-05T01-22-24-239Z/RESULTS.json`.
- Read all six raw responses and verdicts. Viewed representative normal and fault exact request JPEGs; all six actual input hashes match recorded outbound request hashes. Three normal images share one hash; three defect images share another. Request text is identical across six trials, has empty PageDescription, no state names or answer labels, and one screenshot each.
- Independently summed six requests and response-reported cost $0.00255091. Additional selection phase is separately recorded; no reviewer paid call was made.
- Defect representative: `ae75c703-b63f-477b-84a0-0c9e753dd31a`; same trial DOM PASS, actual model image and candidate response. The first issue correctly locates the obscured receipt and explains that labels/amounts/total cannot be read. Its second issue speculates about collection-instruction location; do not use that speculative wording as precise localization evidence.
- Normal representative: `b7181596-c25a-4eb9-be43-56e76d685802` with readable receipt and PASS. Remaining fault responses independently identify the central/lower occlusion.
- Reviewed evaluation script, baseline assertions and final outbound text. Existing assertions remain meaningful: confirmation, recipient, line items, semantic total, complete DOM notice text and visible receipt element. They do not determine pixel occlusion. Screenshot comparison also detects this fault.

## Independently reproduced

At `3163da8042744a8defc8647c31efe9d86d0c3c1e`, full 3-file/17-test suite, build and actual screenshot suite 2/2 passed. HEAD and clean worktree were checked before/after. Screenshot tests include actual normal/fault DOM workflows. Live source to final UI differences include prefilling the same recipient; the reviewed order-confirmed screen remains the evidence source.

Independent Chromium interaction: toggle normal/fault, confirm order in iframe, open original image and JSON endpoints (both HTTP 200 in each state), match correct representative run IDs/verdicts. No page errors. New own captures and results: `artifacts/lead-demo-ui-3163da8/`. Viewed normal/fault desktop and mobile captures. UI clearly labels saved real results and no paid calls on switching. Mobile layout is usable but differs from evaluated 1280×720; mobile Vision accuracy is not established. Use exact evaluated screenshots for video detection evidence, and distinguish responsive interactive preview from recorded evaluated input.

## Scope and next action

This intentionally selected large occlusion is an accepted demonstration, not held-out accuracy, fully autonomous discovery or general superiority over Playwright. Earlier misses remain available in disclosure. Site acceptance does not merge PR or validate Windows. LUMEN should complete v5 using the verified same-run fault evidence, normal control and actual workflow. Show the receipt issue, not speculative prose, in the opening.
