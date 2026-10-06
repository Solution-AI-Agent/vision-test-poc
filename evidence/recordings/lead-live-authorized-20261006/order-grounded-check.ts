import {writeFile,mkdir} from 'node:fs/promises';
import {makeRun,runVision} from '../../apps/platform/server/runner';
import {defaults,inputSchema} from '../../apps/platform/server/domain';
const folder='artifacts/lead-live-authorized-20261006/order-grounded-check';await mkdir(folder,{recursive:true});
const settings={...defaults,model:'qwen/qwen3-vl-30b-a3b-instruct',maxActions:16,maxCalls:20,maxSeconds:180,maxTokens:1536,apiKey:process.env.OPENROUTER_API_KEY};
const run=makeRun(inputSchema.parse({mode:'scenario',url:'http://127.0.0.1:4311/store/a',task:'빨간 머그의 수량을 2개로 바꾸고 받는 분은 테스터, 이메일은 qa@example.test로 입력한 다음 주문을 확정하세요. 화면의 주문 완료와 영수증을 확인하세요.',expected:'테스터의 주문이 완료되고 영수증에 빨간 머그 2개, 합계 24달러가 표시됩니다.'}),settings);
const persist=()=>writeFile(folder+'/RUN.json',JSON.stringify(run,null,2));
await runVision(run,settings,{controller:new AbortController()},persist);await persist();
console.log(JSON.stringify({id:run.id,status:run.status,outcome:run.outcome,calls:run.calls,actions:run.actions,cost:run.cost,steps:run.steps.map(s=>({action:s.plan.action,executed:s.executed,confirmation:s.inputConfirmation,observation:s.plan.observation})),diagnostic:run.diagnostic}));
