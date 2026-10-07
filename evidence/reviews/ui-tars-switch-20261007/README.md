# UI-TARS 1.5 7B 전환 검증

코드 커밋: `23ddfa3`. 모델 `bytedance/ui-tars-1.5-7b`, 앱 계열 `ui-tars-1.5`.

- 전체 플랫폼 61 + 샘플 3 = 64테스트, 공유 UI 타입 검사, 두 앱 빌드 PASS.
- 실제 Chromium + 모의 공급자에서 동일 UI-TARS 모델 ID로 SDK aiAct 클릭, aiInput 값 교체, aiString 응답 처리 확인. 공개 1.5의 resized-image pixel 좌표는 공식 ByteDance parser로 해석해 SDK의 normalized action 형식으로 변환. 화면 밖 좌표 차단 및 2048토큰 상한 검사.
- 동일 코드의 별도 체크아웃에서 구 기본값의 자동 이관, 불러오기 버튼, UI 저장/새로고침, 서버 재시작 복원 PASS. 겹침 검사·지침·호출/행동/시간 값 유지. API 키 없이 진행.
- `SETTINGS.png` 직접 시각 확인. UI 페이지 오류 0.
- 설정 이관 백업은 API 키 제외. 사용자 지정 모델과 이관 후 명시적 Qwen 복귀 보존.

## 한계

추가 유료 모델 호출 0. 이 자료는 호환 코드와 로컬 UI 검증이며 OpenRouter 실응답의 형식 준수, 한국어 주문 성공, 결함 검출 개선을 입증하지 않는다. 이전 Qwen 원본은 보존한다. 공개 UI-TARS와 Doubao 1.5는 같은 좌표 모드가 아니므로 이름만 치환하지 않았다. SDK aiAct의 UI-TARS 전용 계획 경로는 deepLocate 옵션을 지원하지 않으며 aiInput 정밀 탐색은 유지한다.

초기 모의 클릭 실패는 두 단계 요청에 동일 입력칸 응답을 반환한 시험 공급자 문제였다. 실제 SDK 추가 위치 탐색을 구분하도록 테스트를 수정했다. SDK 자체의 클릭 결함으로 확정하지 않는다.

Sources: installed Midscene 1.14.0 UI-TARS planner and Qwen2.5-VL adapter; https://github.com/bytedance/UI-TARS/blob/main/README_coordinates.md ; https://openrouter.ai/bytedance/ui-tars-1.5-7b .
