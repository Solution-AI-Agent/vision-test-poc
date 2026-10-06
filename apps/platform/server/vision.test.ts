import { visualCriteria } from "./visual-qa";
function auditStub(body: unknown) {
  if(JSON.stringify(body).includes("TASK_COMPLETION_CHECK")) return {choices:[{index:0,finish_reason:"stop",message:{role:"assistant",content:'<data-json>{"verified":true,"reason":"로컬 검증 완료 화면"}</data-json>'}}]};
  if (!JSON.stringify(body).includes("VISUAL_QA_REVIEW_V1")) return;
  return { id: "stub-audit", model: "stub", choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: `<data-json>${JSON.stringify({ checks: visualCriteria.map(criterion => ({ criterion, result: "clear", evidence: "Local stub screen" })), issues: [] })}</data-json>` } }], usage: { total_tokens: 42 } };
}
import { it, expect } from "vitest";
import { chromium } from "playwright";
import { PlaywrightAgent } from "@midscene/web/playwright";
import { defaults, inputSchema, planSchema, planPrompt, parseModelPlan } from "./domain";
import { instrumentClient, makeRun, executeAction } from "./runner";
it("Qwen's declared 0..1000 coordinates are converted once, without guessing from magnitude", () => {
  const raw={observation:"수량은 1",rationale:"2로 변경",action:{type:"type",text:"2",x:305,y:618},verdict:"continue",finding:null};
  const qwen=parseModelPlan(raw,"qwen3-vl");
  expect(qwen.success&&qwen.data.action).toEqual({type:"type",text:"2",x:390,y:445});
  expect(raw.action.x).toBe(305);
  expect(parseModelPlan(raw,"gpt-5")).toMatchObject({success:true,data:{action:{x:305,y:618}}});
  expect(parseModelPlan({...raw,action:{...raw.action,x:[305,618],y:undefined}},"qwen3-vl")).toMatchObject({success:true,data:{action:{x:390,y:445}}});
  expect(parseModelPlan({...raw,action:{...raw.action,x:1001}},"qwen3-vl").success).toBe(false);
  expect(parseModelPlan({...raw,action:{...raw.action,y:undefined}},"qwen3-vl").success).toBe(false);
});
it("screenshot coordinates and replacement typing update quantity and its calculated total, rather than append", async () => {
  const browser=await chromium.launch({headless:true});
  try {
    const page=await browser.newPage({viewport:{width:1280,height:720}});
    await page.setContent('<input type="number" value="1" style="position:absolute;left:100px;top:420px;width:600px;height:50px" oninput="document.querySelector(\'output\').textContent=Number(this.value)*12"><output>12</output>');
    await page.mouse.click(390,445);await page.keyboard.press("End");await page.keyboard.insertText("2");
    expect(await page.locator('input').inputValue()).toBe('12'); // Actual former append behavior.
    const plan=parseModelPlan({observation:"수량 12",rationale:"2로 교체",action:{type:"type",text:"2",x:305,y:618},verdict:"continue",finding:null},"qwen3-vl");
    if(!plan.success)throw plan.error;
    const calls:string[]=[];
    await executeAction(page,plan.data.action,(action,completed)=>{if(!completed)calls.push(action.type)});
    expect(await page.locator('input').inputValue()).toBe('2');
    expect(await page.locator('output').textContent()).toBe('24');
    expect(calls).toEqual(['click','key','type']);
  } finally {await browser.close();}
},30000);
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
    expect(run.transport.filter(r => r.phase !== "visual-review")[0].images).toBeGreaterThan(0);
    expect(run.tokens).toBe(42);
    expect(run.transport.filter(r => r.phase !== "visual-review")[0].responseFormat?.normalizedPlainJson).toBe(true);
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
                const audit = auditStub(body); if (audit) return audit;
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
