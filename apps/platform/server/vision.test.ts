import { it, expect } from "vitest";
import { chromium } from "playwright";
import { PlaywrightAgent } from "@midscene/web/playwright";
import { defaults, inputSchema, planSchema, planPrompt } from "./domain";
import { instrumentClient, makeRun, executeAction } from "./runner";
it("Midscene transports screenshots without hidden DOM and executes the validated coordinate plan (stub provider)", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 720 },
    });
    await page.setContent(
      '<div style="display:none">HIDDEN_DOM_SENTINEL_2de48</div><button style="position:absolute;left:50px;top:50px;width:160px;height:60px" onclick="this.textContent=\'Clicked\'">Explore</button>',
    );
    let domReads = 0;
    let serialized = "";
    const plan = {
      observation: "A button is visible",
      rationale: "Explore a visible read-only button",
      action: { type: "click", x: 100, y: 70 },
      verdict: "continue",
      finding: null,
    };
    const run = makeRun(
      inputSchema.parse({
        mode: "autonomous",
        url: "https://www.youtube.com/",
      }),
      { ...defaults, maxCalls: 1, apiKey: "stub-key" },
    );
    const runtime = { controller: new AbortController() };
    const agent = new PlaywrightAgent(page, {
      generateReport: false,
      persistExecutionDump: false,
      autoPrintReportMsg: false,
      forceChromeSelectRendering: false,
      modelConfig: {
        MIDSCENE_MODEL_API_KEY: "stub-key",
        MIDSCENE_MODEL_BASE_URL: "https://stub.invalid/v1",
        MIDSCENE_MODEL_NAME: "stub-vlm",
        MIDSCENE_MODEL_FAMILY: "qwen3-vl",
        MIDSCENE_MODEL_RETRY_COUNT: 0,
      },
      createOpenAIClient: async (client) => {
        client.chat.completions.create = async (body: any) => {
          serialized = JSON.stringify(body);
          return {
            id: "stub-1",
            model: "stub-vlm",
            choices: [
              {
                index: 0,
                finish_reason: "stop",
                message: {
                  role: "assistant",
                  content: JSON.stringify(plan),
                },
              },
            ],
            usage: { total_tokens: 42, cost: 0.002 },
          };
        };
        return instrumentClient(client, run, runtime);
      },
    });
    agent.interface.getElementsNodeTree = async () => {
      domReads++;
      throw new Error("DOM must not be read");
    };
    const returned = planSchema.parse(
      await agent.aiQuery(planPrompt(run.input, []), {
        domIncluded: false,
        screenshotIncluded: true,
        abortSignal: runtime.controller.signal,
      }),
    );
    expect(domReads).toBe(0);
    expect(serialized).not.toContain("HIDDEN_DOM_SENTINEL");
    expect(serialized).toContain("image_url");
    expect(run.calls).toBe(1);
    expect(run.transport[0].images).toBeGreaterThan(0);
    expect(run.tokens).toBe(42);
    expect(run.transport[0].responseFormat?.normalizedPlainJson).toBe(true);
    await executeAction(page, returned.action);
    expect(await page.getByRole("button").textContent()).toBe("Clicked");
    await expect(
      agent.aiQuery("Observe", { domIncluded: false }),
    ).rejects.toThrow();
    expect(run.calls).toBe(1);
  } finally {
    await browser.close();
  }
}, 30000);

it("provider error bodies are sanitized before SDK or Midscene logging", async () => {
  const { providerClient } = await import("./runner");
  const request: typeof globalThis.fetch = async () =>
    new Response(
      JSON.stringify({ error: { message: "SENSITIVE_KEY_FROM_PROVIDER" } }),
      { status: 401, headers: { "content-type": "application/json" } },
    );
  try {
    const client = providerClient({ ...defaults, apiKey: "stub-key" }, request);
    try {
      await client.chat.completions.create({
        model: "stub",
        messages: [{ role: "user", content: "test" }],
      });
      throw new Error("expected error");
    } catch (error: any) {
      expect(error.status).toBe(401);
      expect(error.message).not.toContain("SENSITIVE_KEY_FROM_PROVIDER");
    }
  } finally {
    // The explicit request seam never reaches a real provider.
  }
});

