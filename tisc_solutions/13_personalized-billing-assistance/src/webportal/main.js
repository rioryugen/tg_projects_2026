import Ocr from '@gutenye/ocr-browser';
import * as ort from 'onnxruntime-web';
import * as pdfjs from 'pdfjs-dist';
import { analyzeBill, ITEM_KEYS } from '../shared/engine.mjs';
import { bestText } from '../shared/layout.mjs';
import { parseBill } from '../shared/engine.mjs';

ort.env.wasm.wasmPaths = new URL('./dist/ort/', location.href).href;
ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;
pdfjs.GlobalWorkerOptions.workerSrc = new URL('./dist/pdf.worker.min.mjs', location.href).href;

const $ = (id) => document.getElementById(id);
const KEY = 'billudu.history.v1';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) ?? []; } catch { return []; } };
const LABEL = {
  energy: 'Energy charges', fixed: 'Fixed charges', customer: 'Customer charges', duty: 'Electricity duty',
  interestED: 'Interest on ED', surcharge: 'Surcharge', acdSurcharge: 'ACD surcharge', fsa: 'FSA/FCA',
  trueUp: 'True-up', interestSD: 'Interest on SD', subsidy: 'Subsidy', adjustment: 'Adjustment',
  interestCD: 'Interest on CD', lossGain: 'Loss/Gain',
};

let ocrPromise;
const getOcr = () => (ocrPromise ??= Ocr.create({
  models: {
    detectionPath: './dist/models/ch_PP-OCRv4_det_infer.onnx',
    recognitionPath: './dist/models/ch_PP-OCRv4_rec_infer.onnx',
    dictionaryPath: './dist/models/ppocr_keys_v1.txt',
  },
}));

async function pdfToImageUrl(file) {
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 2.5 });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width; canvas.height = viewport.height;
  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
  return canvas.toDataURL('image/png');
}

let current = null;

function renderFields(bill) {
  const box = $('fields');
  box.replaceChildren();
  const add = (key, label, value) => {
    const row = document.createElement('label');
    row.textContent = label;
    const input = document.createElement('input');
    input.type = 'number'; input.step = '0.01'; input.dataset.key = key;
    if (value != null) input.value = value;
    row.append(input);
    box.append(row);
  };
  add('units', 'Units', bill.units);
  add('days', 'Billing days', bill.days);
  add('billAmount', 'Bill amount (₹)', bill.billAmount);
  for (const k of ITEM_KEYS) add(`item:${k}`, LABEL[k], bill.items[k]);
  $('review').hidden = false;
}

function readFields() {
  const bill = { items: {}, totalDue: current?.totalDue, consumerNo: current?.consumerNo };
  for (const input of $('fields').querySelectorAll('input')) {
    if (input.value === '') continue;
    const [kind, key] = input.dataset.key.split(':');
    if (kind === 'item') bill.items[key] = Number(input.value); else bill[kind] = Number(input.value);
  }
  return bill;
}

function show(result) {
  $('result').hidden = false;
  const days = $('fields').querySelector('[data-key="days"]');
  if (days) days.style.borderColor = result.validation.warnings?.includes('check_days') ? '#f87171' : '';
  const units = $('fields').querySelector('[data-key="units"]');
  if (units) units.style.borderColor = result.validation.warnings?.includes('check_units') ? '#f87171' : '';
  if (!result.confident) {
    $('te').textContent = 'బిల్లును నమ్మకంగా చదవలేకపోయాను. పై అంకెలను బిల్లుతో సరిచూసి సరిచేయండి.';
    $('en').textContent = `Could not verify the bill (${result.validation.issues.join(', ')}). Compare the fields above with your bill and fix them.`;
    $('changeCard').hidden = $('fcCard').hidden = true;
    return;
  }
  const warn = result.validation.warnings.length ? '\n⚠ Please double-check units and billing days against your bill.' : '';
  $('te').textContent = result.telugu;
  $('en').textContent = result.english + warn;
  $('changeCard').hidden = !result.change;
  if (result.change) $('change').textContent = `${result.change.te}\n${result.change.en}`;
  $('fcCard').hidden = !result.forecast;
  if (result.forecast) $('fc').textContent = `${result.forecast.te}\n${result.forecast.en}`;
}

function explain() {
  current = readFields();
  const result = analyzeBill(current, load());
  show(result);
  if (result.confident) {
    const entry = { units: current.units, total: current.billAmount, days: current.days };
    localStorage.setItem(KEY, JSON.stringify([...load(), entry].slice(-12)));
  }
}

async function onFile(file) {
  $('status').textContent = 'Loading on-device AI model (first time only)…';
  try {
    const url = file.type === 'application/pdf' ? await pdfToImageUrl(file) : URL.createObjectURL(file);
    $('preview').src = url; $('preview').hidden = false;
    const ocr = await getOcr();
    $('status').textContent = 'Reading bill…';
    const { texts } = await ocr.detect(url);
    const { result } = bestText(texts);
    current = result.bill ?? parseBill('');
    renderFields(current);
    $('status').textContent = result.confident
      ? 'Bill read and verified. Check the numbers, then press Explain.'
      : 'Some numbers could not be verified. Please correct the fields below, then press Explain.';
    if (result.confident) show(result);
  } catch (e) {
    console.error(e);
    $('status').textContent = 'Could not read this file. Try a clearer, closer photo.';
  }
}

$('file').onchange = (e) => e.target.files[0] && onFile(e.target.files[0]);
$('manual').onclick = () => { current = { items: {} }; renderFields(current); };
$('analyze').onclick = explain;
$('clear').onclick = () => { localStorage.removeItem(KEY); $('status').textContent = 'History cleared.'; };
$('speak').onclick = () => {
  const u = new SpeechSynthesisUtterance($('te').textContent);
  u.lang = 'te-IN';
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
};

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
