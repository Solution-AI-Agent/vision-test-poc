import { writeFile } from 'node:fs/promises';
import { makeRun, runVision } from '../../apps/platform/server/runner';
import { defaults, inputSchema } from '../../apps/platform/server/domain';
const folder = 'artifacts/lead-live-authorized-20261006';
const settings = {...defaults, model:'qwen/qwen3-vl-30b-a3b-instruct', maxActions:1,maxCalls:4,maxSeconds:60, apiKey:process.env.OPENROUTER_API_KEY};
if(!settings.apiKey) throw new Error('Authorized credential unavailable');
for(const site of ['a','c','d','e','f','g']) {
  const run=makeRun(inputSchema.parse({mode:'autonomous',url:`http://127.0.0.1:4311/store/${site}`}),settings);
  const persist=()=>writeFile(`${folder}/${site}.json`,JSON.stringify(run,null,2));
  await runVision(run,settings,{controller:new AbortController()},persist);
  await persist();
  console.log(JSON.stringify({site,id:run.id,status:run.status,calls:run.calls,cost:run.cost,findings:run.findings.length,audits:run.visualAudits?.map(x=>({status:x.status,reason:x.reason,result:x.result})),error:run.error}));
  if(run.diagnostic?.httpStatus === 401 || run.diagnostic?.httpStatus === 402) break;
}