for (const { mode, malformed } of [
  { mode: "scenario", malformed: false },
  { mode: "autonomous", malformed: false },
  { mode: "scenario", malformed: true },
] as const) {
  it(`${mode}${malformed ? " with schema correction" : ""} runner preserves request-image/plan/action linkage and a fresh finish image (local fixture, stub VLM)`, async () => {
    const { runVision, artifactsDir } = await import("./runner");
    const { readFile, stat, writeFile } = await import("node:fs/promises");
    const path = await import("node:path");
    const run = makeRun(
      inputSchema.parse({
        mode,
        url: "https://www.youtube.com/",
        task: "Click the visible button",
        expected: "Button says Clicked",
      }),
      { ...defaults, apiKey: "stub-key", agentInstructions: "CUSTOM_GUIDANCE_TRANSPORT_SENTINEL" },
    );
    run.engine = "LOCAL FIXTURE / STUB VLM · NOT OPENROUTER";
    const runtime = { controller: new AbortController() };
    let attempt = 0;
    let clicked = false;
    let fixturePage: import("playwright").Page;
    let sentImage: string = "";
    await runVision(
      run,
      { ...defaults, apiKey: "stub-key", agentInstructions: "CUSTOM_GUIDANCE_TRANSPORT_SENTINEL" },
      runtime,
      async () => {},
      {
        launchBrowser: async () => {
          const browser = await chromium.launch({ headless: true });
          const original = browser.newContext.bind(browser);
          browser.newContext = async (options) => {
            const context = await original(options);
            context.on("page", (page) => {
              fixturePage = page;
              void page.route("**/*", (route) =>
                route.fulfill({
                  contentType: "text/html",
                  body: '<body style="margin:0"><button style="position:absolute;left:50px;top:50px;width:160px;height:60px" onclick="this.textContent=\'Clicked\'">Explore</button><div style="display:none">HIDDEN_DOM_RUNNER_SENTINEL</div></body>',
                }),
              );
            });
            return context;
          };
          return browser;
        },
        createClient: () => ({
          chat: {
            completions: {
              create: async (body: any) => {
                expect(JSON.stringify(body)).not.toContain(
                  "HIDDEN_DOM_RUNNER_SENTINEL",
                );
                expect(JSON.stringify(body)).toContain("CUSTOM_GUIDANCE_TRANSPORT_SENTINEL");
                attempt++;
                if (malformed && attempt === 1)
                  return {
                    id: "stub-invalid",
                    model: "stub-vlm",
                    choices: [
                      {
                        index: 0,
                        finish_reason: "stop",
                        message: {
                          role: "assistant",
                          content:
                            '<data-json>{"action":{"type":"press","key":"Enter"}}</data-json>',
                        },
                      },
                    ],
                    usage: { total_tokens: 42 },
                  };
                if (mode === "autonomous" && attempt === 1)
                  return {
                    id: "stub-goal",
                    model: "stub-vlm",
                    choices: [
                      {
                        index: 0,
                        finish_reason: "stop",
                        message: {
                          role: "assistant",
                          content: `<data-json>${JSON.stringify({ hypothesis: "Visible button responds to input", task: "Click the visible button", expected: "Button says Clicked", basis: "A visible interactive button" })}</data-json>`,
                        },
                      },
                    ],
                    usage: { total_tokens: 42 },
                  };
                const actionAttempt =
                  attempt - (mode === "autonomous" || malformed ? 1 : 0);
                if (actionAttempt === 2)
                  clicked =
                    (await fixturePage.getByRole("button").textContent()) ===
                    "Clicked";
                if (actionAttempt === 1)
                  sentImage = body.messages
                    .flatMap((m: any) =>
                      Array.isArray(m.content) ? m.content : [],
                    )
                    .find((b: any) => b.type === "image_url").image_url.url;
                const plan = {
                  observation:
                    actionAttempt === 1 ? "A visible button" : "Clicked button",
                  rationale: "Local stub fixture test",
                  action:
                    actionAttempt === 1
                      ? { type: "click", x: 100, y: 70 }
                      : { type: "wait" },
                  verdict: actionAttempt === 1 ? "continue" : "pass",
                  finding:
                    actionAttempt === 2 && mode === "scenario"
                      ? {
                          title: "Normal expected outcome",
                          observed: "Clicked button",
                          expected: "Clicked button",
                          basis: "Task met",
                          reproduction: ["Click button"],
                        }
                      : null,
                };
                return {
                  id: `stub-${attempt}`,
                  model: "stub-vlm",
                  choices: [
                    {
                      index: 0,
                      finish_reason: "stop",
                      message: {
                        role: "assistant",
                        content: `<data-json>${JSON.stringify(plan)}</data-json>`,
                      },
                    },
                  ],
                  usage: { total_tokens: 42 },
                };
              },
            },
          },
        }),
      },
    );
    expect(run.status).toBe("completed");
    expect(run.actions).toBe(1);
    const offset = mode === "autonomous" || malformed ? 1 : 0;
    if (malformed) expect(run.transport[0].validationError).toContain("action");
    expect(run.calls).toBe(2 + offset);
    if (mode === "autonomous") {
      expect(run.goals?.[0].screenshot).toBe(run.transport[0].screenshot);
      expect(run.goals?.[0].task).toBe("Click the visible button");
    }
    expect(run.findings).toHaveLength(0);
    expect(clicked).toBe(true);
    expect(run.steps[0].before).toBe(run.transport[offset].screenshot);
    expect(run.steps[1].before).toBe(run.transport[1 + offset].screenshot);
    expect(run.steps[1].after).toContain("1-decision.png");
    expect(run.steps[1].executed).toBe(false);
    const file = (url: string) =>
      path.join(artifactsDir, url.replace("/artifacts/", ""));
    expect(
      (await stat(file(run.steps[1].after))).mtimeMs,
    ).toBeGreaterThanOrEqual((await stat(file(run.steps[1].before))).mtimeMs);
    const before = await readFile(file(run.steps[0].before));
    const after = await readFile(file(run.steps[0].after));
    expect(before.equals(Buffer.from(sentImage.split(",")[1], "base64"))).toBe(
      true,
    );
    expect(after.length).toBeGreaterThan(0);
    await writeFile(
      path.join(artifactsDir, run.id, "STUB_REPORT.json"),
      JSON.stringify({ ...run, mock: true }, null, 2),
    );
  }, 30000);
}

