import { it, expect } from "vitest";
import { chromium } from "playwright";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { rm, mkdir, writeFile } from "node:fs/promises";
import { defaults, inputSchema } from "./domain";
import { artifactsDir, makeRun, runVision, instrumentClient, type Runtime } from "./runner";
import { diagnose, SafeExecutionError } from "./diagnostics";

async function preserve(run: ReturnType<typeof makeRun>) {
  const folder = path.join(artifactsDir, "runtime-diagnostics-check");
  await mkdir(folder, { recursive: true });
  await writeFile(path.join(folder, `${run.id}.json`), JSON.stringify(run, null, 2));
}
function fixtureRun() {
  return makeRun(inputSchema.parse({ mode: "autonomous", url: "http://127.0.0.1:4311/store/a" }), { ...defaults, maxSeconds: 30 });
}
it("actual missing Chromium fails before model calls and preserves browser phase", async () => {
  const run = fixtureRun();
  try {
    await runVision(run, defaults, { controller: new AbortController() }, async () => {}, {
      launchBrowser: () => chromium.launch({ executablePath: path.join(tmpdir(), `absent-${run.id}`, "chromium"), timeout: 3000 }),
      createClient: () => { throw new Error("Model must not be called"); },
    });
    expect(run.status).toBe("failed");
    expect(run.diagnostic?.code).toBe("BROWSER_NOT_INSTALLED");
    expect(run.diagnostic?.phase).toBe("browser-launch");
    expect(run.stage).toBe("실패 · Chromium 시작");
    expect(run.failureStage).toBeTruthy();
    expect(run.calls).toBe(0);
    expect(run.transport).toEqual([]);
    await preserve(run);
  } finally { await rm(path.join(artifactsDir, run.id), { recursive: true, force: true }); }
});
it("actual refused navigation preserves target phase with zero model calls", async () => {
  const listener = createServer();
  await new Promise<void>((resolve) => listener.listen(0, "127.0.0.1", resolve));
  const port = (listener.address() as { port: number }).port;
  await new Promise<void>((resolve, reject) => listener.close((error) => error ? reject(error) : resolve()));
  const run = fixtureRun();
  try {
    await runVision(run, defaults, { controller: new AbortController() }, async () => {}, {
      // A test-only navigation seam reaches a closed local port; production allowlist is unchanged.
      navigateTarget: async (page) => {
        await page.context().unroute("**/*");
        return page.goto(`http://127.0.0.1:${port}/`, { timeout: 3000 });
      },
      createClient: () => { throw new Error("Model must not be called"); },
    });
    expect(run.status).toBe("failed");
    expect(run.diagnostic?.code).toBe("TARGET_UNREACHABLE");
    expect(run.diagnostic?.phase).toBe("target-navigation");
    expect(run.stage).toBe("실패 · 대상 페이지 접속");
    await preserve(run);
    expect(run.calls).toBe(0);
  } finally { await rm(path.join(artifactsDir, run.id), { recursive: true, force: true }); }
}, 15000);
it("classifies video, model and output failures without exposing raw secrets or inputs", () => {
  const secret = "PRIVATE_SENTINEL_KEY_AND_USER_INPUT";
  expect(diagnose(new Error(`Executable doesn't exist at /private/${secret}/ffmpeg`), "video-context").code).toBe("VIDEO_NOT_INSTALLED");
  expect(diagnose({ name: "TimeoutError", message: secret }, "target-navigation").code).toBe("TARGET_TIMEOUT");
  for (const phase of ["browser-launch", "model-plan", "action", "persistence"] as const) {
    expect(JSON.stringify(diagnose(new Error(secret), phase))).not.toContain(secret);
  }
  expect(diagnose(new SafeExecutionError("MODEL_API_FAILED", 401), "input-confirmation")).toMatchObject({ code: "MODEL_API_FAILED", httpStatus: 401, action: "API 키를 다시 확인하세요." });
  expect(diagnose(new SafeExecutionError("MODEL_NETWORK_FAILED"), "goal-selection").code).toBe("MODEL_NETWORK_FAILED");
  expect(diagnose(new Error("MODEL_OUTPUT_TRUNCATED"), "model-plan").code).toBe("MODEL_OUTPUT_TRUNCATED");
});

it("provider rejection keeps safe HTTP details before Midscene wraps the exception", async () => {
  const run = fixtureRun(); run.executionPhase = "goal-selection";
  const runtime: Runtime = { controller: new AbortController() };
  const client = instrumentClient({chat:{completions:{create:async()=>{throw {status:401,message:"PRIVATE_PROVIDER_BODY"};}}}},run,runtime);
  await expect(client.chat.completions.create({messages:[]})).rejects.toMatchObject({code:"MODEL_API_FAILED",httpStatus:401});
  expect(runtime.providerFailure).toMatchObject({code:"MODEL_API_FAILED",phase:"goal-selection",httpStatus:401});
  expect(JSON.stringify(runtime.providerFailure)).not.toContain("PRIVATE_PROVIDER_BODY");
});
it("actual missing FFmpeg is separated from an installed Chromium", async () => {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const { fileURLToPath } = await import("node:url");
  const folder = path.join(tmpdir(), `absent-video-${Date.now()}`);
  const code = `
    import {chromium} from 'playwright';
    import {runVision,makeRun,artifactsDir} from ${JSON.stringify(new URL('./runner.ts',import.meta.url).href)};
    import {defaults,inputSchema} from ${JSON.stringify(new URL('./domain.ts',import.meta.url).href)};
    import {rm,mkdir,writeFile} from 'node:fs/promises'; import path from 'node:path';
    const run=makeRun(inputSchema.parse({mode:'autonomous',url:'http://127.0.0.1:4311/store/a'}),defaults);
    try{
      await runVision(run,defaults,{controller:new AbortController()},async()=>{}, {launchBrowser:()=>chromium.launch({headless:true,executablePath:${JSON.stringify(chromium.executablePath())}})});
      console.log(JSON.stringify({diagnostic:run.diagnostic,calls:run.calls,status:run.status}));
      await mkdir(path.join(artifactsDir,'runtime-diagnostics-check'),{recursive:true});
      await writeFile(path.join(artifactsDir,'runtime-diagnostics-check',run.id+'.json'),JSON.stringify(run,null,2));
    }finally{await rm(path.join(artifactsDir,run.id),{recursive:true,force:true});}
  `;
  const {stdout}=await promisify(execFile)(process.execPath,["--import","tsx","--input-type=module","-e",code],{cwd:fileURLToPath(new URL("../../../",import.meta.url)),env:{...process.env,PLAYWRIGHT_BROWSERS_PATH:folder},timeout:10000});
  expect(JSON.parse(stdout)).toMatchObject({diagnostic:{code:"VIDEO_NOT_INSTALLED",phase:"video-context"},calls:0,status:"failed"});
},15000);
