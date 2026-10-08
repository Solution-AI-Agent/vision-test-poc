import {it,expect} from "vitest";
import {rm} from "node:fs/promises";
import path from "node:path";
import {defaults,inputSchema,type Settings} from "./domain";
import {visualCriteria} from "./visual-qa";
import {artifactsDir,makeRun,runVision} from "./runner";

// Verbatim model-plan content of stored runs e5336604-1853-42e7-b644-2d5c4b6715a9 (ui-tars-1.5)
// and 150bf07d-c806-4ec0-b565-5b16a4f8ffba (vlm-ui-tars): finish_reason=stop, 109 completion tokens.
const storedPlanResponse = "<observation>이 화면은 ATELIER GOODS의 가상 주문 시스템입니다. 사용자는 빨간 머그를 선택하고 수량을 2개로 설정해야 합니다. 수령인과 이메일 주소를 입력해야 하며, 주문을 제출하고 결과를 확인해야 합니다. 화면은 주문 과정을 단계별로 안내하며, 각 단계에서 필요한 정보를 입력해야 합니다.</observation>\n<errors></errors>";
// Same runs' visual-review output; only its parsed form was stored, so this envelope is reconstructed.
const visualResponse = `<data-json>${JSON.stringify({checks:visualCriteria.map(criterion=>({criterion,result:"not-applicable",evidence:"replay"})),issues:[]})}</data-json>`;
const steps = [{kind:"select",target:"상품 선택",value:"빨간 머그",description:"빨간 머그 선택"},{kind:"input",target:"수량",value:"2",description:"수량 2 입력"}];
const truncatedPlan = `<observation>주문 화면</observation>\n<data-json>{"steps":[${JSON.stringify(steps[0])},{"kind":"input","target":"수`;

type Reply = {content:string;finish?:string};
async function replay(family:Settings["family"], replies:Record<string,Reply>, mode:"scenario"|"autonomous"="scenario") {
  const settings = {...defaults,apiKey:"local-replay",model:"bytedance/ui-tars-1.5-7b",family,maxTokens:1536};
  const run = makeRun(inputSchema.parse({mode,url:"http://127.0.0.1:4311/store/d",task:"빨간 머그를 선택하고 수량을 2로 입력한다.",expected:"주문 요약에 수량 2가 보인다."}),settings);
  const seen:string[] = [];
  try {
    await runVision(run,settings,{controller:new AbortController()},async()=>{},{
      navigateTarget:page=>page.setContent("<h1>ATELIER GOODS</h1><button>빨간 머그</button><label>수량<input value=\"1\"></label>"),
      createClient:()=>({chat:{completions:{create:async(body:any)=>{
        const text = JSON.stringify(body.messages);
        const key = ["VISUAL_QA_REVIEW_V1","MIDSCENE_WORKFLOW","CONTROL_OBSERVATION","Choose ONE concrete"].find(k=>text.includes(k)) ?? "other";
        seen.push(key);
        const reply = replies[key];
        if (!reply) throw new Error(`unexpected request ${key}`);
        return {id:`replay-${seen.length}`,model:settings.model,choices:[{index:0,finish_reason:reply.finish ?? "stop",message:{role:"assistant",content:reply.content}}],usage:{prompt_tokens:10,completion_tokens:109,total_tokens:119}};
      }}}}),
    });
  } finally { await rm(path.join(artifactsDir,run.id),{recursive:true,force:true}); }
  return {run,seen};
}

for (const family of ["ui-tars-1.5","vlm-ui-tars"] as const) {
  it(`${family}: stored plan without data-json is a complete-but-missing structured result, not truncation`, async () => {
    const {run,seen} = await replay(family,{VISUAL_QA_REVIEW_V1:{content:visualResponse},MIDSCENE_WORKFLOW:{content:storedPlanResponse}});
    expect(seen).toEqual(["VISUAL_QA_REVIEW_V1","MIDSCENE_WORKFLOW"]); // no hidden retry
    expect(run.status).toBe("failed");
    expect(run.diagnostic).toMatchObject({code:"MODEL_STRUCTURED_OUTPUT_MISSING",phase:"model-plan"});
    expect(run.transport[1].parsedOutput).toEqual({raw:storedPlanResponse});
    expect(run.transport[1].responseFormat).toMatchObject({finishReason:"stop",hasDataJson:false,normalizedPlainJson:false});
    expect(run.workflow).toBeUndefined();expect(run.actions).toBe(0);expect(run.calls).toBe(2);
  }, 30000);
}

