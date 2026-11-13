import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyze, forecastNext, verifyNumbers, renderEnglish } from './engine.mjs';
import { bestText } from './layout.mjs';

const fx = (name) => readFileSync(new URL(`./fixtures/${name}.txt`, import.meta.url), 'utf8');

test('domestic bill: parses every charge and validates', () => {
  const r = analyze(fx('domestic'));
  assert.equal(r.confident, true);
  assert.equal(r.bill.billAmount, 2204);
  assert.equal(r.bill.items.trueUp, 9);
  assert.equal(r.bill.items.lossGain, -0.44);
  assert.equal(r.bill.units, 324);
  assert.equal(r.bill.dueDate, '16-Nov-2026');
});

test('noisy commercial bill: stray digits and misread labels are tolerated', () => {
  const r = analyze(fx('commercial-noisy'));
  assert.equal(r.confident, true);
  assert.equal(r.bill.items.interestED, 0.04);
  assert.equal(r.bill.units, 1058);
  assert.equal(r.bill.totalDue, 13522);
});

test('arrears bill: total due differs from bill amount', () => {
  const r = analyze(fx('arrears'));
  assert.equal(r.confident, true);
  assert.equal(r.bill.items.subsidy, 0);
  assert.equal(r.explanation.arrears, -5);
});

test('a wrong digit is caught by the sum check', () => {
  const r = analyze(fx('domestic').replace('2006.00', '2060.00'));
  assert.deepEqual(r.validation.issues, ['charges_do_not_sum']);
  assert.equal(r.confident, false);
});

test('unreadable text is refused', () => {
  assert.equal(analyze('garbage').confident, false);
});

test('explanation is Telugu and every number is traceable', () => {
  const r = analyze(fx('domestic'), [{ units: 300, total: 2000, days: 30 }, { units: 310, total: 2100, days: 31 }]);
  assert.ok(/[\u0C00-\u0C7F]/.test(r.telugu));
  assert.ok(verifyNumbers(renderEnglish(r.explanation), r.explanation));
  assert.equal(r.change.dTotal, 104);
  assert.ok(r.forecast.low < r.forecast.point && r.forecast.point < r.forecast.high);
});

test('forecast needs at least two months', () => {
  assert.equal(forecastNext([{ units: 10, total: 100 }]), null);
});

// Skewed receipt where each amount box sits one row below its label: only the template decoder recovers it.
test('template decoding recovers amounts misaligned with labels', () => {
  const labels = ['Energy Charges', 'Fixed Charges', 'Customer Charges', 'Electricity Duty', 'Interest on ED', 'Surcharge',
    'FSA/FCA Charges', 'Adjustment', 'Loss/Gain', 'Bill Amount'];
  const amounts = ['1000.00', '50.00', '120.00', '10.50', '0.00', '0.00', '0.00', '0.00', '-0.50', '1180.00'];
  const box = (text, x, y) => ({ text, box: [[x, y], [x + 100, y], [x + 100, y + 20], [x, y + 20]] });
  const items = [box('Units: 210  Days: 30', 0, 0)];
  labels.forEach((l, i) => items.push(box(l, 0, 100 + i * 30)));
  amounts.forEach((a, i) => items.push(box(a, 400, 118 + i * 30)));
  const { result } = bestText(items);
  assert.equal(result.confident, true);
  assert.equal(result.bill.items.energy, 1000);
  assert.equal(result.bill.billAmount, 1180);
});

test('misread units are flagged and kept out of the forecast', () => {
  const r = analyze(fx('domestic').replace('Units: 324', 'Units: 8'));
  assert.ok(r.validation.warnings.includes('check_units'));
  assert.equal(forecastNext([{ units: 8, total: 2204 }, { units: 324, total: 2204 }]), null);
});
