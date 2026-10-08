import {chromium} from "playwright";
import {PlaywrightAgent} from "@midscene/web/playwright";
import {createHash} from "node:crypto";
import type {z} from "zod";
import {inputSchema,type Settings} from "./domain";
import {makeRun,midsceneAgentOptions,type Runtime} from "./runner";
import {workflowDemand,workflowPrompt,workflowSchema} from "./midscene-workflow";

// Experiment A: compare the app's string DATA_DEMAND with an object DATA_DEMAND on one stored
// screenshot. One request per variant, no retries, no page actions. Not part of the app's run path.
export type Variant = "string" | "object";
export type Obligation = {id:string;pattern:string;kinds:("input"|"select"|"action")[]};
// Required work in the stored failing task (runs e5336604 / 150bf07d). Heuristic text match over each
// step's target/value/description; the raw steps are kept for human review.
export const storedTask = "Select Red mug, quantity 2. Enter a synthetic recipient and email, confirm the simulated order and review its appearance, receipt and community chart.";
export const storedObligations: Obligation[] = [
  {id:"red-mug",pattern:"(red|빨간|레드)[\\s\\S]*(mug|머그)|(mug|머그)[\\s\\S]*(red|빨간|레드)",kinds:["select","action","input"]},
  {id:"quantity-2",pattern:"(quantity|수량)[\\s\\S]*\\b2\\b|\\b2\\b[\\s\\S]*(quantity|수량)",kinds:["input","select","action"]},
  {id:"recipient",pattern:"recipient|받는|수령|수취|이름|name",kinds:["input"]},
  {id:"email",pattern:"e-?mail|이메일",kinds:["input"]},
  {id:"confirm-order",pattern:"confirm|확정|주문하기|주문 완료|submit|제출|place order",kinds:["action"]},
];
const sha256 = (bytes:Buffer|string) => createHash("sha256").update(bytes).digest("hex");
const imageBytes = (url:string) => Buffer.from(url.slice(url.indexOf(",")+1),"base64");

// Keys and image base64 never leave this function: images become hash/size, the key is not in messages.
export function sanitizeMessages(messages:any[]) {
  return messages.map(m=>({role:m.role,content:typeof m.content==="string"?m.content:m.content.map((b:any)=>b.type==="image_url"
    ?{type:"image_url",sha256:sha256(imageBytes(b.image_url.url)),bytes:imageBytes(b.image_url.url).length}:b)}));
}
// Two requests may differ only in the final user <DATA_DEMAND> section that Midscene's extractDataQueryPrompt
// writes as "<DATA_DEMAND>\n…\n</DATA_DEMAND>"; everything else (system prompt, image hash, limits) must match.
export function splitDemand(body:any) {
  const text = JSON.stringify(body), open = "<DATA_DEMAND>\\n", close = "\\n</DATA_DEMAND>";
  const start = text.lastIndexOf(open), end = text.lastIndexOf(close);
  if (start < 0 || end < start) return;
  return {rest:text.slice(0,start+open.length)+text.slice(end),demand:text.slice(start+open.length,end)};
}
export function differsOnlyInDemand(a:any,b:any) {
  const [x,y] = [splitDemand(a),splitDemand(b)];
  return !!x && !!y && x.rest === y.rest && x.demand !== y.demand;
}
export function checkObligations(steps:any[], obligations:Obligation[]) {
  return obligations.map(o=>{
    const re = new RegExp(o.pattern,"i");
    const index = steps.findIndex(s=>o.kinds.includes(s.kind) && re.test([s.target,s.value,s.description].filter(Boolean).join("\u0001")));
    return {id:o.id,covered:index>=0,...(index>=0?{step:index}:{})};
  });
}

