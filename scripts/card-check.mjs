// Checks the badge layout maths that don't need a canvas: text fitting,
// field limits, card sizing, and how cards tile on a print sheet.
// Run with `bun scripts/card-check.mjs`.
import {
  fitText,
  usableFields,
  maxFieldsFor,
  cardSizeMm,
  emptyCard,
  CARD_MM,
} from "../src/lib/card.ts";
import { planSheet, SHEETS } from "../src/lib/render.ts";
import { TEMPLATES, applyTemplate, getTemplate } from "../src/lib/card-templates.ts";

let failures = 0;
function check(label, pass, detail = "") {
  if (pass) console.log(`ok   ${label}`);
  else {
    failures += 1;
    console.log(`FAIL ${label} ${detail}`);
  }
}

// Stand-in for canvas metrics: every glyph is 0.5em wide.
const measure = (text, fontPx) => text.length * fontPx * 0.5;

// --- Text fitting ---------------------------------------------------------
{
  const short = fitText("Ada Lovelace", 400, 40, 20, measure);
  check("short text keeps its size", short.fontPx === 40 && short.text === "Ada Lovelace");

  const long = fitText("Bartholomew Featherstonehaugh", 200, 40, 20, measure);
  check("long text shrinks", long.fontPx < 40, `(${long.fontPx})`);
  check("shrunk text still fits", measure(long.text, long.fontPx) <= 200);

  const huge = fitText("Bartholomew Featherstonehaugh III of Nottinghamshire", 60, 40, 20, measure);
  check("text past the floor is ellipsised", huge.text.endsWith("…"), `(${huge.text})`);
  check("ellipsised text fits", measure(huge.text, huge.fontPx) <= 60, `(${measure(huge.text, huge.fontPx)})`);
  check("floor size is respected", huge.fontPx === 20, `(${huge.fontPx})`);

  const single = fitText("W", 1, 40, 20, measure);
  check("impossible width still returns something", single.text.length >= 1, `(${single.text})`);
}

// --- Fields ---------------------------------------------------------------
{
  const data = emptyCard();
  data.fields = [
    { id: "a", label: "ID", value: "123" },
    { id: "b", label: "", value: "orphan value" },
    { id: "c", label: "Empty", value: "  " },
    { id: "d", label: "Issued", value: "2026-01-01" },
    { id: "e", label: "Expires", value: "2027-01-01" },
    { id: "f", label: "Extra", value: "x" },
    { id: "g", label: "Overflow", value: "y" },
  ];

  const landscape = usableFields(data, maxFieldsFor("landscape"));
  check("blank labels and values are dropped", landscape.every((f) => f.label && f.value.trim()));
  check("landscape caps at 4 fields", landscape.length === 4, `(${landscape.length})`);

  const portrait = usableFields(data, maxFieldsFor("portrait"));
  check("portrait allows 5 fields", portrait.length === 5, `(${portrait.length})`);
}

// --- Card size ------------------------------------------------------------
{
  const l = cardSizeMm("landscape");
  const p = cardSizeMm("portrait");
  check("landscape is CR80", l.widthMm === CARD_MM.long && l.heightMm === CARD_MM.short);
  check("portrait is CR80 rotated", p.widthMm === CARD_MM.short && p.heightMm === CARD_MM.long);
}

// --- Cards on print sheets ------------------------------------------------
{
  const l = cardSizeMm("landscape");
  const a4 = SHEETS.find((s) => s.id === "a4");
  const plan = planSheet(l.widthMm, l.heightMm, a4.widthMm, a4.heightMm);
  check("CR80 cards tile an A4 sheet", plan.copies >= 8, `(${plan.cols}×${plan.rows} = ${plan.copies})`);

  const blockW = plan.cols * l.widthMm + (plan.cols - 1) * plan.gapMm;
  const blockH = plan.rows * l.heightMm + (plan.rows - 1) * plan.gapMm;
  check(
    "card block fits the paper",
    blockW <= a4.widthMm + 1e-9 && blockH <= a4.heightMm + 1e-9,
    `(${blockW.toFixed(1)}×${blockH.toFixed(1)})`,
  );

  for (const s of SHEETS) {
    for (const o of ["landscape", "portrait"]) {
      const size = cardSizeMm(o);
      const p = planSheet(size.widthMm, size.heightMm, s.widthMm, s.heightMm);
      check(`${o} card on ${s.id}: at least one copy`, p.copies >= 1, `(${p.copies})`);
    }
  }
}

// --- Templates ------------------------------------------------------------
{
  check("template ids are unique", new Set(TEMPLATES.map((t) => t.id)).size === TEMPLATES.length);

  for (const t of TEMPLATES) {
    const applied = applyTemplate(emptyCard(), t);
    check(
      `${t.id}: fields fit the orientation`,
      applied.fields.length <= maxFieldsFor(applied.orientation),
      `(${applied.fields.length} > ${maxFieldsFor(applied.orientation)})`,
    );
    check(`${t.id}: every field is labelled`, applied.fields.every((f) => f.label.trim() !== ""));
    check(`${t.id}: field ids are unique`, new Set(applied.fields.map((f) => f.id)).size === applied.fields.length);
    check(`${t.id}: carries its style through`, applied.accent === t.accent && applied.layout === t.layout);
    check(`${t.id}: records which template is active`, applied.templateId === t.id);
  }

  // Switching template restyles without wiping what has been typed.
  {
    let data = emptyCard();
    data.holderName = "Ada Lovelace";
    data.orgName = "Analytical Engines Ltd";
    data.fields = data.fields.map((f, i) => ({ ...f, value: `value ${i}` }));

    const switched = applyTemplate(data, getTemplate("student"));
    check("switching keeps the holder name", switched.holderName === "Ada Lovelace");
    check("switching keeps the organisation", switched.orgName === "Analytical Engines Ltd");
    check("switching keeps entered values", switched.fields[0].value === "value 0", `(${switched.fields[0].value})`);
    check("switching relabels the fields", switched.fields[0].label === "Student No.", `(${switched.fields[0].label})`);
  }

  // An unknown id must not throw.
  check("unknown template falls back", getTemplate("nope").id === TEMPLATES[0].id);

  // The artwork template must not paint chrome over the supplied design.
  check("artwork template uses the plain style", getTemplate("artwork").layout === "plain");
}

console.log(failures ? `\n${failures} FAILING` : "\nall checks passed");
process.exit(failures ? 1 : 0);
