// Billudu core engine: parse OCR text of a TGSPDCL bill -> validate -> explain (te/en) -> forecast.
// Every number shown comes from the bill itself; no tariff rates are hardcoded.
// Kotlin (src/android) and Swift (src/apple) ports mirror this file; change all three together.

// Order matters: more specific labels first. OCR noise is tolerated (e.g. "F8A/FCA", "pill Amount").
export const LABELS = [
  ['acdSurcharge', /acd\s*surcharge/i],
  ['interestED', /inter\w{2,4}\s*o\s*n\s*e[dp]\b/i],
  ['interestSD', /inter\w{2,4}\s*o\s*n\s*s[dp]\b/i],
  ['interestCD', /inter\w{2,4}\s*o\s*n\s*c[dp]\b/i],
  ['energy', /energ[yv]\s*char/i],
  ['fixed', /f[il1]xed\s*char/i],
  ['customer', /c?ustomer\s*char/i],
  ['duty', /\bduty\b/i],
  ['surcharge', /\bsurcharge/i],
  ['fsa', /f[s5$8]a.{0,2}fc|fuel/i],
  ['trueUp', /true[\s-]*up\s*char/i],
  ['subsidy', /subsidy/i],
  ['adjustment', /\badj\w*/i],
  ['lossGain', /loss\s*\/?\s*ga[il1]n|oss\/gain/i],
  ['billAmount', /[il]{2,3}\s*amount/i],
  ['totalDue', /ota[il1]\s*due/i],
];

export const ITEM_KEYS = ['energy', 'fixed', 'customer', 'duty', 'interestED', 'surcharge', 'acdSurcharge', 'fsa',
  'trueUp', 'interestSD', 'subsidy', 'adjustment', 'interestCD', 'lossGain'];

// Amounts always print with 2 decimals; OCR sometimes drops the point ("336240" -> 3362.40)
// and appends stray digits after the amount, so take the first decimal token.
function amountOf(rest) {
  const tokens = (rest.match(/-?\d[\d,]*(?:\.\d+)?/g) ?? []).map((t) => t.replace(/,/g, ''));
  const decimal = tokens.find((t) => t.includes('.'));
  if (decimal) return Number(decimal);
  const bare = tokens.find((t) => t.replace('-', '').length >= 3);
  return bare ? Number(bare) / 100 : null;
}

const clean = (text) => text.replace(/(\d)\.\s+(\d{2})\b/g, '$1.$2').replace(/(\d),(\d{2})\b(?!\d)/g, '$1.$2');

export function parseBill(text) {
  const bill = { items: {} };
  for (const rawLine of clean(text).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const hit = LABELS.find(([, re]) => re.test(line));
    if (hit) {
      const [key, re] = hit;
      const amt = amountOf(line.slice(line.search(re) + line.match(re)[0].length));
      if (amt == null) continue;
      if (key === 'billAmount' || key === 'totalDue') bill[key] ??= amt;
      else bill.items[key] ??= amt;
      continue;
    }
    const u = line.match(/un[il1]ts?\s*[:.]?\s*(\d{1,6})\b/i);
    if (u && bill.units == null) bill.units = Number(u[1]);
    const d = line.match(/\bda[yv]s\s*[:.]?\s*(\d{1,3})\b/i);
    if (d && bill.days == null) bill.days = Number(d[1]);
    const sc = line.match(/\bSC\s*No\.?\s*[:.]?\s*([A-Z]?\d{6,})/i);
    if (sc && !bill.consumerNo) bill.consumerNo = sc[1].toUpperCase();
    const due = line.match(/due\s*date\s*[:.]?\s*(\d{1,2}[-/][A-Za-z0-9]{1,3}[-/]\d{2,4})/i);
    if (due && !bill.dueDate) bill.dueDate = due[1];
  }
  return bill;
}

const itemSum = (items, subsidySign) =>
  Object.entries(items).reduce((a, [k, v]) => a + (k === 'subsidy' ? subsidySign * v : v), 0);

// Plausibility only (not a tariff): all-in rupees per unit far outside this band means units were misread.
const plausibleRate = (perUnit) => perUnit >= 1 && perUnit <= 100;

export function validateBill(bill) {
  const issues = [];
  if (bill.billAmount == null) issues.push('missing_bill_amount');
  if (bill.units == null) issues.push('missing_units');
  if (bill.billAmount != null) {
    if (Object.keys(bill.items).length < 3) issues.push('too_few_charges');
    else if (![1, -1].some((s) => Math.abs(itemSum(bill.items, s) - bill.billAmount) <= 1)) issues.push('charges_do_not_sum');
  }
  const warnings = [];
  if (bill.days != null && (bill.days < 20 || bill.days > 45)) warnings.push('check_days');
  if (bill.units > 0 && bill.billAmount != null && !plausibleRate(bill.billAmount / bill.units)) warnings.push('check_units');
  return { ok: issues.length === 0, issues, warnings };
}

