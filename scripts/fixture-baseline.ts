import { expect } from "@playwright/test";
import type { Page } from "playwright";
// Frozen before implementation/defect injection. Same assertions in every state.
export async function fixtureBaseline(page: Page, url = "http://127.0.0.1:4310/fixture/order") {
  await page.goto(url);
  await page.getByRole("heading", { name: "Review your order" }).waitFor();
  await page.getByLabel("Recipient name").fill("Alex Morgan");
  await page.getByLabel("Email address").fill("alex@example.test");
  await expect(
    page.getByRole("button", { name: "Confirm order" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Confirm order" }).click();
  await expect(
    page.getByRole("heading", { name: "Order confirmed" }),
  ).toBeVisible();
  await expect(page.getByTestId("recipient")).toHaveText(
    "Alex Morgan · alex@example.test",
  );
  await expect(page.getByTestId("notebook")).toHaveText(
    "Studio notebook × 1$32.00",
  );
  await expect(page.getByTestId("clips")).toHaveText("Cable clips × 2$16.00");
  await expect(page.getByTestId("shipping")).toHaveText("Shipping$0.00");
  await expect(page.getByTestId("semantic-total")).toHaveText("$48.00");
  await expect(page.getByTestId("delivery")).toBeVisible();
  await expect(page.getByTestId("delivery")).toHaveText(
    "Delivery in 2 business days.Collection window: 48 hours.Photo ID is required at pickup.",
  );
  await expect(
    page.getByRole("img", { name: "Receipt: total $48.00" }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
}
