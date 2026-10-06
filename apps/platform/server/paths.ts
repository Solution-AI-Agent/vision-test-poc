import path from "node:path";
import { fileURLToPath } from "node:url";
export const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
export const platformRoot = path.join(repoRoot, "apps/platform");
export const dataDir = path.join(repoRoot, ".data");
export const artifactsDir = path.join(repoRoot, "artifacts");
