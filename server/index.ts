import express from "express";
import { createServer } from "node:http";
import path from "node:path";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import {
  defaults,
  settingsSchema,
  scenarioSchema,
  inputSchema,
  validateTarget,
  type Settings,
  type Run,
} from "./domain";
import { artifactsDir, makeRun, runVision, type Runtime } from "./runner";
const app = express();
const port = Number(process.env.PORT ?? 4310);
const origin = `http://127.0.0.1:${port}`;
const dataDir = path.resolve(".data");
await mkdir(dataDir, { recursive: true });
let settings: Settings = { ...defaults };
let connection: "unconfigured" | "ready" | "connected" | "error" =
  "unconfigured";
let visionVerified = false;
let visionActed = false;
let scenarios: any[] = [];
let runs: Run[] = [];
try {
  scenarios = JSON.parse(
    await readFile(path.join(dataDir, "scenarios.json"), "utf8"),
  );
} catch (error: any) {
  if (error.code !== "ENOENT")
    throw new Error(
      "기존 데이터 파일을 읽을 수 없습니다. .data 파일을 보존하고 확인하세요",
    );
}
try {
  runs = JSON.parse(await readFile(path.join(dataDir, "runs.json"), "utf8"));
  for (const r of runs)
    if (r.status === "running") {
      r.status = "failed";
      r.outcome = "서버 재시작으로 중단";
      r.endedAt = new Date().toISOString();
    }
} catch (error: any) {
  if (error.code !== "ENOENT")
    throw new Error(
      "기존 데이터 파일을 읽을 수 없습니다. .data 파일을 보존하고 확인하세요",
    );
}
const runtimes = new Map<string, Runtime>();
let writing = Promise.resolve();
async function persist() {
  const operation = writing
    .catch(() => {})
    .then(async () => {
      await writeFile(
        path.join(dataDir, "runs.tmp"),
        JSON.stringify(runs, null, 2),
        { mode: 0o600 },
      );
      await rename(
        path.join(dataDir, "runs.tmp"),
        path.join(dataDir, "runs.json"),
      );
    });
  writing = operation;
  await operation;
}
app.use((req, res, next) => {
  // Bind loopback and reject alternate hosts/cross-origin writes to protect session keys.
  if (
    req.headers.host !== `127.0.0.1:${port}` &&
    req.headers.host !== `localhost:${port}`
  ) {
    res.status(403).json({ error: "지원하지 않는 호스트" });
    return;
  }
  if (req.path.startsWith("/api") && !["GET", "HEAD"].includes(req.method)) {
    const allowed = [origin, `http://localhost:${port}`];
    if (req.headers.origin && !allowed.includes(req.headers.origin)) {
      res.status(403).json({ error: "동일 출처 요청만 허용" });
      return;
    }
    if (!req.is("application/json")) {
      res.status(415).json({ error: "JSON 요청 필요" });
      return;
    }
  }
  res.setHeader("X-Content-Type-Options", "nosniff");
  next();
});
app.use(express.json({ limit: "32kb" }));
const safeSettings = () => {
  const { apiKey: _key, ...safe } = settings;
  return {
    ...safe,
    hasKey: !!settings.apiKey,
    connection,
    visionVerified,
    visionActed,
    keyStorage: "서버 프로세스 메모리 · 재시작 시 삭제",
  };
};
app.get("/api/settings", (_req, res) => res.json(safeSettings()));
app.put("/api/settings", (req, res, next) => {
  try {
    if (runtimes.size) throw new Error("실행 종료 후 설정을 변경하세요");
    const updated = settingsSchema.parse(req.body);
    settings = {
      ...updated,
      apiKey: updated.apiKey?.trim() || settings.apiKey,
    };
    connection = settings.apiKey ? "ready" : "unconfigured";
    visionVerified = false;
    visionActed = false;
    res.json(safeSettings());
  } catch (e) {
    next(e);
  }
});
app.delete("/api/settings/key", (_req, res, next) => {
  if (runtimes.size) {
    next(new Error("실행 종료 후 키를 삭제하세요"));
    return;
  }
  settings.apiKey = undefined;
  connection = "unconfigured";
  visionVerified = false;
  visionActed = false;
  res.json(safeSettings());
});
app.post("/api/settings/check", async (_req, res, next) => {
  try {
    if (!settings.apiKey) throw new Error("API 키를 먼저 저장하세요");
    const response = await fetch("https://openrouter.ai/api/v1/auth/key", {
      headers: { Authorization: `Bearer ${settings.apiKey}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      connection = "error";
      throw new Error(`OpenRouter 인증 실패 (${response.status})`);
    }
    connection = "connected";
    res.json({
      connection,
      visionVerified: false,
      note: "인증 연결만 확인했습니다. 이미지/Midscene 실행은 별도 검증합니다.",
    });
  } catch {
    connection = "error";
    next(new Error("연결 확인 실패 · API 키와 네트워크를 확인하세요"));
  }
});
app.get("/api/scenarios", (_req, res) => res.json(scenarios));
app.post("/api/scenarios", async (req, res, next) => {
  try {
    const value = scenarioSchema.parse(req.body);
    validateTarget(value.url);
    const scenario = { ...value, id: randomUUID() };
    scenarios.push(scenario);
    await writeFile(
      path.join(dataDir, "scenarios.json"),
      JSON.stringify(scenarios, null, 2),
      { mode: 0o600 },
    );
    res.status(201).json(scenario);
  } catch (e) {
    next(e);
  }
});
app.delete("/api/scenarios/:id", async (req, res) => {
  scenarios = scenarios.filter((s) => s.id !== req.params.id);
  await writeFile(
    path.join(dataDir, "scenarios.json"),
    JSON.stringify(scenarios, null, 2),
    { mode: 0o600 },
  );
  res.json({ ok: true });
});
app.get("/api/runs", (_req, res) => res.json(runs));
app.post("/api/runs", async (req, res, next) => {
  try {
    if (runtimes.size) throw new Error("한 번에 하나의 실행만 지원합니다");
    const input = inputSchema.parse(req.body);
    if (input.mode === "autonomous") {
      input.task = "";
      input.expected = "";
      input.query = "";
    }
    validateTarget(input.url);
    if (input.mode !== "baseline" && !settings.apiKey)
      throw new Error("Vision 실행에는 OpenRouter API 키가 필요합니다");
    if (input.mode === "baseline" && new URL(input.url).pathname !== "/")
      throw new Error("비교군은 YouTube 홈에서 시작합니다");
    const run = makeRun(input, settings);
    const runtime: Runtime = { controller: new AbortController() };
    runtimes.set(run.id, runtime);
    runs.unshift(run);
    try {
      await persist();
    } catch {
      runtimes.delete(run.id);
      runs = runs.filter((r) => r.id !== run.id);
      throw new Error("실행 기록을 저장하지 못했습니다");
    }
    res.status(202).json(run);
    void runVision(run, { ...settings }, runtime, persist)
      .catch(() => {
        run.status = "failed";
        run.outcome = "실행 증거 저장 실패";
      })
      .finally(() => {
        runtimes.delete(run.id);
        if (
          run.input.mode !== "baseline" &&
          run.steps.length &&
          run.transport.some((t) => t.images > 0)
        ) {
          visionVerified = true;
          visionActed ||= run.steps.some((s) => s.executed);
        }
      });
  } catch (e) {
    next(e);
  }
});
app.post("/api/runs/:id/stop", async (req, res) => {
  const runtime = runtimes.get(req.params.id);
  if (runtime) {
    runtime.stopReason = "stopped";
    runtime.controller.abort();
    await runtime.browser?.close().catch(() => {});
  }
  res.json({ ok: true });
});
app.patch("/api/runs/:id/findings/:findingId", async (req, res, next) => {
  try {
    const run = runs.find((r) => r.id === req.params.id);
    const finding = run?.findings.find((f) => f.id === req.params.findingId);
    if (!finding) throw new Error("결함 후보를 찾을 수 없습니다");
    if (
      !["candidate", "confirmed", "false-positive", "inconclusive"].includes(
        req.body.status,
      ) ||
      typeof req.body.note !== "string" ||
      req.body.note.length > 2000
    )
      throw new Error("판정과 검토 근거를 입력하세요");
    if (req.body.status !== "candidate" && !req.body.note.trim())
      throw new Error("독립 검토 근거가 필요합니다");
    finding.status = req.body.status;
    finding.reviewNote = req.body.note;
    await persist();
    res.json(finding);
  } catch (e) {
    next(e);
  }
});
app.get("/api/runs/:id/export", (req, res) => {
  const run = runs.find((r) => r.id === req.params.id);
  if (!run) {
    res.status(404).json({ error: "실행 없음" });
    return;
  }
  res.attachment(`vision-qa-${run.id}.json`).json({
    ...run,
    disclaimer:
      "결함 후보는 독립 재검증 전 확정 결함이 아닙니다. 비용 null은 조회 불가이며 무료를 뜻하지 않습니다.",
  });
});
// Operator state never enters the visible order or model prompt. Local single-user fixture.
let fixtureState = "normal";
app.put("/api/fixture/operator", (req, res) => {
  if (!["normal", "clipped", "total", "decoration"].includes(req.body.state)) {
    res.status(400).json({ error: "Unknown fixture state" });
    return;
  }
  fixtureState = req.body.state;
  res.json({ state: fixtureState });
});
app.get("/api/fixture/presentation", (_req, res) => {
  res
    .set("Cache-Control", "no-store")
    .json({
      noticeHeight: fixtureState === "clipped" ? 44 : 80,
      receiptTotal: fixtureState === "total" ? 68 : 48,
      decoration: fixtureState === "decoration",
    });
});
let demoState = "normal";
app.put("/api/demo/state", (req, res) => {
  if (!["normal", "cover", "cover-wide"].includes(req.body.state)) {res.status(400).json({error:"Unknown demo state"});return;}
  demoState=req.body.state;res.json({state:demoState});
});
app.get("/api/demo/presentation", (_req,res)=>res.set("Cache-Control","no-store").json({noticeHeight:80,receiptTotal:48,decoration:false,cover:demoState==='cover'?1:demoState==='cover-wide'?2:0}));
app.get("/api/demo/evidence", async (_req,res)=>{
 try{res.set("Cache-Control","no-store").json(JSON.parse(await readFile(path.join(dataDir,"demo-evidence.json"),"utf8")));}
 catch{res.json({results:[],note:"Actual recorded evaluation not available yet"});}
});
app.use("/artifacts", express.static(artifactsDir, { dotfiles: "deny" }));
const server = createServer(app);
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.resolve("dist")));
  app.get(["/fixture/order", "/fixture/operator", "/demo/order", "/demo"], (_req, res) => {
    res.sendFile("index.html", { root: path.resolve("dist") });
  });
} else {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: { middlewareMode: true, hmr: { server } },
    appType: "spa",
  });
  app.use(vite.middlewares);
}
app.use(
  (
    error: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    res.status(400).json({
      error:
        error.name === "ZodError" ||
        error.type === "entity.parse.failed" ||
        error.type === "entity.too.large"
          ? "입력 형식 또는 한도를 확인하세요"
          : (error.message ?? "요청 실패"),
    });
  },
);
server.listen(port, "127.0.0.1", () => console.log(`Vision QA Lab: ${origin}`));
