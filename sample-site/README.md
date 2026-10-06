# Standalone Atelier Goods sample

Target: **http://127.0.0.1:4311/order**. Operator: **http://127.0.0.1:4311/operator**.
QA platform remains **http://127.0.0.1:4310**. This is a separate Express process, API and Vite build. It reuses installed dependencies and shadcn source primitives/theme from the repository; it makes no request to the platform and needs no model key. Platform shutdown does not affect the sample.

From repository root:

```
npm install
npm run sample:build
npm run sample:start
```

For development: `npm run sample:dev`. Separately `npm run build && npm start` runs the existing QA platform on 4310. Both can run at once; stop either process independently. Default sample port 4311 (`SAMPLE_PORT` can override for development, but platform allowlisting remains exact 4311/order). Build output sample-site/dist is separate from platform apps/platform/dist.

In operator, select presentation and open/reload the neutral /order URL. Default is normal on process restart. Reset to normal button restores it. Checkout chooses Red mug ($12), notebook ($32) or clips ($8), quantity 1–5, valid recipient/email. POST /api/orders validates and computes cents on the sample server; no client-supplied price accepted, no payment, no external mutation or order persistence. Start another order resets the confirmation; reload starts a fresh checkout. Presentation is local process-wide, suitable for one operator at a time.

| Presentation | Only visible defect | Business/DOM |
|---|---|---|
| normal | none injected | identical rules |
| misaligned | receipt rotated/offset | valid order, correct text/data |
| occluded | blank panel covers receipt/graph after submission | controls, completion and amounts still work |
| clipped | collection instructions cropped after submission | complete underlying instruction DOM text |
| product-image | Red mug selection/name shows an unmistakably blue vector mug | identity/price/accessible label and confirmation correct |
| chart | 20% bar longer than 80% | labels and accessible numerical data remain 80/20 |

Target contains ordinary store UI, no fault names, operator controls, QA verdicts or answers. State selection is only /operator. SVG product artwork is a local vector asset. Canvas bars use numeric presentation separately from displayed correct data. Operators do not change the business schema or calculation.

## QA platform integration

Use the usual target URL field and registered scenario with `http://127.0.0.1:4311/order`. Example: “Select Red mug, quantity 2, enter a synthetic recipient/email, confirm the simulated order. Review product appearance, receipt and chart.” Expectations: selected product and picture agree; quantities/totals match; receipt and required collection instructions are readable; chart magnitude agrees with displayed values. No defect state or answer must be supplied to the model.

Only that exact origin/path, with no credentials/query/hash, is added. Arbitrary localhost, /operator, /api and other ports remain rejected. Its planning policy permits reversible simulated form submission only at this exact target; real purchase/account actions on other sites remain outside scope. This enables the existing pipeline; actual model ability on this new site is **not verified**. No paid model request is part of this implementation. Older 4310/demo model success is historical and does not validate these screens.

## Local verification

`npm test`: full repository unit/SDK stub suite, including authoritative totals, invalid inputs and exact platform scope. `npm run build` and `npm run sample:build`: both typechecked apps. `npm run sample:test`: same meaningful real-browser suite, unchanged across all six states: invalid email/quantity, product selection, price recalculation, selected Red mug identity/image accessible text, 80/20 chart DOM data, server 201 response/calculated amounts, recipient/order/receipt/instruction content, reset. Invalid API input=400, foreign operator origin=403, no page errors.

Captures at 1280×720 viewport are full-page browser screenshots (not model input). Checkout and confirmation are both recorded per state, with WebM and separate RESULTS.json. No pixel/color/bar-size assertions are hidden in the functional suite. Screenshot comparisons or purpose-built image/chart checks can detect these faults too; this is not a claim that Playwright cannot.

## npm workspace

This app is `@vision-qa/sample`. Install once with `npm ci` at the repository root. Direct app commands are `npm run dev --workspace @vision-qa/sample`, `npm run build --workspace @vision-qa/sample`, `npm run start --workspace @vision-qa/sample`, and `npm run test --workspace @vision-qa/sample`. Shared UI imports resolve through the local `@vision-qa/ui` workspace; they do not import the platform application. Root compatibility commands above remain valid.
