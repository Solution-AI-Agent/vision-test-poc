---
title: "User correction: deliver a working differentiation demo site"
tags: [vision-qa, demo, user-direction]
status: active
created: 2026-10-05
---

## User direction and completion criterion

User repeated at 00:38 and 01:09 UTC that the deliverable is a test site demonstrating Playwright passing while Vision identifies a real screen defect. Failure analysis alone does not fulfill this request. Prioritize a deliberately constructed, working demonstration and a video of that demonstration. Do not imply the current site has already met this criterion.

POC_MAKER directive event: `b19fdfa73151b1a2746ccd46590c5e741578a21b292cdc3195b3530acfea1c51`.
LUMEN directive event: `4b5784f7c5875cff40639267c9a43fc00f261a3d2c126ca02337c872f918ac99`.

## Execution

- Finish already-started 03320fd blind extraction batch within its existing limits; preserve it. If it yields an independently verified useful case, use that case in the actual site demonstration. Correctly label extraction-plus-code comparison.
- If no useful case, construct a separate version with a clearer rendering fault. Suggested case: after successful order confirmation, a misplaced noninteractive layout panel visibly covers substantial receipt/required instructions. Same order functionality and meaningful DOM assertions must remain intact. Technical implementation is maker's choice.
- Users must be able to toggle normal/defective site and inspect actual function-suite results and actual Vision issue/evidence. Never hardcode a fake Vision verdict or claim success from a simulated response. Historical results must be labeled as recorded, not current live runs.
- No fault label, variant name or answer supplied to the model. Maintain business criteria and normal control. Screenshot-based Playwright can detect visual differences; comparator remains explicitly DOM/function suite.
- If candidate screening is needed: same user-selected model, normal once plus at most two candidates once each. Select at most one useful candidate and freeze it before normal/defect three trials each. Entire additional stage ceiling 9 requests, 30sec/2048 tokens per request, no format retries. This supersedes the prior blind-extraction plan's automatic stop after that batch solely to permit this newly directed demonstration work. It does not authorize unbounded retries or a model switch.
- Preserve failures and all versions. This is an intentionally selected demonstration, not a blind benchmark of unseen defects. No general performance claim from selected examples.

## Video

First sequence: visible user problem → same case's actual DOM/function PASS → actual Vision issue/location/reason → normal control. Deliver working demo URL, evidence and footage before expanding analysis. Retain concise limitations; do not turn the video into the prior failure chronology. Lead independently validates the successful case before final claims.
