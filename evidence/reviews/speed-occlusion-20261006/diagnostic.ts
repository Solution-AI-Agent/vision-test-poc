import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {providerClient,makeRun,runVision} from '../../apps/platform/server/runner';
import {defaults,inputSchema} from '../../apps/platform/server/domain';
import {visualCriteria,visualSchema,annotationSvg} from '../../apps/platform/server/visual-qa';
const out='artifacts/speed-occlusion-20261006';
const settings={...defaults,model:'qwen/qwen3-vl-30b-a3b-instruct',maxCalls:1,maxTokens:2048,maxSeconds:60,apiKey:process.env.OPENROUTER_API_KEY};
const envelope=JSON.parse(await readFile(out+'/ENVELOPE.json','utf8'));
const prompt=await readFile(out+'/PROMPT_DIAGNOSTIC.txt','utf8');
for(const m of envelope.messages)if(Array.isArray(m.content))for(const b of m.content)if(b.type==='text'&&b.text.includes('<DATA_DEMAND>'))b.text=b.text.replace(/<DATA_DEMAND>[\s\S]*?<\/DATA_DEMAND>/,'<DATA_DEMAND>'+prompt+'</DATA_DEMAND>');
const redact=(body:any)=>({...body,messages:body.messages.map((m:any)=>({...m,content:Array.isArray(m.content)?m.content.map((b:any)=>b.type==='image_url'?{...b,image_url:{...b.image_url,url:'EXACT_STORED_JPEG'}}:b):m.content}))});
await writeFile(out+'/DIAGNOSTIC_ENVELOPE.json',JSON.stringify(redact(envelope),null,2));
const client=providerClient(settings);let count=0;
for(const spec of ['a-throughput','d-throughput','d-throughput','a-throughput']){
 const [site,route]=spec.split('-'); const source=JSON.parse(await readFile(`artifacts/lead-live-authorized-20261006/${site}.json`,'utf8'));
 const screenshot=source.transport.find((t:any)=>t.phase==='visual-review'&&t.screenshot).screenshot;
 const bytes=await readFile('.'+screenshot);await writeFile(`${out}/${site}.jpg`,bytes);
 const body=structuredClone(envelope);body.max_tokens=2048;body.stream=false;if(route!=='default')body.provider={sort:route};
 for(const m of body.messages)if(Array.isArray(m.content))for(const b of m.content)if(b.type==='image_url')b.image_url.url='data:image/jpeg;base64,'+bytes.toString('base64');
 const id='diagnostic-'+String(++count).padStart(2,'0')+'-'+spec;const started=Date.now();
 try{const response:any=await client.chat.completions.create(body,{signal:AbortSignal.timeout(90000)});
 const content=response.choices[0]?.message.content??'';let parsed;try{parsed=JSON.parse(content.match(/<data-json>([\s\S]*?)<\/data-json>/)?.[1]??content.replace(/^```(?:json)?\s*|\s*```$/g,''));}catch{}
 const valid=visualSchema.safeParse(parsed);const record={id,site,route,sourceRun:source.id,inputSha256:createHash('sha256').update(bytes).digest('hex'),request:redact(body),elapsedMs:Date.now()-started,response,parsed,valid:valid.success};
 await writeFile(`${out}/${id}.json`,JSON.stringify(record,null,2));if(valid.success&&valid.data.issues.length)await writeFile(`${out}/${id}.svg`,annotationSvg(bytes,'image/jpeg',valid.data));
 console.log(JSON.stringify({id,ms:record.elapsedMs,provider:response.provider,valid:valid.success,issues:parsed?.issues,usage:response.usage}));
 }catch(e:any){await writeFile(`${out}/${id}.json`,JSON.stringify({id,error:'provider failure',status:e.status??null,elapsedMs:Date.now()-started}));console.log(JSON.stringify({id,status:e.status??null}));if(e.status===401||e.status===402)break;}
}
