import {it,expect} from "vitest";
import {chromium} from "playwright";
import {PlaywrightAgent} from "@midscene/web/playwright";
import {defaults,inputSchema} from "./domain";
import {uiTarsModelConfig,normalizeUiTarsAction} from "./ui-tars";
import {instrumentClient,makeRun} from "./runner";

it("routes public UI-TARS 1.5 actions through its pixel parser and Midscene, and keeps query/input on the same model",async()=>{
 const browser=await chromium.launch();
 try {
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  await page.setContent(`<label style="position:absolute;left:400px;top:400px">이메일<input id="email" style="display:block;width:200px;height:40px"></label><button style="position:absolute;left:900px;top:500px;width:120px;height:80px" onclick="this.textContent='완료'">확인</button><div hidden>PRIVATE_DOM_SENTINEL</div>`);
  const settings={...defaults,apiKey:"local-stub",maxCalls:8,maxTokens:4096};
  const run=makeRun(inputSchema.parse({mode:"autonomous",url:"http://127.0.0.1:4311/store/a"}),settings);
  let planning=0;let stage="click";const requests:any[]=[];
  const agent=new PlaywrightAgent(page,{generateReport:false,persistExecutionDump:false,autoPrintReportMsg:false,forceChromeSelectRendering:false,
   modelConfig:{MIDSCENE_MODEL_API_KEY:"local-stub",MIDSCENE_MODEL_BASE_URL:"https://stub.invalid/v1",MIDSCENE_MODEL_NAME:settings.model,MIDSCENE_MODEL_RETRY_COUNT:0,...uiTarsModelConfig(settings)},
   createOpenAIClient:async()=>instrumentClient({chat:{completions:{create:async(body:any)=>{
    const planningRequest=JSON.stringify(body).includes("## Action Space");
    requests.push({planning:planningRequest,body});
    expect(body.model).toBe("bytedance/ui-tars-1.5-7b");expect(body.max_tokens).toBe(2048);
    expect(JSON.stringify(body)).not.toContain("PRIVATE_DOM_SENTINEL");
    const content=planningRequest ? (++planning===1 ? "Thought: 확인 버튼 클릭\nAction: click(start_box='(966,546)')" : "Thought: 클릭 완료\nAction: finished(content='완료')")
     : JSON.stringify(body).includes("bbox_2d") ? (stage==="click" ? '<data-json>{"bbox_2d":[900,500,1020,580]}</data-json>' : '<data-json>{"bbox_2d":[400,420,600,462]}</data-json>')
     : '<data-json>"test@example.com"</data-json>';
    return {model:settings.model,choices:[{message:{role:"assistant",content},finish_reason:"stop"}],usage:{total_tokens:1}};
   }}}},run,{controller:new AbortController()})});
  agent.interface.getElementsNodeTree=async()=>{throw Error("DOM forbidden")};
  await agent.aiAct("확인 버튼을 클릭한다.");
  expect(await page.getByRole("button").textContent()).toBe("완료");
  expect(run.transport[0].parsedOutput).toMatchObject({raw:expect.stringContaining("966,546"),sdkNormalizedAction:expect.stringContaining("750")});
  stage="input";
  await agent.aiInput("이메일 입력칸",{value:"test@example.com",mode:"replace"});
  expect(await page.locator("#email").inputValue()).toBe("test@example.com");
  expect(await agent.aiString("입력된 이메일",{domIncluded:false})).toBe("test@example.com");
  expect(requests.some(r=>r.planning)).toBe(true);
  const screenshot=await page.screenshot();const messages=[{content:[{type:"image_url",image_url:{url:`data:image/png;base64,${screenshot.toString("base64")}`}}]}];
  await expect(normalizeUiTarsAction("Action: click(start_box='(9999,500)')",messages)).rejects.toThrow("화면 밖");
  expect(await normalizeUiTarsAction("Action: type(content='a@example.com')",messages)).toContain("type(content='a@example.com')");
 }finally{await browser.close();}
},30000);
