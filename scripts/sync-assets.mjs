import { cp, writeFile } from 'node:fs/promises';
import { ensureParent, fromRoot, loadManifest, verifyAsset } from './asset-utils.mjs';

const manifest = await loadManifest();

for (const asset of manifest.assets) {
  const destination = fromRoot(asset.destination);
  await ensureParent(destination);
  const response = await fetch(asset.source);
  if (!response.ok) throw new Error(`${asset.id}: download failed (${response.status})`);
  await writeFile(destination, new Uint8Array(await response.arrayBuffer()));
  await verifyAsset(asset);
  console.log(`verified ${asset.id}`);
}

const wasmSource = fromRoot('node_modules/@mediapipe/tasks-vision/wasm');
const wasmDestination = fromRoot('public/vendor/mediapipe/wasm');
await cp(wasmSource, wasmDestination, { recursive: true, force: true });
console.log('copied pinned MediaPipe WASM');
