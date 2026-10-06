import {it,expect} from 'vitest';
import {chromium} from 'playwright';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import {scanLayout,layoutReviewSchema,createLayoutInspector} from './layout-qa';
import {layoutSummary} from './layout-summary';
import {makeRun,runVision,artifactsDir} from './runner';
import {defaults,inputSchema,settingsSchema} from './domain';
const fixture=(cover:string)=>`<body style="margin:0"><main><div style="position:absolute;left:100px;top:100px;width:260px;height:120px;background:#ddd"><p>HIDDEN_DOM_TEXT_SENTINEL</p><strong>합계 24달러</strong></div>${cover}</main></body>`;
const opaque='<section style="position:absolute;left:90px;top:95px;width:300px;height:150px;background:oklch(.8 0 0)">차트</section>';
it('generic overlap scan distinguishes solid cover from nested UI, transparent decoration and intentional modal',async()=>{
 const b=await chromium.launch();try{const page=await b.newPage({viewport:{width:1280,height:720}});
 await page.setContent(fixture(''));expect((await scanLayout(page)).candidates).toHaveLength(0);
 await page.setContent(fixture(opaque));const actual=await scanLayout(page);expect(actual.candidates).toHaveLength(1);expect(actual.candidates[0].regions).toBeGreaterThanOrEqual(2);expect(JSON.stringify(actual)).not.toContain('HIDDEN_DOM_TEXT');
 await page.setContent(fixture(opaque.replace('background:oklch(.8 0 0)','background:transparent').replace('차트','')));expect((await scanLayout(page)).candidates).toHaveLength(0);
 await page.setContent(fixture(opaque.replace('<section','<section role="dialog" aria-modal="true"')));const modal=await scanLayout(page);expect(modal.candidates).toHaveLength(0);expect(modal.warnings.join()).toContain('대화상자');
 await page.setContent(fixture(opaque.replace('background:oklch(.8 0 0)','background:#fff;pointer-events:none')));const bypass=await scanLayout(page);expect(bypass.candidates).toHaveLength(0);expect(bypass.warnings.join()).toContain('클릭을 통과');
 await page.setContent('<section style="background:#eee;padding:20px"><button>정상 버튼</button><p>일반 중첩 레이아웃</p></section>');expect((await scanLayout(page)).candidates).toHaveLength(0);
 }finally{await b.close();}
});
it('old settings keep hybrid off and incomplete model observations cannot become positive overlap',()=>{
 const {layoutAssist,...old}=defaults;expect(settingsSchema.parse(old).layoutAssist).toBe(false);
 expect(layoutReviewSchema.safeParse({regions:[{id:'region-1',verdict:'visible-overlap',evidence:'guess',occluder:'',affected:'',impact:'',alternative:''}]}).success).toBe(false);
});
for(const verdict of ['visible-overlap','clear','invalid','budget','disabled'] as const){
 it(`hybrid ${verdict} preserves candidate, exact image evidence and explicit provenance`,async()=>{
 const settings={...defaults,apiKey:'local-only',model:'stub-vlm',agentInstructions:'TASK_HISTORY_SENTINEL',layoutAssist:verdict!=='disabled',maxCalls:1};
 const run=makeRun(inputSchema.parse({mode:'autonomous',url:'http://127.0.0.1:4311/store/d'}),settings);
 if(verdict==='budget')run.calls=1;
 let hybrid=0;let full='';
 await runVision(run,settings,{controller:new AbortController()},async()=>{}, {navigateTarget:async page=>{await page.setContent(fixture(opaque));},createClient:()=>({chat:{completions:{create:async(body:any)=>{
 const prompt=JSON.stringify(body);expect(prompt).not.toContain('HIDDEN_DOM_TEXT_SENTINEL');
 if(prompt.includes('HYBRID_OCCLUSION_REVIEW_V1')){
 expect(prompt).not.toContain('TASK_HISTORY_SENTINEL');expect(prompt).not.toContain('/store/d');hybrid++;const images=body.messages.flatMap((m:any)=>Array.isArray(m.content)?m.content:[]).filter((c:any)=>c.type==='image_url');expect(images.length).toBe(2);full=images[0].image_url.url;
 const result={regions:[{id:'region-1',verdict:verdict==='visible-overlap'?'visible-overlap':'clear',occluder:'패널',affected:'정보 영역',evidence:'로컬 모의 화면 판독',impact:'정보 식별 제한',alternative:'의도된 UI 가능성'}]};
 return {choices:[{message:{content:'<data-json>'+JSON.stringify({String:verdict==='invalid'?'invalid-json':JSON.stringify(result)})+'</data-json>'},finish_reason:'stop'}]};
 }
 return {choices:[{message:{content:'<data-json>{}</data-json>'},finish_reason:'stop'}]};
 }}}})});
 if(verdict==='disabled'){expect(hybrid).toBe(0);expect(run.layoutAudits).toBeUndefined();return;}
 expect(run.findings).toHaveLength(1);const f=run.findings[0];expect(f.status).toBe('candidate');expect(layoutSummary(run)).toContain('의심 1건');
 expect(f.layout?.verdict).toBe(['invalid','budget'].includes(verdict)?'not-checked':verdict);
 const audit=run.layoutAudits![0];expect(audit.stable).toBe(true);
 const source=await readFile(path.join(artifactsDir,audit.screenshot.replace('/artifacts/','')));
 const svg=await readFile(path.join(artifactsDir,f.layout!.annotated.replace('/artifacts/','')),'utf8');expect(svg).toContain(source.toString('base64'));
 if(verdict!=='budget')expect(source.equals(Buffer.from(full.split(',')[1],'base64'))).toBe(true);
 expect(svg.includes('stroke="#e11d48"')).toBe(verdict==='visible-overlap');expect(svg.includes('stroke-dasharray')).toBe(verdict!=='visible-overlap');
 if(verdict==='budget'){expect(hybrid).toBe(0);expect(audit.reason).toContain('미실행');}
 if(verdict==='invalid')expect(audit.reason).toContain('실패');
 },30000);
}

