import {chromium,type Browser,type Page} from "playwright";
import {PlaywrightAgent} from "@midscene/web/playwright";
import {_keyDefinitions} from "@midscene/shared/us-keyboard-layout";
import {mkdir,writeFile} from "node:fs/promises";
import path from "node:path";
import {inputSchema,validateTarget,type Run,type Settings,type Step} from "./domain";
import {artifactsDir,makeRun,midsceneAgentOptions,type Runtime} from "./runner";

// Experiment C: one direct agent.aiAct(task) with UI-TARS' own planner (Midscene vlm-ui-tars custom
// planning), no aiQuery workflow plan. Not part of the app's run path; the app still uses runMidsceneWorkflow.
// Image-only: no DOM, no selectors, no fixed coordinates, no generated values, no retries.
export const orderScenario = {
  url:"http://127.0.0.1:4311/store/d",
  // User's original wording (thread fc58e7cc…), kept verbatim including the expected-result typo.
  task:"상품선택에서 빨간 머그를 선택하고 수량을 2로 입력한다. 받는 사람에 “김성지”를 입력하고 이메일 주소에 “test@gmail.com”을 입력하고 주문 확정을 클릭한다.",
  expected:"우측 주문요약에 선택한 숭품의 이미지와 수량,단가,배송비 여부가 보여진다.",
  requiredInputs:["2","김성지","test@gmail.com"],
};
export const experimentLimits = {maxCalls:20,maxActions:12,maxSeconds:180};
// Optional comparison variant (off by default): one general input-state rule for every field, appended to the
// aiAct planning context only. No scenario values, coordinates or DOM; the user's task text is not touched.
export const inputStateGuidance = "입력칸 공통 규칙: 입력칸 안의 흐린 예시 문구(placeholder)는 입력값이 아니며 그 칸은 빈 칸이다. 요구된 값을 직접 입력하기 전에는 입력을 완료했다고 판단하지 않는다. 삭제한 뒤에도 같은 예시 문구가 보이면 삭제를 반복하지 말고 요구된 값을 입력한다.";

const nfc = (v:string) => v.normalize("NFC").trim();

// App runs put UI-TARS on a separate planning slot, so Midscene drops the planned point and re-locates each
// target with an extra default-model (qwen2.5-vl bbox JSON) call. Here UI-TARS is the default slot with
// Midscene's vlm-ui-tars adapter, so its own planned point is executed (includeLocateInPlanning). Only planning
// requests carry the public UI-TARS 1.5 pixel->1000 coordinate adapter flag; insight requests (aiAssert) do not.
//
// Midscene stores getSummary(response) as the assistant history, and that response is already the adapter's
// 0-1000 normalized text, so later requests showed UI-TARS normalized points next to its own resized-pixel
// points (live run e4c62a7f: name click (175,532) was replayed as [136,731], then the email click came back
// as (465,731), off screen). The model gets back its own raw answer; the executor keeps the normalized one.
// Exact match only: an assistant turn this run did not produce fails the request instead of being guessed.
const uiTarsSummary = (text:string) => text.replace(/Reflection:[\s\S]*?(?=Action_Summary:|Action:|$)/g,"").trim(); // Midscene ui-tars getSummary
export function uiTarsActAgentOptions(settings:Settings,run:Run,runtime:Runtime,createClient:(settings:Settings)=>any,generalGuidance?:string) {
  const base = midsceneAgentOptions(settings,run,runtime,createClient);
  // Midscene uses aiContexts.aiAct instead of (not in addition to) default, so the variant repeats default.
  const aiContexts = generalGuidance ? {...base.aiContexts,aiAct:`${base.aiContexts.default}\n${generalGuidance}`} : base.aiContexts;
  const rawByNormalized = new Map<string,string>();
  const rawHistory = (content:unknown) => {
    const raw = typeof content==="string" ? rawByNormalized.get(content) : undefined;
    if (raw===undefined) throw new Error("UI-TARS 행동 이력의 원 좌표를 찾을 수 없습니다.");
    return raw;
  };
  const modelConfig = Object.fromEntries(Object.entries(base.modelConfig).filter(([key])=>!key.startsWith("MIDSCENE_PLANNING_MODEL_")));
  return {...base,aiContexts,modelConfig:{...modelConfig,MIDSCENE_MODEL_FAMILY:"vlm-ui-tars"},
    createOpenAIClient:async () => {
      const client = await base.createOpenAIClient();
      const create = client.chat.completions.create;
      client.chat.completions.create = async (body:any,opts:any) => {
        if (!JSON.stringify(body.messages).includes("## Action Space")) return create(body,opts);
        const response = await create({...body,messages:body.messages.map((m:any)=>m.role==="assistant" ? {...m,content:rawHistory(m.content)} : m),visionQaUiTarsAction:true},opts);
        const output = run.transport.at(-1)?.parsedOutput as {raw?:string;sdkNormalizedAction?:string}|undefined;
        if (output?.raw && output.sdkNormalizedAction) {
          const key = uiTarsSummary(output.sdkNormalizedAction), raw = uiTarsSummary(output.raw);
          if (raw !== (rawByNormalized.get(key) ?? raw)) throw new Error("UI-TARS 행동 이력의 원 좌표를 구분할 수 없습니다.");
          rawByNormalized.set(key,raw);
        }
        return response;
      };
      return client;
    }};
}

