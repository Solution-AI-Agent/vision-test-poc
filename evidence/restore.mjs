import { readFile, mkdir, copyFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// This imports recorded data only. It never starts a browser or calls a model.
const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const manifest = JSON.parse(await readFile(path.join(repository, 'evidence/MANIFEST.json'), 'utf8'));
for (const file of manifest.files) {
  const source = path.resolve(repository, file.path);
  if (!source.startsWith(repository + path.sep)) throw Error('Invalid manifest path');
  const bytes = await readFile(source);
  if (bytes.length !== file.bytes || hash(bytes) !== file.sha256) throw Error(`Evidence checksum mismatch: ${file.path}`);
}
if (process.argv.includes('--check')) {
  console.log(`Verified ${manifest.files.length} preserved source files.`);
  process.exit(0);
}
const copies = manifest.files.flatMap(file => {
  if (file.path.startsWith('evidence/recordings/')) return [{ from: file.path, to: file.path.replace('evidence/recordings/', 'artifacts/') }];
  if (file.path.startsWith('evidence/runtime/')) return [{ from: file.path, to: file.path.replace('evidence/runtime/', '.data/') }];
  return [];
});
const batchNames = [
  'demo-probe-2026-10-05T01-20-29-400Z',
  'demo-candidate-2026-10-05T01-21-26-894Z',
  'demo-verify-2026-10-05T01-22-24-239Z',
];
const batches = await Promise.all(batchNames.map(async name => ({
  folder: `artifacts/${name}`,
  ...JSON.parse(await readFile(path.join(repository, 'evidence/recordings', name, 'RESULTS.json'), 'utf8')),
})));
const demo = {
  selectedState: 'cover-wide',
  kind: 'actual stored evaluation; switching does not call model',
  batches: batches.map(b => ({ folder: b.folder, source: b.source, stage: b.stage })),
  results: batches.flatMap(b => b.results.map(r => ({ ...r, source: b.source, model: b.model, batch: b.folder }))),
};
const generated = { to: '.data/demo-evidence.json', bytes: Buffer.from(JSON.stringify(demo, null, 2)) };
// Preflight all destinations before copying. Never replace another machine's saved work.
for (const item of [...copies, generated]) {
  const destination = path.join(repository, item.to);
  if (!existsSync(destination)) continue;
  const incoming = item.bytes ?? await readFile(path.join(repository, item.from));
  if (hash(await readFile(destination)) !== hash(incoming)) {
    throw Error(`Existing data differs: ${item.to}. Use a fresh checkout or preserve/move your local data before restoring.`);
  }
}
for (const item of copies) {
  const destination = path.join(repository, item.to);
  await mkdir(path.dirname(destination), { recursive: true });
  if (!existsSync(destination)) await copyFile(path.join(repository, item.from), destination);
}
await mkdir(path.join(repository, '.data'), { recursive: true });
await writeFile(path.join(repository, generated.to), generated.bytes);
console.log(`Restored ${copies.length} files and ${demo.results.length} recorded demo trials. No model calls; API credentials are not included.`);