it("unchanged autonomous screens trigger one bounded replan then an explicit inconclusive stop", async () => {
  const { runVision } = await import("./runner");
  const run = makeRun(
    inputSchema.parse({ mode: "autonomous", url: "https://www.youtube.com/" }),
    { ...defaults, apiKey: "stub-key" },
  );
  const runtime = { controller: new AbortController() };
  let requestedGoals = 0,
    outgoingCalls = 0;
  await runVision(
    run,
    { ...defaults, apiKey: "stub-key" },
    runtime,
    async () => {},
    {
      launchBrowser: async () => {
        const browser = await chromium.launch({ headless: true });
        const original = browser.newContext.bind(browser);
        browser.newContext = async (options) => {
          const context = await original(options);
          context.on("page", (page) => {
            void page.route("**/*", (route) =>
              route.fulfill({
                contentType: "text/html",
                body: '<body style="margin:0">Static fixture</body>',
              }),
            );
          });
          return context;
        };
        return browser;
      },
      createClient: () => ({
        chat: {
          completions: {
            create: async (body: any) => {
              outgoingCalls++;
              const demand = JSON.stringify(body.messages);
              const selecting = demand.includes(
                "Choose ONE concrete visual QA hypothesis",
              );
              const output = selecting
                ? {
                    hypothesis: `Goal ${++requestedGoals}`,
                    task: "Observe this read-only fixture",
                    expected: "Visible page content",
                    basis: "Screen evidence",
                  }
                : {
                    observation: "Static fixture",
                    rationale: "Stub deliberately simulates a stuck planner",
                    action: { type: "wait" },
                    verdict: "continue",
                    finding: null,
                  };
              return {
                id: `stub-${outgoingCalls}`,
                model: "stub-vlm",
                choices: [
                  {
                    index: 0,
                    finish_reason: "stop",
                    message: {
                      role: "assistant",
                      content: `<data-json>${JSON.stringify(output)}</data-json>`,
                    },
                  },
                ],
                usage: { total_tokens: 42 },
              };
            },
          },
        },
      }),
    },
  );
  expect(requestedGoals).toBe(2);
  expect(run.goals).toHaveLength(2);
  expect(run.status).toBe("limited");
  expect(run.outcome).toContain("판단 불가");
  expect(run.actions).toBe(4);
  expect(run.calls).toBe(6);
  expect(run.steps.every((s) => s.unchanged)).toBe(true);
}, 30000);

