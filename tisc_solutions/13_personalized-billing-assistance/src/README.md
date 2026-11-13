# Billudu (Challenge 13) — on-device apps

Photo/PDF of a TGSPDCL bill → on-device OCR → verified fields → Telugu + English explanation, "why it changed", next-bill range. No server: OCR, engine and voice all run on the device.

One engine, three shells. `src/shared/` is the single source of truth (parser, sum-check, templates, forecast); the web portal imports it and the native apps run the same code as a bundled JS file.

| Folder | OCR (on-device) | Notes |
| --- | --- | --- |
| `shared/` | — | Engine + tests. `npm test` |
| `webportal/` | PaddleOCR PP-OCRv4 via onnxruntime-web (models bundled, ~15 MB) + pdf.js | Offline after first load (service worker) |
| `android/` | ML Kit Text Recognition (bundled model) + ML Kit Document Scanner | Engine runs in QuickJS; PDFs via `PdfRenderer` |
| `apple/` | Apple Vision + VisionKit scanner | Engine runs in JavaScriptCore; PDFs via PDFKit |

## Build and run

```
npm install
npm run build      # web bundle + native engine bundles (billudu-engine.js)
npm test
npm run serve      # http://127.0.0.1:8080/webportal/ (sends COOP/COEP so ONNX can use threads)
```

- Android: `cd src/android; gradlew assembleDebug` (needs JDK 17+ and the Android SDK; `scripts/android-e2e.ps1` drives an emulator through the sample bills). Built and run on an Android 14 emulator: ML Kit OCR, PDF import and the Telugu explanation work; 5 of 7 sample bills verify on-device.
- iOS: `brew install xcodegen && cd src/apple && xcodegen && open Billudu.xcodeproj`. Not compiled in the authoring environment (no Xcode).
- Production hosting of the web portal must send `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`, otherwise OCR falls back to one thread (slower).

## Findings from the sample bills (`testing/`, git-ignored: personal data)

- Real bills are TGSPDCL thermal "Bill-cum-Notice" slips; labels and amounts sit in separate columns and photos are skewed, so rows are rebuilt from boxes (de-rotation) and, if the charges don't add up, decoded against the fixed TGSPDCL row order. The sum check (charges = Bill Amount) decides which reading is accepted.
- 5 of 7 samples verify automatically with the web OCR; the rest (blurry/curved photo) fall back to editable fields. Units and billing days are not covered by the sum check, so implausible values are flagged for confirmation.
- Tesseract was dropped: far worse than PaddleOCR on these photos.
- ML Kit has no Telugu script; irrelevant here since bills are digits + English labels and Telugu is output only.
