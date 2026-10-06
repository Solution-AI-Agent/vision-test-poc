from pathlib import Path
import json, hashlib, html

base=Path('OUTBOX/VISION_TEST_LUMEN_V5')
doc=json.loads((base/'SCRIPT_STORYBOARD.json').read_text())
manifest=json.loads((base/'EVIDENCE_MANIFEST.json').read_text())
def write(name, content):
    p=base/name
    if p.exists(): raise RuntimeError(f'Refusing overwrite: {p}')
    p.write_text(content,encoding='utf-8')
def stamp(seconds):
    ms=round(seconds*1000)
    return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'
motions={
1:'동일 결함 입력 JPEG 전체를 1.5초 보여주고 3.5초까지 영수증 영역으로 확대한 뒤 유지.',
2:'같은 ae75c703 실행의 입력 JPEG와 원장 domSuite: PASS 발췌를 병치. 콘솔 녹화가 아님.',
3:'같은 JPEG의 영수증 영역과 원응답 첫 issue의 location/reason을 병치. 두 번째 추측 issue는 검출 근거로 쓰지 않음.',
4:'b7181596 정상 입력 JPEG와 저장된 pass 판정. 도입 30초 안에 정상 대조를 완료.',
5:'동일 업무의 기능 assertion과 시각적 수락 기준이 확인하는 정보를 두 카드로 비교.',
6:'실제 UI의 정상 선택/주문 완료/결함 선택/주문 완료 캡처를 3초씩 순서 편집. 현재 유료 호출처럼 보이지 않게 표시.',
7:'앞 6초는 정상 실제 검사 근거 패널과 원본/JSON 링크, 뒤 6초는 결함 이미지 링크를 실제로 연 브라우저 캡처.',
8:'고정 fixture-baseline.ts의 실제 assertion 발췌. 전체 수신자/명세/안내 문구 검사도 있음을 표시.',
9:'현재 화면 → 공통 가독성 기준 → 모델 직접 판단 → 위치/이유/증거 대조. 별도 전사+코드 판정과 구분.',
10:'정상/결함 실제 JPEG의 같은 영수증 영역을 같은 크기로 병치.',
11:'고정 확인 6회의 DOM 결과/모델 판정/독립 검토를 표로 표시. 후보 선정 9회와 별도.',
12:'실제 Playwright 정상 reference PNG와 결함 입력 JPEG의 같은 영역을 비교.',
13:'같은 카드 구도에서 기준 이미지 카드를 자연어 가독성 요구 카드로 전환.',
14:'선별한 주입 사례와 등록 기준 평가의 한계, 이전 실패 부록, Windows/모바일 Vision 미검증.',
15:'앞 10초 실제 데모 UI와 조작 4단계, 뒤 10초 로컬 URL과 증거 기반 추가 가치.'}
text=['VISION-TEST · LUMEN · v5 최종 검수본','2분 40초 / 1280×720 / 24fps / 무음 한국어 자막','목적: 기능 검사가 통과한 화면의 읽기 문제를 Vision이 지적하는 작동 데모 설명.','']
rows=[]; srt=[]; count=0
for s in doc['scenes']:
    start=s['start']; end=start+s['duration']
    body=f"장면 {s['id']:02} | {stamp(start)}–{stamp(end)} | {s['title']}\n표시: {s['kicker']}\n화면/움직임: {motions[s['id']]}\n자막 전반: {s['captions'][0]}\n자막 후반: {s['captions'][1]}\n"
    text.append(body)
    rows.append(f'<article><h2>{s["id"]:02} · {start}–{end}초 · {html.escape(s["title"])}</h2><p>{html.escape(s["kicker"])}</p><p>{html.escape(motions[s["id"]])}</p><ol>'+''.join(f'<li>{html.escape(c)}</li>' for c in s['captions'])+'</ol></article>')
    for j,c in enumerate(s['captions']):
        count+=1
        a=start+s['duration']*j/2; b=start+s['duration']*(j+1)/2
        srt.append(f'{count}\n{stamp(a)} --> {stamp(b)}\n{c}\n')
