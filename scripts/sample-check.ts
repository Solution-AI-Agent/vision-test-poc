import { chromium } from "playwright";
import { expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { sampleBaseline } from "./sample-baseline";
import { fileURLToPath } from "node:url";
// Keep functional recordings at repository root even when npm enters the sample workspace.
process.chdir(fileURLToPath(new URL("../", import.meta.url)));
const commit=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim();
const folder=`artifacts/source-layout-sample-${new Date().toISOString().replace(/[:.]/g,"-")}`;
await mkdir(folder,{recursive:true});const browser=await chromium.launch();const results:any[]=[];
try {

 // First, direct visits: no operator setup, platform access, routing, CSS/DOM injection or init scripts.
 for(const route of ["/store/a","/store/b"]){
  const name=route.endsWith("/a")?"store-a":"store-b";
  const context=await browser.newContext({viewport:{width:1280,height:720},recordVideo:{dir:folder,size:{width:1280,height:720}}});
  const page=await context.newPage();const requests:string[]=[];const errors:string[]=[];
  page.on("request",r=>requests.push(r.url()));page.on("pageerror",e=>errors.push(e.message));
  await sampleBaseline(page,()=>page.screenshot({path:`${folder}/${name}-checkout.png`,fullPage:true}).then(()=>{}),`http://127.0.0.1:4311${route}`);
  await page.screenshot({path:`${folder}/${name}.png`,fullPage:true});
  expect(requests.every(u=>u.startsWith("http://127.0.0.1:4311/"))).toBe(true);
  expect(requests.some(u=>u.includes("/api/operator")||u.includes("/api/presentation"))).toBe(false);
  expect(errors).toEqual([]);
  await page.getByRole("button",{name:"Start another order"}).click();await expect(page.getByRole("button",{name:"Confirm order"})).toBeEnabled();
  const video=page.video();await context.close();results.push({route,functionalSuite:"PASS",requests,operatorSetup:false,platformRequests:0,pageErrors:errors,video:await video?.path()});
 }
 for(const state of ["normal","misaligned","occluded","clipped","product-image","chart"]){
  const context=await browser.newContext({viewport:{width:1280,height:720},recordVideo:{dir:folder,size:{width:1280,height:720}}});const page=await context.newPage();const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  expect((await page.request.put("http://127.0.0.1:4311/api/operator",{data:{state}})).ok()).toBe(true);
  await sampleBaseline(page,()=>page.screenshot({path:`${folder}/${state}-checkout.png`,fullPage:true}).then(()=>{}));
  const bad=await page.request.post("http://127.0.0.1:4311/api/orders",{data:{product:"mug",quantity:0,name:"Alex",email:"invalid"}});expect(bad.status()).toBe(400);
  const guarded=await page.request.put("http://127.0.0.1:4311/api/operator",{headers:{Origin:"http://unrelated.test"},data:{state:"normal"}});expect(guarded.status()).toBe(403);
  await page.screenshot({path:`${folder}/${state}.png`,fullPage:true});
  await page.getByRole("button",{name:"Start another order"}).click();await expect(page.getByRole("button",{name:"Confirm order"})).toBeEnabled();expect(errors).toEqual([]);
  const video=page.video();await context.close();results.push({state,functionalSuite:"PASS",invalidApiStatus:bad.status(),foreignOriginStatus:guarded.status(),pageErrors:errors,video:await video?.path()});
 }
 const page=await browser.newPage({viewport:{width:390,height:844}});await page.goto("http://127.0.0.1:4311/operator");await page.getByRole("radio",{name:"Normal",exact:true}).click();await page.getByRole("button",{name:"Reset to normal"}).click();await page.screenshot({path:`${folder}/operator.png`,fullPage:true});await sampleBaseline(page);await page.screenshot({path:`${folder}/normal-mobile.png`,fullPage:true});await page.close();
} finally {
 await fetch("http://127.0.0.1:4311/api/operator",{method:"PUT",headers:{"Content-Type":"application/json"},body:'{"state":"normal"}'});await browser.close();await writeFile(`${folder}/RESULTS.json`,JSON.stringify({commit,modelCalls:0,viewport:{width:1280,height:720},screenshots:"full-page browser capture; not model input",results},null,2));
}
console.log(folder);
