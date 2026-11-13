# Challenge 13 — Personalized Billing Assistance: Working Plan

Official ask (from TISC): a consumer photographs an electricity bill and gets an AI-generated explanation of every charge in Telugu, analysis of monthly consumption, and a prediction of the next bill. Departments: Energy (TDSDISCOMs). Impact: clearer bills, better-informed consumers, fewer avoidable service queries.

---

## 1. Product definition

**Working name:** *Billudu* ("bill" + Telugu flavour) — photo → Telugu explanation → forecast.

User journey (the one we demo):
1. Consumer photographs a paper bill (or forwards a WhatsApp image / PDF).
2. System extracts the fields: discom, consumer/service number, tariff category, meter reading dates, units consumed, billing days, per-slab energy charge, fixed charge, fuel/energy adjustment, surcharge, late fee, arrears/adjustments, total, due date.
3. It explains each line in Telugu, in plain sentences: "Your bill is ₹X because you used Y units over Z days; the slab changed from last month because…", with a numerate breakdown table.
4. It answers *why did my bill go up* — decomposition into units, per-unit rate, billing-days, adjustment charges, weather-linked load.
5. It estimates next month's bill as a range with an explicit confidence band and the assumptions used (last 6 months of readings + seasonal load profile).
6. Optional voice output in Telugu for low-literacy users; printable one-page summary for Grama Sabhas / Seva Barodis.

**Non-goals for v1:** payments, complaint handling, tariff litigation advice, real-time meter streaming (most consumers have no AMI access).

---

## 2. Core design principle: deterministic math, generative language

Every number shown to the consumer comes from parsed bill fields plus a versioned tariff table computed in code — never from an LLM. The LLM only *renders* text (Telugu/English) from a structured explanation object. This makes the output auditable and prevents hallucinated charges, which is the single biggest credibility risk for a public-impact demo.

Pipeline:
```
photo → rectify/de-skew → OCR (layout-aware) → field extraction & validation
      → bill schema object  ─→ tariff engine (slab math, FAC, surcharge)
      → history store (consumer's parsed bills over months)
      → explanation object → Telugu/English renderer (+ TTS)
      → forecast model → range + assumptions
```

Field extraction is the hard part and the demo's make-or-break. Plan: layout-aware OCR (DocTR/PaddleOCR fine-tuned on Telangana bill formats, with Tesseract as fallback), a per-format parsing registry keyed by discom + bill template version, and numeric self-consistency checks (units × rate ≈ energy charge; sum of components == total). A mismatch → the app says "I can't read this confidently" rather than guessing.

Telugu rendering: template-based Telugu for the standard explanation shapes (fixed phrases reviewed by a native speaker), LLM translation for free-form questions, with numeric tokens kept in digits and rupee symbols preserved. Include common transliterated terms consumers actually use (యూనిట్లు, ఫిక్స్డ్ ఛార్జీ, ఫ్యూల్ అడ్జస్ట్‌మెంట్).

Forecasting: start with a simple, explainable model — per-tariff-category seasonal baseline + consumer's own 6-month history + degree-days from local weather. Report MAPE honestly; consumers trust "₹1,200–1,500 if you use AC like last month" more than a fake precise number.

---

## 3. Channels & affordability

- **WhatsApp bot** — zero install, works on cheap phones, photo-in/answer-out. Primary channel for reach.
- **Light web/PWA page** for the demo and for discom embedding on their portal.
- Self-hosted OCR, small local LLM for translation where feasible; per-bill cost target under ₹1. Caching by consumer number + month so repeat queries are free.

---

## 4. What we need from the department (data asks)

1. Sample bills covering every current bill template version across the TDSDISCOMs (domestic LT, commercial, prepaid-meter receipts, and the printed thermal copies that fade).
2. The published tariff orders per category in machine-readable form (slabs, fixed charges, surcharges, FAC basis), with effective dates — needed for a versioned tariff engine.
3. Access route to consumer billing history (API or monthly batch file) so prediction works without the consumer photographing 6 bills; fallback is "photograph your last few bills".
4. A baseline number: current bill-related calls/queries at call centres and Seva Barodis, so impact can be measured after pilot.
5. Approval path for a consumer-consent pilot in one mandal.