write('SCRIPT_STORYBOARD.txt','\n'.join(text))
style='<meta charset="utf-8"><style>body{background:#06161b;color:#e4f2f4;font:18px system-ui;max-width:1000px;margin:40px auto;padding:20px}a{color:#72d9c1}article{background:#122b31;border-radius:12px;padding:20px;margin:20px 0}h2{font-size:24px}video,img{max-width:100%}</style>'
write('SCRIPT_STORYBOARD.html',style+'<h1>Vision 차별점 데모 · LUMEN v5</h1><p>160초 · 한국어 자막 · 15장면</p>'+''.join(rows))
write('CAPTIONS_KO.srt','\n'.join(srt))
write('APPENDIX/EXPERIMENT_DISCLOSURE.txt','''실험 범위와 이전 실패 공개

본편의 성공은 선택한 큰 패널 가림 사례의 직접 화면 판단이다. 별도 맹검 전사+코드 비교 성공이 아니다.
고정 확인: 정상 3회 pass, 결함 3회 candidate, DOM 기능 suite 6/6 PASS. 6요청, 공급자 응답 보고 비용 $0.00255091.
후보 선정 전체 9요청에는 정상 사전 확인 1회, 작은 패널 미탐 1회, 큰 패널 후보 지적 1회와 위 고정 확인 6회가 포함된다. 전체 보고 비용 $0.00356816. 6회 비용에 9회 비용을 더하면 중복이다.
선정 단계 원장: selection-probe-RESULTS.json, selection-candidate-RESULTS.json. 실패 후보도 보존했다. 미지 결함의 공정한 성능평가 또는 일반 검출률이 아니다.

이전 통제 평가: 안내 잘림·Canvas 합계 불일치를 각각 3/3 놓쳤고 정상·가벼운 색상 변경은 각각 3/3 pass. 12요청, 보고 비용 $0.00466121. 독립 원본 판정은 VISION_QA_CONTROLLED_INDEPENDENT_REVIEW_2026_10_05.json 및 CONTROLLED_RESULT_REVIEW 문서에 있다. 본편 고정 확인에 합산하지 않는다.
별도 맹검 진단: 같은 저장 화면 전사+고정 코드 비교, 12요청, 보고 비용 $0.010346. $68 전사는 3/3 정확했지만 좌표가 화면 밖이라 고정 비교는 12/12 판단 불가. 사후 판정 규칙을 완화하지 않았다. blind-diagnostic-RESULTS.json을 보존했다.
모델 요청 전 12건/0요청 파이프라인 장애는 실제 모델 미탐과 구분된다. 원본은 REPOS/vision-test-maker/artifacts/controlled-evaluation-2026-10-05T00-03-40-752Z/에 보존돼 있다.
이전 YouTube 기록과 영상 v4, 82초 v5 중간본은 기존 폴더에 보존했다. 이번 본편의 실제 검출 성공 근거로 사용하지 않는다.

Playwright reference screenshot assertion도 선택한 결함을 잡았다. 차이는 DOM/기능 assertion의 범위를 기준 이미지 없는 자연어 화면 판단으로 보완한 사례다.
모든 비용은 공급자 응답의 보고값이며 실제 청구액으로 주장하지 않는다. Windows와 모바일 Vision 정확도, 완전 자율 발견, 일반적인 속도/품질 우위는 미검증이다.
''')
write('REVIEW.html',style+'''<h1>Vision 차별점 작동 데모 · v5 검수</h1><p>2분 40초 · 1280×720 · 24fps · 무음 한국어 자막</p><video controls preload="metadata" src="VISION_TEST_LUMEN_V5.mp4"></video><p><a href="SCRIPT_STORYBOARD.html">대본과 스토리보드</a> · <a href="QA_REPORT.txt">검수 기록</a> · <a href="EVIDENCE_MANIFEST.json">출처와 해시</a> · <a href="APPENDIX/EXPERIMENT_DISCLOSURE.txt">실험 범위·이전 실패 부록</a> · <a href="HANDOFF.txt">인계</a></p><p>첫 30초: 동일 결함 실행의 입력 JPEG → 기능 PASS → 실제 첫 영수증 issue → 정상 대조. 사이트 조작 화면은 저장된 실제 판정이며 유료 실시간 호출이 아닙니다.</p>''')
write('HANDOFF.txt','''VISION-TEST / LUMEN / v5 최종 검수본
검토 담당: POC-LEAD. 사이트 독립 수락 이후 제작한 영상이며 영상 자체는 검수 요청 상태.
영상: VISION_TEST_LUMEN_V5.mp4 (160초, 1280×720, H264, 24fps, 무음 한국어 자막)
재생: REVIEW.html 또는 MP4를 로컬 플레이어에서 연다.
대본/장면: SCRIPT_STORYBOARD.txt / .html / .json. 별도 자막: CAPTIONS_KO.srt (화면 자막과 동일한 30구간).
출처: EVIDENCE_MANIFEST.json. 실제 모델 JPEG: ASSETS/fault.jpg 및 normal.jpg (원본 바이트 유지).
원장/첫 issue/정상 판정: SOURCES/RESULTS.json 및 FAULT_RUN.json/NORMAL_RUN.json. 후자의 두 파일은 원장 발췌본.
독립 수락: SOURCES/VISION_QA_WORKING_DEMO_ACCEPTANCE_2026_10_05.md. DEMO_HANDOFF.md는 당시 원본 사본이며 최신 수락 판단은 독립 검토 문서가 우선.
실제 UI 조작 근거: WORKFLOW/CAPTURE_REPORT.json. 1600×1100 반응형 캡처는 정확한 1280×720 모델 입력과 구분. 이미지/JSON 링크 HTTP200, 페이지 오류0, 추가 모델 호출0.
검수: QA_REPORT.txt / PLAYBACK_REPORT.json / QA_CONTINUOUS/DECODE_REPORT.json / QA_REDUCED_640/.
제작: AppKit/CoreText/AVFoundation Swift, RENDER.swift와 RENDER_BODY.swift, 편집 JSON/ASSETS. VERIFY.swift/PLAYBACK.swift/REDUCED_QA.swift는 검수 도구.
PREPARE_FINAL.py/ASSEMBLE_RENDER.py/PRESERVE_EXTRA_SOURCES.py/CAPTURE_WORKFLOW.mjs는 제작 이력 소스. 일부 출력 경로는 고정돼 있으므로 보존 폴더에서 그대로 재실행하지 말고 새 버전 경로로 바꾼다.
재렌더 예: swiftc -suppress-warnings -module-cache-path .scratch/VISION_TEST_SWIFT_CACHE RENDER.swift -o .scratch/new-v5-render; 새 버전 폴더 경로를 해당 바이너리에 인자로 전달한다. 실행 전 RENDER.swift 인자/출력 규칙을 확인한다. macOS OS 코덱 접근이 필요하다.
이 영상은 실제 캡처를 확대·순서 편집한 설명 영상이다. 원본 WebM의 연속 실시간 녹화라고 주장하지 않는다. 재생 검수의 GUI 전체 시청은 미수행이며 프로그램 실시간 재생과 출력 프레임 확인을 구분했다.
데모: http://127.0.0.1:4310/demo (로컬 앱 실행 필요). 사이트 실행/복원 방법은 SOURCES/DEMO_HANDOFF.md 참조.
선택한 주입 사례의 등록 기준 기반 직접 화면 판단이다. Playwright screenshot도 검출 가능. 이전 실패/선정 단계는 APPENDIX/에 분리했고 성공률에 합산하지 않았다. 두 번째 collection issue의 추측 위치를 정밀 검출 근거로 쓰지 않았다.
API 키·설정 저장소·키가 노출된 대화/화면은 사용하지 않았다. v4와 이전 v5 기록은 덮어쓰지 않았다. 저장된 응답을 현재 실시간 호출로 표시하지 않았다.
''')
print('Generated storyboard text/html, 30 SRT cues, appendix disclosure, review and handoff.')
