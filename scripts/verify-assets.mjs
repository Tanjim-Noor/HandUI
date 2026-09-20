import { access, readFile } from 'node:fs/promises';
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

for (const file of ['vision_wasm_internal', 'vision_wasm_nosimd_internal']) {
  const source = await readFile(fromRoot(`.generated/mediapipe/${file}.mjs`), 'utf8');
  if (!source.includes('var custom_dbg = globalThis.custom_dbg'))
    throw new Error(`${file}: compatibility shim missing`);
  if (!source.includes('export default ModuleFactory;'))
    throw new Error(`${file}: ESM factory export missing`);
  if (source.includes('require("node:')) throw new Error(`${file}: Node-only import remains`);
}

console.log('runtime assets verified');
