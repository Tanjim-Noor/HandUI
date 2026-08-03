import { createHash } from 'node:crypto';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export async function loadManifest() {
  return JSON.parse(await readFile(resolve(root, 'assets/manifest.json'), 'utf8'));
}

export function fromRoot(path) {
  return resolve(root, path);
}

export async function sha256(path) {
  return createHash('sha256')
    .update(await readFile(path))
    .digest('hex');
}

export async function verifyAsset(asset) {
  const path = fromRoot(asset.destination);
  const info = await stat(path);
  if (info.size !== asset.bytes)
    throw new Error(`${asset.id}: expected ${asset.bytes} bytes, got ${info.size}`);
  const digest = await sha256(path);
  if (digest !== asset.sha256) throw new Error(`${asset.id}: SHA-256 mismatch (${digest})`);
}

export async function ensureParent(path) {
  await mkdir(dirname(path), { recursive: true });
}
