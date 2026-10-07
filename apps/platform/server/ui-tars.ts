import { actionParser } from "@ui-tars/action-parser";
import { imageInfoOfBase64 } from "@midscene/shared/img";
import type { Settings } from "./domain";

// Public UI-TARS 1.5 uses Qwen2.5-VL resized-image pixels, unlike Doubao's
// normalized coordinates. Keep Midscene's native action executor; adapt only
// its planning response protocol with ByteDance's versioned official parser.
export function uiTarsModelConfig(settings: Settings): Record<string, string> {
  return settings.family === "ui-tars-1.5" ? {
    MIDSCENE_MODEL_FAMILY: "qwen2.5-vl" as const,
    MIDSCENE_PLANNING_MODEL_NAME: settings.model,
    MIDSCENE_PLANNING_MODEL_API_KEY: settings.apiKey ?? "",
    MIDSCENE_PLANNING_MODEL_BASE_URL: "https://openrouter.ai/api/v1",
    MIDSCENE_PLANNING_MODEL_TIMEOUT: "0",
    MIDSCENE_PLANNING_MODEL_RETRY_COUNT: "0",
    MIDSCENE_PLANNING_MODEL_EXTRA_BODY_JSON: JSON.stringify({visionQaUiTarsAction:true}),
    MIDSCENE_PLANNING_MODEL_FAMILY: "vlm-ui-tars" as const,
  } : { MIDSCENE_MODEL_FAMILY: settings.family };
}

export async function normalizeUiTarsAction(content: string, messages: any[]) {
  const images = messages.flatMap(m => Array.isArray(m.content) ? m.content : [])
    .filter(b => b.type === "image_url");
  const image = images.at(-1)?.image_url?.url;
  if (!image?.startsWith("data:image/")) throw new Error("UI-TARS 행동 좌표의 입력 화면을 확인할 수 없습니다.");
  const size = await imageInfoOfBase64(image);
  const { parsed } = actionParser({ prediction: content, factor: 1000,
    screenContext: size, modelVer: "1.5" as any });
  if (!parsed.length) throw new Error("UI-TARS 행동 응답을 해석할 수 없습니다.");
  const actions = parsed.map(action => {
    if (!/^[a-z_]+$/.test(action.action_type)) throw new Error("UI-TARS 행동 형식 오류");
    const args = Object.entries(action.action_inputs).filter(([key]) => !key.endsWith("_coords"))
      .map(([key, value]) => {
        if (key === "start_box" || key === "end_box") {
          const box = JSON.parse(String(value));
          if (!Array.isArray(box) || ![2,4].includes(box.length) ||
            box.some(v => !Number.isFinite(v) || v < 0 || v > 1))
            throw new Error("UI-TARS 행동 좌표가 화면 밖입니다.");
          value = JSON.stringify(box.map(v => Math.round(v * 1000)));
        }
        const literal = String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'")
          .replace(/\n/g, "\\n").replace(/\r/g, "\\r");
        return `${key}='${literal}'`;
      });
    return `${action.action_type}(${args.join(", ")})`;
  });
  return `Thought: ${parsed[0].thought ?? ""}\nAction: ${actions.join("\n\n")}`;
}
