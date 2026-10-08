import {it,expect} from "vitest";
import {chromium} from "playwright";
import {defaults} from "./domain";
import {workflowPrompt} from "./midscene-workflow";
import {checkObligations,compareDemands,differsOnlyInDemand,storedObligations,storedTask} from "./plan-demand-experiment";

const input = {mode:"scenario" as const,url:"http://127.0.0.1:4311/store/d",task:storedTask,expected:"Product appearance matches selection."};
const settings = {...defaults,apiKey:"mock-key-sentinel",model:"bytedance/ui-tars-1.5-7b",family:"ui-tars-1.5" as const,maxTokens:1536};
async function jpeg() {
  const browser = await chromium.launch();
  try { const page = await browser.newPage({viewport:{width:1280,height:720}}); await page.setContent("<h1>ATELIER GOODS</h1>"); return await page.screenshot({type:"jpeg"}); }
  finally { await browser.close(); }
}
const reply = (content:string,finish="stop") => () => {
  const bodies:any[] = [];
  // A fresh client per agent, like providerClient; the run wrappers patch it in place.
  return {bodies,client:()=>({chat:{completions:{create:async(body:any)=>{bodies.push(body);return {id:"mock",model:body.model,choices:[{index:0,finish_reason:finish,message:{role:"assistant",content}}],usage:{total_tokens:1}};}}}})};
};

it("string and object requests go through the app's SDK path and differ only in DATA_DEMAND", async () => {
  const image = await jpeg();
  const steps = [{kind:"select",target:"상품",value:"Red mug",description:"Red mug 선택"},{kind:"input",target:"수량",value:"2",description:"수량 2"},{kind:"input",target:"받는 분",value:"홍길동",description:"수령인 입력"},{kind:"input",target:"이메일",value:"a@b.c",description:"이메일 입력"},{kind:"action",description:"주문 확정 클릭"}];
  const mock = reply(`<observation>x</observation>\n<data-json>${JSON.stringify({steps})}</data-json>`)();
  const result = await compareDemands({image,input,settings,createClient:mock.client,obligations:storedObligations});
  expect(result.providerCalls).toBe(2);expect(result.demandOnlyDifference).toBe(true);
  for (const r of result.results) {
    expect(r).toMatchObject({calls:1,pageActions:0,actions:0,aiQuery:{ok:true},workflowSchema:{ok:true}});
    expect(r.request.imageUnchanged).toBe(true);expect(r.request.max_tokens).toBe(1536);expect(r.request.model).toBe(settings.model);
    expect(r.obligations.every((o:any)=>o.covered)).toBe(true);
    expect(r.inventedValues).toEqual(["홍길동","a@b.c"]);
  }
  expect(result.results[0].demand).toBe(workflowPrompt(input.task,input.expected,"",input.url));
  expect(JSON.stringify(mock.bodies[1].messages)).toContain('\\"steps\\": \\"Array<');
  const serialized = JSON.stringify(result);
  expect(serialized).not.toContain("base64,");expect(serialized).not.toContain("mock-key-sentinel");
}, 60000);

for (const [name,content,finish,code] of [
  ["stored missing data-json","<observation>주문 화면</observation>\n<errors></errors>","stop","MODEL_STRUCTURED_OUTPUT_MISSING"],
  ["token-limit plan",'<data-json>{"steps":[{"kind":"action","description":"주문 확정"}]}</data-json>',"length","MODEL_OUTPUT_TRUNCATED"],
] as const) it(`${name}: recorded as a failed variant with exactly one call each and no schema pass`, async () => {
  const mock = reply(content,finish)();
  const result = await compareDemands({image:await jpeg(),input,settings,createClient:mock.client,obligations:storedObligations});
  expect(mock.bodies).toHaveLength(2);
  for (const r of result.results) {
    expect(r).toMatchObject({calls:1,pageActions:0,aiQuery:{ok:false,error:code},workflowSchema:{ok:false}});
    expect(r.response).toMatchObject({raw:content,finishReason:finish});
  }
}, 60000);

it("difference check rejects any change outside the demand, and obligations flag missing work", () => {
  const body = (demand:string,image="h1",system="s") => ({model:"m",max_tokens:1,messages:[{role:"system",content:`${system} <DATA_DEMAND>\nexample\n</DATA_DEMAND>`},{role:"user",content:[{type:"image_url",sha256:image},{type:"text",text:`<DATA_DEMAND>\n${demand}\n</DATA_DEMAND>`}]}]});
  expect(differsOnlyInDemand(body("a"),body("b"))).toBe(true);
  expect(differsOnlyInDemand(body("a"),body("a"))).toBe(false);
  expect(differsOnlyInDemand(body("a"),body("b","h2"))).toBe(false);
  expect(differsOnlyInDemand(body("a"),body("b","h1","t"))).toBe(false);
  const covered = checkObligations([{kind:"select",target:"상품",value:"빨간 머그",description:"선택"},{kind:"input",target:"수량",value:"2",description:"입력"},{kind:"input",target:"받는 분",value:"x",description:"입력"},{kind:"action",description:"주문 확정"}],storedObligations);
  expect(Object.fromEntries(covered.map(o=>[o.id,o.covered]))).toEqual({"red-mug":true,"quantity-2":true,recipient:true,email:false,"confirm-order":true});
});
