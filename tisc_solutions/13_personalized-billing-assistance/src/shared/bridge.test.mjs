// Runs the native-app engine bundle in a bare JS context (no Node/DOM globals), like QuickJS or JavaScriptCore would.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const bundle = readFileSync(new URL('../android/app/src/main/assets/billudu-engine.js', import.meta.url), 'utf8');
const ctx = vm.createContext({});
vm.runInContext(`${bundle}; this.Billudu = Billudu;`, ctx);
const call = (fn, ...args) => JSON.parse(vm.runInContext(`Billudu.${fn}(${args.map((a) => JSON.stringify(a)).join(',')})`, ctx));

const box = (text, x, y) => ({ text, box: [[x, y], [x + 100, y], [x + 100, y + 20], [x, y + 20]] });
const rows = [['Units: 210 Days: 30', ''], ['Energy Charges', '1000.00'], ['Fixed Charges', '50.00'], ['Customer Charges', '120.00'],
  ['Electricity Duty', '10.50'], ['Interest on ED', '0.00'], ['Surcharge', '0.00'], ['FSA/FCA Charges', '0.00'],
  ['Adjustment', '0.00'], ['Loss/Gain', '-0.50'], ['Bill Amount', '1180.00']];
const boxes = rows.flatMap(([l, a], i) => [box(l, 0, i * 30), ...(a ? [box(a, 400, i * 30)] : [])]);

test('bundle analyses OCR boxes and returns Telugu text', () => {
  const r = call('analyzeBoxesJson', JSON.stringify(boxes), '[]');
  assert.equal(r.confident, true);
  assert.equal(r.bill.billAmount, 1180);
  assert.ok(/[\u0C00-\u0C7F]/.test(r.telugu));
});

test('bundle re-analyses a user-corrected bill', () => {
  const bill = { units: 210, days: 30, billAmount: 1180, items: { energy: 1000, fixed: 50, customer: 120, duty: 10.5, lossGain: -0.5 } };
  const r = call('analyzeBillJson', JSON.stringify(bill), JSON.stringify([{ units: 200, total: 1100, days: 30 }, { units: 205, total: 1150, days: 31 }]));
  assert.equal(r.confident, true);
  assert.ok(r.forecast.point > 0);
  assert.ok(r.change.te.length > 0);
});
