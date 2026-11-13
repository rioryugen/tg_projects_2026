// JSON-in/JSON-out entry points bundled for the native apps (QuickJS on Android, JavaScriptCore on iOS),
// so all three platforms run the exact same tested engine.
import { analyzeBill } from './engine.mjs';
import { bestText } from './layout.mjs';

// boxes: [{text, box:[[x,y],[x,y],[x,y],[x,y]]}] in image pixels, clockwise from top-left.
export function analyzeBoxesJson(boxesJson, historyJson) {
  const { result } = bestText(JSON.parse(boxesJson));
  return JSON.stringify(result.confident ? analyzeBill(result.bill, JSON.parse(historyJson)) : result);
}

// bill: {units, days, billAmount, totalDue?, items:{key:amount}}, e.g. after the user corrected a field.
export function analyzeBillJson(billJson, historyJson) {
  return JSON.stringify(analyzeBill(JSON.parse(billJson), JSON.parse(historyJson)));
}
