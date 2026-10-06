import { describe, it, expect } from "vitest";
import {
  validateTarget,
  planSchema,
  inputSchema,
  settingsSchema,
  defaults,
  planPrompt,
  actionSchema,
  actionScope,
  goalPrompt,
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
    for (const suffix of ["a","b","c","d","e","f","g"]) {
      const url = `http://127.0.0.1:4311/store/${suffix}`;
      expect(validateTarget(url)).toBe(url);
      expect(actionScope(url)).toContain("simulated order site");
      expect(() => validateTarget(url + "?state=normal")).toThrow();
    }
    expect(() => validateTarget("http://127.0.0.1:4311/store/h")).toThrow();
    expect(validateTarget("http://127.0.0.1:4311/order")).toBe("http://127.0.0.1:4311/order");
    for (const url of [
      "http://127.0.0.1:4311/operator",
      "http://127.0.0.1:4311/order?state=occluded",
      "http://127.0.0.1:4311/order#normal",
      "http://localhost:4311/order",
      "http://127.0.0.1:4312/order",
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

it("permits simulated submission only for the exact standalone sample target", () => {
 const sample = inputSchema.parse({mode:"scenario",url:"http://127.0.0.1:4311/order",task:"Complete a simulated order",expected:"Receipt appears"});
 expect(planPrompt(sample,[])).toContain("submit the simulated order");
 expect(goalPrompt(sample.url)).toContain("synthetic recipient");
 expect(goalPrompt("https://www.youtube.com/")).not.toContain("submit the simulated order");
 expect(goalPrompt("http://127.0.0.1:4311/operator")).not.toContain("submit the simulated order");
});


it("permits only the seven exact direct store revisions with simulated order actions", () => {
 for (const route of ["/store/a", "/store/b", "/store/c", "/store/d", "/store/e", "/store/f", "/store/g"]) {
  const url = `http://127.0.0.1:4311${route}`;
  expect(validateTarget(url)).toBe(url);
  expect(goalPrompt(url)).toContain("submit the simulated order");
  for (const suffix of ["?state=normal", "#answer", "/"]) expect(() => validateTarget(url + suffix)).toThrow();
 }
 expect(() => validateTarget("http://127.0.0.1:4311/store/h")).toThrow();
 expect(() => validateTarget("http://localhost:4311/store/b")).toThrow();
});
