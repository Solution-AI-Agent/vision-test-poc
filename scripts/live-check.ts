import { mkdir, writeFile } from "node:fs/promises";
const origin = "http://127.0.0.1:4310";
const mode = process.argv[2] ?? "scenario";
if (!["scenario", "autonomous"].includes(mode))
  throw new Error("mode must be scenario or autonomous");
const response = await fetch(`${origin}/api/runs`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    mode,
    url: "https://www.youtube.com/",
    task:
      mode === "scenario"
        ? "검색창에서 Midscene AI demo를 검색하고 검색 결과가 표시되는지 확인한다."
        : "",
    expected:
      mode === "scenario"
        ? "검색어에 해당하는 영상 결과 목록이 화면에 표시된다."
        : "",
  }),
});
const start = await response.json();
if (!response.ok) throw new Error(start.error);
console.log(`Live ${mode} run: ${start.id}`);
while (true) {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  const runs = await (await fetch(`${origin}/api/runs`)).json();
  const run = runs.find((r: any) => r.id === start.id);
  if (run.status !== "running" && run.endedAt) {
    await mkdir("artifacts/live-check", { recursive: true });
    await writeFile(
      `artifacts/live-check/${mode.toUpperCase()}_${run.id}_RESULT.json`,
      JSON.stringify(run, null, 2),
    );
    console.log(
      JSON.stringify({
        id: run.id,
        status: run.status,
        outcome: run.outcome,
        calls: run.calls,
        actions: run.actions,
        tokens: run.tokens,
        reportedCost: run.cost,
        findings: run.findings.length,
        video: run.video,
      }),
    );
    break;
  }
}
