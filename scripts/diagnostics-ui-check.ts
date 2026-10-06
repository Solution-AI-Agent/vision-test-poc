// UI smoke using a real local missing-browser regression record. No server/API mutation.
import { chromium } from "playwright";
import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { artifactsDir } from "../apps/platform/server/paths";
const folder=path.join(artifactsDir,"runtime-diagnostics-check");
const records=await Promise.all((await readdir(folder)).filter(f=>f.endsWith('.json')).map(async f=>JSON.parse(await readFile(path.join(folder,f),'utf8'))));
const record=records.filter(r=>r.diagnostic?.code==='BROWSER_NOT_INSTALLED').sort((a,b)=>b.startedAt.localeCompare(a.startedAt))[0];
assert.ok(record,'Run npm test first');
const output=path.join(artifactsDir,'diagnostic-ui-check'); await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1100}}); const errors:string[]=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/runs',route=>route.fulfill({json:[record]}));
 await page.goto(process.env.APP_ORIGIN??'http://127.0.0.1:4310');
 await page.getByRole('alert').filter({hasText:'BROWSER_NOT_INSTALLED'}).waitFor();
 assert.ok(await page.getByText(/npx playwright install chromium을 실행한 뒤 npm run doctor/).isVisible());
 await page.evaluate(()=>document.fonts.ready); await page.waitForTimeout(300);
 await page.screenshot({path:path.join(output,'BROWSER_DIAGNOSTIC.png'),fullPage:true});
 assert.deepEqual(errors,[]);
 await writeFile(path.join(output,'RESULT.json'),JSON.stringify({sourceRun:record.id,sourceVersion:record.sourceVersion,uiRecordMock:true,modelCalled:false,pageErrors:errors,actionVisible:true},null,2));
 console.log('diagnostic UI PASS (record replay only)');
}finally{await browser.close();}
