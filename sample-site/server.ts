import express from "express";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { prepareOrder } from "./order";
import { presentationFor } from "./presentation";
const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.SAMPLE_PORT ?? 4311);
const origin = `http://127.0.0.1:${port}`;
const app = express();
app.use((req, res, next) => {
  if (req.headers.host !== `127.0.0.1:${port}` || (req.headers.origin && req.headers.origin !== origin)) {
    res.status(403).json({ error: "샘플 매장과 같은 로컬 출처에서 요청해주세요." }); return;
  }
  next();
});
app.use(express.json({ limit: "8kb" }));
let state = "normal";
app.get("/api/operator", (_req, res) => res.set("Cache-Control", "no-store").json({ state }));
app.put("/api/operator", (req, res) => {
  if (!["normal", "misaligned", "occluded", "clipped", "product-image", "chart"].includes(req.body.state)) {
    res.status(400).json({ error: "지원하지 않는 화면 설정입니다." }); return;
  }
  state = req.body.state;
  res.json({ state });
});
// Legacy operator selection uses the same app-source layouts. Direct revisions bypass it.
app.get("/api/presentation", (_req, res) => res.set("Cache-Control", "no-store").json(presentationFor(state)));
app.post("/api/orders", (req, res) => {
  const order = prepareOrder(req.body);
  res.status(201).json({ ...order, id: randomUUID() });
});
app.get("/", (_req, res) => res.redirect("/order"));
const server = createServer(app);
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(root, "dist")));
  app.get(["/order", "/operator", "/store/a", "/store/b", "/store/c", "/store/d", "/store/e", "/store/f", "/store/g"], (_req, res) => res.sendFile("index.html", { root: path.join(root, "dist") }));
} else {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({ configFile: path.join(root, "vite.config.ts"), server: { middlewareMode: true, hmr: { server } }, appType: "spa" });
  app.use(vite.middlewares);
}
app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => res.status(400).json({ error: error.name === "ZodError" ? "받는 분, 이메일 주소와 수량(1~5개)을 확인해주세요." : "잘못된 요청입니다. 입력 내용을 확인해주세요." }));
server.listen(port, "127.0.0.1", () => console.log(`Standalone sample: ${origin}/order`));
