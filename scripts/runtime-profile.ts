// Read-only analysis of a saved run. No browser, model or API key required.
import {readFile} from 'node:fs/promises';
const filename=process.argv[2];if(!filename)throw Error('Usage: npx tsx scripts/runtime-profile.ts path/to/run.json');
const run=JSON.parse(await readFile(filename,'utf8'));
const groups:Record<string,{requests:number;responseSeconds:number;maxResponseSeconds:number}>={};
for(const request of run.transport??[]){const phase=request.phase??'unknown';const item=groups[phase]??={requests:0,responseSeconds:0,maxResponseSeconds:0};const seconds=(request.elapsedMs??0)/1000;item.requests++;item.responseSeconds+=seconds;item.maxResponseSeconds=Math.max(item.maxResponseSeconds,seconds);}
const wallSeconds=run.endedAt?(Date.parse(run.endedAt)-Date.parse(run.startedAt))/1000:null;
const responseSeconds=Object.values(groups).reduce((sum,g)=>sum+g.responseSeconds,0);
for(const item of Object.values(groups)){item.responseSeconds=+item.responseSeconds.toFixed(3);item.maxResponseSeconds=+item.maxResponseSeconds.toFixed(3);}
console.log(JSON.stringify({runId:run.id,model:run.settings.model,wallSeconds,responseSeconds:+responseSeconds.toFixed(3),otherSeconds:wallSeconds===null?null:+(wallSeconds-responseSeconds).toFixed(3),responseShare:wallSeconds?+(responseSeconds/wallSeconds).toFixed(4):null,groups,note:'Response duration includes transport/proxy/provider queue and generation. These cannot be separated from this ledger. Historical screenshot phase may include native planning after an action. Missing/failed request duration is excluded; otherSeconds is not pure browser CPU time.'},null,2));
