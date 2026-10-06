import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {providerClient,makeRun,runVision} from '../../apps/platform/server/runner';
import {defaults,inputSchema} from '../../apps/platform/server/domain';
import {visualCriteria,visualSchema,annotationSvg} from '../../apps/platform/server/visual-qa';
const base='artifacts/lead-live-authorized-20261006';
const out=path.join(base,'model-compare');await mkdir(out,{recursive:true});
const settings={...defaults,model:'qwen/qwen3-vl-235b-a22b-instruct',maxCalls:1,maxSeconds:60,apiKey:process.env.OPENROUTER_API_KEY};
let envelope:any;
const capture=makeRun(inputSchema.parse({mode:'autonomous',url:'http://127.0.0.1:4311/store/a'}),settings);
await runVision(capture,settings,{controller:new AbortController()},async()=>{}, {createClient:()=>({chat:{completions:{create:async(body:any)=>{
 envelope=structuredClone(body);
 return {id:'LOCAL-ENVELOPE-CAPTURE-NO-PROVIDER-CALL',model:'stub',choices:[{finish_reason:'stop',message:{content:'<data-json>'+JSON.stringify({checks:visualCriteria.map(criterion=>({criterion,result:'clear',evidence:'Local envelope capture, not a model judgement'})),issues:[]})+'</data-json>'}}]};
}}}})});
if(!envelope)throw new Error('Request envelope missing');
await writeFile(path.join(out,'ENVELOPE.json'),JSON.stringify({...envelope,messages:envelope.messages.map((m:any)=>({...m,content:Array.isArray(m.content)?m.content.map((b:any)=>b.type==='image_url'?{type:'image_url',image_url:{...b.image_url,url:'EXACT_STORED_JPEG'}}:b):m.content}))},null,2));
const client=providerClient(settings);
for(const site of ['a','c','d','e','f','g']){
 const run=JSON.parse(await readFile(path.join(base,site+'.json'),'utf8'));
 const screenshot=run.transport.find((t:any)=>t.phase==='visual-review'&&t.screenshot)?.screenshot;
 if(!screenshot)continue;
 const bytes=await readFile('.'+screenshot);
 const body=structuredClone(envelope);body.model=settings.model;body.max_tokens=settings.maxTokens;body.stream=false;
 for(const m of body.messages)if(Array.isArray(m.content))for(const b of m.content)if(b.type==='image_url')b.image_url.url='data:image/jpeg;base64,'+bytes.toString('base64');
 const started=Date.now();
 try{
 const response=await client.chat.completions.create(body);
 const content=response.choices[0]?.message.content??'';
 let parsed:any;try{parsed=JSON.parse(content.match(/<data-json>([\s\S]*?)<\/data-json>/)?.[1]??content.replace(/^```(?:json)?\s*|\s*```$/g,''));}catch{}
 const validated=visualSchema.safeParse(parsed);
 const record={site,model:settings.model,sourceRun:run.id,screenshot,inputSha256:createHash('sha256').update(bytes).digest('hex'),elapsedMs:Date.now()-started,response,parsed,valid:validated.success};
 await writeFile(path.join(out,site+'.json'),JSON.stringify(record,null,2));
 if(validated.success&&validated.data.issues.length)await writeFile(path.join(out,site+'.svg'),annotationSvg(bytes,'image/jpeg',validated.data));
 console.log(JSON.stringify({site,valid:validated.success,parsed,usage:response.usage}));
 }catch(e:any){await writeFile(path.join(out,site+'.json'),JSON.stringify({site,error:'provider failed',httpStatus:e.status??null},null,2));console.log(JSON.stringify({site,status:e.status??null}));break;}
}
