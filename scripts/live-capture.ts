import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
const origin = "http://127.0.0.1:4310";
await mkdir("artifacts/live-capture", { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
  recordVideo: {
    dir: "artifacts/live-capture",
    size: { width: 1440, height: 1100 },
  },
});
const page = await context.newPage();
async function capture(name: string) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  await page.screenshot({
    path: `artifacts/live-capture/${name}.png`,
    fullPage: true,
  });
}
try {
  await page.goto(origin);
  await page.getByText("화면에서 계획하는 QA.", { exact: true }).waitFor();
  await capture("WORKSPACE_LIVE");
  await page.getByRole("button", { name: "모델 & 설정" }).click();
  await capture("SETTINGS_LIVE");
  await page.getByRole("button", { name: "증거 & 검토" }).click();
  await page
    .getByRole("button", { name: /Vision 시나리오/ })
    .filter({ hasText: "완료" })
    .first()
    .click();
  await capture("SCENARIO_EVIDENCE");
  await page
    .getByRole("button", { name: /Vision 자율 탐색/ })
    .first()
    .click();
  await capture("AUTONOMOUS_EVIDENCE");
} finally {
  await context.close();
  await browser.close();
}
console.log(
  "Read-only live UI screenshots and video captured; no settings or key mutations",
);
