import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
const require=createRequire('/Users/zpro/.buzz/REPOS/vision-test-maker/package.json');
const {chromium}=require('playwright');
const repo='/Users/zpro/.buzz/REPOS/vision-test-maker';
const base='/Users/zpro/.buzz/OUTBOX/VISION_TEST_LUMEN_V5/WORKFLOW';
await mkdir(base,{recursive:true});
const headBefore=execFileSync('git',['-C',repo,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
const browser=await chromium.launch();
const captures=[];const errors=[];const responses=[];
let page;
try{
 page=await browser.newPage({viewport:{width:1600,height:1100}});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4310/demo');
 await page.getByText('고정 확인 실행:',{exact:false}).waitFor();
 const snap=async(name,step)=>{
  await page.evaluate(()=>document.fonts.ready);
  await page.frameLocator('iframe').locator('body').evaluate(()=>document.fonts.ready);
  await page.waitForTimeout(650);
  await page.screenshot({path:path.join(base,name+'.png'),fullPage:true});
  captures.push({file:name+'.png',step,time:new Date().toISOString(),kind:'UI workflow capture; not model input',viewport:{width:1600,height:1100}});
 };
 for(const [label,state] of [['정상','normal'],['렌더링 결함','fault']]){
  await page.getByRole('radio',{name:label,exact:true}).click();
  const frame=page.frameLocator('iframe');
  await frame.getByRole('button',{name:'Confirm order'}).waitFor();
  await snap(state+'-before','selected '+state+' before confirmation');
  await frame.getByRole('button',{name:'Confirm order'}).click();
  await frame.getByRole('heading',{name:'Order confirmed'}).waitFor();
  await snap(state+'-confirmed','confirmed '+state+'; saved evidence panel visible');
  for(const linkName of ['실제 입력 이미지','원응답/로그']){
   const href=await page.getByRole('link',{name:linkName}).first().getAttribute('href');
   const url=new URL(href,'http://127.0.0.1:4310').href;
   const response=await page.request.get(url);responses.push({state,link:linkName,url,status:response.status()});
   if(!response.ok())throw Error('Evidence endpoint failed');
  }
 }
 const imageHref=await page.getByRole('link',{name:'실제 입력 이미지'}).first().getAttribute('href');
 await page.goto(new URL(imageHref,'http://127.0.0.1:4310').href);
 await page.waitForTimeout(500);
 await page.screenshot({path:path.join(base,'fault-input-link.png'),fullPage:true});
 captures.push({file:'fault-input-link.png',step:'opened actual recorded image URL',time:new Date().toISOString(),kind:'browser evidence link capture; exact original JPEG remains separately in ASSETS'});
 if(errors.length)throw Error('Page error encountered');
}finally{
 if(page)await page.request.put('http://127.0.0.1:4310/api/demo/state',{data:{state:'normal'}});
 await browser.close();
 const headAfter=execFileSync('git',['-C',repo,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
 await writeFile(path.join(base,'CAPTURE_REPORT.json'),JSON.stringify({headBefore,headAfter,sameHead:headBefore===headAfter,captures,responses,errors,paidModelCalls:0,recording:'chronological screenshots, not realtime video',restoredState:'normal'},null,2));
}
console.log('Workflow captures completed; evidence endpoints HTTP200; no model calls.');
