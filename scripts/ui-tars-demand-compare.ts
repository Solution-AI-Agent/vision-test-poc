// Experiment A: string vs object DATA_DEMAND for the stored UI-TARS plan failure.
// Usage (from the checkout that holds .data/ and artifacts/):
//   npx tsx scripts/ui-tars-demand-compare.ts                 # mock provider only, no network
//   OPENROUTER_API_KEY=... npx tsx scripts/ui-tars-demand-compare.ts --live   # mock preflight, then max 2 paid calls
// Options: --run <id> (default e5336604-…), --runs <path to runs.json>, --image <stored request jpg>
import {readFile,writeFile,mkdir} from "node:fs/promises";
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import path from "node:path";
import {defaults,type Settings} from "../apps/platform/server/domain";
import {providerClient} from "../apps/platform/server/runner";
import {compareDemands,storedObligations,storedTask} from "../apps/platform/server/plan-demand-experiment";

const arg = (name:string) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i+1] : undefined; };
const live = process.argv.includes("--live");
const runId = arg("--run") ?? "e5336604-1853-42e7-b644-2d5c4b6715a9";
const runsPath = arg("--runs") ?? ".data/runs.json";
const imagePath = arg("--image") ?? `artifacts/${runId}/model-request-2.jpg`;
const sha256 = (b:Buffer|string) => createHash("sha256").update(b).digest("hex");

const stored = (JSON.parse(await readFile(runsPath,"utf8")) as any[]).find(r=>r.id===runId);
if (!stored) throw new Error(`run ${runId} not found in ${runsPath}`);
const planRecord = stored.transport?.find((t:any)=>t.phase==="model-plan");
if (!planRecord || path.basename(planRecord.screenshot) !== path.basename(imagePath)) throw new Error("image is not the stored model-plan request image");
if (stored.input.task !== storedTask) throw new Error("stored task differs from the task the obligations were written for");
const image = await readFile(imagePath);
const {model,family,maxTokens,agentInstructions,providerSort} = stored.settings;
const base:Settings = {...defaults,model,family,maxTokens,agentInstructions,providerSort,maxCalls:1,maxSeconds:60};
const input = {mode:"scenario" as const,url:stored.input.url,task:stored.input.task,expected:stored.input.expected};
const source = {
  commit:execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim(),
  dirty:!!execFileSync("git",["status","--porcelain","--","apps","scripts"],{encoding:"utf8"}).trim(),
};

// Mock provider: same SDK request path, no network. Confirms the two requests differ only in DATA_DEMAND.
const mockClient = () => ({chat:{completions:{create:async(body:any)=>({id:"mock",model:body.model,provider:"mock",
  choices:[{index:0,finish_reason:"stop",message:{role:"assistant",content:'<observation>mock</observation>\n<data-json>{"steps":[{"kind":"action","description":"mock"}]}</data-json>'}}],
  usage:{prompt_tokens:0,completion_tokens:0,total_tokens:0}})}}});
const preflight = await compareDemands({image,input,settings:{...base,apiKey:"mock-no-network"},createClient:mockClient as any,obligations:storedObligations});
const ok = preflight.demandOnlyDifference === true && preflight.providerCalls === 2 && preflight.results.every(r=>r.request?.imageUnchanged && r.calls===1 && r.pageActions===0);
const summary = (r:any) => ({variant:r.variant,calls:r.calls,pageActions:r.pageActions,finishReason:r.response?.finishReason,completionTokens:r.response?.usage?.completion_tokens,
  aiQuery:r.aiQuery.ok?"ok":r.aiQuery.error,workflowSchema:r.workflowSchema.ok,steps:r.workflowSchema.steps?.length,
  obligations:Object.fromEntries((r.obligations??[]).map((o:any)=>[o.id,o.covered])),inventedValues:r.inventedValues});
console.log(JSON.stringify({mode:"mock-preflight",ok,demandOnlyDifference:preflight.demandOnlyDifference,providerCalls:preflight.providerCalls,results:preflight.results.map(summary)}));
if (!ok) throw new Error("mock preflight failed; no live call made");

const folder = `artifacts/experiments/ui-tars-demand-${new Date().toISOString().replace(/[:.]/g,"-")}`;
await mkdir(folder,{recursive:true});
const protocol = {source,runId,runsPath,image:{path:imagePath,sha256:sha256(image),bytes:image.length},model,family,maxTokens,variants:["string","object"],limits:{providerCalls:2,retries:0,pageActions:0},obligations:storedObligations};
let output:any = {protocol,preflight,mode:"mock"};
if (live) {
  if (source.dirty) throw new Error("commit apps/ and scripts/ before live calls");
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY unavailable");
  const result = await compareDemands({image,input,settings:{...base,apiKey:key},createClient:providerClient,obligations:storedObligations});
  output = {...output,mode:"live",live:result};
  console.log(JSON.stringify({mode:"live",providerCalls:result.providerCalls,demandOnlyDifference:result.demandOnlyDifference,results:result.results.map(summary)}));
}
const text = JSON.stringify(output,null,2);
if (/base64,|sk-or-/.test(text) || (process.env.OPENROUTER_API_KEY && text.includes(process.env.OPENROUTER_API_KEY))) throw new Error("refusing to write: image base64 or key-like text in result");
await writeFile(`${folder}/RESULT.json`,text);
console.log(folder);
