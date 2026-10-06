from pathlib import Path
import json
b=Path('OUTBOX/VISION_AGENT_CONCEPT_2026_10_06_V1')
d=json.loads((b/'STORYBOARD.json').read_text())
changes={6:('화면에 드러난 상태를 확인합니다',['선택 표시·버튼 활성·로딩처럼 현재 화면에 드러난 상태를 읽습니다.','명령을 보냈다는 기록과 지금 보이는 상태를 구분해 다음 선택에 반영합니다.'],'설정 스위치가 꺼짐에서 켜짐으로 바뀌고 관찰된 상태가 강조된다.'),7:('관계와 맥락으로 대상을 구분',['“노란 메모 오른쪽 폴더”처럼 화면 속 관계로 목표를 표현할 수 있습니다.','대상 간 관계를 사용합니다. 가려지거나 모호하면 추가 확인이 필요합니다.'],'메모와 폴더의 간격이 바뀌어도 오른쪽 관계 연결선이 목표 폴더를 가리킨다.')}
js=(b/'CONCEPT_ENGINE.js').read_text()
for i,(title,caps,visual) in changes.items():
    s=d['scenes'][i]
    js=js.replace(s['title'],title)
    for old,new in zip(s['captions'],caps): js=js.replace(old,new)
    s.update(title=title,captions=caps,visual=visual)
swift6='''case 6:
  window(130,200,670,365,"현재 설정 화면")
  text("집중 모드",175,300,360,30,ink,true,60)
  let on=u>5
  box(550,294,190,75,on ? mint.withAlphaComponent(0.7) : muted.withAlphaComponent(0.3))
  circle(587+110*p,331,26,ink,true)
  text(on ? "켜짐" : "꺼짐",175,425,340,30,on ? mint : muted,true,60)
  arrow(CGPoint(x:825,y:332),CGPoint(x:910,y:332),mint)
  note("선택 표시와\n현재 상태 확인",930,287,280)
  text("화면에 드러난 상태를 다음 선택의 입력으로",230,585,1000,24,mint,true,36)
 '''
swift7='''case 7:
  box(80,205,490,120);text("목표: 노란 메모 오른쪽 폴더",105,240,440,25,ink,true,65)
  box(215,390,120,110,amber.withAlphaComponent(0.8))
  text("메모",235,428,110,22,ink,true,38)
  let fx=560+200*p
  box(fx,373,150,126,mint.withAlphaComponent(0.25),mint);box(fx,357,65,24,mint.withAlphaComponent(0.5))
  text("폴더",fx+35,425,130,23,mint,true,40)
  box(900,214,150,126,muted.withAlphaComponent(0.2),muted);text("폴더",925,257,130,23,muted,true,40)
  arrow(CGPoint(x:350,y:435),CGPoint(x:fx-16,y:435),mint)
  text("오른쪽 관계",375,467,300,23,mint,true,45)
  text("같은 모양도 주변 관계로 구분",380,570,850,28,mint,true,46)
 '''
for fn in ['RENDER.swift','ANIMATION_BODY.swift']:
    p=b/fn;s=p.read_text();start=s.index('case 6:');end=s.index('case 8:',start);s=s[:start]+swift6+swift7+s[end:];p.write_text(s)
start=js.index('case 6:');end=js.index('case 8:',start)
js6="""case 6:win(130,200,670,365,'현재 설정 화면');text('집중 모드',175,300,30);{let on=p>.5;box(550,294,190,75,on?C.mint:C.muted);circle(587+110*p,331,26,C.ink,true);text(on?'켜짐':'꺼짐',175,425,30,on?C.mint:C.muted);}arrow(825,332,910,332);text('선택 표시와\\n현재 상태 확인',930,287,25,C.mint,280);text('화면에 드러난 상태를 다음 선택의 입력으로',230,585,24,C.mint);break;
case 7:box(80,205,490,120);text('목표: 노란 메모 오른쪽 폴더',105,240,25,C.ink,440);box(215,390,120,110,C.amber);text('메모',235,428,22);{let fx=560+200*p;box(fx,373,150,126,C.card,C.mint);box(fx,357,65,24,C.mint);text('폴더',fx+35,425,23,C.mint);arrow(350,435,fx-16,435);}box(900,214,150,126,C.card,C.muted);text('폴더',925,257,23,C.muted);text('오른쪽 관계',375,467,23,C.mint);text('같은 모양도 주변 관계로 구분',380,570,28,C.mint);break;
"""
js=js[:start]+js6+js[end:]
(b/'CONCEPT_ENGINE.js').write_text(js)
(b/'STORYBOARD.json').write_text(json.dumps(d,ensure_ascii=False,indent=2))
old=Path('.scratch/BUILD_CONCEPT_HTML.py').read_text()
old=old.replace('03 위치 이동 · 07 안내 폭 · 08 막대 길이','03 위치 이동 · 07 선택 상태 · 08 대상 간격').replace('안내가 읽히는지, 숫자와 그림이 어울리는지 같은 시각적 관계를 질문합니다.','선택 상태·진행 상태·화면 전후 변화처럼 사용자에게 보이는 결과를 질문합니다.')
Path('.scratch/BUILD_CONCEPT_HTML_R2.py').write_text(old)
exec(compile(old,'BUILD_CONCEPT_HTML_R2.py','exec'))
def ts(x):return f'{x//3600:02}:{x//60%60:02}:{x%60:02},000'
txt=['VISION AGENT · 개념 설명 V1','168초 / 12장면 / 무음 한국어 자막','b1b3를 3Blue1Brown식 개념 시각화로 해석. 브랜드/캐릭터를 모방하지 않고 도형·연결·변화로 설명.','모든 화면/Agent 선택은 개념 예시이며 실제 모델 실행 결과가 아니다. 프로젝트의 실험 자료는 포함하지 않는다.',''];cues=[]
for s in d['scenes']:
    txt.extend([f"{s['id']:02} | {s['start']}–{s['start']+14}초 | {s['title']}",s['visual'],*s['captions'],''])
    for k,c in enumerate(s['captions']):cues.append(f"{len(cues)+1}\n{ts(s['start']+7*k)} --> {ts(s['start']+7*(k+1))}\n{c}\n")
(b/'SCRIPT_STORYBOARD.txt').write_text('\n'.join(txt));(b/'CAPTIONS_KO.srt').write_text('\n'.join(cues))
print('Refined generic agent examples: selection state and spatial reference')
