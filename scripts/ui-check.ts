import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const origin = process.env.APP_ORIGIN ?? "http://127.0.0.1:4310";
await mkdir("artifacts/ui-check", { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
  recordVideo: {
    dir: "artifacts/ui-check",
    size: { width: 1440, height: 1100 },
  },
});
const page = await context.newPage();
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto(origin);
  await page.getByText("화면에서 계획하는 QA.", { exact: true }).waitFor();
  await page.getByText("키 설정 필요 · Vision 대기", { exact: true }).waitFor();
  const priorRuns = await (await page.request.get(`${origin}/api/runs`)).json();
  if (
    priorRuns.some(
      (r: any) => r.input.mode === "baseline" && r.status === "completed",
    )
  ) {
    await page.getByRole("button", { name: "증거 & 검토" }).click();
    await page
      .getByRole("button", { name: /Playwright 비교군/ })
      .filter({ hasText: "완료" })
      .first()
      .click();
    await page.getByRole("button", { name: "실행 워크스페이스" }).click();
  }
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({
    path: "artifacts/ui-check/WORKSPACE_DARK.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "모델 & 설정" }).click();
  await page
    .getByLabel("API 키", { exact: true })
    .fill("stub-ui-key-not-a-real-key");
  await page.getByRole("button", { name: "설정 적용" }).click();
  await page.getByText("설정을 적용했습니다.", { exact: false }).waitFor();
  assert.equal(
    await page.getByLabel("API 키", { exact: true }).inputValue(),
    "",
  );
  const settings = await page.request.get(`${origin}/api/settings`);
  const settingsJson = await settings.json();
  assert.equal(settingsJson.hasKey, true);
  assert.ok(!JSON.stringify(settingsJson).includes("stub-ui-key"));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({
    path: "artifacts/ui-check/SETTINGS_DARK.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "키 삭제" }).click();
  await page.getByText("API 키를 삭제했습니다.", { exact: true }).waitFor();
  await page.getByRole("button", { name: "실행 워크스페이스" }).click();
  await page.getByRole("tab", { name: "등록 시나리오", exact: true }).click();
  await page.getByRole("button", { name: "시나리오 저장" }).click();
  await page.getByText("시나리오를 저장했습니다.", { exact: true }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({
    path: "artifacts/ui-check/SCENARIO_DARK.png",
    fullPage: true,
  });
  assert.equal(
    await page
      .getByRole("button", { name: "시나리오 실행", exact: true })
      .isDisabled(),
    true,
  );
  const noKey = await page.request.post(`${origin}/api/runs`, {
    data: { mode: "autonomous", url: "https://www.youtube.com/" },
  });
  assert.equal(noKey.status(), 400);
  const external = await page.request.post(`${origin}/api/scenarios`, {
    data: {
      name: "bad",
      url: "https://127.0.0.1/",
      task: "read",
      expected: "visible",
    },
  });
  assert.equal(external.status(), 400);
  const csrf = await page.request.put(`${origin}/api/settings`, {
    headers: { Origin: "https://attacker.invalid" },
    data: settingsJson,
  });
  assert.equal(csrf.status(), 403);
  await page.getByRole("button", { name: "증거 & 검토" }).click();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({
    path: "artifacts/ui-check/EVIDENCE_DARK.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "라이트 테마" }).click();
  await page.getByRole("button", { name: "모델 & 설정" }).click();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({
    path: "artifacts/ui-check/SETTINGS_LIGHT.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({
    path: "artifacts/ui-check/SETTINGS_MOBILE.png",
    fullPage: true,
  });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    "mobile horizontal overflow",
  );
  assert.deepEqual(errors, []);
  await writeFile(
    "artifacts/ui-check/RESULT.json",
    JSON.stringify(
      {
        status: "pass",
        checks: [
          "settings save and key masking",
          "key deletion",
          "scenario persistence",
          "missing-key guard",
          "target boundary",
          "same-origin mutation guard",
          "dark/light/mobile views",
          "no browser exceptions",
        ],
        provider: "not called",
        at: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  console.log(
    "UI/API checks passed; screenshots and raw video: artifacts/ui-check/",
  );
} finally {
  await context.close();
  await browser.close();
}
