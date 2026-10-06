---
title: "Final v5 differentiation video accepted after independent review"
tags: [vision-qa, video-review, acceptance]
status: active
created: 2026-10-05
---

## Decision

Accept final v5 as the requested explanation video of the working selected-case demonstration. The opening directly shows the user-visible receipt obstruction, same-run DOM/function PASS, actual Vision issue, and normal control within 30 seconds. Demo site and difference-focused video delivery are complete; this does not establish unrestricted autonomous QA feasibility or approve PR merge.

Video: https://orangestandard.communities.buzz.xyz/media/7ed43ab8d6f1386cd69344f27dc05b1a5c9eb36f89d654631c1e6cdbfef63163.mp4

## Independent verification

- File `OUTBOX/VISION_TEST_LUMEN_V5/VISION_TEST_LUMEN_V5.mp4`: computed SHA256 matches `7ed43ab8d6f1386cd69344f27dc05b1a5c9eb36f89d654631c1e6cdbfef63163`, the reported uploaded hash.
- Reused inspected AVAssetReader verifier to decode the whole final video into separate `OUTBOX/VISION_TEST_LEAD_V5_VIDEO_REVIEW/`. Completed 3,840 frames, 160 seconds, 1280×720, 24fps, monotonic timestamps, zero audio tracks; last PTS 159.958333s.
- Extracted 45 scene-boundary/midpoint frames. All 45 independently produced PNG hashes match LUMEN's corresponding continuous-decode outputs.
- Directly visually reviewed 15 midpoint frames (DECODED_02,05,08,11,14,17,20,23,26,29,32,35,38,41,44). Headers, original response, Korean captions, numeric table and limits were legible without observed text omissions or overlaps in these frames. This is representative-frame review, not human inspection of every frame or GUI full viewing.
- Reconciled all 21 manifest source copies against original files and recorded SHA256; all match. Frozen baseline source hash also matches evaluation source record.
- Read full storyboard and handoff. First issue comes from fault run `ae75c703-b63f-477b-84a0-0c9e753dd31a`; normal is `b7181596-c25a-4eb9-be43-56e76d685802`. Same-case functional evidence is not mixed with a different fault. Speculative second collection issue is excluded from precise localization claims.
- Result table matches independently accepted matrix: normal3/3 pass, fault3/3 candidate, DOM6/6 PASS, 6 requests, response-reported $0.00255091. Selected 9-call development phase and prior misses remain separate in source/appendix.
- The video labels UI capture editing and saved results, distinguishes actual 1280×720 model inputs from responsive preview, identifies direct model judgment rather than blind extraction/code comparison, and states Playwright reference screenshot comparison also detects the fault.

## Limits and next action

LUMEN reports AVPlayer real-time program playback; reviewer did not repeat that playback or watch the full video in a GUI. Independent full decode and sampled visual review suffice for this deliverable; no claim of GUI full viewing is made. The artifact is silent Korean-captioned video. Windows/mobile Vision accuracy, general unseen-defect performance and full autonomy remain unverified. Preserve v4, failed experiments and all source assets. Recommend using this selected Web example to explain the additional visual check; broader adoption needs new-case validation.
