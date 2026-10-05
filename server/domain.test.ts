import { describe, it, expect } from "vitest";
import {
  validateTarget,
  planSchema,
  inputSchema,
  settingsSchema,
  defaults,
  planPrompt,
  actionSchema,
} from "./domain";
describe("execution boundaries", () => {
  it("accepts public YouTube HTTPS only", () => {
    expect(validateTarget("https://www.youtube.com/")).toBe(
      "https://www.youtube.com/",
    );
    for (const url of [
      "http://www.youtube.com/",
      "https://youtube.com.attacker.test",
      "https://user:password@youtube.com",
      "https://localhost/",
      "https://127.0.0.1/",
      "https://www.youtube.com:9999/",
    ])
      expect(() => validateTarget(url)).toThrow();
  });
  it("allows only the exact local fixture origin/path", () => {
    expect(validateTarget("http://127.0.0.1:4310/demo/order")).toBe("http://127.0.0.1:4310/demo/order");
    expect(validateTarget("http://127.0.0.1:4310/fixture/order")).toBe(
      "http://127.0.0.1:4310/fixture/order",
    );
    for (const url of [
      "http://127.0.0.1:4310/demo",
      "http://127.0.0.1:4310/demo/order?state=cover",
      "http://localhost:4310/fixture/order",
      "http://127.0.0.1:4311/fixture/order",
      "http://127.0.0.1:4310/fixture/operator",
      "http://127.0.0.1:4310/api/settings",
      "http://127.0.0.1:4310/fixture/order?state=total",
    ])
      expect(() => validateTarget(url)).toThrow();
  });
  it("rejects malformed or out-of-screen actions", () => {
    const base = {
      observation: "visible",
      rationale: "read only",
      verdict: "continue",
      finding: null,
    };
    expect(() =>
      planSchema.parse({ ...base, action: { type: "click", x: 1280, y: 5 } }),
    ).toThrow();
    expect(() =>
      actionSchema.parse({ type: "type", text: "sample" }),
    ).toThrow();
    expect(() =>
      actionSchema.parse({ type: "type", text: "sample", x: 1280, y: 10 }),
    ).toThrow();
    expect(() =>
      planSchema.parse({ ...base, action: { type: "eval", code: "evil" } }),
    ).toThrow();
    expect(() =>
      planSchema.parse({ ...base, action: { type: "key", key: "Control+L" } }),
    ).toThrow();
    expect(
      planSchema.parse({ ...base, action: { type: "click", x: 5, y: 5 } })
        .action.type,
    ).toBe("click");
  });
  it("requires a registered intent and bounded limits", () => {
    expect(() =>
      inputSchema.parse({ mode: "scenario", url: "https://www.youtube.com/" }),
    ).toThrow();
    expect(() =>
      settingsSchema.parse({ ...defaults, maxCalls: 999 }),
    ).toThrow();
    expect(() =>
      settingsSchema.parse({ ...defaults, maxSeconds: 0 }),
    ).toThrow();
  });
  it("autonomous prompt does not supply a YouTube task sequence or URL", () => {
    const prompt = planPrompt(
      inputSchema.parse({
        mode: "autonomous",
        url: "https://www.youtube.com/",
        task: "SECRET_FIXED_TASK",
      }),
      [],
    );
    expect(prompt).not.toContain("SECRET_FIXED_TASK");
    expect(prompt).not.toContain("youtube.com");
    expect(prompt).toContain("Autonomously choose");
  });
});
