import {chromium}from'playwright';import{readFile,mkdir,writeFile}from'node:fs/promises';import assert from'node:assert/strict';
const out='artifacts/hybrid-occlusion-20261006/ui';await mkdir(out,{recursive:true});
const runs=await Promise.all(['02-d','01-d'].map(x=>readFile('artifacts/hybrid-occlusion-20261006/v2/'+x+'.json','utf8').then(JSON.parse)));
const b=await chromium.launch();const errors:string[]=[];
try{const p=await b.newPage({viewport:{width:1440,height:1050}});p.on('pageerror',e=>errors.push(e.message));
await p.route('**/api/runs',r=>r.fulfill({json:runs})); // Replay stored real results, no model call or user data mutation.
await p.goto('http://127.0.0.1:14360');await p.getByRole('button',{name:'모델 & 설정',exact:true}).click();
await p.getByLabel('웹 겹침 보조 검사',{exact:true}).click();await p.getByRole('option',{name:'웹 위치 + 화면 혼합 검사',exact:true}).click();
await p.screenshot({path:out+'/SETTINGS.png',fullPage:true});
await p.getByRole('button',{name:'증거 & 검토',exact:true}).click();
await p.getByText('브라우저 측정 근거',{exact:false}).waitFor();
await p.getByText('모델 주장 · 관찰',{exact:false}).waitFor();
await p.locator('img').evaluateAll(images=>Promise.all(images.map(i=>i.decode().catch(()=>{}))));
await p.screenshot({path:out+'/REVIEW_DESKTOP.png',fullPage:true});
await p.locator('[data-slot=card]').filter({hasText:'모델 주장 · 관찰'}).last().screenshot({path:out+'/FINDING.png'});
const links=await p.locator('img').evaluateAll(images=>images.map(i=>({src:i.getAttribute('src'),loaded:i.complete&&i.naturalWidth>0})));assert(links.every(x=>x.loaded));
await p.setViewportSize({width:390,height:844});await p.screenshot({path:out+'/REVIEW_MOBILE.png',fullPage:true});
const overflow=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert(!overflow);
assert.equal(errors.length,0);await writeFile(out+'/REPORT.json',JSON.stringify({records:runs.map(r=>r.id),mode:'UI replay of original stored model responses, not a new live run',settings:'selection only; persistence is covered by SettingsStore regression',errors,links,mobileHorizontalOverflow:overflow},null,2));
}finally{await b.close();}
