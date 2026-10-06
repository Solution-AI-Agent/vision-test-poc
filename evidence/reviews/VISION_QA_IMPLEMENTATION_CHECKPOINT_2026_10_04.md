---
title: "Vision QA Implementation Checkpoint and Live Validation"
tags: [vision-test, midscene, implementation, validation]
status: active
created: 2026-10-04
---

## Fixed implementation checkpoint

- Worktree: `/Users/zpro/.buzz/REPOS/vision-test-maker`, branch `poc-maker/vision-qa`.
- Tested source commit: `ecf9e53736f33d38f6ab2e80eefb1b7c14877030`.
- Full `npm test`: 2 files / 8 tests passed, 2026-10-04 09:45 UTC. `git rev-parse HEAD` before and after matched the above commit.
- `npm run build`: TypeScript + Vite passed in the same shell and commit state.
- `npm run test:ui`: real Chromium UI/API flow passed at the same commit, including corrected missing-key readiness and stabilized screenshots.
- Real YouTube locator baseline in preceding worktree state: `artifacts/youtube-check/RESULT.json`, run `f0b467c9-1aa1-4714-87fc-717ac619514f`, completed 3 operations, 0 model calls; resulting screen inspected and contains a Midscene result.
- Lifecycle checks in preceding worktree state: action cap and immediate stop passed; `artifacts/lifecycle-check/RESULT.json`.
- Both runner-mode unit/integration tests use local fixtures and stub VLMs. Actual model-input bytes are preserved and linked; DOM sentinels/tree reads excluded; real button changes after coordinate click; finish image follows request image. These are not live OpenRouter results.
- Original checkout still has the same untracked package.json, package-lock.json and node_modules; none were removed/overwritten.
- Remote was empty before push. One root commit outgoing; author/committer and signed-message pk match the configured POC_MAKER identity. No human coauthor or DCO trailer was invented. Branch tip on remote matches the tested commit.
- Review PR: buzz://pr?id=72ca9b460234fd00c8a29d1f7534ae67cf6e3824c0743def2957fda962c97ddf&owner=a80ae419fd6a1475b24961e49e2c135ec541a35177efc7977d5e770394843c0a&d=vision-test

## New user-authorized live validation

- Authorization: Buzz event `4e9f9b759e66a456e28fbfa906119d66e337812145d979b995d3b6ceddbeafc0` supplied a temporary key and explicitly requested model `qwen/qwen3-vl-30b-a3b-instruct`.
- The key was loaded via a relay-read → in-memory parse → localhost settings request; it was not printed, written to a file, or committed. Never include its content in this log.
- Bounds chosen for first runs: 6 actions / 8 actual model requests / 120 seconds / 2048 output tokens per request, per mode. No dollar budget claimed.
- App authentication check succeeded (`connection: connected`); this alone does not prove image compatibility or QA behavior.
- Registered live scenario started; results will be appended after actual completion.

## Final revised-code checkpoint

- Code commit: `8fcac127a2e76abb5da45ecad8913367f9d33267` (clean working tree at server startup).
- Full suite: **2 files / 10 tests passed**, 2026-10-04 10:08 UTC; TypeScript + Vite build passed in the same shell. HEAD before/after matched this code commit.
- Added regressions: pass with a normal finding never becomes a defect candidate, pass ends a task without an extra action, complete plain JSON is normalized to Midscene's response protocol without semantic changes, one schema-correction request is bounded, and unchanged screens cause one replan then explicit inconclusive stop.
- Final autonomous run: `5739f389-9faa-4528-8979-92e3d968b3ea`; recorded source commit above, source SHA-256 in run report, prompt `goal-first-v3-protocol-and-replan`, requested/response model `qwen/qwen3-vl-30b-a3b-instruct`.
- Screenshot-selected goal: search for `cooking tutorial` (chosen by model, not given by user). The model typed without focusing an input, then pressed Enter; both actions left byte-identical before/after PNGs. One goal replan did not recover; subsequent waits also showed no change. Controller stopped as **재계획 후에도 화면 진전 없음 · 판단 불가**.
- That run: 6 requests, 4 executed actions, 13,734 reported tokens, provider-reported $0.00283305, 0 defect candidates. All request responses used the expected data-json protocol; no token truncation was reported. This run demonstrates bounded failure handling, not successful autonomous discovery.
- Earlier live states remain in the app/unique reports: `1b8bc475…` and `193a9473…` repeated clicks/waits; `0163b8ca…` selected a cooking goal then failed plan schema; `1bf47058…` selected tutorials then failed Midscene response parsing. No retroactive success claims.
- Initial registered normal-success finding was classified as app false positive. Original record remains, with independent review note. Fix filters candidate verdict only.
- Final registered-mode run at the same code commit started after this autonomous result; append its actual outcome below.

## Final registered run and review delivery

- Registered `044ecb6b-dfb3-4c61-970b-d0dc653f3201` at the same clean code 8fcac127: completed 5 requests / 4 actions / 28.991 s / 11,731 reported tokens / reported $0.00236504 / 0 candidates. Actual final `4-decision.png` visually inspected: entered query and related Midscene video results. Pass decision stopped without executing a redundant wait.
- All eight live attempts: 42 requests, provider-reported $0.0198094. `artifacts/live-check/FINAL_SUMMARY.json` identifies each attempt. No further paid calls made for delivery.
- Stabilized final UI screenshots/video in `artifacts/live-capture/`; autonomous evidence screenshot inspected and shows failed search input/unchanged screens, zero candidates and explicit inconclusive stop.
- Evidence bundle `OUTBOX/VISION_QA_LIVE_EVIDENCE.zip`: 183 artifact files plus handoff/readme, 15,890,188 bytes; selected artifact bytes scanned for OpenRouter key pattern, zero matches. Includes original failures and raw videos, no settings store or stub runs.
- Documentation-only tip `03a8239a4995c364c7b2269399369d15ea2b62c6`: only README.md/HANDOFF.md differ from tested code8fcac127. Four outgoing commits inspected against actual origin/poc-maker/vision-qa; agent author/committer identities and signing headers verified, no invented human trailer. Pushed branch successfully.
- Overall acceptance, successful autonomous discovery/defect reproduction, Windows and edited video remain open. Current local server retains key in process memory; no disk persistence claimed.

- PR update accepted: `63e122732a09bd3e2c43823038a8c9a04009ae230f9d4d390b8fbd6258dd22d1`. Final result message with three PNGs accepted: `8b1c5bd125e45109dfc0369bddf4b85d8b37d3e406b1407f10c71addd72554b8`; signed mention_pubkeys includes POC-LEAD. Buzz rejected application/zip and video/webm uploads, so ZIP and raw WebMs remain local; delivered message states this limitation explicitly.
