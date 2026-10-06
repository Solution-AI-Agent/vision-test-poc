# -*- coding: utf-8 -*-
from pathlib import Path
from decimal import Decimal
import json,hashlib,shutil,subprocess
root=Path('/Users/zpro/.buzz');out=root/'OUTBOX/VISION_TEST_LUMEN_V5'
out.mkdir(exist_ok=False)
for name in ['ASSETS','SOURCES','PREVIEWS','WORKFLOW','APPENDIX']:(out/name).mkdir()
repo=root/'REPOS/vision-test-maker'
matrix_path=repo/'artifacts/demo-verify-2026-10-05T01-22-24-239Z/RESULTS.json'
m=json.loads(matrix_path.read_text());assert len(m['results'])==6
assert sum(r['calls'] for r in m['results'])==6
assert sum(Decimal(str(r['reportedCost'])) for r in m['results'])==Decimal('0.00255091')
items=[]
def copy_source(p,q,kind):
 shutil.copyfile(p,q)
 assert p.read_bytes()==q.read_bytes()
 items.append(dict(original=str(p.relative_to(root)),copy=str(q.relative_to(out)),sha256=hashlib.sha256(q.read_bytes()).hexdigest(),kind=kind))
for r in m['results']:
 image_path=repo/'artifacts'/r['id']/'model-request-1.jpg'
 h=hashlib.sha256(image_path.read_bytes()).hexdigest()
 image_refs=[b for msg in r['requests'][0]['messages'] if isinstance(msg.get('content'),list) for b in msg['content'] if b.get('type')=='image_url']
 assert len(image_refs)==1 and image_refs[0]['sha256']==h
 assert r['domSuite']=='PASS'
 assert r['output']['status']==('pass' if r['state']=='normal' else 'candidate')
 if r['repetition']==1:
  state='normal' if r['state']=='normal' else 'fault'
  copy_source(image_path,out/'ASSETS'/(state+'.jpg'),'actual 1280x720 model input; unchanged')
text_inputs=[json.dumps(r['requests'][0],sort_keys=True).replace(r['requests'][0]['messages'][1]['content'][1]['sha256'],'IMAGE_HASH') for r in m['results']]
assert len(set(text_inputs))==1
for p in [matrix_path,repo/'artifacts/demo-verify-2026-10-05T01-22-24-239Z/MAKER_REVIEW.json',root/'WORK_LOGS/VISION_QA_WORKING_DEMO_ACCEPTANCE_2026_10_05.md',repo/'DEMO_HANDOFF.md']:
 copy_source(p,out/'SOURCES'/p.name,'original record/review snapshot')
for state in ['normal','fault']:
 copy_source(repo/'artifacts/demo-ui-3163da8'/(state+'.png'),out/'ASSETS'/('maker-ui-'+state+'.png'),'responsive demo UI; not model input')
baseline=subprocess.check_output(['git','-C',str(repo),'show',m['source']['commit']+':scripts/fixture-baseline.ts'])
assert hashlib.sha256(baseline).hexdigest()==m['source']['baselineHash']
(out/'SOURCES/fixture-baseline.ts').write_bytes(baseline)
fault=next(r for r in m['results'] if r['id']=='ae75c703-b63f-477b-84a0-0c9e753dd31a')
normal=next(r for r in m['results'] if r['id']=='b7181596-c25a-4eb9-be43-56e76d685802')
assert fault['output']['issues'][0]['location']=='Your receipt section'
for n,r in [('FAULT_RUN',fault),('NORMAL_RUN',normal)]:
 (out/'SOURCES'/(n+'.json')).write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
