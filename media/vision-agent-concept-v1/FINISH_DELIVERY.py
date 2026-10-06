from pathlib import Path
import hashlib,json,shutil,zipfile,struct
b=Path('OUTBOX/VISION_AGENT_CONCEPT_2026_10_06_V1')
dec=json.loads((b/'VIDEO_QA/DECODE_REPORT.json').read_text())
play=json.loads((b/'PLAYBACK_REPORT.json').read_text())
web=json.loads((b/'HTML_QA/REPORT.json').read_text())
assert dec['decoded_frames']==4032 and dec['reader_completed'] and dec['monotonic_pts']
assert play['completed'] and play['sampled_decoded_buffers']==4032
assert not web['pageErrors'] and not web['externalRequests']
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
movie=b/'VISION_AGENT_CONCEPT_V1.mp4';page=b/'VISION_AGENT_CONCEPT.html'
assert sha(movie)=='0dcb7d4fde67a4af629caf6ab097e356fff79c16df83c807c567f6406573f859'
boxes=[]
with movie.open('rb') as f:
    while f.tell()<movie.stat().st_size:
        pos=f.tell();size,kind=struct.unpack('>I4s',f.read(8))
        if size==1:size=struct.unpack('>Q',f.read(8))[0]
        if size==0:size=movie.stat().st_size-pos
        boxes.append((kind.decode(),pos));f.seek(pos+size)
assert dict(boxes)['moov']<dict(boxes)['mdat']
story=json.loads((b/'STORYBOARD.json').read_text())
js=(b/'CONCEPT_ENGINE.js').read_text();h=page.read_text()
assert js in h
assert all(s['title'] in js and all(c in js for c in s['captions']) for s in story['scenes'])
for p in b.rglob('*'):
    if p.is_file() and p.suffix in ['.json','.txt','.html','.js','.swift','.srt']:
        assert b'sk-or-v1-' not in p.read_bytes()
for name,source in [('BUILD_CONCEPT_HTML_R2.py','.scratch/BUILD_CONCEPT_HTML_R2.py'),('REFINE_VISION_CONCEPT.py','.scratch/REFINE_VISION_CONCEPT.py'),('CHECK_VISION_CONCEPT_HTML.mjs','.scratch/CHECK_VISION_CONCEPT_HTML.mjs')]:
    assert not (b/name).exists();shutil.copyfile(source,b/name)
report={
    'video':{'file':movie.name,'sha256':sha(movie),'url':'https://orangestandard.communities.buzz.xyz/media/'+sha(movie)+'.mp4','duration':168,'frames':4032,'fps':24,'resolution':[1280,720],'audio':'none','faststart':True},
    'html':{'file':page.name,'sha256':sha(page),'standalone':True,'relay_upload':'rejected unsupported text/html; local file provided'},
    'scope':'general conceptual explainer; project tests and real model outputs excluded',
    'actual_model_calls':0,'html_video_titles_and_captions_match':True,
    'visual_decoded_indices':[2,5,8,11,14,17,20,23,26,29,32,35,37,38,39,40,41,42,43],
    'visual_reduced_indices':[8,11,20,23,32,35],
    'GUI_full_watch':False,'decoder_report':'VIDEO_QA/DECODE_REPORT.json','playback_report':'PLAYBACK_REPORT.json','html_report':'HTML_QA/REPORT.json'}