const EN = {
  energy: 'Energy charges', fixed: 'Fixed charges', customer: 'Customer charges', duty: 'Electricity duty',
  interestED: 'Interest on electricity duty', surcharge: 'Surcharge', acdSurcharge: 'ACD surcharge',
  fsa: 'FSA/FCA (fuel & power-purchase adjustment)', trueUp: 'True-up charges', interestSD: 'Interest on security deposit',
  subsidy: 'Subsidy', adjustment: 'Adjustment', interestCD: 'Interest on consumption deposit', lossGain: 'Rounding (loss/gain)',
};
const TE = {
  energy: ['విద్యుత్ ఛార్జీలు', 'మీరు వాడిన యూనిట్లకు లెక్కించిన మొత్తం.'],
  fixed: ['ఫిక్స్డ్ ఛార్జీలు', 'వాడకంతో సంబంధం లేకుండా ప్రతి నెలా ఉండే స్థిర ఛార్జీ.'],
  customer: ['కస్టమర్ ఛార్జీలు', 'కనెక్షన్ నిర్వహణ కోసం నెలవారీ ఛార్జీ.'],
  duty: ['విద్యుత్ సుంకం', 'ప్రభుత్వానికి చెల్లించే విద్యుత్ సుంకం.'],
  interestED: ['విద్యుత్ సుంకంపై వడ్డీ', 'సుంకం ఆలస్యంగా చెల్లించినందుకు వడ్డీ.'],
  surcharge: ['సర్‌ఛార్జీ', 'అదనపు ఛార్జీ.'],
  acdSurcharge: ['ACD సర్‌ఛార్జీ', 'అదనపు కన్సంప్షన్ డిపాజిట్‌కు సంబంధించిన సర్‌ఛార్జీ.'],
  fsa: ['FSA/FCA ఛార్జీలు', 'ఇంధన మరియు విద్యుత్ కొనుగోలు ఖర్చులో మార్పులకు సర్దుబాటు.'],
  trueUp: ['ట్రూ-అప్ ఛార్జీలు', 'గత సంవత్సరాల ఖర్చుల సర్దుబాటు.'],
  interestSD: ['సెక్యూరిటీ డిపాజిట్‌పై వడ్డీ', 'మీ సెక్యూరిటీ డిపాజిట్‌పై వడ్డీ.'],
  subsidy: ['సబ్సిడీ', 'ప్రభుత్వ సబ్సిడీ సర్దుబాటు.'],
  adjustment: ['సర్దుబాటు', 'ఇతర సర్దుబాటు.'],
  interestCD: ['కన్సంప్షన్ డిపాజిట్‌పై వడ్డీ', 'కన్సంప్షన్ డిపాజిట్‌పై వడ్డీ.'],
  lossGain: ['రౌండింగ్ సర్దుబాటు', 'బిల్లును పూర్తి రూపాయలకు చేసే చిన్న సర్దుబాటు.'],
};

const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(2));
const rs = (n) => `${n < 0 ? '-' : ''}₹${fmt(Math.abs(n))}`;
const round2 = (n) => Math.round(n * 100) / 100;

// Explanation object: every number is parsed or computed here, then rendered by templates.
export function buildExplanation(bill) {
  const lines = ITEM_KEYS.filter((k) => bill.items[k] != null && bill.items[k] !== 0)
    .map((k) => ({ key: k, amount: bill.items[k], en: `${EN[k]}: ${rs(bill.items[k])}`, te: `${TE[k][0]}: ${rs(bill.items[k])} — ${TE[k][1]}` }));
  const perUnit = bill.units > 0 ? round2(bill.billAmount / bill.units) : null;
  const energyPerUnit = bill.units > 0 && bill.items.energy != null ? round2(bill.items.energy / bill.units) : null;
  const arrears = bill.totalDue != null ? round2(bill.totalDue - bill.billAmount) : null;
  return { billAmount: bill.billAmount, totalDue: bill.totalDue ?? null, arrears, units: bill.units, days: bill.days ?? null, perUnit, energyPerUnit, lines };
}

