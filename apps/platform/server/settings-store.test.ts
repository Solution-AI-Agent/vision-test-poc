import { afterEach, expect, it } from "vitest";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { SettingsStore } from "./settings-store";
import { defaults, settingsSchema, goalPrompt, planPrompt, inputSchema } from "./domain";
import { makeRun } from "./runner";
const directories: string[] = [];
async function directory() {
  const dir = await mkdtemp(path.join(tmpdir(), "vision-settings-"));
  directories.push(dir);
  return dir;
}
afterEach(async () => { await Promise.all(directories.splice(0).map(p => rm(p, { recursive: true, force: true }))); });

it("restores Korean settings after a new store instance, excludes credentials, and supports clearing instructions", async () => {
  const dir = await directory();
  const store = new SettingsStore(dir);
  expect(await store.load()).toEqual(defaults);
  const settings = { ...defaults, agentInstructions: "겹침과 뒤틀림을 화면 근거로 검토한다.", model: "qwen/test", apiKey: "private-test-sentinel" };
  await store.save(settings);
  const raw = await readFile(path.join(dir, "settings.json"), "utf8");
  expect(raw).not.toContain("private-test-sentinel");
  expect(raw).not.toContain("apiKey");
  expect(await new SettingsStore(dir).load()).toEqual({ ...defaults, agentInstructions: settings.agentInstructions, model: settings.model });
  await Promise.all([store.save(settings), store.save({ ...defaults, agentInstructions: "" })]);
  expect((await new SettingsStore(dir).load()).agentInstructions).toBe("");
});

it("does not silently replace corrupted settings and safely reads older settings without instructions", async () => {
  const dir = await directory();
  const file = path.join(dir, "settings.json");
  await writeFile(file, "broken-private-value");
  await expect(new SettingsStore(dir).load()).rejects.toThrow("로컬 설정");
  expect(await readFile(file, "utf8")).toBe("broken-private-value");
  const { agentInstructions, ...legacy } = defaults;
  await writeFile(file, JSON.stringify(legacy));
  expect((await new SettingsStore(dir).load()).agentInstructions).toBe("");
  expect(() => settingsSchema.parse({ ...defaults, agentInstructions: "x".repeat(8001) })).toThrow();
});

it("applies instructions to both planning modes and freezes each run's settings without credentials", () => {
  const settings = { ...defaults, agentInstructions: "한국어 화면의 가독성을 확인한다.", apiKey: "test-only-secret" };
  const input = inputSchema.parse({ mode: "autonomous", url: "http://127.0.0.1:4311/store/c" });
  const run = makeRun(input, settings);
  expect(goalPrompt(input.url, settings.agentInstructions)).toContain(settings.agentInstructions);
  for (const mode of ["scenario", "autonomous"] as const) {
    const prompt = planPrompt({ ...input, mode }, [], undefined, settings.agentInstructions);
    expect(prompt).toContain(settings.agentInstructions);
    expect(prompt).toContain("required response schema");
  }
  settings.agentInstructions = "changed later";
  expect(run.settings.agentInstructions).toBe("한국어 화면의 가독성을 확인한다.");
  expect(JSON.stringify(run)).not.toContain("test-only-secret");
});

it('migrates only the legacy 120-second default once, preserving explicitly saved short limits',async()=>{
 const dir=await directory();const file=path.join(dir,'settings.json');const store=new SettingsStore(dir);
 await writeFile(file,JSON.stringify({...defaults,maxSeconds:120}));
 expect((await store.load()).maxSeconds).toBe(900);
 expect(JSON.parse(await readFile(path.join(dir,'settings.before-timeout-v2.json'),'utf8')).maxSeconds).toBe(120);
 expect(JSON.parse(await readFile(file,'utf8')).settingsVersion).toBe(2);
 await store.save({...defaults,maxSeconds:120});expect((await store.load()).maxSeconds).toBe(120);
 await writeFile(file,JSON.stringify({...defaults,maxSeconds:240}));expect((await store.load()).maxSeconds).toBe(240);
 await store.save({...defaults,maxSeconds:0});expect((await store.load()).maxSeconds).toBe(0);
});

it('persists routing preference and keeps old settings on unchanged provider selection',async()=>{
 const dir=await directory();const store=new SettingsStore(dir);
 await store.save({...defaults,providerSort:"throughput"});
 expect((await new SettingsStore(dir).load()).providerSort).toBe("throughput");
 const {providerSort,...legacy}=defaults;
 await writeFile(path.join(dir,'settings.json'),JSON.stringify(legacy));
 expect((await store.load()).providerSort).toBe("default");
 expect(()=>settingsSchema.parse({...defaults,providerSort:"unknown"})).toThrow();
});
