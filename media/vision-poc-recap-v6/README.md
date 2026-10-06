# Vision POC recap V6

실제 POC의 화면 기반 주문·시각 검사 차이를 설명하는 160초 무음 한국어 자막 영상입니다. `REVIEW.html`을 열거나 저장소 루트에서 `npm run media:serve` 후 `/media/vision-poc-recap-v6/REVIEW.html`로 접속합니다.

## 원본과 범위

- `ASSETS/`: 수정하지 않은 입력 화면·실제 주문 WebM.
- `SOURCES/`: 동일 실행 원장과 독립 검토. 과거 통제실험과 최신 혼합 검사를 분리합니다.
- `MANIFEST.json`, `SCENE_SOURCES.json`, `EDIT_DECISIONS.json`: 해시, 장면별 출처, 편집 구간/배속.
- `SCRIPT_STORYBOARD.json` / `.txt`, `CAPTIONS_KO.srt`: 대본과 자막.
- `QA_REPORT.txt`, `QA/`: 검수 범위. GUI에서 전체 연속 시청한 것으로 표현하지 않습니다.

영상은 실제 저장 기록의 편집이며 모델 결과를 합성하지 않습니다. 정상 차트 오탐과 겹침 해석 실패를 보존했습니다. 선별한 주입 사례의 검출을 일반 성능이나 최신 한국어 화면의 성공으로 확대하지 않습니다.

## 재생성 (macOS)

Swift/AppKit/AVFoundation와 VP8 디코딩 가능한 FFmpeg가 필요합니다. 렌더 유틸은 LUMEN V5에서 재사용했고, V6 대본·구도·편집·검수는 POC-LEAD가 작성했습니다.

```sh
python3 EXTRACT_CLIPS.py /path/to/ffmpeg /tmp/vision-v6-clips
swiftc RENDER.swift -o /tmp/vision-v6-render
VISION_CLIP_DIR=/tmp/vision-v6-clips /tmp/vision-v6-render "$PWD" --preview
# 최종 MP4가 없는 별도 작업 사본에서만 실행 (기존 출력 덮어쓰기 금지)
VISION_CLIP_DIR=/tmp/vision-v6-clips /tmp/vision-v6-render "$PWD"
swiftc -parse-as-library VERIFY.swift -o /tmp/vision-v6-verify
/tmp/vision-v6-verify VISION_POC_RECAP_V6.mp4 QA/DECODED
```

최종 24fps 영상의 실제 녹화 구간은 원본을 6fps로 샘플링해 합성했습니다. 배속과 시간 생략은 영상에 표시합니다. 원본 WebM은 보존되어 있습니다. 재생성은 API 호출 없이 로컬에서 수행합니다.
