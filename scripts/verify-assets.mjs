import { access } from 'node:fs/promises';
import { fromRoot, loadManifest, verifyAsset } from './asset-utils.mjs';

const manifest = await loadManifest();
for (const asset of manifest.assets) await verifyAsset(asset);

for (const file of [
  'vision_wasm_internal.wasm',
  'vision_wasm_module_internal.wasm',
  'vision_wasm_nosimd_internal.wasm',
]) {
  await access(fromRoot(`public/vendor/mediapipe/wasm/${file}`));
}

console.log('runtime assets verified');
