// Rebuild reading-order text from detector boxes ({text, box:[[x,y]x4]}).
// Receipt photos are skewed/curved, so geometry alone can pair a label with a neighbouring row's amount.
// We offer several candidate texts; the engine's sum check picks the one that is self-consistent.
import { LABELS, analyze } from './engine.mjs';

const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)] ?? 0; };
const AMOUNT = /-?\d[\d,]*\.\d{1,2}/g;
const ANCHOR = ['energy', 'fixed', 'customer'];

function prepare(items) {
  const angle = median(items.map((it) => Math.atan2(it.box[1][1] - it.box[0][1], it.box[1][0] - it.box[0][0])));
  const cos = Math.cos(-angle), sin = Math.sin(-angle);
  const boxes = items.map((it) => {
    const cx = it.box.reduce((a, p) => a + p[0], 0) / 4, cy = it.box.reduce((a, p) => a + p[1], 0) / 4;
    const h = Math.hypot(it.box[3][0] - it.box[0][0], it.box[3][1] - it.box[0][1]);
    return { text: it.text.trim(), x: cx * cos - cy * sin, y: cx * sin + cy * cos, h };
  }).sort((a, b) => a.y - b.y);
  return { boxes, tol: 0.6 * median(boxes.map((b) => b.h)) };
}

export function geometricText(items) {
  if (!items.length) return '';
  const { boxes, tol } = prepare(items);
  const rows = [];
  for (const b of boxes) {
    const row = rows.find((r) => Math.abs(r.y - b.y) < tol);
    if (row) { row.items.push(b); row.y = row.items.reduce((a, i) => a + i.y, 0) / row.items.length; }
    else rows.push({ y: b.y, items: [b] });
  }
  return rows.sort((a, b) => a.y - b.y).map((r) => r.items.sort((a, b) => a.x - b.x).map((i) => i.text).join('  ')).join('\n');
}

const LABEL_TEXT = {
  energy: 'Energy Charges', fixed: 'Fixed Charges', customer: 'Customer Charges', duty: 'Electricity Duty',
  interestED: 'Interest on ED', surcharge: 'Surcharge', acdSurcharge: 'ACD Surcharge', fsa: 'FSA/FCA Charges',
  trueUp: 'True-Up Charges', subsidy: 'Subsidy', interestSD: 'Interest on SD', adjustment: 'Adjustment',
  interestCD: 'Interest on CD', lossGain: 'Loss/Gain', billAmount: 'Bill Amount',
};

// TGSPDCL prints the same charge rows in a fixed order; optional rows vary by consumer category.
function* templates(count) {
  for (let mask = 0; mask < 32; mask++) {
    const on = (bit) => Boolean(mask & (1 << bit));
    const order = ['energy', 'fixed', 'customer', 'duty', 'interestED', 'surcharge', ...(on(0) ? ['acdSurcharge'] : []), 'fsa',
      ...(on(1) ? ['trueUp'] : []), ...(on(2) ? ['subsidy'] : []), ...(on(3) ? ['interestSD'] : []), 'adjustment',
      ...(on(4) ? ['interestCD'] : []), 'lossGain', 'billAmount'];
    if (order.length === count) yield order;
  }
}

// Amount-column numbers between the first charge label and the Bill Amount label, matched to a row template.
function* templateTexts(items) {
  const { boxes, tol } = prepare(items);
  const anchor = boxes.find((b) => LABELS.some(([k, re]) => ANCHOR.includes(k) && re.test(b.text)));
  const bill = boxes.find((b) => LABELS.some(([k, re]) => k === 'billAmount' && re.test(b.text)));
  if (!anchor || !bill || bill.y <= anchor.y) return;
  const nums = boxes.filter((b) => b.y >= anchor.y - tol && b.y <= bill.y + 2 * tol && b.x > anchor.x + 2 * tol)
    .flatMap((b) => (b.text.match(AMOUNT) ?? []).map((t) => ({ t, y: b.y, x: b.x })))
    .sort((a, b) => a.y - b.y || a.x - b.x);
  for (const extra of [0, 1, 2]) {
    const drops = extra === 0 ? [[]] : extra === 1 ? nums.map((_, i) => [i]) : nums.flatMap((_, i) => nums.slice(i + 1).map((__, j) => [i, i + 1 + j]));
    for (const order of templates(nums.length - extra)) {
      for (const d of drops) {
        const kept = nums.filter((_, i) => !d.includes(i));
        yield order.map((k, i) => `${LABEL_TEXT[k]} ${kept[i].t}`).join('\n');
      }
    }
  }
}

const header = (items) => geometricText(items).split('\n').filter((l) => !LABELS.some(([, re]) => re.test(l))).join('\n');

// Returns the best text (a confident one if any) plus its analysis.
export function bestText(items) {
  const geo = geometricText(items);
  const first = { text: geo, result: analyze(geo) };
  if (first.result.confident) return first;
  const head = header(items);
  for (const body of templateTexts(items)) {
    const text = `${head}\n${body}`;
    const result = analyze(text);
    if (result.confident) return { text, result };
  }
  return first;
}
