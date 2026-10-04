import { chromium, type Browser, type Page } from "playwright";
import { PlaywrightAgent } from "@midscene/web/playwright";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";
import OpenAI from "openai";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
const sourceVersion = {
  commit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  dirty: !!execFileSync("git", ["status", "--porcelain"], {
    encoding: "utf8",
  }).trim(),
  sourceHash: createHash("sha256")
    .update(readFileSync("server/domain.ts"))
    .update(readFileSync("server/runner.ts"))
    .digest("hex"),
  promptVersion: "goal-first-v3-protocol-and-replan",
};
import {
  planPrompt,
  goalPrompt,
  goalSchema,
  type Goal,
  planSchema,
  validateTarget,
  type Run,
  type Settings,
  type Input,
  type Action,
  type Step,
} from "./domain";
export const artifactsDir = path.resolve("artifacts");
export type Runtime = {
  controller: AbortController;
  browser?: Browser;
  stopReason?: "stopped" | "limited";
};
export async function executeAction(page: Page, action: Action) {
  switch (action.type) {
    case "click":
      await page.mouse.click(action.x, action.y);
      break;
    case "type":
      await page.keyboard.insertText(action.text);
      break;
    case "key":
      await page.keyboard.press(action.key);
      break;
    case "scroll":
      await page.mouse.wheel(0, action.delta);
      break;
    case "wait":
      await page.waitForTimeout(800);
      break;
    case "finish":
      break;
  }
}
export function makeRun(input: Input, settings: Settings): Run {
  const { apiKey: _key, ...safe } = settings;
  return {
    id: randomUUID(),
    input,
    settings: safe,
    startedAt: new Date().toISOString(),
    status: "running",
    outcome: "미판정",
    stage: "브라우저 준비",
    calls: 0,
    actions: 0,
    tokens: 0,
    cost: null,
    steps: [],
    findings: [],
    engine:
      input.mode === "baseline"
        ? "Playwright locator / 1.63.0"
        : "Midscene aiQuery / 1.14.0 → Playwright coordinates / 1.63.0",
    transport: [],
    sourceVersion,
  };
}
export function providerClient(settings: Settings) {
  return new OpenAI({
    apiKey: settings.apiKey!,
    baseURL: "https://openrouter.ai/api/v1",
    maxRetries: 0,
    timeout: 30000,
    fetch: async (input, init) => {
      try {
        const response = await fetch(input, init);
        if (!response.ok)
          return new Response(
            JSON.stringify({
              error: { message: `Model API error (${response.status})` },
            }),
            {
              status: response.status,
              headers: { "content-type": "application/json" },
            },
          );
        return response;
      } catch {
        throw new Error("Model network request failed");
      }
    },
  });
}
export function instrumentClient(client: any, run: Run, runtime: Runtime) {
  const original = client.chat.completions.create.bind(client.chat.completions);
  client.chat.completions.create = async (body: any, options: any) => {
    if (runtime.controller.signal.aborted) throw new Error("실행 중지됨");
    if (run.calls >= run.settings.maxCalls) {
      runtime.stopReason = "limited";
      throw new Error("모델 호출 한도 도달");
    }
    run.calls++;
    const blocks = body.messages.flatMap((m: any) =>
      Array.isArray(m.content) ? m.content : [{ type: "text" }],
    );
    const record: Run["transport"][number] = {
      images: blocks.filter((b: any) => b.type === "image_url").length,
      texts: blocks.filter((b: any) => b.type === "text").length,
    };
    run.transport.push(record);
    const image = blocks.find((b: any) => b.type === "image_url")?.image_url
      ?.url;
    if (typeof image === "string" && image.startsWith("data:image/")) {
      const match = image.match(/^data:image\/(png|jpeg);base64,(.+)$/s);
      if (match) {
        const folder = path.join(artifactsDir, run.id);
        await mkdir(folder, { recursive: true });
        const filename = `model-request-${run.calls}.${match[1] === "jpeg" ? "jpg" : "png"}`;
        await writeFile(
          path.join(folder, filename),
          Buffer.from(match[2], "base64"),
        );
        record.screenshot = `/artifacts/${run.id}/${filename}`;
      }
    }
    const started = Date.now();
    let response;
    try {
      response = await original(
        { ...body, max_tokens: run.settings.maxTokens, stream: false },
        {
          ...options,
          signal: AbortSignal.any([
            runtime.controller.signal,
            ...(options?.signal ? [options.signal] : []),
          ]),
          maxRetries: 0,
        },
      );
    } catch (error: any) {
      throw new Error(
        typeof error?.status === "number"
          ? `Model API error (${error.status})`
          : "Model request failed",
      );
    }
    const message = response.choices?.[0]?.message;
    const content = message?.content;
    if (typeof content === "string") {
      record.responseFormat = {
        finishReason: response.choices?.[0]?.finish_reason,
        chars: content.length,
        hasDataJson: content.includes("<data-json>"),
        normalizedPlainJson: false,
      };
      if (!record.responseFormat.hasDataJson) {
        const plain = content.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
        try {
          const structured = JSON.parse(plain);
          message.content = `<data-json>${JSON.stringify(structured)}</data-json>`;
          record.responseFormat.normalizedPlainJson = true;
        } catch {}
      }
    }
    record.elapsedMs = Date.now() - started;
    record.responseModel = response.model;
    record.requestId = response.id;
    run.tokens += response.usage?.total_tokens ?? 0;
    if (typeof response.usage?.cost === "number")
      run.cost = (run.cost ?? 0) + response.usage.cost;
    return response;
  };
  return client;
}
export async function runVision(
  run: Run,
  settings: Settings,
  runtime: Runtime,
  persist: () => Promise<void>,
  dependencies: {
    launchBrowser?: () => Promise<Browser>;
    createClient?: (settings: Settings) => any;
  } = {},
) {
  let page: Page | undefined;
  const folder = path.join(artifactsDir, run.id);
  await mkdir(folder, { recursive: true });
  const timeout = setTimeout(() => {
    runtime.stopReason = "limited";
    runtime.controller.abort();
    void runtime.browser?.close();
  }, settings.maxSeconds * 1000);
  const capture = async (label: string) => {
    const name = `${label}.png`;
    await page!.screenshot({ path: path.join(folder, name) });
    run.screenshot = `/artifacts/${run.id}/${name}`;
    return run.screenshot;
  };
  try {
    runtime.controller.signal.throwIfAborted();
    const url = validateTarget(run.input.url);
    runtime.browser = await (dependencies.launchBrowser?.() ??
      chromium.launch({ headless: true }));
    runtime.controller.signal.throwIfAborted();
    const context = await runtime.browser.newContext({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1,
      recordVideo: { dir: folder, size: { width: 1280, height: 720 } },
    });
    // Navigation boundary only; URL metadata never enters the vision planner.
    await context.route("**/*", async (route) => {
      const request = route.request();
      if (
        request.isNavigationRequest() &&
        request.frame() === page?.mainFrame()
      ) {
        try {
          validateTarget(request.url());
        } catch {
          await route.abort();
          return;
        }
      }
      await route.continue();
    });
    page = await context.newPage();
    page.setDefaultTimeout(12000);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(1000);
    if (run.input.mode === "baseline") {
      await runBaseline(page, run, capture, persist, runtime);
    } else {
      const agent = new PlaywrightAgent(page, {
        generateReport: false,
        persistExecutionDump: false,
        autoPrintReportMsg: false,
        forceChromeSelectRendering: false,
        forceSameTabNavigation: false,
        modelConfig: {
          MIDSCENE_MODEL_API_KEY: settings.apiKey!,
          MIDSCENE_MODEL_BASE_URL: "https://openrouter.ai/api/v1",
          MIDSCENE_MODEL_NAME: settings.model,
          MIDSCENE_MODEL_FAMILY: settings.family,
          MIDSCENE_MODEL_RETRY_COUNT: 0,
          MIDSCENE_MODEL_TIMEOUT: 30000,
          MIDSCENE_MODEL_INIT_CONFIG_JSON: JSON.stringify({ maxRetries: 0 }),
          MIDSCENE_MODEL_EXTRA_BODY_JSON: JSON.stringify({
            max_tokens: settings.maxTokens,
          }),
        },
        createOpenAIClient: async () =>
          instrumentClient(
            (dependencies.createClient ?? providerClient)(settings),
            run,
            runtime,
          ),
      });
      let goal: Goal | undefined;
      let replans = 0,
        unchangedCount = 0,
        schemaRetries = 0;
      const selectGoal = async (replan = false) => {
        run.stage = replan
          ? "무진전 · 다른 테스트 가설 재계획"
          : "화면에서 테스트 가설 선택";
        await capture(`goal-${run.goals?.length ?? 0}-before`);
        await persist();
        const query =
          goalPrompt() +
          (replan
            ? ` Prior chosen goal: ${JSON.stringify(goal)}. The last ${unchangedCount} actions produced identical before/after screenshots. Choose a different read-only test or a genuinely different method; do not repeat the same ineffective action. History: ${JSON.stringify(run.steps.map((s) => ({ action: s.plan.action, observation: s.plan.observation, unchanged: s.unchanged })))}`
            : "");
        const selected = goalSchema.parse(
          await agent.aiQuery(query, {
            domIncluded: false,
            screenshotIncluded: true,
            abortSignal: runtime.controller.signal,
          }),
        );
        goal = {
          ...selected,
          screenshot: run.transport.at(-1)?.screenshot ?? run.screenshot!,
          at: new Date().toISOString(),
        };
        (run.goals ??= []).push(goal);
        await persist();
      };
      if (run.input.mode === "autonomous") await selectGoal();
      for (let index = 0; index <= settings.maxActions; index++) {
        if (runtime.controller.signal.aborted) throw new Error("실행 중지됨");
        run.stage = "화면 관찰 · 다음 QA 계획";
        const before = await capture(`${index}-before`);
        await persist();
        const getPlan = async (feedback = "") => {
          try {
            const output = await agent.aiQuery(
              planPrompt(run.input, run.steps, goal) + feedback,
              {
                domIncluded: false,
                screenshotIncluded: true,
                abortSignal: runtime.controller.signal,
              },
            );
            run.transport.at(-1)!.parsedOutput = output;
            return planSchema.safeParse(output);
          } catch (error) {
            if (
              runtime.controller.signal.aborted ||
              !run.transport.at(-1)?.requestId ||
              run.calls >= settings.maxCalls
            )
              throw error;
            run.transport.at(-1)!.validationError =
              "Midscene response protocol";
            return planSchema.safeParse(undefined);
          }
        };
        let parsed = await getPlan();
        if (!parsed.success && schemaRetries < 1) {
          schemaRetries++;
          const paths = parsed.error.issues
            .map((issue) => issue.path.join("."))
            .join(", ");
          run.transport.at(-1)!.validationError = paths;
          run.stage = "모델 응답 형식 교정 · 행동 미실행";
          await persist();
          parsed = await getPlan(
            ` Previous structured output failed validation at: ${paths}. No action was executed for that output. Return a corrected object matching EXACTLY the requested schema. Previous output: ${JSON.stringify(run.transport.at(-1)?.parsedOutput)}`,
          );
        }
        if (!parsed.success) {
          if (run.transport.at(-1)?.responseFormat?.finishReason === "length")
            throw new Error("MODEL_OUTPUT_TRUNCATED");
          throw parsed.error;
        }
        const plan = parsed.data;
        const step: Step = {
          index,
          at: new Date().toISOString(),
          before: run.transport.at(-1)?.screenshot ?? before,
          after: before,
          plan,
          executed: false,
        };
        run.steps.push(step);
        // A fresh decision-time screen must follow the actual model-input image, including finish/limit decisions.
        step.after = await capture(`${index}-decision`);
        if (plan.verdict === "candidate" && plan.finding) {
          const duplicate = run.findings.some(
            (f) =>
              f.title.trim().toLowerCase() ===
              plan.finding!.title.trim().toLowerCase(),
          );
          if (!duplicate)
            run.findings.push({
              ...plan.finding,
              id: randomUUID(),
              status: "candidate",
              reviewNote: "",
              step: index,
              before: step.before,
              after: step.after,
            });
        }
        if (plan.action.type === "finish") {
          run.status = "completed";
          run.outcome =
            run.input.mode === "scenario" && plan.verdict === "pass"
              ? "기대 결과 관찰됨 · 독립 검토 필요"
              : run.input.mode === "autonomous" && plan.verdict === "pass"
                ? "자율 선택 업무의 기대 결과 관찰됨 · 결함 검토 별도"
                : "탐색 종료 · 결과 검토 필요";
          break;
        }
        if (run.actions >= settings.maxActions) {
          run.status = "limited";
          run.outcome = "행동 한도 도달";
          break;
        }
        run.stage = "Playwright 좌표 행동 실행";
        try {
          await executeAction(page, plan.action);
          run.actions++;
          step.executed = true;
          await page.waitForTimeout(700);
          step.after = await capture(`${index}-after`);
          const imageFile = (url: string) =>
            path.join(artifactsDir, url.replace("/artifacts/", ""));
          step.unchanged = (await readFile(imageFile(before))).equals(
            await readFile(imageFile(step.after)),
          );
          unchangedCount = step.unchanged ? unchangedCount + 1 : 0;
          for (const finding of run.findings.filter((f) => f.step === index))
            finding.after = step.after;
        } catch {
          step.error = "행동 실행 실패 · 제품 결함 아님";
          throw new Error(step.error);
        }
        await persist();
        if (run.input.mode === "autonomous" && unchangedCount >= 2) {
          if (
            replans === 0 &&
            run.actions < settings.maxActions &&
            run.calls < settings.maxCalls
          ) {
            replans++;
            await selectGoal(true);
            unchangedCount = 0;
          } else {
            run.status = "limited";
            run.outcome = "재계획 후에도 화면 진전 없음 · 판단 불가";
            break;
          }
        }
      }
    }
    const video = page.video();
    await context.close();
    if (video)
      run.video = `/artifacts/${run.id}/${path.basename(await video.path())}`;
  } catch (error: any) {
    const interrupted = runtime.stopReason;
    const apiStatus = String(error?.message).match(
      /Model API error \((\d+)\)/,
    )?.[1];
    run.status = interrupted ?? "failed";
    // Provider errors can include credentials or request bodies. Expose only a category.
    run.error = interrupted
      ? interrupted === "limited"
        ? "시간 또는 모델 호출 한도 도달"
        : "사용자가 실행 중지"
      : apiStatus
        ? `모델 API 오류 (${apiStatus}) · ${apiStatus === "401" ? "인증 키" : apiStatus === "402" ? "계정 잔액" : apiStatus === "429" ? "공급자 요청 한도" : "모델·이미지 지원"}를 확인하세요`
        : error?.message === "MODEL_OUTPUT_TRUNCATED"
          ? "모델 응답이 출력 토큰 한도에서 잘려 판단할 수 없습니다"
          : error?.name === "ZodError"
            ? `모델 응답 형식 검증 실패 · ${error.issues?.map((issue: any) => issue.path.join(".")).join(", ") ?? "schema"}`
            : "브라우저 또는 모델 실행 실패 · 환경과 설정을 확인하세요";
    run.outcome = run.error;
  } finally {
    clearTimeout(timeout);
    await runtime.browser?.close().catch(() => {});
    if (page?.video()) {
      try {
        run.video = `/artifacts/${run.id}/${path.basename(await page.video()!.path())}`;
      } catch {}
    }
    run.endedAt = new Date().toISOString();
    run.stage = "종료";
    await persist();
  }
}
async function runBaseline(
  page: Page,
  run: Run,
  capture: (label: string) => Promise<string>,
  persist: () => Promise<void>,
  runtime: Runtime,
) {
  // Fixed same-work comparison: homepage → search query → visible results. No VLM calls.
  const operations = [
    {
      description: "검색 필드 입력 (role/label locator)",
      action: async () => {
        const search = page
          .getByRole("combobox", { name: /search|검색/i })
          .or(page.getByPlaceholder(/search|검색/i));
        await search.first().fill(run.input.query);
      },
    },
    {
      description: "검색 실행 (Enter)",
      action: async () => {
        await page.keyboard.press("Enter");
        await page.waitForURL("**/results?**", { timeout: 15000 });
      },
    },
    {
      description: "검색 결과 링크 가시성 확인",
      action: async () => {
        await page
          .locator("ytd-video-renderer")
          .first()
          .getByRole("link")
          .first()
          .waitFor({ state: "visible" });
      },
    },
  ];
  for (const [index, op] of operations.entries()) {
    if (runtime.controller.signal.aborted) throw new Error("stopped");
    if (run.actions >= run.settings.maxActions) {
      run.status = "limited";
      run.outcome = "행동 한도 도달";
      return;
    }
    const before = await capture(`${index}-before`);
    run.stage = op.description;
    await persist();
    await op.action();
    run.actions++;
    run.steps.push({
      index,
      at: new Date().toISOString(),
      before,
      after: await capture(`${index}-after`),
      executed: true,
      plan: {
        observation: op.description,
        rationale: "사전 작성한 locator 스크립트",
        action: { type: "wait" },
        verdict: "continue",
        finding: null,
      },
    });
  }
  run.status = "completed";
  run.outcome = "고정 검색 업무 완료 · locator 결과 확인";
}
