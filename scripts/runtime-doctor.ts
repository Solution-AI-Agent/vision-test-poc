import { chromium } from "playwright";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { proxyEnvironment } from "../apps/platform/server/network";
import { diagnose, type ExecutionPhase } from "../apps/platform/server/diagnostics";

// Local probe only: no API key, provider client, external navigation or runtime data.
const require = createRequire(import.meta.url);
const report: Record<string, unknown> = {
  node: process.version, platform: process.platform, arch: process.arch,
  playwright: require("playwright/package.json").version,
  nodeSupported: Number(process.versions.node.split(".")[0]) >= 24,
  browser: false, screenshot: false, video: false, modelCalled: false,
};
let phase: ExecutionPhase = "artifact-prepare";
let folder: string | undefined;
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
try {
  phase = "model-initialization";
  const proxy = proxyEnvironment();
  report.proxy = { http: Boolean(proxy.httpProxy), https: Boolean(proxy.httpsProxy), userBypass: Boolean(process.env.no_proxy ?? process.env.NO_PROXY), networkTested: false };
  phase = "artifact-prepare";
  folder = await mkdtemp(path.join(tmpdir(), "vision-qa-probe-"));
  phase = "browser-launch";
  browser = await chromium.launch({ headless: true, timeout: 10000 });
  report.browser = true;
  phase = "video-context";
  const context = await browser.newContext({ recordVideo: { dir: folder }, viewport: { width: 640, height: 360 } });
  const page = await context.newPage();
  await page.setContent('<html lang="ko"><body><h1>로컬 실행 점검</h1></body></html>');
  phase = "screenshot";
  await page.screenshot({ path: path.join(folder, "probe.png"), timeout: 5000 });
  report.screenshot = true;
  phase = "video-finalization";
  const video = page.video();
  await context.close();
  if (!video || (await stat(await video.path())).size === 0) throw new Error("Empty video");
  report.video = true;
  report.ok = report.nodeSupported;
  if (!report.nodeSupported) report.action = "Node 24 이상으로 실행하세요.";
} catch (error) {
  report.ok = false;
  report.diagnostic = diagnose(error, phase);
} finally {
  await browser?.close().catch(() => {});
  if (folder) await rm(folder, { recursive: true, force: true }).catch(() => {});
}
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
