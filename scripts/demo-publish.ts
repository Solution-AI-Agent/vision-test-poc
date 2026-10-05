import {readFile,writeFile} from 'node:fs/promises';
const folders=process.argv.slice(2);if(!folders.length)throw Error('Provide recorded batch folders');
const batches=await Promise.all(folders.map(async folder=>({folder,...JSON.parse(await readFile(`${folder}/RESULTS.json`,'utf8'))})));
const results=batches.flatMap(b=>b.results.map((r:any)=>({...r,source:b.source,model:b.model,batch:b.folder})));
if(results.some(r=>r.requests?.some((q:any)=>JSON.stringify(q).includes('sk-or-'))))throw Error('Unsafe evidence');
const manifest={selectedState:'cover-wide',kind:'actual stored evaluation; switching does not call model',batches:batches.map(b=>({folder:b.folder,source:b.source,stage:b.stage})),results};
await writeFile('.data/demo-evidence.json',JSON.stringify(manifest,null,2));
console.log(JSON.stringify({publishedResults:results.length,batches:folders}));
