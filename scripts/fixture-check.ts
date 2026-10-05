import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fixtureBaseline } from "./fixture-baseline";
const origin = "http://127.0.0.1:4310";
const folder = process.argv[2] ?? "artifacts/fixture-check";
await mkdir(folder, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const state of ["normal", "clipped", "total", "decoration"]) {
    const response = await fetch(`${origin}/api/fixture/operator`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state }),
    });
    if (!response.ok) throw new Error("Operator configuration failed");
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      recordVideo: { dir: folder, size: { width: 1280, height: 720 } },
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await fixtureBaseline(page);
    if (errors.length) throw new Error(`Page error: ${errors.join(",")}`);
    await page.screenshot({ path: `${folder}/${state}.png` });
    results.push({
      state,
      domSuite: "PASS",
      pageErrors: errors,
      screenshot: `${folder}/${state}.png`,
    });
    await context.close();
  }
} finally {
  await browser.close();
  await fetch(`${origin}/api/fixture/operator`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: '{"state":"normal"}',
  });
}
await writeFile(
  `${folder}/RESULT.json`,
  JSON.stringify(
    {
      commit: execFileSync("git", ["rev-parse", "HEAD"], {
        encoding: "utf8",
      }).trim(),
      criteria: "evaluation/CRITERIA.json",
      results,
    },
    null,
    2,
  ),
);
console.log(JSON.stringify(results));
