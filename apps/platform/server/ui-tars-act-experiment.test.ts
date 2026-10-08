import {it,expect} from "vitest";
import {readFile} from "node:fs/promises";
import path from "node:path";
import type {Page} from "playwright";
import {defaults} from "./domain";
import {artifactsDir} from "./runner";
import {experimentLimits,orderScenario,runUiTarsActExperiment} from "./ui-tars-act-experiment";

// Local stand-in for the order form. Test-only DOM reads below check the page; the runner never reads DOM.
const fixture = `<style>*{margin:0}body{font:16px sans-serif}button,input{position:absolute;width:160px;height:40px}</style>
<button id="red" style="left:100px;top:100px" onclick="this.textContent='빨간 머그 ✓'">빨간 머그</button>
<input id="qty" value="1" style="left:100px;top:200px" aria-label="수량">
<input id="name" style="left:100px;top:300px" aria-label="받는 사람">
<input id="email" style="left:100px;top:400px" aria-label="이메일 주소">
<button id="confirm" style="left:100px;top:500px" onclick="this.textContent='주문 완료'">주문 확정</button>
<div hidden>PRIVATE_DOM_SENTINEL</div>`;
const navigateTarget = async (page:Page) => { await page.setContent(fixture); };
// Public UI-TARS 1.5 answers in Qwen2.5-VL smart-resized pixels: 1280x720 -> 1288x728.
const at = (x:number,y:number) => `(${Math.round(x*1288/1280)},${Math.round(y*728/720)})`;
const happy = [
  `Thought: 빨간 머그 선택\nAction: click(start_box='${at(180,120)}')`,
  `Thought: 수량 칸 클릭\nAction: click(start_box='${at(180,220)}')`,
  "Thought: 기존 수량 전체 선택\nAction: hotkey(key='ctrl a')",
  "Thought: 수량 입력\nAction: type(content='2')",
  `Thought: 받는 사람 칸 클릭\nAction: click(start_box='${at(180,320)}')`,
  "Thought: 이름 입력\nAction: type(content='김성지')",
  `Thought: 이메일 칸 클릭\nAction: click(start_box='${at(180,420)}')`,
  "Thought: 이메일 입력\nAction: type(content='test@gmail.com')",
  `Thought: 주문 확정 클릭\nAction: click(start_box='${at(180,520)}')`,
  "Thought: 완료\nAction: finished(content='주문을 확정했습니다')",
];
const assertPass = '<thought>요약이 보입니다</thought>\n<data-json>{"StatementIsTruthy": true}</data-json>';
function provider(plans:string[],options:{assert?:string;finish?:string;onPlan?:(n:number,signal?:AbortSignal)=>Promise<void>|void}={}) {
  const bodies:any[] = [];let planCalls = 0;
  const client = () => ({chat:{completions:{create:async(body:any,opts:any)=>{
    bodies.push(body);
    const planning = JSON.stringify(body).includes("## Action Space");
    if (planning) await options.onPlan?.(planCalls,opts?.signal);
    const content = planning ? plans[Math.min(planCalls++,plans.length-1)] : options.assert ?? assertPass;
    return {id:"mock",model:body.model,choices:[{index:0,finish_reason:planning?options.finish ?? "stop":"stop",message:{role:"assistant",content}}],usage:{total_tokens:1}};
  }}}});
  return {bodies,client};
}
const settings = {...defaults,apiKey:"mock-key-sentinel",...experimentLimits,maxTokens:1536};
const run = async (mock:ReturnType<typeof provider>,extra:Partial<Parameters<typeof runUiTarsActExperiment>[0]>={},overrides:Partial<typeof settings>={}) => {
  let page:Page|undefined;
  const report = await runUiTarsActExperiment({settings:{...settings,...overrides},createClient:mock.client,
    navigateTarget:async p=>{page=p;await navigateTarget(p);},...extra});
  return {report,page:page!};
};

it("reaches UI-TARS action planning without any JSON plan, executes and records evidence, but never reports success", async () => {
  const mock = provider(happy);
  const values:Record<string,string> = {};
  // Test-only page observation via a binding; the runner itself never reads DOM.
  const {report} = await run(mock,{navigateTarget:async page=>{
    await page.exposeBinding("observe",(_source,id:string,value:string)=>{values[id]=value;});
    await navigateTarget(page);
    await page.evaluate(()=>{for (const e of document.querySelectorAll("input,button")) for (const type of ["input","click"])
      e.addEventListener(type,()=>setTimeout(()=>(window as any).observe(e.id,e.tagName==="INPUT"?(e as HTMLInputElement).value:e.textContent),0));});
  }});
  expect([values.qty,values.name,values.email,values.confirm]).toEqual(["2","김성지","test@gmail.com","주문 완료"]);
  expect(report.sdk).toMatchObject({planningModelFamily:"vlm-ui-tars",planningKind:"custom",planningSlot:"default",includeLocateInPlanning:true,deepLocate:{supportedForAiAct:false,requested:false},replanningCycleLimit:12});
  expect(report).toMatchObject({status:"model-finished-needs-review",aiAct:{status:"returned"},modelFinished:{declared:true},assertion:{status:"pass"},
    orderCompletion:{status:"needs-independent-review"},inputs:{stepwiseVisualConfirmation:"not-performed",typedValues:["2","김성지","test@gmail.com"],requiredTyped:{"2":true,"김성지":true,"test@gmail.com":true},otherTypedValues:[]}});
  expect(report.counts).toMatchObject({calls:11,actions:9,executedActions:9});
  const planning = mock.bodies.filter(b=>JSON.stringify(b).includes("## Action Space"));
  expect(planning).toHaveLength(10);
  const all = JSON.stringify(mock.bodies);
  expect(all).not.toContain("MIDSCENE_WORKFLOW");expect(all).not.toContain("PRIVATE_DOM_SENTINEL");expect(all).not.toContain("visionQaUiTarsAction");
  expect(JSON.stringify(planning[0])).toContain(JSON.stringify(orderScenario.task).slice(1,-1));
  expect(planning.every(b=>b.model==="bytedance/ui-tars-1.5-7b" && b.max_tokens===1536)).toBe(true);
  // Raw response, SDK-normalized action and the exact model input image are kept per call.
  expect(report.transport[0].parsedOutput).toMatchObject({raw:happy[0],sdkNormalizedAction:expect.stringContaining("click(")});
  const image = await readFile(path.join(artifactsDir,report.transport[0].screenshot.replace("/artifacts/","")));
  const sent = planning[0].messages.flatMap((m:any)=>Array.isArray(m.content)?m.content:[]).find((b:any)=>b.type==="image_url").image_url.url;
  expect(Buffer.from(sent.slice(sent.indexOf(",")+1),"base64").equals(image)).toBe(true);
  expect(report.steps.every((s:any)=>s.executed && s.before && s.after)).toBe(true);
  expect(report.finalScreenshot).toMatch(/act-final\.png$/);expect(report.video).toMatch(/\.webm$/);
  const saved = await readFile(path.join(artifactsDir,report.runId,"ACT_EXPERIMENT.json"),"utf8");
  expect(saved).not.toContain("mock-key-sentinel");expect(saved).not.toContain("base64,");
}, 60000);

