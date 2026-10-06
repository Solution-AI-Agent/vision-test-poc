from pathlib import Path
import json,hashlib,struct,shutil
base=Path('OUTBOX/VISION_TEST_LUMEN_V5')
manifest=json.loads((base/'EVIDENCE_MANIFEST.json').read_text())
digest=lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
checks=[]
for entry in manifest['sources']:
    copied=base/entry['copy']
    assert copied.exists() and digest(copied)==entry['sha256'],entry['copy']
    original=Path(entry['original'])
    if entry['original'].startswith('WORKFLOW/'):
        original=base/entry['original']
    assert original.exists() and digest(original)==entry['sha256'],entry['original']
    checks.append(entry['copy'])
assert digest(base/'SOURCES/fixture-baseline.ts')==manifest['source']['baselineHash']
decode=json.loads((base/'QA_CONTINUOUS/DECODE_REPORT.json').read_text())
play=json.loads((base/'PLAYBACK_REPORT.json').read_text())
assert decode['decoded_frames']==3840 and decode['reader_completed'] and decode['monotonic_pts']
assert play['completed'] and play['sampled_decoded_buffers']==3840 and not play['full_GUI_watch']
mp4=base/'VISION_TEST_LUMEN_V5.mp4'
boxes=[]
with mp4.open('rb') as stream:
    while stream.tell()<mp4.stat().st_size:
        pos=stream.tell(); header=stream.read(8)
        size,kind=struct.unpack('>I4s',header)
        if size==1: size=struct.unpack('>Q',stream.read(8))[0]
        if size==0: size=mp4.stat().st_size-pos
        boxes.append({'kind':kind.decode(),'offset':pos,'bytes':size})
        stream.seek(pos+size)
assert next(x['offset'] for x in boxes if x['kind']=='moov')<next(x['offset'] for x in boxes if x['kind']=='mdat')
secret_files=[]
for p in base.rglob('*'):
    if p.is_file() and p.suffix in ['.json','.txt','.html','.swift','.py','.mjs','.ts','.md','.srt']:
        if b'sk-or-v1-' in p.read_bytes(): secret_files.append(str(p))
assert not secret_files,'Secret prefix found; do not publish'
report={'verified_original_copies':len(checks),'baseline_hash_matches':True,'full_decode':decode,'realtime_playback':play,'mp4_sha256':digest(mp4),'mp4_boxes':boxes,'secret_prefix_matches':0,'caption_cues':30,'review_status':'awaiting POC-LEAD video review','visual_frame_indices':[1,2,3,5,8,11,14,17,19,20,23,26,29,32,35,38,41,44,46,47,48],'reduced_visual_indices':[2,8,11,19,32]}
out=base/'DELIVERY_VERIFICATION.json'
assert not out.exists()
out.write_text(json.dumps(report,ensure_ascii=False,indent=2))
qa=f'''VISION-TEST / LUMEN / v5 最終検수
검수 대상: VISION_TEST_LUMEN_V5.mp4
SHA256: {digest(mp4)}
출력: 160초, 1280×720, 24fps, H264, 무음 한국어 자막. moov가 mdat 앞에 있어 점진 재생 가능.

실행한 검수
- 최종 파일 전체 3,840프레임 AVAssetReader 연속 디코드 완료. PTS 단조 증가, 마지막 PTS 159.958333초, 오디오 트랙0.
- AVPlayerItemVideoOutput으로 160초 실제 시간 재생 완료. 3,840출력 버퍼, 마지막 시간 {play['last_time_seconds']:.6f}초, 경과 {play['wall_seconds']:.3f}초.
- 연속 디코드 과정에서 48프레임 추출. 그중 15장면 대표 프레임과 도입 시작/확대 유지/확대 중간, UI 정상 완료, 증거 패널, 끝 조작 안내를 포함한 21프레임을 직접 시각 확인.
- 주요 문제/원응답/정상/근거/결과표 5프레임을 640×360으로 축소하여 직접 확인. 제목·한국어 설명·판정·비용·첫 issue가 읽히고 요소 겹침/출력 글자 누락이 보이지 않음. 원본 화면의 작은 세부 글자 전체가 축소 화면에서 읽힌다는 주장은 하지 않음.
- 렌더러 글자 영역 넘침 검사: empty. 최종 시간 연결: 15장면, 160초, 첫 네 장면 0–30초. SRT는 화면 자막과 같은 30구간/반 장면 시점.
- 원본 사본 {len(checks)}개 기록 해시 및 현재 원본과 재대조 일치. baseline 소스의 해시도 고정 기준과 일치. 실제 입력 JPEG와 반응형 UI 캡처를 구분.
- 첫 도입의 ae75c703 입력/DOM PASS/원응답 첫 영수증 issue, 정상 b7181596 판정 연결 확인. 후보 선정·이전 미탐·맹검 진단은 별도 부록이고 일반 성공률/실청구액으로 쓰지 않음.
- 정확한 모델 입력, UI 조작, 검사 링크는 실제 기록을 사용. 편집 카드/확대 화면은 원본 연속 녹화라고 표현하지 않음. API 키 설정 또는 키가 있는 대화 화면을 사용하지 않음.

검수 범위의 한계
- GUI 플레이어에서 160초 전체 시청은 미수행. 프로그램의 실시간 재생 검사와 추출 출력 프레임의 직접 시각 확인을 수행했으며 두 범위를 구분함.
- 무음 영상이라 음성 동기화 검수는 해당 없음. 전체 3,840프레임을 사람이 하나씩 시각 검토한 것은 아님.
- 사이트의 실제 Vision 실험·패키지 테스트는 POC_MAKER/POC-LEAD 기록에 근거. LUMEN은 추가 유료 호출이나 코드 테스트 재실행을 하지 않음. 영상 자체는 POC-LEAD 검수 요청 상태.
'''
qa=qa.replace('最終検수','최종 검수')
assert not (base/'QA_REPORT.txt').exists()
(base/'QA_REPORT.txt').write_text(qa)
shutil.copyfile('.scratch/FINISH_V5_DELIVERY.py',base/'FINISH_DELIVERY.py')
shutil.copyfile(__file__,base/'VERIFY_DELIVERY.py')
required=['VISION_TEST_LUMEN_V5.mp4','SCRIPT_STORYBOARD.txt','SCRIPT_STORYBOARD.html','SCRIPT_STORYBOARD.json','CAPTIONS_KO.srt','QA_REPORT.txt','PLAYBACK_REPORT.json','QA_CONTINUOUS/DECODE_REPORT.json','HANDOFF.txt','REVIEW.html','EVIDENCE_MANIFEST.json','APPENDIX/EXPERIMENT_DISCLOSURE.txt']
assert all((base/p).stat().st_size>0 for p in required)
files=sorted(p for p in base.rglob('*') if p.is_file())
(base/'FILES_SHA256.txt').write_text(''.join(f'{digest(p)}  {p.relative_to(base)}\n' for p in files))
print(json.dumps({'files':len(files)+1,'verified_source_copies':len(checks),'mp4_sha256':digest(mp4),'mp4_bytes':mp4.stat().st_size,'all_handoff_files_exist':True,'moov_before_mdat':True},indent=2))
