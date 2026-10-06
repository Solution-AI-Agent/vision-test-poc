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