it("type into a prefilled field without the model's own select-all appends (12): typed value 2 is not a screen confirmation", async () => {
  let qty = "";
  const plans = [happy[1],happy[3],"Thought: 완료\nAction: finished(content='완료')"];
  const {report} = await run(provider(plans),{navigateTarget:async page=>{
    await page.exposeBinding("observe",(_source,value:string)=>{qty=value;});
    await navigateTarget(page);
    await page.evaluate(()=>document.getElementById("qty")!.addEventListener("input",e=>(window as any).observe((e.target as HTMLInputElement).value)));
  }});
  expect(qty).toBe("12");
  expect(report.inputs).toMatchObject({stepwiseVisualConfirmation:"not-performed",typedValues:["2"],requiredTyped:{"2":true}});
  expect(report.status).toBe("model-finished-needs-review");
}, 60000);

it("a finished declaration without the work is not success: missing inputs are flagged even when the assertion passes", async () => {
  const {report} = await run(provider(["Thought: 이미 완료\nAction: finished(content='완료')"]));
  expect(report).toMatchObject({status:"model-finished-needs-review",modelFinished:{declared:true},assertion:{status:"pass"},
    inputs:{typedValues:[],requiredTyped:{"2":false,"김성지":false,"test@gmail.com":false}}});
  expect(report.counts).toMatchObject({calls:2,actions:0});
}, 60000);

it("assertion format failure stays a failure, never a pass", async () => {
  const {report} = await run(provider(["Thought: 완료\nAction: finished(content='완료')"],{assert:"<thought>모름</thought>"}));
  expect(report.assertion).toMatchObject({status:"format-failure",raw:"<thought>모름</thought>"});
  expect(report.status).toBe("model-finished-needs-review");
}, 60000);

it("action limit stops the run as incomplete with no replanning beyond it", async () => {
  const mock = provider([`Thought: 클릭\nAction: click(start_box='${at(180,120)}')`]);
  const {report} = await run(mock,{},{maxActions:2});
  expect(report).toMatchObject({status:"limited-incomplete",reason:"행동 한도 도달 (2회)",aiAct:{status:"error"},assertion:{status:"not-run"},modelFinished:{declared:false}});
  expect(report.counts).toMatchObject({calls:3,actions:2,executedActions:2});
}, 60000);

it("call limit stops the run as incomplete", async () => {
  const {report} = await run(provider([`Thought: 클릭\nAction: click(start_box='${at(180,120)}')`]),{},{maxCalls:3});
  expect(report).toMatchObject({status:"limited-incomplete",reason:"모델 호출 한도 도달 (3회)",assertion:{status:"not-run"}});
  expect(report.counts).toMatchObject({calls:3,actions:3});
}, 60000);

it("token-limit planning response is blocked before any action", async () => {
  const {report} = await run(provider(happy,{finish:"length"}));
  expect(report).toMatchObject({status:"failed",reason:"MODEL_OUTPUT_TRUNCATED",assertion:{status:"not-run"}});
  expect(report.counts).toMatchObject({calls:1,actions:0});
}, 60000);

it("user stop and total time limit end the run without further calls", async () => {
  const controller = new AbortController();
  const stopped = await run(provider(happy,{onPlan:n=>{if(n===2)controller.abort();}}),{controller});
  expect(stopped.report.status).toBe("stopped");expect(stopped.report.counts.calls).toBe(3);expect(stopped.report.counts.actions).toBe(2);
  const timed = await run(provider(happy,{onPlan:(n,signal)=>n===1?new Promise((_,reject)=>signal?.addEventListener("abort",()=>reject(signal.reason))):undefined}),{timeoutMs:4000});
  expect(timed.report).toMatchObject({status:"limited-incomplete",reason:"전체 실행 시간 한도 도달 (180초)"});
  expect(timed.report.counts.calls).toBe(2);
}, 60000);

it("an action execution error stops instead of letting Midscene replan", async () => {
  const mock = provider(["Thought: 키 입력\nAction: hotkey(key='nosuchkey')",...happy]);
  const {report} = await run(mock);
  expect(report.status).toBe("limited-incomplete");
  expect(report.reason).toMatch(/행동 실행 오류로 중지/);
  expect(report.counts.calls).toBe(1);
}, 60000);
