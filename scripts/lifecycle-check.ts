import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const origin = "http://127.0.0.1:4310";
async function request(route: string, method = "GET", data?: unknown) {
  const response = await fetch(`${origin}/api${route}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const result = await response.json();
  assert.ok(response.ok, JSON.stringify(result));
  return result;
}
async function finish(id: string) {
  const deadline = Date.now() + 40000;
  while (Date.now() < deadline) {
    const run = (await request("/runs")).find((r: any) => r.id === id);
    if (run.status !== "running") return run;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("run did not stop");
}
const original = await request("/settings");
assert.equal(
  original.hasKey,
  false,
  "do not run this check on a configured paid session",
);
const {
  hasKey,
  connection,
  visionVerified,
  visionActed,
  keyStorage,
  ...settings
} = original;
await request("/settings", "PUT", { ...settings, maxActions: 1 });
const limitedStart = await request("/runs", "POST", {
  mode: "baseline",
  url: "https://www.youtube.com/",
  query: "Midscene AI demo",
});
const limited = await finish(limitedStart.id);
assert.equal(limited.status, "limited");
assert.equal(limited.actions, 1);
assert.equal(limited.calls, 0);
await request("/settings", "PUT", settings);
const stoppedStart = await request("/runs", "POST", {
  mode: "baseline",
  url: "https://www.youtube.com/",
  query: "Midscene AI demo",
});
await request(`/runs/${stoppedStart.id}/stop`, "POST", {});
const stopped = await finish(stoppedStart.id);
assert.equal(stopped.status, "stopped");
assert.equal(stopped.calls, 0);
await mkdir("artifacts/lifecycle-check", { recursive: true });
await writeFile(
  "artifacts/lifecycle-check/RESULT.json",
  JSON.stringify(
    { at: new Date().toISOString(), status: "pass", limited, stopped },
    null,
    2,
  ),
);
console.log(
  "Lifecycle checks passed: action limit and immediate stop, no VLM calls",
);