export function renderTelugu(e) {
  const out = [`ఈ నెల బిల్లు ${rs(e.billAmount)}. మీరు ${e.units} యూనిట్లు వాడారు${e.days ? ` (${e.days} రోజులకు)` : ''}.`];
  out.push(...e.lines.map((l) => `• ${l.te}`));
  if (e.energyPerUnit != null) out.push(`విద్యుత్ ఛార్జీ సగటున యూనిట్‌కు ${rs(e.energyPerUnit)}.`);
  if (e.arrears) out.push(`చెల్లించాల్సిన మొత్తం ${rs(e.totalDue)}: బకాయిలు/సర్దుబాట్ల వల్ల బిల్లు కంటే ${rs(Math.abs(e.arrears))} ${e.arrears > 0 ? 'ఎక్కువ' : 'తక్కువ'}.`);
  return out.join('\n');
}

export function renderEnglish(e) {
  const out = [`This month's bill is ${rs(e.billAmount)} for ${e.units} units${e.days ? ` over ${e.days} days` : ''}.`];
  out.push(...e.lines.map((l) => `- ${l.en}`));
  if (e.energyPerUnit != null) out.push(`Energy charges average ${rs(e.energyPerUnit)} per unit.`);
  if (e.arrears) out.push(`Total due is ${rs(e.totalDue)}: arrears/adjustments make it ${rs(Math.abs(e.arrears))} ${e.arrears > 0 ? 'more' : 'less'} than the bill amount.`);
  return out.join('\n');
}

export function explainChange(curr, prev) {
  if (!prev || curr.billAmount == null) return null;
  const dTotal = round2(curr.billAmount - prev.total);
  const dUnits = (curr.units ?? 0) - prev.units;
  const dDays = (curr.days ?? 0) - (prev.days ?? 0);
  const te = `గత నెలతో పోలిస్తే బిల్లు ${rs(Math.abs(dTotal))} ${dTotal >= 0 ? 'పెరిగింది' : 'తగ్గింది'}. ` +
    `యూనిట్లు ${Math.abs(dUnits)} ${dUnits >= 0 ? 'ఎక్కువ' : 'తక్కువ'}` +
    (dDays ? `, బిల్లింగ్ రోజులు ${Math.abs(dDays)} ${dDays > 0 ? 'ఎక్కువ' : 'తక్కువ'}` : '') + '.';
  const en = `Bill ${dTotal >= 0 ? 'rose' : 'fell'} by ${rs(Math.abs(dTotal))} vs last month: ` +
    `${Math.abs(dUnits)} units ${dUnits >= 0 ? 'more' : 'fewer'}` +
    (dDays ? `, ${Math.abs(dDays)} ${dDays > 0 ? 'more' : 'fewer'} billing days` : '') + '.';
  return { dTotal, dUnits, dDays, te, en };
}

// History is oldest -> newest ({units,total,days}); range is +/-15% around the point estimate.
export function forecastNext(history) {
  const h = history.filter((b) => b.total != null && b.units > 0 && plausibleRate(b.total / b.units)).slice(-6);
  if (h.length < 2) return null;
  const avgUnits = h.reduce((a, b) => a + b.units, 0) / h.length;
  const avgPerUnit = h.reduce((a, b) => a + b.total / b.units, 0) / h.length;
  const point = Math.round(avgUnits * avgPerUnit);
  const low = Math.round(point * 0.85), high = Math.round(point * 1.15);
  return {
    point, low, high, assumptions: { months: h.length, avgUnits: Math.round(avgUnits), avgPerUnit: round2(avgPerUnit) },
    te: `వచ్చే నెల బిల్లు సుమారు ${rs(point)} (${rs(low)}–${rs(high)}) ఉండవచ్చు. గత ${h.length} నెలల సగటు వాడకం ${Math.round(avgUnits)} యూనిట్ల ఆధారంగా అంచనా.`,
    en: `Next bill is likely around ${rs(point)} (${rs(low)}-${rs(high)}), based on your average of ${Math.round(avgUnits)} units over the last ${h.length} months.`,
  };
}

// Number faithfulness: every number in rendered text must be a known value.
export function verifyNumbers(text, e) {
  const known = [e.billAmount, e.totalDue, e.arrears, e.units, e.days, e.perUnit, e.energyPerUnit, ...e.lines.map((l) => l.amount)]
    .filter((v) => v != null).map((v) => fmt(Math.abs(v)));
  return (text.match(/\d+(?:\.\d+)?/g) ?? []).every((n) => known.includes(n));
}

export function analyzeBill(bill, history = []) {
  const validation = validateBill(bill);
  if (!validation.ok) return { bill, validation, confident: false };
  const explanation = buildExplanation(bill);
  return {
    bill, validation, confident: true, explanation,
    telugu: renderTelugu(explanation), english: renderEnglish(explanation),
    change: explainChange(bill, history[history.length - 1]),
    forecast: forecastNext([...history, { units: bill.units, total: bill.billAmount, days: bill.days }]),
  };
}

export const analyze = (text, history = []) => analyzeBill(parseBill(text), history);
