(() => {
 const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
 let scenario='base', generation=0, running=false;
 const copy={base:'목표만 받아도, 화면에서 관련 메뉴를 찾아 행동을 계획할 수 있습니다.',moved:'위치가 달라지면 새 화면에서 대상을 다시 찾습니다. role·label 기반 자동화도 이런 위치 변화에 대응할 수 있습니다.',modal:'예상 밖 팝업이 보이면 지금 필요한 행동을 바꿉니다. 처음 계획을 그대로 실행하는 것만으로는 부족할 수 있습니다.'};
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 function highlight(target){$$('.focused').forEach(e=>e.classList.remove('focused'));$('#focus-tag').hidden=!target;if(target)target.classList.add('focused');}
 function step(n,text,label){$$('.steps li').forEach((e,i)=>{e.classList.toggle('current',i===n);e.classList.toggle('done',i<n)});$('#observation-label').textContent=label;$('#observation').textContent=text;}
 function toggleState(on){$('#notification-toggle').setAttribute('aria-checked',String(on));$('#app-status').textContent=on?'현재 알림이 켜져 있습니다.':'알림이 꺼졌습니다.';$('#setting-description').textContent=on?'새 소식이 오면 알려드려요.':'새 소식 알림을 보내지 않아요.';}
 function openSettings(){ $('#home-panel').hidden=true;$('#settings-panel').hidden=false; }
 function reset(){generation++;running=false;$('#run-demo').disabled=false;$('#run-demo span').textContent='Agent 흐름 보기';$('#home-panel').hidden=false;$('#settings-panel').hidden=true;$('#popup').hidden=scenario!=='modal';$('.top-setting').hidden=scenario!=='moved';$('.bottom-setting').hidden=scenario==='moved';toggleState(true);highlight(null);step(-1,'아래 버튼을 누르면 화면에서 대상을 찾는 과정을 볼 수 있어요.','체험 준비');$('#takeaway').textContent=copy[scenario];$$('.scenario').forEach(b=>{const selected=b.dataset.scenario===scenario;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected));});}
 $$('.scenario').forEach(b=>b.addEventListener('click',()=>{scenario=b.dataset.scenario;reset();}));
 $('#reset-demo').addEventListener('click',reset);
 $$('.mock-setting').forEach(b=>b.addEventListener('click',()=>{if(running)return;openSettings();step(-1,'직접 설정을 열었어요. “처음 화면으로”를 누르면 Agent 흐름을 처음부터 볼 수 있습니다.','직접 조작');}));
 $('#notification-toggle').addEventListener('click',()=>{if(running)return;toggleState($('#notification-toggle').getAttribute('aria-checked')!=='true');});
 $('#dismiss-popup').addEventListener('click',()=>{if(running)return;$('#popup').hidden=true;});
 $('#run-demo').addEventListener('click',async()=>{
  reset();running=true;if(matchMedia('(max-width:760px)').matches)$('#mock-window').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});const current=generation;$('#run-demo').disabled=true;$('#run-demo span').textContent='화면을 따라 진행 중…';
  const pause=async ms=>{await wait(ms);return current===generation;};
  if(scenario==='modal'){
   step(0,'화면 앞에 팝업이 떠 있어요. 먼저 “나중에 보기”로 닫아야 설정에 접근할 수 있습니다.','화면에서 발견');highlight($('#dismiss-popup'));if(!await pause(1600))return;
   $('#popup').hidden=true;highlight(null);step(1,'팝업을 닫았습니다. 바뀐 화면에서 설정 메뉴를 다시 찾습니다.','경로 바꾸기');if(!await pause(1000))return;
  }
  const target=scenario==='moved'?$('.top-setting'):$('.bottom-setting');
  step(0,scenario==='moved'?'설정 메뉴가 오른쪽 위로 옮겨졌어요. 새 화면의 톱니 모양과 글자를 보고 찾습니다.':'왼쪽 아래에 톱니 모양과 “설정” 글자가 보입니다. 목표와 관련 있는 메뉴예요.','대상 찾기');highlight(target);if(!await pause(1700))return;
  openSettings();highlight($('#notification-toggle'));step(1,'설정을 열었어요. “새 소식 알림” 스위치가 켜져 있으니 눌러서 끕니다.','행동 선택');if(!await pause(1600))return;
  toggleState(false);highlight($('.notification-row'));step(2,'스위치가 꺼진 모양으로 바뀌고, “알림이 꺼졌습니다”가 보입니다. 목표와 일치하는 결과예요.','보이는 결과 확인');if(!await pause(1400))return;
  highlight(null);$$('.steps li').forEach(e=>{e.classList.remove('current');e.classList.add('done')});running=false;$('#run-demo').disabled=false;$('#run-demo span').textContent='같은 흐름 다시 보기';$('#observation-label').textContent='개념 시연 완료';
 });
 $$('[data-result]').forEach(b=>b.addEventListener('click',()=>{const changed=b.dataset.result==='changed';$$('[data-result]').forEach(e=>{const active=e===b;e.classList.toggle('active',active);e.setAttribute('aria-pressed',String(active))});$('#result-toggle').classList.toggle('on',!changed);$('#result-state').textContent=changed?'꺼짐':'켜짐';$('#verify-verdict').classList.toggle('success',changed);$('#verdict-symbol').textContent=changed?'✓':'!';$('#verdict-title').textContent=changed?'이 화면에서는 목표와 일치해요.':'아직 목표를 이루지 못했어요.';$('#verdict-body').textContent=changed?'스위치가 꺼진 상태를 확인했습니다. 행동 완료뿐 아니라 화면의 변화가 판단 근거가 됩니다.':'스위치가 여전히 켜져 있습니다. 성공으로 끝내지 않고 원인을 확인해야 합니다.';}));
 reset();
})();
