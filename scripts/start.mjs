// npm runs this from either app workspace. No shell-specific environment assignment.
const entry = {
  platform: new URL('../apps/platform/server/index.ts', import.meta.url),
  sample: new URL('../sample-site/server.ts', import.meta.url),
}[process.argv[2]];
if (!entry) throw new Error('Choose platform or sample.');
process.env.NODE_ENV = 'production';
await import(entry.href);
