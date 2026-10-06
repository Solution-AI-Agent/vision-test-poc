import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {defaults,inputSchema} from '../../apps/platform/server/domain';
import {makeRun,runVision,providerClient} from '../../apps/platform/server/runner';
const out='artifacts/hybrid-occlusion-20261006/fixed';await mkdir(out,{recursive:true});
const order=['a','d','a','d','a','d'];
const settings={...defaults,apiKey:process.env.OPENROUTER_API_KEY,model:'qwen/qwen3-vl-30b-a3b-instruct',layoutAssist:true,maxCalls:1,maxActions:1,maxSeconds:120,maxTokens:2048};
await writeFile(out+'/PROTOCOL.json',JSON.stringify({commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),order,model:settings.model,maxTotalRequests:6,maxRequestsPerRun:1,maxSeconds:120,maxTokens:2048,scope:'First screen diagnostic, intentionally no task actions. A has no geometry candidates: independent visual QA uses its one request. D hybrid review has priority; remaining QA/task stages are incomplete. No per-page defect labels or expected answers in prompts. No retry after batch.'},null,2));
let n=0;const results:any[]=[];
for(const site of order){
 const id=String(++n).padStart(2,'0')+'-'+site;
 const run=makeRun(inputSchema.parse({mode:'autonomous',url:`http://127.0.0.1:4311/store/${site}`}),settings);
 const runtime:any={controller:new AbortController()};const file=out+'/'+id+'.json';
 const persist=()=>writeFile(file,JSON.stringify(run,null,2));
 await runVision(run,settings,runtime,persist,{createClient:()=>{
  const client=providerClient(settings);const orig=client.chat.completions.create.bind(client.chat.completions);
  client.chat.completions.create=async(body:any,options:any)=>{
   const saved=structuredClone(body);
   for(const m of saved.messages)if(Array.isArray(m.content))for(const block of m.content)if(block.type==='image_url'){
    const bytes=Buffer.from(block.image_url.url.split(',')[1],'base64');block.image_url.url='stored in run.transport screenshots';block.sha256=createHash('sha256').update(bytes).digest('hex');
   }
   await writeFile(out+'/'+id+'-request.json',JSON.stringify(saved,null,2));
   return orig(body,options);
  };return client;
 }});
 await persist();const audit=run.layoutAudits?.[0];
 const summary={id,runId:run.id,calls:run.calls,cost:run.cost,status:run.status,candidates:audit?.candidates.length,review:audit?.review,reason:audit?.reason,warnings:audit?.warnings};results.push(summary);
 console.log(JSON.stringify(summary));await writeFile(out+'/SUMMARY.json',JSON.stringify(results,null,2));
 if(runtime.providerFailure)break;
}