it('unstable capture never gets an evidence box, and abort preserves already saved candidates',async()=>{
 const b=await chromium.launch();const folder=await mkdtemp('/tmp/vision-layout-stop-');
 try{
  const page=await b.newPage({viewport:{width:1280,height:720}});await page.setContent(fixture(opaque));
  const settings={...defaults,apiKey:'local',layoutAssist:true};
  const make=()=>makeRun(inputSchema.parse({mode:'autonomous',url:'http://127.0.0.1:4311/store/d'}),settings);
  const run=make();const original=page.screenshot.bind(page);let shots=0;
  (page as any).screenshot=async()=>{if(++shots===2)await page.evaluate(()=>document.body.style.background='pink');return original();};
  let calls=0;const fake:any={aiAsk:async()=>{calls++;throw Error('unexpected');}};
  await createLayoutInspector(page,fake,run,{controller:new AbortController()},folder,async()=>{})('unstable');
  expect(run.layoutAudits![0].stable).toBe(false);expect(run.layoutAudits![0].annotated).toBeUndefined();expect(run.findings).toHaveLength(0);expect(calls).toBe(0);
  (page as any).screenshot=original;
  const aborted=make();const controller=new AbortController();let saved=0;
  const stopAgent:any={aiAsk:async()=>{controller.abort();throw Error('stop');}};
  await expect(createLayoutInspector(page,stopAgent,aborted,{controller},folder,async()=>{saved++;})('stop')).rejects.toThrow('stop');
  expect(saved).toBeGreaterThan(0);expect(aborted.findings).toHaveLength(1);expect(aborted.findings[0].layout?.verdict).toBe('not-checked');expect(aborted.layoutAudits![0].reason).toContain('의심을 보존');
 }finally{await b.close();await rm(folder,{recursive:true,force:true});}
},30000);
