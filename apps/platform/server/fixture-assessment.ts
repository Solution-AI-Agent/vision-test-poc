import type { Settings } from "./domain";
// Midscene validates the base URL even when a custom OpenAI client is supplied.
export function fixtureModelConfig(settings: Settings) {
  return {
    MIDSCENE_MODEL_API_KEY: settings.apiKey!,
    MIDSCENE_MODEL_BASE_URL: "https://openrouter.ai/api/v1",
    MIDSCENE_MODEL_NAME: settings.model,
    MIDSCENE_MODEL_FAMILY: settings.family,
    MIDSCENE_MODEL_RETRY_COUNT: 0,
    MIDSCENE_MODEL_TIMEOUT: 30000,
    MIDSCENE_MODEL_INIT_CONFIG_JSON: JSON.stringify({ maxRetries: 0 }),
  };
}
