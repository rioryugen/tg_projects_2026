// Bundles the web portal so it runs fully offline: JS, ONNX runtime wasm, OCR models and pdf.js worker are all local.
import { build } from 'esbuild';
import { cpSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const web = resolve(root, 'src/webportal');
const nm = (p) => resolve(root, 'node_modules', p);

await build({
  entryPoints: [resolve(web, 'main.js')],
  bundle: true, format: 'esm', outfile: resolve(web, 'dist/app.js'), minify: true, target: 'es2022',
  external: ['fs', 'path'], conditions: ['onnxruntime-web-use-extern-wasm'], alias: { 'onnxruntime-web': 'onnxruntime-web/wasm' }, logLevel: 'info',
});

mkdirSync(resolve(web, 'dist/ort'), { recursive: true });
for (const f of ['ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm']) cpSync(nm(`onnxruntime-web/dist/${f}`), resolve(web, 'dist/ort', f));
cpSync(nm('pdfjs-dist/build/pdf.worker.min.mjs'), resolve(web, 'dist/pdf.worker.min.mjs'));
mkdirSync(resolve(web, 'dist/models'), { recursive: true });
for (const f of ['ch_PP-OCRv4_det_infer.onnx', 'ch_PP-OCRv4_rec_infer.onnx', 'ppocr_keys_v1.txt']) {
  cpSync(nm(`@gutenye/ocr-models/assets/${f}`), resolve(web, 'dist/models', f));
}
console.log('web portal built -> src/webportal/dist');

// Engine bundle for the native apps (ES2017 so QuickJS/JavaScriptCore on older OS versions can run it).
const engineOut = [resolve(root, 'src/android/app/src/main/assets/billudu-engine.js'), resolve(root, 'src/apple/App/Resources/billudu-engine.js')];
for (const outfile of engineOut) {
  await build({ entryPoints: [resolve(root, 'src/shared/bridge.mjs')], bundle: true, format: 'iife', globalName: 'Billudu', target: 'es2017', outfile, minify: true });
}
console.log('native engine bundles written');
