import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch();
try{
const page=await browser.newPage({viewport:{width:1440,height:1050}});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:14350');await page.getByRole('button',{name:'모델 & 설정',exact:true}).click();
const before=await (await page.request.get('http://127.0.0.1:14350/api/settings')).json();assert.equal(before.providerSort,'default');
await page.locator('#provider-sort').click();await page.getByRole('option',{name:'응답 생성 속도 우선',exact:true}).click();
assert.match(await page.locator('#provider-sort').innerText(),/응답 생성 속도/);
await page.screenshot({path:'artifacts/speed-occlusion-20261006/SETTINGS.png',fullPage:true});
await page.setViewportSize({width:390,height:844});await page.screenshot({path:'artifacts/speed-occlusion-20261006/SETTINGS_MOBILE.png',fullPage:true});
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.equal(errors.length,0);
const after=await (await page.request.get('http://127.0.0.1:14350/api/settings')).json();assert.deepEqual(after,before);
await writeFile('artifacts/speed-occlusion-20261006/UI_REVIEW.json',JSON.stringify({pageErrors:errors,selection:'throughput',mobileOverflow:false,persistedSettingsUnchanged:true,note:'Draft selection only; persistence is covered by SettingsStore regression tests; no model calls.'},null,2));
}finally{await browser.close();}
