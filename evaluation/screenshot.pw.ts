import { test, expect } from "@playwright/test";
import { fixtureBaseline } from "../scripts/fixture-baseline";
// Normal reference is created first. Default pixel tolerance detects both defects; this mild palette control is tolerated.
test("reference screenshot comparison complements the frozen functional suite", async ({
  page,
  request,
}) => {
  try {
    await request.put("http://127.0.0.1:4310/api/fixture/operator", {
      data: { state: "normal" },
    });
    await fixtureBaseline(page);
    await expect(page).toHaveScreenshot("order.png");
    for (const state of ["clipped", "total", "decoration"]) {
      const configured = await request.put(
        "http://127.0.0.1:4310/api/fixture/operator",
        {
          headers: { "Content-Type": "application/json" },
          data: { state },
        },
      );
      expect(configured.ok(), await configured.text()).toBe(true);

      await fixtureBaseline(page);
      if (state === "decoration")
        await expect(page).toHaveScreenshot("order.png");
      else await expect(page).not.toHaveScreenshot("order.png");
    }
  } finally {
    await request.put("http://127.0.0.1:4310/api/fixture/operator", {
      data: { state: "normal" },
    });
  }
});
