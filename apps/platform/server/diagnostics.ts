export type ExecutionPhase = "artifact-prepare" | "target-validation" | "browser-launch" | "video-context" | "target-navigation" | "screenshot" | "model-initialization" | "goal-selection" | "model-plan" | "visual-review" | "action" | "input-confirmation" | "video-finalization" | "persistence";
export const phaseLabels: Record<ExecutionPhase, string> = {
  "visual-review": "독립 시각 QA 검사",
  "artifact-prepare": "증거 폴더 준비", "target-validation": "대상 주소 검증", "browser-launch": "Chromium 시작", "video-context": "브라우저·동영상 준비", "target-navigation": "대상 페이지 접속", screenshot: "화면 캡처", "model-initialization": "Vision 모델 초기화", "goal-selection": "자율 테스트 가설 선택", "model-plan": "화면 관찰·계획", action: "Playwright 행동 실행", "input-confirmation": "입력 결과 시각 확인", "video-finalization": "동영상 저장", persistence: "실행 기록 저장",
};
const advice = {
  PROXY_CONFIGURATION_INVALID: ["프록시 환경변수 형식이 잘못됐습니다.", "HTTP_PROXY/HTTPS_PROXY를 http(s) 프록시 URL로 설정하고 서버를 다시 시작하세요. PAC 주소는 지원하지 않습니다."],
  PROXY_NETWORK_FAILED: ["설정한 프록시를 통해 모델 공급자에 연결하지 못했습니다.", "사내 프록시 주소·인증·NO_PROXY·CA 신뢰를 확인하세요. 직접 접속으로 자동 우회하지 않습니다."],
  BROWSER_NOT_INSTALLED: ["Chromium 실행 파일이 설치되지 않았습니다.", "저장소 루트에서 npx playwright install chromium을 실행한 뒤 npm run doctor로 확인하세요."],
  BROWSER_LAUNCH_FAILED: ["Chromium을 시작하지 못했습니다.", "npm run doctor로 브라우저 실행을 확인하고 보안 프로그램·권한·지원 환경을 확인하세요."],
  VIDEO_NOT_INSTALLED: ["Playwright 동영상 실행 파일이 설치되지 않았습니다.", "npx playwright install chromium을 실행해 Chromium과 FFmpeg를 설치하고 npm run doctor로 확인하세요."],
  VIDEO_FAILED: ["브라우저 동영상 준비 또는 저장에 실패했습니다.", "npm run doctor로 동영상 생성과 임시 폴더 쓰기를 확인하세요."],
  TARGET_INVALID: ["지원하지 않는 대상 주소입니다.", "허용된 정확한 대상 URL을 사용하세요. 운영자·API·다른 로컬 포트는 허용하지 않습니다."],
  TARGET_UNREACHABLE: ["대상 페이지에 연결하지 못했습니다.", "같은 PC의 브라우저에서 대상 주소를 열고 사내 프록시·CA 신뢰를 확인하세요. 샘플 URL은 그 PC에서 npm run sample:start로 서버를 실행해야 합니다."],
  TARGET_TIMEOUT: ["대상 페이지 접속 시간이 초과됐습니다.", "대상 서버 응답과 네트워크·프록시를 확인하세요. API 키 인증과 대상 접속은 별개입니다."],
  SCREENSHOT_FAILED: ["대상 화면을 캡처하지 못했습니다.", "브라우저가 종료됐는지 확인하고 npm run doctor로 기본 화면 캡처를 점검하세요."],
  MODEL_API_FAILED: ["모델 API가 요청을 거부했습니다.", "HTTP 코드에 따라 API 키·모델 사용 권한·잔액·공급자 한도를 확인하세요."],
  MODEL_NETWORK_FAILED: ["모델 공급자에 연결하지 못했습니다.", "OpenRouter 네트워크·프록시·방화벽을 확인하세요. 키 연결 확인과 실제 이미지 요청은 별개입니다."],
  MODEL_TIMEOUT: ["모델 응답 시간이 초과됐습니다.", "공급자 상태와 설정한 모델·실행 시간 한도를 확인하세요."],
  MODEL_INITIALIZATION_FAILED: ["Vision 모델 초기화에 실패했습니다.", "설정한 모델 ID·Midscene 모델 family와 환경을 확인하세요."],
  MODEL_RESPONSE_INVALID: ["모델 응답을 계획 형식으로 검증하지 못했습니다.", "모델의 구조화된 응답 지원과 출력 토큰 설정을 확인하세요. 이 실패는 제품 결함 판정이 아닙니다."],
  MODEL_OUTPUT_TRUNCATED: ["모델 응답이 출력 토큰 한도에서 잘렸습니다.", "모델과 출력 토큰 설정을 확인하세요. 잘린 응답은 성공으로 처리하지 않습니다."],
  INPUT_CONFIRMATION_FAILED: ["도구 완료 후 입력 결과 확인에 실패했습니다.", "입력 결과와 요청 증거를 확인하세요. 도구 완료만으로 업무 성공을 판단하지 않습니다."],
  ACTION_FAILED: ["브라우저 행동 실행에 실패했습니다.", "화면과 브라우저 상태를 확인하세요. 자동화 실패는 제품 결함이 아닙니다."],
  ARTIFACT_WRITE_FAILED: ["실행 증거 또는 기록을 저장하지 못했습니다.", "저장소 루트 .data/·artifacts/와 임시 폴더의 쓰기 권한·남은 공간을 확인하세요."],
  EXECUTION_FAILED: ["실행 단계에서 오류가 발생했습니다.", "실패 단계·오류 코드와 npm run doctor 결과를 공유하세요. API 키나 공급자 원문은 공유하지 마세요."],
} as const;
export type FailureCode = keyof typeof advice;
export type RunDiagnostic = { code: FailureCode; phase: ExecutionPhase; message: string; action: string; httpStatus?: number };
export class SafeExecutionError extends Error {
  constructor(public code: FailureCode, public httpStatus?: number) { super(code); this.name = "SafeExecutionError"; }
}
// Raw strings are inspected only for known categories, never copied into output.
export function diagnose(error: unknown, phase: ExecutionPhase): RunDiagnostic {
  const e = error as { name?: string; message?: string; code?: string; status?: number } | undefined;
  const text = String(e?.message ?? "");
  let code: FailureCode;
  let httpStatus: number | undefined;
  if (error instanceof SafeExecutionError) { code = error.code; httpStatus = error.httpStatus; }
  else if (phase === "artifact-prepare" || phase === "persistence" || ["EACCES", "EPERM", "ENOSPC", "EROFS"].includes(e?.code ?? "")) code = "ARTIFACT_WRITE_FAILED";
  else if (/Executable doesn't exist|executable.*(?:missing|not found)/i.test(text)) code = /ffmpeg/i.test(text) ? "VIDEO_NOT_INSTALLED" : "BROWSER_NOT_INSTALLED";
  else if (phase === "browser-launch") code = "BROWSER_LAUNCH_FAILED";
  else if (phase === "video-context" || phase === "video-finalization") code = "VIDEO_FAILED";
  else if (phase === "target-validation") code = "TARGET_INVALID";
  else if (phase === "target-navigation") code = e?.name === "TimeoutError" ? "TARGET_TIMEOUT" : "TARGET_UNREACHABLE";
  else if (text === "MODEL_OUTPUT_TRUNCATED") code = "MODEL_OUTPUT_TRUNCATED";
  else if (text === "INPUT_CONFIRMATION_FAILED") code = "INPUT_CONFIRMATION_FAILED";
  else if (e?.name === "ZodError") code = "MODEL_RESPONSE_INVALID";
  else if (phase === "screenshot") code = "SCREENSHOT_FAILED";
  else if (phase === "model-initialization") code = "MODEL_INITIALIZATION_FAILED";
  else if (phase === "action") code = "ACTION_FAILED";
  else if (["goal-selection", "model-plan", "visual-review", "input-confirmation"].includes(phase)) code = "MODEL_RESPONSE_INVALID";
  else code = "EXECUTION_FAILED";
  if (httpStatus !== undefined && (!Number.isInteger(httpStatus) || httpStatus < 400 || httpStatus > 599)) httpStatus = undefined;
  const [message, action] = advice[code];
  const httpAction = code === "MODEL_API_FAILED" ? ({401:"API 키를 다시 확인하세요.",402:"OpenRouter 계정 잔액을 확인하세요.",403:"모델 사용 권한과 공급자 접근 정책을 확인하세요.",429:"공급자 요청 한도와 사용량을 확인하세요."} as Record<number,string>)[httpStatus ?? 0] : undefined;
  return { code, phase, message, action: httpAction ?? action, ...(httpStatus ? {httpStatus} : {}) };
}
