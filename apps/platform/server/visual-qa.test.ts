import { it, expect } from "vitest";
import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { visualCriteria, visualSchema, visualPrompt, visualSummary, matchingIssue } from "./visual-qa";
import { defaults, inputSchema } from "./domain";
import { makeRun, runVision, artifactsDir } from "./runner";
const issue = { criterion: "geometry" as const, title: "압축된 주문 요약", observed: "문자와 금액이 세로로 압축돼 읽기 어렵다", expected: "요약 내용을 읽을 수 있어야 한다", impact: "주문 내용을 식별하기 어렵다", alternative: "장식적 기울기만이 아니라 본문도 압축됨", box: {x:.3,y:.2,width:.4,height:.3} };
const clear = () => ({ checks: visualCriteria.map(criterion => ({criterion,result:"clear",evidence:"검사한 영역에서 문제 근거 없음"})), issues: [] });
const defect = () => ({ checks: visualCriteria.map(criterion => ({criterion,result:criterion === "geometry" ? "issue" : "clear",evidence:"화면 관찰 근거"})), issues:[issue] });
it("validates complete QA criteria, consistent findings and bounded normalized boxes without page answers", () => {
  expect(visualSchema.safeParse(clear()).success).toBe(true);
  expect(visualSchema.safeParse(defect()).success).toBe(true);
  for (const invalid of [{...defect(),issues:[]},{...clear(),checks:[]},{...defect(),issues:[{...issue,box:{x:300,y:200,width:400,height:300}}]},{...defect(),issues:[{...issue,box:{x:.8,y:.8,width:.4,height:.4}}]}]) expect(visualSchema.safeParse(invalid).success).toBe(false);
  const suspected = defect(); suspected.checks[1].result = "uncertain";
  expect(visualSchema.safeParse(suspected).success).toBe(true);
  const prompt = visualPrompt();
  for (const answer of ["/store/c", "빨간 머그", "80/20", "History:"]) expect(prompt).not.toContain(answer);
  expect(matchingIssue(issue,{...issue,box:{x:.31,y:.21,width:.4,height:.3}})).toBe(true);
  expect(matchingIssue(issue,{...issue,box:{x:0,y:0,width:.1,height:.1}})).toBe(false);
});

for (const variant of ["reproduced","normal","disagrees","invalid","budget"] as const) {
  it(`independent QA ${variant}: completion cannot hide findings or unreviewed frames (stub model)`, async () => {
    const settings = {...defaults,model:"stub-vlm",apiKey:"stub-key",maxCalls:variant === "budget" ? 1 : 6};
    const run = makeRun(inputSchema.parse({mode:"scenario",url:"http://127.0.0.1:4311/store/c",task:"Observe the completed order",expected:"Order completed"}), settings);
    run.engine = "LOCAL STUB QA PIPELINE TEST · 실제 모델 검출 아님";
    let audits = 0, plans = 0; const prompts: string[] = [], images: string[] = [];
    await runVision(run,settings,{controller:new AbortController()},async()=>{}, {
      navigateTarget: async page => { await page.setContent('<html><body style="margin:0"><div style="display:none">HIDDEN_QA_SENTINEL</div><main style="position:absolute;left:384px;top:144px;width:512px;height:216px;background:#eee;transform:skew(12deg) scaleY(.6)">주문 요약<br>합계 $48.00</main><p>주문 완료</p></body></html>'); },
      createClient: () => ({ chat:{ completions:{ create:async (body:any)=>{
        const demand = JSON.stringify(body.messages); expect(demand).not.toContain("HIDDEN_QA_SENTINEL");
        let output;
        if (demand.includes("VISUAL_QA_REVIEW_V1")) {
          audits++;prompts.push(demand);
          expect(demand).not.toContain("/store/c"); expect(demand).not.toContain("Observe the completed order");
          images.push(body.messages.flatMap((m:any)=>Array.isArray(m.content)?m.content:[]).find((b:any)=>b.type==="image_url").image_url.url);
          output=variant === "normal" || (variant === "disagrees" && audits>1) ? clear() : defect();
          if (variant === "invalid") output={...defect(),issues:[{...issue,box:{x:900,y:100,width:20,height:40}}]};
        } else if(demand.includes("MIDSCENE_WORKFLOW")) {plans++;output={steps:[{kind:"action",description:"완료 화면 관찰"}]};} else {output={action:{type:"Finished",param:null},log:"로컬 완료",finalizeSuccess:true,pass:true,result:true,thought:"로컬 완료 화면"};}
        return {id:`stub-${audits}-${plans}`,model:"stub-vlm",choices:[{index:0,finish_reason:"stop",message:{role:"assistant",content:`<complete success="true">로컬 완료</complete><data-json>${JSON.stringify(output)}</data-json>`}}],usage:{total_tokens:32}};
      }}} }),
    });
    expect(run.calls).toBeLessThanOrEqual(settings.maxCalls);
    expect(run.visualAudits!.length).toBeGreaterThan(0);
    if (variant === "normal") { expect(run.status).toBe("completed");expect(run.findings).toHaveLength(0);expect(visualSummary(run)).toContain("검사한 화면"); }
    if (variant === "invalid") { expect(run.findings).toHaveLength(0);expect(visualSummary(run)).toContain("판단 불가");expect(run.visualAudits!.every(a=>!a.annotated)).toBe(true); }
    if (variant === "reproduced" || variant === "disagrees" || variant === "budget") {
      expect(run.findings).toHaveLength(1);const f=run.findings[0];expect(f.status).toBe("candidate");
      expect(f.visual!.verification).toBe(variant === "reproduced" ? "reproduced" : variant === "disagrees" ? "not-reproduced" : "not-checked");
      expect(visualSummary(run)).toContain("검토 필요");
      const svg=await readFile(path.join(artifactsDir,f.visual!.annotated.replace("/artifacts/","")),"utf8");
      expect(svg).toContain('stroke="#e11d48"');expect(svg).toContain('x="384" y="144" width="512" height="216"');
      const original=await readFile(path.join(artifactsDir,f.before.replace("/artifacts/","")));
      expect(original.equals(Buffer.from(images[0].split(',')[1],'base64'))).toBe(true);
      expect(svg).toContain(original.toString('base64'));
      // Recheck receives no previous accusation, including model title or observed text.
      if (audits>1) { expect(prompts[1]).not.toContain(issue.title);expect(prompts[1]).not.toContain(issue.observed); }
    }
    if (variant === "budget") { expect(run.status).toBe("limited");expect(visualSummary(run)).toContain("미완료");expect(plans).toBe(0); }
    await writeFile(path.join(artifactsDir,run.id,"VISUAL_QA_STUB.json"),JSON.stringify({...run,mock:true},null,2));
  },30000);
}