it("a plan cut at the token limit fails as truncation instead of being repaired into fewer steps", async () => {
  const {run,seen} = await replay("ui-tars-1.5",{VISUAL_QA_REVIEW_V1:{content:visualResponse},MIDSCENE_WORKFLOW:{content:truncatedPlan,finish:"length"}});
  expect(seen).toEqual(["VISUAL_QA_REVIEW_V1","MIDSCENE_WORKFLOW"]);
  expect(run.diagnostic).toMatchObject({code:"MODEL_OUTPUT_TRUNCATED",phase:"model-plan"});
  expect(run.transport[1].parsedOutput).toEqual({raw:truncatedPlan});
  expect(run.transport[1].responseFormat?.finishReason).toBe("length");
  expect(run.workflow).toBeUndefined();expect(run.actions).toBe(0);expect(run.steps).toEqual([]);
}, 30000);

it("a token-limit response with a closed, schema-valid plan still performs zero actions", async () => {
  const closed = `<data-json>${JSON.stringify({steps})}</data-json>`;
  const {run,seen} = await replay("vlm-ui-tars",{VISUAL_QA_REVIEW_V1:{content:visualResponse},MIDSCENE_WORKFLOW:{content:closed,finish:"length"}});
  expect(seen).toEqual(["VISUAL_QA_REVIEW_V1","MIDSCENE_WORKFLOW"]);
  expect(run.diagnostic?.code).toBe("MODEL_OUTPUT_TRUNCATED");
  expect(run.workflow).toBeUndefined();expect(run.actions).toBe(0);expect(run.steps).toEqual([]);
}, 30000);

it("a truncated visual review also stops the run rather than becoming an inconclusive audit", async () => {
  const {run,seen} = await replay("ui-tars-1.5",{VISUAL_QA_REVIEW_V1:{content:visualResponse.slice(0,80),finish:"length"}});
  expect(seen).toEqual(["VISUAL_QA_REVIEW_V1"]);
  expect(run.diagnostic).toMatchObject({code:"MODEL_OUTPUT_TRUNCATED",phase:"visual-review"});
}, 30000);

it("a complete plan keeps exactly the model's steps, and control observation shares the missing-result diagnosis", async () => {
  const {run,seen} = await replay("ui-tars-1.5",{VISUAL_QA_REVIEW_V1:{content:visualResponse},MIDSCENE_WORKFLOW:{content:`<observation>주문 화면</observation>\n<data-json>${JSON.stringify({steps})}</data-json>`},CONTROL_OBSERVATION:{content:"<observation>상품 버튼</observation>\n<errors></errors>"}});
  expect(seen).toEqual(["VISUAL_QA_REVIEW_V1","MIDSCENE_WORKFLOW","CONTROL_OBSERVATION"]);
  expect(run.workflow!.steps.map(({status:_s,...step})=>step)).toEqual(steps);
  expect(run.workflow!.steps[0].status).toBe("running");
  expect(run.diagnostic).toMatchObject({code:"MODEL_STRUCTURED_OUTPUT_MISSING",phase:"model-plan"});
  expect(run.actions).toBe(0);
}, 30000);

it("autonomous goal selection shares the same diagnosis", async () => {
  const {run,seen} = await replay("vlm-ui-tars",{VISUAL_QA_REVIEW_V1:{content:visualResponse},"Choose ONE concrete":{content:"<observation>주문 화면</observation>"}},"autonomous");
  expect(seen).toEqual(["VISUAL_QA_REVIEW_V1","Choose ONE concrete"]);
  expect(run.diagnostic).toMatchObject({code:"MODEL_STRUCTURED_OUTPUT_MISSING",phase:"goal-selection"});
  expect(run.goals ?? []).toEqual([]);
}, 30000);
