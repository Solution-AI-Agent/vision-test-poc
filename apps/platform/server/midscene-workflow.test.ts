import {it,expect} from 'vitest';
import {runMidsceneWorkflow,workflowPrompt,workflowSchema} from './midscene-workflow';
import {makeRun} from './runner';
import {defaults,inputSchema} from './domain';

for(const mode of ['normal','mismatch','budget','aborted','assertion-failed','unchanged'] as const) {
 it(`native workflow ${mode}: input/read/action/assert use Midscene APIs and retain uncompleted obligations`,async()=>{
  const run=makeRun(inputSchema.parse({mode:'scenario',url:'http://127.0.0.1:4311/store/a',task:'값을 2로 입력하고 확인 버튼 클릭',expected:'완료 표시'}),{...defaults,maxActions:mode==='budget'?0:5});
  const runtime={controller:new AbortController(),stopReason:undefined as 'limited'|undefined};
  const calls:any[]=[];let shots=0;
  const record=()=>{run.calls++;run.transport.push({phase:run.executionPhase,images:1,texts:1,screenshot:`/test/request-${run.calls}.jpg`});};
  const agent:any={interface:{},
   aiQuery:async(prompt:string,options:any)=>{calls.push(['query',prompt,options]);record();if(prompt.startsWith('CONTROL_OBSERVATION'))return {kind:'editable',target:'숫자 필드',currentValue:'1',evidence:'편집 입력칸'};return {steps:[{kind:'input',target:'숫자 필드',value:'2',description:'숫자 2 입력'},{kind:'action',description:'확인 버튼 누르기'}]};},
   aiInput:async(target:string,options:any)=>{calls.push(['input',target,options]);await agent.interface.beforeInvokeAction('Input',{value:options.value});await agent.interface.afterInvokeAction('Input',{value:options.value});},
   aiString:async(prompt:string,options:any)=>{calls.push(['read',prompt,options]);record();expect(prompt).not.toContain('"2"');return mode==='mismatch'?'': '2';},
   aiAct:async(prompt:string,options:any)=>{calls.push(['act',prompt,options]);await agent.interface.beforeInvokeAction('Tap',{});await agent.interface.afterInvokeAction('Tap',{});},
   aiAssert:async(prompt:string,_message:any,options:any)=>{calls.push(['assert',prompt,options]);record();return {pass:mode!=='assertion-failed',thought:'화면 결과'};},
  };
  if(mode==='aborted')runtime.controller.abort();
  const perform=()=>runMidsceneWorkflow(agent,run,runtime,async()=>`/test/frame-${++shots}.png`,async()=>{},async()=>{},async()=>mode==='unchanged');
  if(mode==='budget'||mode==='aborted') {
   await expect(perform()).rejects.toThrow();expect(run.actions).toBe(0);
   if(mode==='budget')expect(runtime.stopReason).toBe('limited');
  } else {
   await perform();
   expect(calls.find(c=>c[0]==='input')[2]).toMatchObject({value:'2',mode:'replace',deepLocate:true});
   expect(calls.find(c=>c[0]==='read')[2]).toMatchObject({domIncluded:false,screenshotIncluded:true});
   if(mode==='unchanged'){expect(run.status).toBe('limited');expect(run.workflow!.steps[1].status).toBe('unverified');expect(calls.some(c=>c[0]==='assert')).toBe(false);}
   else if(mode==='mismatch'){expect(run.status).toBe('limited');expect(calls.some(c=>c[0]==='act'||c[0]==='assert')).toBe(false);expect(run.workflow!.steps[1].status).toBe('pending');}
   else{expect(run.status).toBe(mode==='normal'?'completed':'limited');expect(run.actions).toBe(2);expect(run.steps.every(s=>s.executed&&s.before!==s.after)).toBe(true);expect(calls.find(c=>c[0]==='assert')[2]).toMatchObject({domIncluded:false,keepRawResponse:true});}
  }
  expect(agent.interface.beforeInvokeAction).toBeUndefined();expect(agent.interface.afterInvokeAction).toBeUndefined();
 });
}
it('workflow asks for commitments, not coordinates or per-page answers',()=>{
 const text=workflowPrompt('이름과 수량 입력 후 주문','완료','CUSTOM_INSTRUCTIONS','http://127.0.0.1:4311/store/a');
 expect(text).toContain('CUSTOM_INSTRUCTIONS');expect(text).toContain('모든 필수 입력');
 expect(workflowSchema.parse([{kind:'action',description:'화면 탐색'}]).steps).toHaveLength(1);
 expect(workflowSchema.safeParse({steps:[{kind:'input',value:'2',description:'입력'}]}).success).toBe(false);
});

for(const mode of ['already-selected','change-selection','unconfirmed','unknown'] as const)it(`selection guard ${mode}: a misclassified input never types into another field`,async()=>{
 const run=makeRun(inputSchema.parse({mode:'scenario',url:'http://127.0.0.1:4311/store/d',task:'항목 선택',expected:'선택 표시'}),defaults);const runtime={controller:new AbortController()};let actions=0,observations=0,typed=0;
 const record=()=>{run.calls++;run.transport.push({images:1,texts:1,screenshot:'/request.jpg'});};
 const agent:any={interface:{},aiQuery:async(prompt:string)=>{record();if(prompt.startsWith('CONTROL_OBSERVATION')){observations++;return {kind:mode==='unknown'?'unknown':'choice',target:'항목 목록',currentValue:mode==='already-selected'||(mode==='change-selection'&&observations>1)?'두 번째':'첫 번째',evidence:'선택 표시 관찰'};}return {steps:[{kind:'input',target:'항목 목록',value:'두 번째',description:'두 번째 선택'}]};},aiInput:async()=>{typed++;},aiAct:async()=>{actions++;await agent.interface.beforeInvokeAction('Tap',{});await agent.interface.afterInvokeAction('Tap',{});},aiAssert:async()=>{record();return {pass:true};}};
 await runMidsceneWorkflow(agent,run,runtime,async()=>'/frame.png',async()=>{},async()=>{},async()=>true);
 expect(typed).toBe(0);expect(actions).toBe(mode==='already-selected'||mode==='unknown'?0:1);
 expect(run.workflow!.steps[0].status).toBe(mode==='unconfirmed'||mode==='unknown'?'unverified':'verified');expect(run.status).toBe(mode==='unconfirmed'||mode==='unknown'?'limited':'completed');
});
