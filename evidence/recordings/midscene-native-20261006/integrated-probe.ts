import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {makeRun,runVision} from '../../apps/platform/server/runner';
import {defaults,inputSchema} from '../../apps/platform/server/domain';
const settings={...defaults,apiKey:process.env.OPENROUTER_API_KEY,model:'qwen/qwen3-vl-30b-a3b-instruct',maxCalls:30,maxActions:16,maxSeconds:240,maxTokens:2048};
const run=makeRun(inputSchema.parse({mode:'scenario',url:'http://127.0.0.1:4311/store/a',task:'수량을 2개로 바꾸고 받는 분은 테스터, 이메일은 qa@example.test로 입력한 다음 주문 확정 버튼을 누르세요.',expected:'주문 완료 화면과 테스터의 영수증에 빨간 머그 2개, 합계24달러가 표시됩니다.'}),settings);
const root='artifacts/midscene-native-20261006';const folder=`artifacts/${run.id}`;await mkdir(folder,{recursive:true});
const save=()=>writeFile(root+'/INTEGRATED_PROBE.json',JSON.stringify(run,null,2));
const oracle:any[]=[];const pending:Promise<any>[]=[];
await runVision(run,settings,{controller:new AbortController()},save,{launchBrowser:async()=>{
 const browser=await chromium.launch({headless:true});const newContext=browser.newContext.bind(browser);
 browser.newContext=async(...args)=>{const context=await newContext(...args);context.on('page',page=>page.on('response',response=>{if(response.url().endsWith('/api/orders')&&response.request().method()==='POST')pending.push(response.json().then(body=>oracle.push({status:response.status(),body})));}));return context;};return browser;
}});
await Promise.all(pending);await writeFile(folder+'/TEST_ORACLE.json',JSON.stringify({note:'Independent test-only API response observer; never provided to model or production runner.',orders:oracle},null,2));
console.log(JSON.stringify({id:run.id,status:run.status,calls:run.calls,actions:run.actions,cost:run.cost,outcome:run.outcome,workflow:run.workflow,orderResponses:oracle}));
