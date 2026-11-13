// Network-first with cache fallback: always fresh when online, fully usable offline after the first load.
const CACHE = 'billudu-v1';
const SHELL = ['./', './index.html', './dist/app.js', './dist/pdf.worker.min.mjs', './dist/ort/ort-wasm-simd-threaded.mjs',
  './dist/ort/ort-wasm-simd-threaded.wasm', './dist/models/ch_PP-OCRv4_det_infer.onnx', './dist/models/ch_PP-OCRv4_rec_infer.onnx',
  './dist/models/ppocr_keys_v1.txt'];

self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(
  caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return res; }).catch(() => caches.match(e.request)));
});