previous=[root/'OUTBOX/VISION_QA_CONTROLLED_INDEPENDENT_REVIEW_2026_10_05.json',root/'WORK_LOGS/VISION_QA_CONTROLLED_RESULT_REVIEW_2026_10_05.md',root/'PLANS/VISION_QA_WORKING_DEMO_PRIORITY_2026_10_05.md']
for p in previous:copy_source(p,out/'APPENDIX'/p.name,'prior experiment/selection disclosure; not pooled with current six trials')
rows=[
 (7,'fault','주문은 끝났는데, 영수증을 읽을 수 없습니다','실제 모델 입력 · 의도적으로 주입한 렌더링 결함',['큰 빈 패널이 영수증을 가려 상품·금액·합계를 읽을 수 없습니다.','실제 1280×720 입력 화면의 영수증 영역을 확대합니다.']),
 (6,'dom','같은 실행의 기능 검사는 PASS','ae75c703… · 실제 원장 발췌',['주문 완료·명세·의미 총액·요소 가시성 검사는 통과했습니다.','이 PASS가 화면의 읽기 가능성을 보장하지는 않습니다.']),
 (10,'issue','Vision은 가려진 영수증을 지적했습니다','ae75c703… · 원응답 첫 issue',['문제 위치는 “Your receipt section”입니다.','큰 패널 때문에 상품명·금액·합계를 읽을 수 없다는 실제 지적입니다.']),
 (7,'normal','정상 화면은 같은 기준으로 통과','b7181596… · 실제 입력과 저장된 모델 응답',['정상 화면에서는 명세와 영수증을 읽을 수 있습니다.','이 정상 실행은 pass로 판정했고 문제가 없다고 기록했습니다.']),
 (12,'scope','같은 업무, 서로 다른 검증 정보','기능 assertion / 시각적 수락 기준',['기능 검사는 주문 상태와 의미 데이터를 확인합니다.','Vision은 현재 화면에서 사용자가 내용을 읽을 수 있는지 판단합니다.']),
 (12,'toggle','사이트에서 정상과 결함을 전환합니다','실제 UI 조작 캡처 순서 편집 · 모델 입력과 별도',['정상 또는 렌더링 결함을 선택하고 Confirm order를 누릅니다.','전환은 유료 호출을 하지 않습니다. 오른쪽은 저장된 실제 실행 결과입니다.']),
 (12,'evidence','주문 완료에서 실제 검사 근거로','실제 UI 캡처 · 원본 이미지와 원응답 링크',['주문 완료 화면 옆에서 기능 PASS와 Vision 지적을 확인합니다.','실제 입력 이미지와 원응답/로그 링크로 해당 실행의 근거를 열 수 있습니다.']),
 (12,'assertion','기능 검사에서 실제로 확인한 항목','고정 baseline · 실측 코드 373ecad3 · 소스 발췌',['의미 총액과 안내 DOM 문구·영수증 요소의 가시성을 검사합니다.','이 assertion은 큰 패널 뒤의 픽셀 내용을 읽을 수 있는지 판정하지 않습니다.']),
 (12,'loop','현재 화면 한 장을 직접 판단합니다','Midscene 화면 평가 · qwen/qwen3-vl-30b-a3b-instruct',['현재 화면과 공통 가독성 기준으로 모델이 직접 판단했습니다.','DOM·정답·기준 이미지·이력은 제공하지 않았습니다. 전사+코드 비교가 아닙니다.']),
 (10,'detail','영수증의 위치와 읽기 문제를 연결','정상/결함 실제 입력 · 같은 영역 확대',['정상 영수증에는 상품·금액·합계가 보입니다.','결함 화면의 같은 영역은 가려져 있습니다. 이 문제를 실제 응답이 지적했습니다.']),
 (10,'matrix','고정 확인: 정상 3/3 · 결함 3/3 지적','같은 고정 모델·코드·공통 기준의 확인 실행',['정상은 3/3 PASS, 결함은 3/3 candidate. 기능 suite는 6/6 PASS입니다.','고정 확인 6요청 · 공급자 응답 보고 비용 $0.00255091입니다.']),
 (10,'screenshot','Playwright도 기준 화면을 비교할 수 있습니다','실제 screenshot suite도 이 결함을 구분',['Playwright의 기준 screenshot 검사도 이 결함을 잡았습니다.','이번 비교 대상은 동일 업무의 DOM/기능 assertion과 시각적 수락 기준입니다.']),
 (10,'value','기준 이미지 없는 화면 검토의 추가 가치','확인한 범위: 선택한 영수증 가림 사례',['기능 검사가 통과한 화면의 읽기 문제를, 기준 이미지 없이 발견했습니다.','자연어 요구와 현재 화면을 대조하고 문제 위치·이유를 설명한 사례입니다.']),
 (10,'limits','선별한 통제 데모라는 한계는 남습니다','이전 실패는 출처·부록에 별도 보존',['선별한 주입 사례·등록 기준 평가입니다. 일반 성능이나 완전 자율 발견은 미입증입니다.','이전 미탐도 보존했습니다. Windows와 모바일 Vision 정확도는 미검증입니다.']),
 (20,'end','사이트에서 직접 확인하세요','정상/결함 전환 → 주문 완료 → 실제 검사 근거',['127.0.0.1:4310/demo에서 상태를 선택하고 주문을 완료해 비교 화면을 보세요.','저장된 실제 입력과 원응답으로 기능 PASS와 Vision 지적의 근거를 확인할 수 있습니다.'])]
sc=[];t=0
for i,(dur,kind,title,kicker,caps) in enumerate(rows,1):
 sc.append(dict(id=i,start=t,duration=dur,kind=kind,title=title,kicker=kicker,captions=caps));t+=dur
assert t==160 and sc[4]['start']==30
doc=dict(project='vision-test',version='v5-final-review-01',duration=t,resolution=[1280,720],fps=24,audio='silent Korean captions',scenes=sc)
(out/'SCRIPT_STORYBOARD.json').write_text(json.dumps(doc,ensure_ascii=False,indent=2)+'\n')
manifest=dict(project='vision-test',version=doc['version'],sources=items,source=m['source'],all_six_actual_input_hashes_verified=True,all_six_request_texts_identical=True,opening=dict(fault_run=fault['id'],model_image='ASSETS/fault.jpg',dom_field='SOURCES/FAULT_RUN.json:domSuite',issue_field='SOURCES/FAULT_RUN.json:output.issues[0]',normal_run=normal['id'],normal_image='ASSETS/normal.jpg',normal_field='SOURCES/NORMAL_RUN.json:output.status'),fixed_confirmation=dict(calls=6,reported_cost='0.00255091',normal='3/3 pass',defect='3/3 candidate',dom='6/6 PASS'),selection=dict(calls=9,reported_cost='0.00356816',includes='normal probe, missed smaller candidate, detected larger candidate, six fixed confirmations',not_pooled=True),blind_extraction='separate earlier diagnostic, not current direct-judgment success',second_collection_issue='not used as precise localization evidence',scope='selected injected case; registered criteria; no autonomous/general/Windows/mobile Vision claim',demo_url='http://127.0.0.1:4310/demo')
(out/'EVIDENCE_MANIFEST.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
shutil.copyfile(__file__,out/'PREPARE_FINAL.py')
print('Prepared final v5: 160s, same-run receipt issue + normal control; six input hashes and costs verified.')