for (const missingFocus of [false, true]) {
  it(`focus and screenshot input confirmation ${missingFocus ? "reject silent input loss despite a false model claim" : "verify a typed value"} within tool/request limits`, async () => {
    const { runVision } = await import("./runner");
    const settings = {
      ...defaults,
      apiKey: "stub-key",
      maxActions: 2,
      maxCalls: 3,
    };
    const run = makeRun(
      inputSchema.parse({
        mode: "scenario",
        url: "https://www.youtube.com/",
        task: "Type sample in the visible field",
        expected: "sample appears",
      }),
      settings,
    );
    let page: import("playwright").Page;
    let attempt = 0;
    let actualText = "";
    const requests: string[] = [];
    await runVision(
      run,
      settings,
      { controller: new AbortController() },
      async () => {},
      {
        launchBrowser: async () => {
          const browser = await chromium.launch({ headless: true });
          const original = browser.newContext.bind(browser);
          browser.newContext = async (options) => {
            const context = await original(options);
            context.on("page", (p) => {
              page = p;
              if (missingFocus) page.mouse.click = async () => {}; // Reproduce silent focus failure, not a product fallback.
              void page.route("**/*", (route) =>
                route.fulfill({
                  contentType: "text/html",
                  body: '<body style="margin:0"><input style="position:absolute;left:100px;top:100px;width:300px;height:50px" placeholder="Visible field"><div style="display:none">INPUT_HIDDEN_SENTINEL</div></body>',
                }),
              );
            });
            return context;
          };
          return browser;
        },
        createClient: () => ({
          chat: {
            completions: {
              create: async (body: any) => {
                const demand = JSON.stringify(body.messages);
                requests.push(demand);
                expect(demand).not.toContain("INPUT_HIDDEN_SENTINEL");
                attempt++;
                if (attempt === 2)
                  actualText = await page.locator("input").inputValue(); // Test oracle only; never sent as model input.
                const output =
                  attempt === 2
                    ? {
                        status: "verified",
                        visibleText: "sample",
                        reason:
                          "Stub intentionally claims success even if focus was lost",
                      }
                    : {
                        observation:
                          attempt === 1
                            ? "Visible empty field"
                            : "sample visible",
                        rationale: "Fixture",
                        action:
                          attempt === 1
                            ? { type: "type", text: "sample", x: 200, y: 125 }
                            : { type: "finish" },
                        verdict: attempt === 1 ? "continue" : "pass",
                        finding: null,
                      };
                return {
                  id: `input-stub-${attempt}`,
                  model: "stub-vlm",
                  choices: [
                    {
                      index: 0,
                      finish_reason: "stop",
                      message: {
                        role: "assistant",
                        content: `<data-json>${JSON.stringify(output)}</data-json>`,
                      },
                    },
                  ],
                  usage: { total_tokens: 42 },
                };
              },
            },
          },
        }),
      },
    );
    expect(run.actions).toBe(2); // Focus click and insertText each counted, never one compound action.
    expect(
      run.steps[0].toolCalls?.map((t) => [t.action.type, t.completed]),
    ).toEqual([
      ["click", true],
      ["type", true],
    ]);
    expect(requests[1]).toContain("independent visual input check");
    expect(requests[1]).not.toContain("History:");
    expect(run.steps[0].inputConfirmation?.screenshot).toBe(
      run.transport[1].screenshot,
    );
    expect(run.steps[0].inputConfirmation?.call).toBe(2);
    if (missingFocus) {
      expect(actualText).toBe("");
      expect(run.steps[0].unchanged).toBe(true);
      expect(run.steps[0].inputConfirmation?.status).toBe("not-visible");
      expect(run.status).toBe("limited");
      expect(run.outcome).toContain("입력 결과");
      expect(run.calls).toBe(2);
      expect(run.steps).toHaveLength(1); // Never accept a subsequent pass or submit on silent loss.
    } else {
      expect(actualText).toBe("sample");
      expect(run.steps[0].inputConfirmation?.status).toBe("verified");
      expect(run.status).toBe("completed");
      expect(run.calls).toBe(3);
    }
    expect(run.findings).toHaveLength(0);
  }, 30000);
}

