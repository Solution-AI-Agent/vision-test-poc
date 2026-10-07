import { it, expect } from "vitest";
import { directPresentation } from "./presentation";

it("isolates each new typography or placement error from all other presentation values", () => {
  const normal = directPresentation("/store/a")!;
  for (const [route, change] of [
    ["h", { typography: "crowded" }], ["i", { typography: "collapsed" }],
    ["j", { placement: "offset" }], ["k", { placement: "chart-labels" }],
  ] as const) {
    expect(directPresentation(`/store/${route}`)).toEqual({ ...normal, ...change });
    expect(directPresentation("/store/a")).toEqual(normal);
  }
  expect(directPresentation("/store/l")).toBeUndefined();
});
