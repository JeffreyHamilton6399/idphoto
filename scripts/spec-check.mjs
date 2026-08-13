// Verifies the crop solver actually produces spec-compliant photos, by
// synthesising faces at known positions and measuring the result.
// Run with `bun scripts/spec-check.mjs`.
import { SPECS, getSpec, pixelSize, targetHeadFraction } from "../src/lib/specs.ts";
import {
  solveCrop,
  measure,
  runChecks,
  estimateCrown,
  crownFromMask,
  cropOverflow,
  worstStatus,
} from "../src/lib/geometry.ts";

let failures = 0;
function check(label, pass, detail = "") {
  if (pass) console.log(`ok   ${label}`);
  else {
    failures += 1;
    console.log(`FAIL ${label} ${detail}`);
  }
}

/** A face sitting in a 3000×4000 photo, head 1200px tall. */
function makeFace({ eyeY = 1500, chinY = 2100, eyeX = 1500, roll = 0 } = {}) {
  return {
    eyeY,
    eyeX,
    chinY,
    crownY: estimateCrown(eyeY, chinY),
    crownSource: "estimated",
    rollDeg: roll,
  };
}

// --- Every spec must be satisfiable from a well-shot photo ----------------
for (const spec of SPECS) {
  const geo = makeFace();
  const crop = solveCrop(geo, spec);
  const m = measure(geo, crop, spec);

  const headOk = m.headMm >= spec.headMinMm && m.headMm <= spec.headMaxMm;
  check(
    `${spec.id}: head lands in range`,
    headOk,
    `(${m.headMm.toFixed(1)} mm vs ${spec.headMinMm}–${spec.headMaxMm})`,
  );

  if (spec.eyeMinMm !== undefined) {
    const eyeOk =
      m.eyeFromBottomMm >= spec.eyeMinMm && m.eyeFromBottomMm <= spec.eyeMaxMm;
    check(
      `${spec.id}: eye line lands in range`,
      eyeOk,
      `(${m.eyeFromBottomMm.toFixed(1)} mm vs ${spec.eyeMinMm}–${spec.eyeMaxMm})`,
    );
  }

  const aspect = crop.width / crop.height;
  const wanted = spec.widthMm / spec.heightMm;
  check(
    `${spec.id}: crop matches print aspect`,
    Math.abs(aspect - wanted) < 1e-9,
    `(${aspect.toFixed(4)} vs ${wanted.toFixed(4)})`,
  );
}

// --- Spec sanity: the published numbers must be internally consistent ------
for (const spec of SPECS) {
  check(
    `${spec.id}: head range fits inside the photo`,
    spec.headMaxMm < spec.heightMm && spec.headMinMm > 0,
    `(head ${spec.headMaxMm} vs photo ${spec.heightMm})`,
  );
  const frac = targetHeadFraction(spec);
  check(`${spec.id}: target head fraction is sane`, frac > 0.4 && frac < 0.9, `(${frac.toFixed(2)})`);
  const px = pixelSize(spec);
  check(`${spec.id}: renders at least 300px`, px.width >= 300 && px.height >= 300, `(${px.width}×${px.height})`);
}

// --- US spec against the State Department's own numbers -------------------
{
  const us = getSpec("us-passport");
  const px = pixelSize(us);
  check("US photo is 600×600 px at 300 DPI", px.width === 600 && px.height === 600, `(${px.width}×${px.height})`);
}

// --- The mask crown beats the estimate on tall hair ------------------------
{
  const width = 100;
  const height = 200;
  const mask = new Uint8ClampedArray(width * height * 4);
  // Subject silhouette starts at row 40 in a band around the face.
  for (let y = 40; y < height; y++) {
    for (let x = 30; x < 70; x++) mask[(y * width + x) * 4 + 3] = 255;
  }
  const found = crownFromMask(mask, width, height, 50);
  check("mask crown finds the silhouette top", found === 40, `(${found})`);

  // A stray blob far from the face must not be mistaken for the head.
  const withBlob = new Uint8ClampedArray(mask);
  for (let y = 5; y < 10; y++) {
    for (let x = 0; x < 4; x++) withBlob[(y * width + x) * 4 + 3] = 255;
  }
  const ignored = crownFromMask(withBlob, width, height, 50);
  check("mask crown ignores distant blobs", ignored === 40, `(${ignored})`);
}

// --- Head scale moves the measurement the way the slider implies -----------
{
  const spec = getSpec("uk-passport");
  const geo = makeFace();
  const small = measure(geo, solveCrop(geo, spec, { headScale: 0.9 }), spec);
  const big = measure(geo, solveCrop(geo, spec, { headScale: 1.1 }), spec);
  check("larger head scale measures larger", big.headMm > small.headMm, `(${small.headMm.toFixed(1)} → ${big.headMm.toFixed(1)})`);
}

// --- A face too close to the top must be reported, not silently cropped ----
{
  const spec = getSpec("us-passport");
  const geo = makeFace({ eyeY: 200, chinY: 800 });
  const crop = solveCrop(geo, spec);
  const over = cropOverflow(crop, 3000, 4000);
  check("overflow detected when the head is near the edge", over.any);

  const checks = runChecks(geo, crop, spec, 3000, 4000);
  const framing = checks.find((c) => c.id === "framing");
  check("framing check fails on overflow", framing.status === "fail");
}

// --- A good photo passes everything except the estimated-crown note --------
{
  const spec = getSpec("us-passport");
  const geo = makeFace();
  const crop = solveCrop(geo, spec);
  const checks = runChecks(geo, crop, spec, 3000, 4000);
  const failed = checks.filter((c) => c.status === "fail");
  check("well-shot photo has no failures", failed.length === 0, `(${failed.map((f) => f.id).join(",")})`);
  check("estimated crown is flagged as a warning", worstStatus(checks) === "warn");

  const withMask = { ...geo, crownSource: "mask" };
  const masked = runChecks(withMask, solveCrop(withMask, spec), spec, 3000, 4000);
  check("mask-derived crown clears all checks", worstStatus(masked) === "pass");
}

// --- A low-resolution phone crop must be caught ----------------------------
{
  const spec = getSpec("us-passport");
  const geo = makeFace({ eyeY: 150, chinY: 210, eyeX: 200 });
  const crop = solveCrop(geo, spec);
  const checks = runChecks(geo, crop, spec, 400, 500);
  const res = checks.find((c) => c.id === "resolution");
  check("upscaling is caught", res.status !== "pass", `(${res.detail})`);
}

// --- Tilt ------------------------------------------------------------------
{
  const spec = getSpec("us-passport");
  const geo = makeFace({ roll: 8 });
  const checks = runChecks(geo, solveCrop(geo, spec), spec, 3000, 4000);
  check("tilted head fails the level check", checks.find((c) => c.id === "level").status === "fail");
}

console.log(failures ? `\n${failures} FAILING` : "\nall checks passed");
process.exit(failures ? 1 : 0);