it("typing without focus silently drops text in a real browser; a screenshot-selected focus fixes it", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(
      '<input style="position:absolute;left:100px;top:100px;width:300px;height:50px">',
    );
    await page.keyboard.insertText("sample");
    expect(await page.locator("input").inputValue()).toBe("");
    await executeAction(page, { type: "type", text: "sample", x: 200, y: 125 });
    expect(await page.locator("input").inputValue()).toBe("sample");
  } finally {
    await browser.close();
  }
}, 30000);

it("controlled screenshot assessment initializes the explicit OpenRouter base URL with a stub client, without DOM", async () => {
  const { fixtureModelConfig } = await import("./fixture-assessment");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 720 },
    });
    await page.setContent(
      '<p>Order confirmation fixture</p><p style="display:none">ASSESSMENT_HIDDEN_SENTINEL</p>',
    );
    let requests = 0;
    const agent = new PlaywrightAgent(page, {
      generateReport: false,
      persistExecutionDump: false,
      autoPrintReportMsg: false,
      forceChromeSelectRendering: false,
      modelConfig: fixtureModelConfig({
        ...defaults,
        model: "qwen/qwen3-vl-30b-a3b-instruct",
        apiKey: "stub-key",
      }),
      createOpenAIClient: async () =>
        ({
          chat: {
            completions: {
              create: async (body: any) => {
                requests++;
                expect(JSON.stringify(body)).toContain("image_url");
                expect(JSON.stringify(body)).not.toContain(
                  "ASSESSMENT_HIDDEN_SENTINEL",
                );
                return {
                  id: "assessment-stub",
                  model: "stub",
                  choices: [
                    {
                      index: 0,
                      finish_reason: "stop",
                      message: {
                        role: "assistant",
                        content:
                          '<data-json>{"status":"pass","observation":"stub","issues":[]}</data-json>',
                      },
                    },
                  ],
                };
              },
            },
          },
        }) as any,
    });
    agent.interface.getElementsNodeTree = async () => {
      throw new Error("DOM forbidden");
    };
    expect(
      await agent.aiQuery(
        "Return {status,observation,issues} from the current screenshot",
        { domIncluded: false, screenshotIncluded: true },
      ),
    ).toEqual({ status: "pass", observation: "stub", issues: [] });
    expect(requests).toBe(1);
  } finally {
    await browser.close();
  }
}, 30000);
