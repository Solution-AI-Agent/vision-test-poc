import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
process.chdir(fileURLToPath(new URL("../", import.meta.url)));
const source = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const folder = `artifacts/direct-korean-store-${new Date().toISOString().replace(/[:.]/g, "-")}`;
let platformStopped = false;
try { await fetch("http://127.0.0.1:4310/", { signal: AbortSignal.timeout(1000) }); } catch { platformStopped = true; }
if (!platformStopped) throw new Error("Stop the QA platform for this independent browser capture.");
await mkdir(folder, { recursive: true });
const browser = await chromium.launch();
const results: any[] = [];
try {
  for (const version of ["a", "b", "c", "d", "e", "f", "g"]) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: folder, size: { width: 1280, height: 720 } } });
    const page = await context.newPage(); const requests: string[] = []; const errors: string[] = [];
    page.on("request", r => requests.push(r.url())); page.on("pageerror", e => errors.push(e.message));
    await page.goto(`http://127.0.0.1:4311/store/${version}`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: `${folder}/store-${version}-initial.png`, fullPage: true });
    await page.getByLabel("수량", { exact: true }).fill("2");
    await page.getByLabel("받는 분").fill("김민수");
    await page.getByLabel("이메일 주소").fill("minsu@example.test");
    await page.getByRole("button", { name: "주문 확정하기" }).click();
    await page.getByRole("heading", { name: "주문이 완료되었습니다." }).waitFor();
    await page.getByRole("button", { name: "다시 주문하기" }).waitFor();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${folder}/store-${version}-confirmed.png`, fullPage: true });
    if (requests.some(u => !u.startsWith("http://127.0.0.1:4311/") || u.includes("/api/operator") || u.includes("/api/presentation"))) throw new Error("Unexpected app dependency");
    if (errors.length) throw new Error(errors.join(";"));
    const video = page.video(); await context.close();
    results.push({ version, requests, errors, video: await video?.path() });
  }
} finally { await browser.close(); }
await writeFile(`${folder}/RESULTS.json`, JSON.stringify({ source, platformStopped, modelCalls: 0, operatorCalls: 0, renderingInjection: false, capture: "direct ordinary-browser visits and form submission; not model input", language: "ko", results }, null, 2));
console.log(folder);
