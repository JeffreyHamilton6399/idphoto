// Checks the print-sheet layout against what a photo counter actually produces.
// Run with `bun scripts/sheet-check.mjs`.
import { planSheet, SHEETS } from "../src/lib/render.ts";
import { SPECS, getSpec } from "../src/lib/specs.ts";

let failures = 0;
function check(label, pass, detail = "") {
  if (pass) console.log(`ok   ${label}`);
  else {
    failures += 1;
    console.log(`FAIL ${label} ${detail}`);
  }
}

const sheet = (id) => SHEETS.find((s) => s.id === id);

// The canonical case: six 2×2 in photos on a 4×6 in print.
{
  const us = getSpec("us-passport");
  const p = planSheet(us.widthMm, us.heightMm, sheet("4x6").widthMm, sheet("4x6").heightMm);
  check("US 2x2 on 4x6 gives 6 copies", p.copies === 6, `(${p.cols}×${p.rows} = ${p.copies})`);
}

// UK 35×45 mm on a 4×6: 4 across, 2 down.
{
  const uk = getSpec("uk-passport");
  const p = planSheet(uk.widthMm, uk.heightMm, sheet("4x6").widthMm, sheet("4x6").heightMm);
  check("UK 35x45 on 4x6 gives 8 copies", p.copies === 8, `(${p.cols}×${p.rows} = ${p.copies})`);
}

// Nothing may overflow the paper, for any spec on any sheet.
for (const spec of SPECS) {
  for (const s of SHEETS) {
    const p = planSheet(spec.widthMm, spec.heightMm, s.widthMm, s.heightMm);
    const blockW = p.cols * spec.widthMm + (p.cols - 1) * p.gapMm;
    const blockH = p.rows * spec.heightMm + (p.rows - 1) * p.gapMm;

    check(
      `${spec.id} on ${s.id}: fits the paper`,
      blockW <= s.widthMm + 1e-9 && blockH <= s.heightMm + 1e-9,
      `(${blockW.toFixed(1)}×${blockH.toFixed(1)} on ${s.widthMm}×${s.heightMm})`,
    );
    check(
      `${spec.id} on ${s.id}: centred with non-negative origin`,
      p.startXMm >= -1e-9 && p.startYMm >= -1e-9,
      `(${p.startXMm.toFixed(1)}, ${p.startYMm.toFixed(1)})`,
    );
    check(`${spec.id} on ${s.id}: at least one copy`, p.copies >= 1, `(${p.copies})`);
    check(
      `${spec.id} on ${s.id}: gap stays sane`,
      p.gapMm >= 0 && p.gapMm <= 3,
      `(${p.gapMm.toFixed(2)} mm)`,
    );
  }
}

// A photo bigger than the paper still yields one (clipped) copy rather than
// dividing by zero or looping forever.
{
  const p = planSheet(200, 300, 100, 150);
  check("oversized photo degrades to one copy", p.copies === 1, `(${p.copies})`);
}

console.log(failures ? `\n${failures} FAILING` : "\nall checks passed");
process.exit(failures ? 1 : 0);
