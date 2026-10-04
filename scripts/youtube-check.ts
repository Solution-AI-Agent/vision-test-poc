import { writeFile, mkdir } from "node:fs/promises";
const origin = "http://127.0.0.1:4310";
const response = await fetch(`${origin}/api/runs`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    mode: "baseline",
    url: "https://www.youtube.com/",
    query: "Midscene AI demo",
  }),
});
const start = await response.json();
if (!response.ok) throw new Error(start.error);
console.log(`YouTube baseline started: ${start.id}`);
while (true) {
  await new Promise((r) => setTimeout(r, 1500));
  const runs = await (await fetch(`${origin}/api/runs`)).json();
  const run = runs.find((r: any) => r.id === start.id);
  if (run.status !== "running") {
    await mkdir("artifacts/youtube-check", { recursive: true });
    await writeFile(
      "artifacts/youtube-check/RESULT.json",
      JSON.stringify(run, null, 2),
    );
    console.log(
      JSON.stringify({
        id: run.id,
        status: run.status,
        outcome: run.outcome,
        actions: run.actions,
        video: run.video,
        screenshot: run.screenshot,
      }),
    );
    break;
  }
}
