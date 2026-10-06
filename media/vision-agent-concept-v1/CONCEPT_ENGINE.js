// Authored concept animation. No model calls, no project data or real execution results.
(() => {
const C={bg:'#060c17',card:'#0f1a2b',ink:'#e8f2ff',muted:'#809bb8',mint:'#52e0c7',amber:'#ffb557',blue:'#65a9ff'};
const titles=['화면을 이해하는 Agent','목표와 화면을 하나로 연결','레이아웃이 바뀌면 다시 관찰','행동은 관찰의 다음 단계','예상 밖 화면에서도 경로를 조정','의미 정보가 적은 화면도 다룰 수 있음','화면에 드러난 상태를 확인합니다','관계와 맥락으로 대상을 구분','화면은 서로 다른 앱의 공통 관찰 입력','시도와 결과를 따로 확인','기존 자동화와 역할을 나눕니다','차별점은 관찰을 통한 선택과 확인'];
const captions=[
['소프트웨어의 화면을 관찰하고 목표에 맞는 행동을 선택합니다.','그 뒤 바뀐 화면을 다시 확인합니다. 핵심은 이 순환 구조입니다.'],
['“설정을 열어 주세요”라는 목표가 화면의 기어 아이콘과 연결됩니다.','모양·텍스트·위치를 함께 해석해 행동할 대상을 찾는 과정입니다.'],
['같은 기능이 다른 위치에 나타나면 새 화면에서 대상을 다시 찾습니다.','위치 변화에 대응할 수 있지만 인식 정확도는 모델과 화면에 달려 있습니다.'],
['현재 화면과 목표를 바탕으로 행동을 선택하고 도구로 실행합니다.','새 화면이 계획의 입력이 됩니다. 행동 완료만으로 목표 달성을 단정하지 않습니다.'],
['중간에 대화상자가 나타났다면 현재 화면을 읽고 다음 행동을 바꿀 수 있습니다.','새 장애물을 확인해 우회하거나, 불확실하면 멈추고 확인을 요청합니다.'],
['Canvas나 아이콘 중심 화면에서도 시각적 단서를 사용해 대상을 찾을 수 있습니다.','이미지만으로 작은 글자나 유사한 아이콘을 혼동할 수 있습니다.'],
['선택 표시·버튼 활성·로딩처럼 현재 화면에 드러난 상태를 읽습니다.','명령을 보냈다는 기록과 지금 보이는 상태를 구분해 다음 선택에 반영합니다.'],
['“노란 메모 오른쪽 폴더”처럼 화면 속 관계로 목표를 표현할 수 있습니다.','대상 간 관계를 사용합니다. 가려지거나 모호하면 추가 확인이 필요합니다.'],
['Web과 Native가 달라도 화면을 보고 판단하는 구조를 재사용할 수 있습니다.','클릭·터치·키 입력을 수행할 어댑터와 환경별 권한은 별도로 필요합니다.'],
['클릭 명령을 보냈다는 것과 설정이 실제로 바뀌었다는 것은 다릅니다.','행동 전후 화면과 목표의 충족 여부를 연결해야 결과를 검토할 수 있습니다.'],
['DOM·API 검사는 정확한 데이터와 반복 검증에 강하고, Vision은 화면 해석을 더합니다.','Playwright도 스크린샷 비교를 제공합니다. Vision은 기준 이미지 없는 자연어 검토가 가능합니다.'],
['화면의 의미로 대상을 찾고, 변화에 따라 경로를 바꾸고, 보이는 결과를 확인합니다.','모델 오판·지연·비용은 남습니다. 중요한 결과는 근거를 남기고 검토해야 합니다.']];
const canvas=document.querySelector('canvas'),x=canvas.getContext('2d');
let time=0,playing=false,last=0,variant=null;
function text(s,a,b,size=26,color=C.ink,max=1100){x.fillStyle=color;x.font=`${size>=28?'600':'400'} ${size}px system-ui, sans-serif`;x.textBaseline='top';for(const [i,line] of s.split('\n').entries())x.fillText(line,a,b+i*(size+8),max);}
function box(a,b,w,h,color=C.card,stroke){x.fillStyle=color;x.beginPath();x.roundRect(a,b,w,h,14);x.fill();if(stroke){x.strokeStyle=stroke;x.lineWidth=2;x.stroke();}}
function line(a,b,c,d,color=C.mint,dash=false){x.strokeStyle=color;x.lineWidth=3;x.setLineDash(dash?[7,7]:[]);x.beginPath();x.moveTo(a,b);x.lineTo(c,d);x.stroke();x.setLineDash([]);}
function arrow(a,b,c,d,color=C.mint){line(a,b,c,d,color);let q=Math.atan2(d-b,c-a);line(c,d,c-14*Math.cos(q-.5),d-14*Math.sin(q-.5),color);line(c,d,c-14*Math.cos(q+.5),d-14*Math.sin(q+.5),color);}
function circle(a,b,r,color=C.mint,fill=false){x.beginPath();x.arc(a,b,r,0,Math.PI*2);x.strokeStyle=color;x.lineWidth=3;fill?(x.fillStyle=color,x.fill()):x.stroke();}
function gear(a,b,r=25){circle(a,b,r);circle(a,b,r*.32);for(let i=0;i<8;i++){let q=i*Math.PI/4;line(a+r*Math.cos(q),b+r*Math.sin(q),a+(r+9)*Math.cos(q),b+(r+9)*Math.sin(q));}}
function win(a,b,w,h,label){box(a,b,w,h,C.card,C.muted);line(a,b+38,a+w,b+38,C.muted);for(let i=0;i<3;i++)circle(a+18+i*15,b+18,3,C.muted,true);text(label,a+72,b+10,17,C.muted,w-88);}
function ease(t){t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);}
function draw(t){time=Math.max(0,Math.min(167.999,t));let n=Math.floor(time/14),u=time-n*14,p=variant===null?ease(u/10):variant;x.fillStyle=C.bg;x.fillRect(0,0,1280,720);x.globalAlpha=.08;for(let a=40;a<1280;a+=40)line(a,156,a,602,C.muted);for(let a=160;a<600;a+=40)line(40,a,1240,a,C.muted);x.globalAlpha=1;
text(`VISION AGENT / ${String(n+1).padStart(2,'0')}`,48,22,16,C.mint);text(titles[n],48,62,36,C.ink,1184);
switch(n){
case 0:for(let i=0;i<3;i++){let a=100+i*350;win(a,230,300,235,['Web','Desktop','Mobile'][i]);gear(a+150,342);text('화면',a+110,406,25,C.mint);arrow(a+150,185,a+150,219);}text('목표 → 화면의 의미 → 행동',400,165,25,C.mint);line(180,532,1080,532,C.muted);circle(180+900*p,532,8,C.mint,true);text('‘보이는 것’을 행동의 입력으로',390,550,29);break;
case 1:box(65,240,390,150);text('목표',90,263,22,C.amber);text('설정을 열어 주세요',90,309,28);win(650,205,530,345,'현재 화면');circle(760,355,28,C.muted);gear(910,355);box(1030,325,75,60);text('검색',732,424,22,C.muted);text('설정',885,424,22,C.mint);text('메뉴',1030,424,22,C.muted);arrow(455,315,650+260*p,355);if(u>3)circle(910,355,48);text('화면 속 의미를 행동 대상으로 연결',360,560,25,C.mint);break;
case 2:win(100,190,760,390,'새 레이아웃');gear(250+440*p,335+140*p);circle(250,335,48,C.muted);line(250,335,250+440*p,335+140*p,C.mint,true);arrow(460,545,250+440*p,380+140*p);text('현재 화면에서\n다시 위치 찾기',940,305,25,C.mint,280);text('role / label locator도 배치 변화에 대응할 수 있습니다.',100,590,20,C.muted);break;
case 3:{let ps=[[280,275],[970,275],[970,510],[280,510]],ls=['관찰 Iₜ','판단 + 목표 g','행동 aₜ','새 화면 Iₜ₊₁'];ps.forEach((a,i)=>{arrow(...a,...ps[(i+1)%4],C.muted);box(a[0]-118,a[1]-44,236,88);text(ls[i],a[0]-98,a[1]-16,26);});let v=u/3%4,k=Math.floor(v),f=v-k,a=ps[k],b=ps[(k+1)%4];circle(a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f,9,C.amber,true);text('다음 선택의 입력은 ‘새 화면’',410,374,27,C.mint);break;}
case 4:arrow(140,365,500,365,C.muted);arrow(500,365,1110,365,C.muted);text('목표',90,280,25,C.mint);text('현재 화면',390,275,25,C.mint);text('계속 진행',1010,280,25,C.mint);box(550,305,340,155,C.card,C.amber);text('대화상자 등장',580,341,25,C.amber);text('새 관찰 필요',580,387,21,C.muted);if(u>3||variant!==null){arrow(500,365,755,530);arrow(755,530,1110,365);text('닫기 / 대기 / 확인 요청',560,552,25,C.mint);}break;
case 5:win(90,210,610,335,'Canvas / 이미지 중심 인터페이스');for(let i=0;i<3;i++)i===1?gear(230+i*165,352,34):circle(230+i*165,352,32,C.muted);line(100+580*p,256,100+580*p,530);arrow(770,370,435,370);text('모양 + 위치 + 맥락',820,285,25,C.mint,355);text('시각 단서로 대상 선택\n작은 글자·유사 아이콘은\n오판 가능',820,390,24,C.ink,355);break;
case 6:win(130,200,670,365,'현재 설정 화면');text('집중 모드',175,300,30);{let on=p>.5;box(550,294,190,75,on?C.mint:C.muted);circle(587+110*p,331,26,C.ink,true);text(on?'켜짐':'꺼짐',175,425,30,on?C.mint:C.muted);}arrow(825,332,910,332);text('선택 표시와\n현재 상태 확인',930,287,25,C.mint,280);text('화면에 드러난 상태를 다음 선택의 입력으로',230,585,24,C.mint);break;
case 7:box(80,205,490,120);text('목표: 노란 메모 오른쪽 폴더',105,240,25,C.ink,440);box(215,390,120,110,C.amber);text('메모',235,428,22);{let fx=560+200*p;box(fx,373,150,126,C.card,C.mint);box(fx,357,65,24,C.mint);text('폴더',fx+35,425,23,C.mint);arrow(350,435,fx-16,435);}box(900,214,150,126,C.card,C.muted);text('폴더',925,257,23,C.muted);text('오른쪽 관계',375,467,23,C.mint);text('같은 모양도 주변 관계로 구분',380,570,28,C.mint);break;
case 8:[70,450,830].forEach((a,i)=>{win(a,220,300,230,['Web','Desktop','Mobile'][i]);gear(a+150,345);arrow(a+150,450,640,545);});box(445,514,390,77);text('공통 입력: 화면',485,538,27,C.mint);text('실행 도구는 환경별로: 클릭 / 터치 / 키 입력',320,174,24,C.amber);break;
case 9:['행동 요청','도구 완료','관찰된 변화'].forEach((l,i)=>{let a=70+i*410,active=u>i*3;box(a,290,330,135,C.card,active?C.mint:C.muted);text(l,a+30,329,29,active?C.mint:C.muted);if(i<2)arrow(a+340,358,a+400,358,C.muted);});text('화면 전후 변화 + 목표 충족 근거',310,510,25,C.mint);text('예시: 테마 변경 요청 → 실행 → 실제 화면 색상 확인',220,210,25);break;
case 10:circle(445,370,175,C.mint);circle(815,370,175,C.blue);text('DOM / API',335,308,30,C.mint);text('정확한 값\n명시적 계약\n반복 검증',350,376,25);text('Vision',740,308,30,C.blue);text('현재 화면\n관계와 맥락\n자연어 검토',750,376,25);arrow(615,365,665,365,C.amber);text('Playwright screenshot 비교도 시각 검증의 한 방식',225,590,22,C.muted);break;
case 11:arrow(190,365,630,365);arrow(630,365,1070,265);arrow(630,365,1070,495,C.amber);box(65,315,250,100);text('화면 관찰',95,343,27);box(500,315,260,100);text('근거 확인',530,343,27);box(925,215,280,100);text('목표 충족 확인',950,244,25,C.mint);box(925,445,280,100);text('불확실 → 확인 요청',950,474,23,C.amber);circle(190+440*p,365,9,C.mint,true);text('화면 이해 · 변화에 따른 선택 · 결과 확인',280,563,28,C.mint);break;
}
box(30,626,1220,68);text(captions[n][u<7?0:1],50,640,23,C.ink,1180);text('개념 애니메이션 · 실제 모델 실행 아님 · 실험 자료 미포함',48,701,13,C.muted);x.fillStyle=C.mint;x.fillRect(0,717,time/168*1280,3);
document.querySelector('#time').value=String(time);document.querySelector('#clock').textContent=`${Math.floor(time/60)}:${String(Math.floor(time%60)).padStart(2,'0')} / 2:48`;document.querySelector('#chapter').value=String(n);document.querySelector('#summary').textContent=captions[n].join(' ');document.querySelector('#detail').textContent=titles[n];
}
function tick(now){if(playing&&last){time+=(now-last)/1000;if(time>=168){time=167.999;playing=false;document.querySelector('#play').textContent='재생';}}last=now;if(playing)draw(time);requestAnimationFrame(tick);}
document.querySelector('#chapter').innerHTML=titles.map((s,i)=>`<option value="${i}">${String(i+1).padStart(2,'0')} · ${s}</option>`).join('');
document.querySelector('#play').onclick=()=>{if(time>=167.9)time=0;playing=!playing;last=0;document.querySelector('#play').textContent=playing?'일시정지':'재생';};
document.querySelector('#time').oninput=e=>{variant=null;draw(Number(e.target.value));};
document.querySelector('#chapter').onchange=e=>{variant=null;draw(Number(e.target.value)*14);};
document.querySelector('#variation').oninput=e=>{playing=false;document.querySelector('#play').textContent='재생';variant=Number(e.target.value)/100;let n=Math.floor(time/14);if(![2,6,7].includes(n))n=2;draw(n*14+8);};
document.querySelector('#reset').onclick=()=>{variant=null;playing=false;document.querySelector('#play').textContent='재생';document.querySelector('#variation').value='50';draw(0);};
window.concept={draw,seek:(t)=>{playing=false;variant=null;draw(t);},state:()=>({time,playing,variant}),titles,captions};
draw(0);requestAnimationFrame(tick);
})();