Open questions to ask TSSPDCL/TGSPDCL/TPNDCL/GHDCL equivalents (confirm exact current discom list and names — verify, don't assume):
- Which bill formats are live today, and how often do templates change?
- Is there an existing consumer-facing bill explainer/app/bot we should integrate with rather than compete with?
- What is the department's stance on Telugu-first vs bilingual (Telugu + English) output?
- Do they want this as a consumer app, a call-centre assist tool for staff, or embedded in the existing portal?

---

## 5. MVP scope for Demo Day (1 Dec 2026, T-Hub)

Live demo on one phone: photograph two real bills from two different discoms, show parsed fields with confidence, Telugu explanation card, "why it rose" decomposition, next-bill range. Plus a pre-computed sample deck showing the same for a street-level aggregate (mandal dashboard: which tariff categories are seeing bill spikes — that's the department-facing hook).

Stretch if time allows: Telugu voice output, and the Seva Barodi one-page printable summary.

---

## 6. Evaluation metrics (what we commit to)

- Field extraction accuracy on an annotated set of bills: ≥98% on numeric fields; report per-format breakdown.
- **Number faithfulness**: every number in generated text must equal a parsed/computed value, checked by an automated verifier. Zero tolerance.
- Next-bill forecast MAPE one month ahead, reported by tariff category (target ≤15%, publish actual).
- Comprehension test: n≥30 consumers in a mandal, before/after quiz on their own bill; measure improvement.
- Query reduction: measured against department baseline after pilot.

---

## 7. Risks & mitigations

| Risk | Mitigation |
| --- | --- |
| Faded thermal prints, crumpled photos | Image restoration + confidence gating; explicit "can't read" path |
| Bill template changes silently | Format registry with version detection; drift alert when a new layout appears |
| Tariff orders change mid-year | Versioned tariff tables keyed by billing period; effective-date aware |
| LLM invents numbers | Deterministic math layer + numeric verifier; no free-form arithmetic in prompts |
| Consumer privacy (name, consumer number, address on bill) | Explicit consent, minimal retention, DPDP Act 2023 alignment, no training on personal data without permission, PII masked in logs |
| Telugu quality (mixed-script OCR garbling Telugu labels) | Numeric-first extraction — Telangana bills are mostly digits + English abbreviations; Telugu only for output |
| Cost per query at scale | Self-hosted OCR, caching, small models, WhatsApp as free transport |

---

## 8. Reuse story (scalability argument for judges)

The same engine generalises to any bill: water/tax bills, LPG, gas, municipal property tax, pension slips — the parse-explain-forecast pattern is department-agnostic. That's the affordability + scalability case: one platform, many departments, Telugu-first, low per-query cost.

---

## 9. Milestones (anchored to TISC dates)

| Window | Deliverable |
| --- | --- |
| Now → week 2 | Bill corpus collected (public samples), format registry v0, parser for one discom |
| Week 3–4 | End-to-end photo→fields→explanation in Telugu on 5 bills; tariff engine v1 from published orders |
| Before 20 Nov | Application submitted: problem framing, MVP screenshots, metrics commitment, data asks list |
| Nov → 1 Dec | Forecast model + "why it rose" decomposition; mandal dashboard mockup; demo rehearsal on one phone over mobile data |

**Application:** https://forms.zohopublic.com/THub/form/TISC2026ApplicationForm/formperma/_CRTCzpyPqvGiThE5TOeJDwicYaGJpup0OFe4XC1eLc
Evaluation criteria: feasibility, innovation, affordability, scalability, public impact.

---

## 10. Open decisions (needs your input)

- Consumer app vs department-side tool (call-centre assist / Seva Barodi) — the demo can show both, but the application should commit to one primary framing.
- Build in-house parser vs using a commercial document AI API for v1 (in-house is the affordability story; API gets us to demo faster).
- Interpreter/annotator sourcing: need a Telugu speaker to review explanation templates and run the comprehension test.

---

*General knowledge note: specific TDSDISCOM names, current tariff slabs, existing discom apps/bots are not verified here — confirm against the official discom portals (TSSPDCL/TGSPDCL/TPNDCL/GHDCL) before quoting any rate in the application.*
