import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: ".",
  testMatch: "*.pw.ts",
  workers: 1,
  fullyParallel: false,
  outputDir: "../artifacts/fixture-screenshot-test",
  use: { viewport: { width: 1280, height: 720 }, headless: true },
  reporter: "list",
});
