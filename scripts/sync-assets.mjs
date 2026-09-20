import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
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
const loaderDestination = fromRoot('.generated/mediapipe');
await rm(wasmDestination, { recursive: true, force: true });
await rm(loaderDestination, { recursive: true, force: true });
await mkdir(wasmDestination, { recursive: true });
await mkdir(loaderDestination, { recursive: true });
for (const file of [
  'vision_wasm_internal.wasm',
  'vision_wasm_module_internal.wasm',
  'vision_wasm_nosimd_internal.wasm',
]) {
  await copyFile(`${wasmSource}/${file}`, `${wasmDestination}/${file}`);
}

const moduleMarker = 'var Module = moduleArg;';
const umdFooterMarker = '// Export using a UMD style export';
const debugCompatibility = `${moduleMarker}
    // MediaPipe 1.0.1 expects classic-script function hoisting for this debug hook.
    var custom_dbg = globalThis.custom_dbg ?? ((...args) => console.warn(...args));`;
for (const file of ['vision_wasm_internal', 'vision_wasm_nosimd_internal']) {
  const source = await readFile(`${wasmSource}/${file}.js`, 'utf8');
  if (!source.includes(moduleMarker)) throw new Error(`${file}: unsupported loader source`);
  const footerIndex = source.indexOf(umdFooterMarker);
  if (footerIndex < 0) throw new Error(`${file}: UMD footer missing`);
  const esmSource = source
    .slice(0, footerIndex)
    .replaceAll('require("node:fs")', 'undefined')
    .replaceAll('require("node:crypto")', 'undefined');
  const compatibleModule = `${esmSource.replace(moduleMarker, debugCompatibility)}
export default ModuleFactory;
`;
  await writeFile(`${loaderDestination}/${file}.mjs`, compatibleModule);
}
console.log('prepared pinned MediaPipe WASM binaries and worker loaders');
