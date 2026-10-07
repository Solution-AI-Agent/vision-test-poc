import {it,expect} from 'vitest';
import {createServer} from 'node:http';
import {defaults,inputSchema,settingsSchema} from './domain';
import {makeRun,runVision,providerClient} from './runner';
import type {Runtime} from './runner';
import {createNetworkFetch} from './network';
import {visualCriteria} from './visual-qa';

it('actual Midscene + provider + network accept a response beyond the former 30-second deadline',async()=>{
 const network=createNetworkFetch({});let requests=0;
 const server=createServer((req,res)=>{res.setHeader('content-type','application/json');let body='';req.on('data',c=>body+=c);req.on('end',()=>{
  requests++;const first=requests===1;
  const output=body.includes('VISUAL_QA_REVIEW_V1') ? {checks:visualCriteria.map(criterion=>({criterion,result:'clear',evidence:'로컬 정상 화면'})),issues:[]} : body.includes('MIDSCENE_WORKFLOW') ? {steps:[{kind:'action',description:'완료 화면 확인'}]} : {result:true};
  setTimeout(()=>res.end(JSON.stringify({id:'local-delayed-provider',choices:[{index:0,finish_reason:'stop',message:{role:'assistant',content:`<complete success="true">완료</complete><data-json>${JSON.stringify(output)}</data-json>`}}]})),first?31050:0);
 });});
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url=`http://127.0.0.1:${(server.address() as any).port}`;
 const settings={...defaults,family:'qwen3-vl' as const,model:'stub-vlm',apiKey:'stub-key',maxSeconds:60};
 const run=makeRun(inputSchema.parse({mode:'scenario',url:'http://127.0.0.1:4311/store/a',task:'완료 화면 확인',expected:'완료'}),settings);
 try{
  await runVision(run,settings,{controller:new AbortController()},async()=>{}, {
   navigateTarget:page=>page.setContent('<main>완료</main>'),
   createClient:()=>providerClient(settings,(_input,init)=>network.fetch(url,init)),
  });
  expect(run.status).toBe('completed');expect(run.transport[0].elapsedMs).toBeGreaterThan(30000);expect(requests).toBe(4);
 }finally{await network.close();server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
},50000);

for(const stop of ['user','deadline'] as const)it(`request still aborts through ${stop} when SDK request timeout is removed`,async()=>{
 const settings={...defaults,apiKey:'stub-key',maxSeconds:stop==='user'?0:3};
 const run=makeRun(inputSchema.parse({mode:'scenario',url:'http://127.0.0.1:4311/store/a',task:'화면 확인',expected:'완료'}),settings);
 const runtime:Runtime={controller:new AbortController()};let observedAbort=false;
 await runVision(run,settings,runtime,async()=>{}, {
  navigateTarget:page=>page.setContent('<main>완료</main>'),
  createClient:()=>({chat:{completions:{create:async(_body:any,options:any)=>new Promise((_resolve,reject)=>{
   options.signal.addEventListener('abort',()=>{observedAbort=true;reject(new Error('local aborted'));},{once:true});
   if(stop==='user')setTimeout(()=>{runtime.stopReason='stopped';runtime.controller.abort();},50);
  })}}}),
 });
 expect(observedAbort).toBe(true);expect(run.status).toBe(stop==='user'?'stopped':'limited');
 expect(run.error).toContain(stop==='user'?'사용자':'전체 실행 시간');
},15000);

it('allows 0 for no run deadline and validates extended finite limits',()=>{
 expect(defaults.maxSeconds).toBe(900);
 for(const maxSeconds of [0,10,900,7200])expect(settingsSchema.parse({...defaults,maxSeconds}).maxSeconds).toBe(maxSeconds);
 for(const maxSeconds of [-1,1,7201])expect(settingsSchema.safeParse({...defaults,maxSeconds}).success).toBe(false);
});