(b/'DELIVERY_MANIFEST.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
(b/'QA_REPORT.txt').write_text('''VISION AGENT CONCEPT V1 / LUMEN / 2026-10-06

最종 파일: VISION_AGENT_CONCEPT_V1.mp4. 168초/1280×720/24fps/H264/무음 한국어 자막.
전체 4,032프레임 AVAssetReader 연속 디코드: 완료. PTS 단조 증가. 오디오 트랙0. moov가 mdat 앞에 있어 점진 재생 가능.
AVPlayerItemVideoOutput으로 168초 실제 시간 재생: 완료. 4,032버퍼 출력.
43프레임 추출 중 12장면 대표+변화 시점 7장을 포함한 19프레임 직접 시각 검수. 글자 누락·넘침·의도하지 않은 요소 겹침을 발견하지 않았다. 렌더러 텍스트 넘침 검사 empty.
주요 6프레임을 640×360으로 축소해 직접 확인했다. 제목·핵심 도형·한국어 자막이 읽힌다. 작은 출처/주석 글자까지 모바일에서 모두 읽힌다는 주장은 하지 않는다.
GUI 플레이어에서 전체 영상을 사람이 연속 시청한 것은 아니다. 프로그램의 실제 시간 재생과 추출 프레임의 직접 시각 검토를 구분한다. 음성 동기화는 무음이라 해당 없음.

단일 HTML 실제 Chromium 검수: 1440×1100 / 390×844. 12장면 선택, 재생 진행, 일시정지 유지, 시간 이동, 변화 조절에 따른 프레임 변화 확인. page error0, 외부 HTTP 요청0.
데스크톱·모바일 캡처와 대표 장면을 직접 확인했다. 모바일 도해는 축소되므로 별도 본문/장면 요약으로 내용을 읽을 수 있다. 문서 가로 넘침 없음.
HTML/JS/영상 편집 JSON의 12개 제목과 24개 자막이 일치함을 확인했다. 자막 SRT는 각 장면의 전반/후반 7초씩 총24구간으로 화면 자막과 맞춘다.

제작 내용: 직접 만든 화면·도형·선·상태 예시. 실제 모델 응답이나 실행 캡처가 아니다. 프로젝트 테스트 원본·수치·판정·비용을 사용하지 않았다. 유료 모델 호출0.
차별점의 구체적 서사와 시각적 예시는 공식 문서/연구를 종합한 제작자 설명이며 특정 모델 성공 또는 일반 우위 실증이 아니다. role/label locator의 배치 대응과 Playwright screenshot 비교도 설명해 시각 확인을 Vision의 독점 능력처럼 표현하지 않았다.
공식 문서·연구 출처 및 적용 범위는 SOURCES.json / HTML 하단에 있다.

업로드 MP4와 로컬 파일 SHA256 일치. HTML 업로드는 Buzz의 unsupported text/html 오류로 거절돼 로컬 단일 파일로 제공한다. 이는 자동 승인 거절이 아니라 relay 지원 형식 제한이다.
'''.replace('最종','최종'))
review='''<!doctype html><html lang="ko"><meta charset="utf-8"><title>Vision Agent Concept V1 검토</title><style>body{background:#060c17;color:#e8f2ff;font:18px system-ui;max-width:1100px;margin:40px auto;padding:20px}video{width:100%}a{color:#52e0c7}</style><h1>Vision Agent 개념 설명 V1</h1><p>2분 48초 · 1280×720 · 24fps · 무음 한국어 자막</p><video controls src="VISION_AGENT_CONCEPT_V1.mp4"></video><p><a href="VISION_AGENT_CONCEPT.html">인터랙티브 HTML 열기</a> · <a href="SCRIPT_STORYBOARD.txt">대본</a> · <a href="SOURCES.json">출처</a> · <a href="QA_REPORT.txt">검수</a> · <a href="HANDOFF.txt">인계</a></p><p>모든 화면·Agent 선택은 개념 애니메이션이며 실제 모델 실행과 프로젝트 실험 자료가 아닙니다.</p></html>'''
(b/'REVIEW.html').write_text(review)
shutil.copyfile('.scratch/FINISH_VISION_CONCEPT.py',b/'FINISH_DELIVERY.py')
required=['VISION_AGENT_CONCEPT.html','VISION_AGENT_CONCEPT_V1.mp4','SCRIPT_STORYBOARD.txt','STORYBOARD.json','SOURCES.json','CAPTIONS_KO.srt','QA_REPORT.txt','HANDOFF.txt','REVIEW.html','PLAYBACK_REPORT.json','DELIVERY_MANIFEST.json']
assert all((b/p).stat().st_size>0 for p in required)
files=sorted(p for p in b.rglob('*') if p.is_file())
(b/'FILES_SHA256.txt').write_text(''.join(f'{sha(p)}  {p.relative_to(b)}\n' for p in files))
dest=Path('OUTBOX/VISION_AGENT_CONCEPT_2026_10_06_V1.zip');assert not dest.exists()
with zipfile.ZipFile(dest,'x',zipfile.ZIP_DEFLATED) as z:
    for p in sorted(b.rglob('*')):
        if p.is_file():z.write(p,p.relative_to(b.parent))
with zipfile.ZipFile(dest) as z:assert z.testzip() is None
print(json.dumps({'video_sha256':sha(movie),'html_sha256':sha(page),'required_files_exist':True,'bundle':str(dest),'zip_bytes':dest.stat().st_size,'files':len(files)+1},indent=2))