// UI-TARS names arrow keys up/down/left/right; Midscene's hotkey transform passes them through unchanged and
// Playwright rejects them ("Unknown key: up", live run 7bb207d3). Only these unambiguous aliases are mapped,
// per key token of the SDK keyName ("Meta+A" stays as is). Any other token that is not a Midscene key
// definition or a single character is blocked before the action instead of being guessed.
const arrowAliases:Record<string,string> = {up:"ArrowUp",down:"ArrowDown",left:"ArrowLeft",right:"ArrowRight"};
export function playwrightKeyName(keyName:string) {
  const tokens = keyName.trim().split(/\s*\+\s*|\s+/);
  const mapped = tokens.map(token => arrowAliases[token.toLowerCase()] ?? token);
  const unknown = mapped.filter(key => !(key.length===1 || (key in _keyDefinitions && (_keyDefinitions as any)[key].key===key)));
  if (unknown.length) throw new Error(`알 수 없는 키라 실행하지 않습니다: ${JSON.stringify(keyName)}`);
  return mapped.join("+");
}

export async function runUiTarsActExperiment(options:{
  settings:Settings;
  createClient:(settings:Settings)=>any;
  inputGuidance?:boolean;
  scenario?:typeof orderScenario;
  launchBrowser?:()=>Promise<Browser>;
  navigateTarget?:(page:Page,url:string)=>Promise<unknown>;
  controller?:AbortController;
  timeoutMs?:number;
}) {
  const scenario = options.scenario ?? orderScenario;
  const settings = {...options.settings,family:"ui-tars-1.5" as const};
  const run = makeRun(inputSchema.parse({mode:"scenario",url:scenario.url,task:scenario.task,expected:scenario.expected}),settings);
  run.engine = "Midscene aiAct (vlm-ui-tars custom planner, public UI-TARS 1.5 coordinate adapter) / 1.14.0 · experiment C";
  const runtime:Runtime = {controller:options.controller ?? new AbortController()};
  const folder = path.join(artifactsDir,run.id);
  const report:any = {
    experiment:"ui-tars-direct-aiAct",runId:run.id,scenario,
    prompt:{variant:options.inputGuidance?"input-guidance":"baseline",userTask:scenario.task,generalGuidance:options.inputGuidance?inputStateGuidance:null},limits:{maxCalls:settings.maxCalls,maxActions:settings.maxActions,maxSeconds:settings.maxSeconds,maxTokens:settings.maxTokens},
    sdk:{},aiAct:{status:"not-run"},modelFinished:{declared:false},
    inputs:{stepwiseVisualConfirmation:"not-performed",note:"직접 aiAct 경로에는 기존 단계별 aiString 입력값 확인이 없습니다. typedValues는 모델이 요청한 type 내용이며 화면 확인값이 아닙니다."},
    orderCompletion:{status:"needs-independent-review",note:"코드/모델로 판정하지 않음. finalScreenshot·video로 독립 검토."},
    assertion:{status:"not-run"},
  };
  const deadline = setTimeout(()=>{
    runtime.stopReason ??= "limited";runtime.limitReason ??= `전체 실행 시간 한도 도달 (${settings.maxSeconds}초)`;
    runtime.controller.abort();
  },options.timeoutMs ?? settings.maxSeconds*1000);
  // Abort stops further model calls/actions at once; the browser stays open so the final screen is kept.
  // Backstop: close it if an in-flight page operation has not returned 15s later.
  let backstop:ReturnType<typeof setTimeout>|undefined;
  const onAbort = () => { runtime.stopReason ??= "stopped"; backstop = setTimeout(()=>void runtime.browser?.close(),15000); };
  runtime.controller.signal.addEventListener("abort",onAbort);
  let page:Page|undefined;
  const capture = async (label:string) => {
    const name = `${label}.png`;
    await page!.screenshot({path:path.join(folder,name)});
    return `/artifacts/${run.id}/${name}`;
  };
  try {
    await mkdir(folder,{recursive:true});
    const url = validateTarget(scenario.url);
    runtime.browser = await (options.launchBrowser?.() ?? chromium.launch({headless:true}));
    const context = await runtime.browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1,recordVideo:{dir:folder,size:{width:1280,height:720}}});
    await context.route("**/*",async route=>{
      const request = route.request();
      if (request.isNavigationRequest() && request.frame()===page?.mainFrame()) {
        try { validateTarget(request.url()); } catch { await route.abort(); return; }
      }
      await route.continue();
    });
    page = await context.newPage();
    page.setDefaultTimeout(12000);
    await (options.navigateTarget ? options.navigateTarget(page,url) : page.goto(url,{waitUntil:"domcontentloaded",timeout:30000}));
    await page.waitForTimeout(1000);
    report.initialScreenshot = await capture("act-initial");

    const agent = new PlaywrightAgent(page,uiTarsActAgentOptions(settings,run,runtime,options.createClient,options.inputGuidance?inputStateGuidance:undefined));
    agent.interface.getElementsNodeTree = async () => { throw new Error("DOM planning is disabled"); };
    const planning = (agent as any).resolveModelRuntime("planning");
    report.sdk = {
      planningModelFamily:planning.config.modelFamily,planningKind:planning.adapter.planning.kind,
      deepLocate:{supportedForAiAct:planning.adapter.planning.supportsActionDeepLocate===true,requested:false},
      planningSlot:planning.config.slot,includeLocateInPlanning:planning.config.slot==="default",
      replanningCycleLimit:(agent as any).resolveReplanningCycleLimit(planning),
    };
    // Midscene feeds a failed locate/action back to the planner and replans (up to 5 errors). Stop instead: no hidden retry.
    let current:Step|undefined;
    const executor = (agent as any).taskExecutor;
    const feedback = executor.setPendingFeedbackMessage.bind(executor);
    executor.setPendingFeedbackMessage = (history:unknown,time:string,body:string) => {
      if (typeof body==="string" && body.startsWith("Error executing running tasks")) {
        report.executionError = body.split("\n")[0].slice(0,500);
        if (current && !current.executed) (current as any).error = report.executionError;
        runtime.stopReason ??= "limited";runtime.limitReason ??= "행동 실행 오류로 중지 (재계획 없음)";
        runtime.controller.abort();
      }
      return feedback(history,time,body);
    };
    agent.interface.beforeInvokeAction = async (name,param) => {
      runtime.controller.signal.throwIfAborted();
      if (run.actions >= settings.maxActions) {
        runtime.stopReason = "limited";runtime.limitReason = `행동 한도 도달 (${settings.maxActions}회)`;
        runtime.controller.abort();throw new Error(runtime.limitReason);
      }
      const before = await capture(`act-${run.steps.length}-before`);
      current = {index:run.steps.length,at:new Date().toISOString(),before,after:before,executed:false,
        plan:{observation:"UI-TARS aiAct 계획 행동",rationale:name,action:{type:"midscene",name,description:name},verdict:"continue",finding:null},
        native:{name,parameters:structuredClone(param)},modelCall:run.calls} as Step;
      run.steps.push(current);run.actions++;
      if (name==="KeyboardPress") {
        const keyName = (param as any)?.keyName;
        if (typeof keyName!=="string") throw new Error("키 이름이 없어 실행하지 않습니다.");
        (current as any).plannedKeyName = keyName;
        // Midscene passes this same param object on to the action call; the model text/history are untouched.
        (param as any).keyName = playwrightKeyName(keyName);
      }
    };
    agent.interface.afterInvokeAction = async (_name,param) => {
      if (!current) return;
      current.executed = true;current.after = await capture(`act-${current.index}-after`);current.native!.parameters = structuredClone(param);
    };

    run.executionPhase = "action";
    try {
      // deepLocate is not passed: vlm-ui-tars reports supportsActionDeepLocate=false and Midscene would ignore it.
      await agent.aiAct(scenario.task,{abortSignal:runtime.controller.signal});
      report.aiAct = {status:"returned"};
    } catch (error:any) {
      report.aiAct = {status:"error",error:String(error?.message ?? error).split("\n")[0].slice(0,500)};
    }
    // Finished is a model declaration only; it is never task success.
    const finished = run.transport.map(t=>(t.parsedOutput as any)?.sdkNormalizedAction as string|undefined).find(a=>a && /\bfinished\(/.test(a));
    report.modelFinished = finished ? {declared:true,action:finished.slice(finished.indexOf("finished(")).slice(0,500)} : {declared:false};

    const ended = !!(runtime.stopReason || runtime.providerFailure || report.aiAct.status==="error");
    if (!ended && run.calls < settings.maxCalls) {
      run.executionPhase = "input-confirmation";
      try {
        const result:any = await agent.aiAssert(`원래 업무: ${scenario.task}. 요구 결과: ${scenario.expected}. 현재 화면에서 모든 요구 결과가 실제로 보인다. 입력 중인 미리보기와 제출 완료는 구분하고, 빈 필드의 placeholder는 입력값으로 취급하지 않는다.`,undefined,{domIncluded:false,screenshotIncluded:true,keepRawResponse:true,abortSignal:runtime.controller.signal} as any);
        // Midscene turns a missing/unparseable data-json into pass:false; classify it from the actual response instead.
        const record = run.transport.at(-1), format = record?.responseFormat;
        const parsed = !!format && (format.hasDataJson || format.normalizedPlainJson) && typeof result?.pass==="boolean" && !/parse error/i.test(String(result?.message ?? ""));
        report.assertion = {status:!parsed?"format-failure":result.pass?"pass":"fail",reason:String(result?.thought ?? result?.message ?? "").slice(0,1000),
          raw:(record?.parsedOutput as any)?.raw,call:run.calls,screenshot:record?.screenshot};
      } catch (error:any) {
        report.assertion = {status:runtime.providerFailure?"provider-failure":"format-failure",error:String(error?.message ?? error).split("\n")[0].slice(0,300),call:run.calls};
      }
    } else if (!ended) report.assertion = {status:"not-run",reason:"모델 호출 한도"};
    report.finalScreenshot = await capture("act-final");
    const video = page.video();
    await context.close();
    if (video) report.video = `/artifacts/${run.id}/${path.basename(await video.path())}`;
  } catch (error:any) {
    report.error ??= String(error?.message ?? error).split("\n")[0].slice(0,500);
  } finally {
    clearTimeout(deadline);clearTimeout(backstop);
    runtime.controller.signal.removeEventListener("abort",onAbort);
    await runtime.browser?.close().catch(()=>{});
    run.endedAt = new Date().toISOString();
  }
  const typedValues = run.steps.filter(s=>s.native?.name==="Input").map(s=>String((s.native!.parameters as any)?.value ?? ""));
  report.inputs.typedValues = typedValues;
  report.inputs.requiredTyped = Object.fromEntries(scenario.requiredInputs.map(v=>[v,typedValues.some(t=>nfc(t)===nfc(v))]));
  report.inputs.otherTypedValues = typedValues.filter(t=>!scenario.requiredInputs.some(v=>nfc(v)===nfc(t)));
  // Run outcome: only how the run ended. Never "passed": order/expected-result need independent review.
  report.status = runtime.stopReason==="stopped" ? "stopped" : runtime.stopReason==="limited" ? "limited-incomplete"
    : runtime.providerFailure || report.aiAct.status!=="returned" || report.error ? "failed" : "model-finished-needs-review";
  report.reason = runtime.limitReason ?? runtime.providerFailure?.code ?? report.aiAct.error ?? report.error;
  report.counts = {calls:run.calls,actions:run.actions,executedActions:run.steps.filter(s=>s.executed).length,tokens:run.tokens,cost:run.cost,startedAt:run.startedAt,endedAt:run.endedAt};
  report.steps = run.steps.map(s=>({index:s.index,name:s.native?.name,parameters:s.native?.parameters,executed:s.executed,plannedKeyName:(s as any).plannedKeyName,error:(s as any).error,before:s.before,after:s.after,afterModelCall:(s as any).modelCall}));
  // Raw model responses and the exact request images; keys and base64 never stored here.
  // transport[].screenshot is the first image of the request (the oldest history image once UI-TARS history grows);
  // currentScreenshot is the last image, the screen the model acted on.
  report.transport = run.transport.map(t=>({...t,currentScreenshot:t.screenshots?.at(-1)}));
  report.transportNote = "screenshot=요청의 첫 이미지(이력이 쌓이면 가장 오래된 화면), currentScreenshot=요청의 마지막 이미지(모델이 판단한 현재 화면)";
  report.sourceVersion = run.sourceVersion;
  await mkdir(folder,{recursive:true});
  await writeFile(path.join(folder,"ACT_EXPERIMENT.json"),JSON.stringify(report,null,2));
  return report;
}
