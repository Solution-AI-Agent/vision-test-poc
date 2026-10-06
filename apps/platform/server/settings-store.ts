import path from "node:path";
import { mkdir, readFile, writeFile, rename, rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { defaults, settingsSchema, type Settings } from "./domain";

// Credentials remain session-only and are excluded even if supplied by a caller.
const storedSchema = settingsSchema.omit({ apiKey: true });
export class SettingsStore {
  private writing: Promise<unknown> = Promise.resolve();
  constructor(private readonly directory: string) {}

  async load(): Promise<Settings> {
    try {
      const raw = JSON.parse(await readFile(path.join(this.directory, "settings.json"), "utf8"));
      const settings = storedSchema.parse(raw);
      if (raw.settingsVersion !== 2 && settings.maxSeconds === 120) {
        await writeFile(path.join(this.directory, "settings.before-timeout-v2.json"), JSON.stringify(settings, null, 2), {flag:"wx",mode:0o600}).catch(error=>{if(error.code!=="EEXIST")throw error;});
        settings.maxSeconds = defaults.maxSeconds;
        await this.save(settings);
      }
      return settings;
    } catch (error: any) {
      if (error.code === "ENOENT") return { ...defaults };
      throw new Error("로컬 설정을 읽을 수 없습니다. .data/settings.json을 보존하고 확인하세요.");
    }
  }

  save(settings: Settings): Promise<void> {
    const contents = JSON.stringify({ ...storedSchema.parse(settings), settingsVersion: 2 }, null, 2);
    const operation = this.writing.catch(() => {}).then(async () => {
      await mkdir(this.directory, { recursive: true });
      const temporary = path.join(this.directory, `settings-${randomUUID()}.tmp`);
      try {
        await writeFile(temporary, contents, { mode: 0o600 });
        await rename(temporary, path.join(this.directory, "settings.json"));
      } finally {
        await rm(temporary, { force: true }).catch(() => {});
      }
    });
    this.writing = operation;
    return operation;
  }
}