export async function compareDemands(options:{image:Buffer;input:z.input<typeof inputSchema>;settings:Settings;createClient:(settings:Settings)=>any;variants?:Variant[];obligations?:Obligation[];timeoutMs?:number}) {
  const {image,settings,createClient} = options;
  const input = inputSchema.parse({...options.input,mode:"scenario"});
  const variants = options.variants ?? ["string","object"];
  if (variants.length > 2) throw new Error("최대 2개 요청");
  const browser = await chromium.launch({headless:true});
  const results:any[] = [];
  let providerCalls = 0;
  try {
    for (const variant of variants) {
      const runSettings = {...settings,maxCalls:1,maxActions:0};
      const run = makeRun(input,runSettings);
      const runtime:Runtime = {controller:new AbortController()};
      const timer = setTimeout(()=>runtime.controller.abort(),options.timeoutMs ?? 60000);
      const result:any = {variant,request:undefined,response:undefined,aiQuery:{ok:false},workflowSchema:{ok:false},obligations:[]};
      let pageActions = 0;
      const guardedClient = (s:Settings) => {
        const client = createClient(s);
        const original = client.chat.completions.create.bind(client.chat.completions);
        client.chat.completions.create = async (body:any, opts:any) => {
          if (++providerCalls > 2) throw new Error("실험 호출 한도(2) 초과");
          const sent = body.messages.flatMap((m:any)=>Array.isArray(m.content)?m.content.filter((b:any)=>b.type==="image_url"):[]);
          result.request = {model:body.model,max_tokens:body.max_tokens,stream:body.stream,provider:body.provider,body:{...body,messages:sanitizeMessages(body.messages)},
            imageUnchanged:sent.length===1 && sha256(imageBytes(sent[0].image_url.url))===sha256(image)};
          const response = await original(body,opts);
          const choice = response.choices?.[0];
          result.response = {id:response.id,model:response.model,provider:response.provider,raw:choice?.message?.content,finishReason:choice?.finish_reason,usage:response.usage};
          return response;
        };
        return client;
      };
      try {
        const page = await browser.newPage({viewport:{width:1280,height:720}});
        await page.setContent("<p>stored screenshot experiment</p>");
        const agent = new PlaywrightAgent(page,midsceneAgentOptions(runSettings,run,runtime,guardedClient));
        agent.interface.screenshotBase64 = async () => `data:image/jpeg;base64,${image.toString("base64")}`;
        agent.interface.getElementsNodeTree = async () => { throw new Error("DOM forbidden"); };
        agent.interface.beforeInvokeAction = async () => { pageActions++; throw new Error("page action forbidden"); };
        const demand = variant === "string"
          ? workflowPrompt(input.task,input.expected,settings.agentInstructions,input.url)
          : workflowDemand(input.task,input.expected,settings.agentInstructions,input.url);
        result.demand = demand;
        try {
          const data = await agent.aiQuery(demand as any,{domIncluded:false,screenshotIncluded:true,abortSignal:runtime.controller.signal});
          result.aiQuery = {ok:true,data};
          const parsed = workflowSchema.safeParse(data);
          result.workflowSchema = parsed.success ? {ok:true,steps:parsed.data.steps}
            : {ok:false,issues:parsed.error.issues.slice(0,5).map(i=>({path:i.path.join("."),message:i.message}))};
          if (parsed.success) {
            result.obligations = checkObligations(parsed.data.steps,options.obligations ?? []);
            // Values the model typed itself (not present in the task text) are recorded, not judged.
            result.inventedValues = parsed.data.steps.flatMap(s=>s.kind!=="action" && s.value && !input.task.includes(s.value) ? [s.value] : []);
          }
        } catch (error:any) {
          result.aiQuery = {ok:false,error:runtime.providerFailure?.code ?? (/Missing required field: data-json/.test(String(error?.message)) ? "MODEL_STRUCTURED_OUTPUT_MISSING" : String(error?.name ?? "Error"))};
        }
      } finally {
        clearTimeout(timer);
        Object.assign(result,{calls:run.calls,pageActions,actions:run.actions,transport:run.transport.map(({screenshot:_s,screenshots:_ss,...t})=>t)});
        results.push(result);
      }
    }
  } finally { await browser.close(); }
  const [a,b] = results;
  return {providerCalls,results,demandOnlyDifference:a?.request && b?.request ? differsOnlyInDemand(a.request.body,b.request.body) : undefined};
}
