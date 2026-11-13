// PaddleOCR (ONNX, on-device) over every sample, then the engine.
import Ocr from '@gutenye/ocr-node';
import { readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { bestText } from '../src/shared/layout.mjs';

const dir = process.argv[2];
mkdirSync('.ocr-paddle', { recursive: true });
const ocr = await Ocr.create();
for (const f of readdirSync(dir).filter((x) => /\.(png|jpe?g)$/i.test(x))) {
  const { texts } = await ocr.detect(join(dir, f));
  const { text, result: r } = bestText(texts);
  writeFileSync(join('.ocr-paddle', f + '.txt'), text);
  console.log(f.padEnd(16), r.confident ? 'OK' : r.validation.issues.join(','), 'bill', r.bill.billAmount, 'units', r.bill.units, 'days', r.bill.days, 'n', Object.keys(r.bill.items).length);
}
