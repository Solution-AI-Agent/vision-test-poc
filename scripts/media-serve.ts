import express from "express";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const media = path.join(root, "media");
if (!existsSync(path.join(media, "index.html"))) {
  throw new Error("media/index.html is missing. Include the delivery bundle before serving media.");
}
const app = express();
app.use(express.static(media, { dotfiles: "deny" }));
app.listen(4312, "127.0.0.1", () => console.log("Media: http://127.0.0.1:4312/index.html"));
