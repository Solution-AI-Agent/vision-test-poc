// Experiment C: UI-TARS direct agent.aiAct(task) on Store D with the user's original order scenario.
// Usage (from this worktree, with the sample site on 127.0.0.1:4311):
//   npx tsx scripts/ui-tars-act-experiment.ts           # mock provider preflight only, no network/charges
//   npx tsx scripts/ui-tars-act-experiment.ts --live    # mock preflight, then ONE paid run (≤20 calls, ≤12 actions, ≤180s)
// The live key is read from OPENROUTER_API_KEY or this worktree's .env. Ctrl+C stops the run (recorded as stopped).
import {existsSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {defaults,type Settings} from "../apps/platform/server/domain";
import {providerClient} from "../apps/platform/server/runner";
import {experimentLimits,orderScenario,runUiTarsActExperiment} from "../apps/platform/server/ui-tars-act-experiment";

const live = process.argv.includes("--live");
const base:Settings = {...defaults,...experimentLimits};
const summary = (r:any) => ({status:r.status,reason:r.reason,aiAct:r.aiAct.status,modelFinished:r.modelFinished.declared,assertion:r.assertion.status,
  calls:r.counts.calls,actions:r.counts.actions,executedActions:r.counts.executedActions,cost:r.counts.cost,inputs:r.inputs.requiredTyped,
  otherTypedValues:r.inputs.otherTypedValues,sdk:r.sdk,result:`artifacts/${r.runId}/ACT_EXPERIMENT.json`,finalScreenshot:r.finalScreenshot,video:r.video});

// Mock provider on the real Store D page: proves the request is a UI-TARS action-planning request with the
// verbatim task and one image, no JSON workflow plan and no DOM. The mock declares finished without acting.
const bodies:any[] = [];
const mockClient = () => ({chat:{completions:{create:async(body:any)=>{
  bodies.push(body);
  const planning = JSON.stringify(body.messages).includes("## Action Space");
  return {id:"mock",model:body.model,choices:[{index:0,finish_reason:"stop",message:{role:"assistant",content:planning
    ?"Thought: mock\nAction: finished(content='mock')":'<thought>mock</thought>\n<data-json>{"StatementIsTruthy": false}</data-json>'}}],usage:{total_tokens:0}};
}}}});
const preflight = await runUiTarsActExperiment({settings:{...base,apiKey:"mock-no-network"},createClient:mockClient});
const planning = bodies.filter(b=>JSON.stringify(b.messages).includes("## Action Space"));
const text = JSON.stringify(planning[0]?.messages ?? "");
const checks = {
  ranToFinish:preflight.status==="model-finished-needs-review",
  onePlanningRequest:planning.length===1,
  verbatimTask:text.includes(JSON.stringify(orderScenario.task).slice(1,-1)),
  noWorkflowPlanRequest:!JSON.stringify(bodies).includes("MIDSCENE_WORKFLOW"),
  singleImage:planning[0]?.messages.flatMap((m:any)=>Array.isArray(m.content)?m.content:[]).filter((b:any)=>b.type==="image_url").length===1,
  modelAndTokens:planning[0]?.model===base.model && planning[0]?.max_tokens===base.maxTokens,
  ownPlannedPoint:preflight.sdk.includeLocateInPlanning===true,
  finishedIsNotSuccess:preflight.orderCompletion.status==="needs-independent-review",
};
console.log(JSON.stringify({mode:"mock-preflight",checks,...summary(preflight)},null,1));
if (!Object.values(checks).every(Boolean)) throw new Error("mock preflight failed; no live call made");
if (!live) process.exit(0);

const dirty = execFileSync("git",["status","--porcelain","--","apps","scripts"],{encoding:"utf8"}).trim();
if (dirty) throw new Error("commit apps/ and scripts/ before live calls");
if (!process.env.OPENROUTER_API_KEY && existsSync(".env")) process.loadEnvFile(".env");
const key = process.env.OPENROUTER_API_KEY;
if (!key) throw new Error("OPENROUTER_API_KEY unavailable (env or .env)");
const controller = new AbortController();
process.once("SIGINT",()=>controller.abort());
const result = await runUiTarsActExperiment({settings:{...base,apiKey:key},createClient:providerClient,controller});
if (JSON.stringify(result).includes(key)) throw new Error("key found in result");
console.log(JSON.stringify({mode:"live",...summary(result)},null,1));
