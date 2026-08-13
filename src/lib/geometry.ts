/**
 * Turning a detected face into a crop that satisfies a spec.
 *
 * The specs measure crown-to-chin, but no face model reports the crown — hair
 * is not a facial landmark. Two ways to find it, in order of trust:
 *
 *   1. The silhouette from background removal. The topmost opaque pixel above
 *      the face IS the crown, hair included. This is what the authority
 *      measures, so when a mask is available we use it.
 *   2. Anthropometry. The eye line sits close to the vertical midpoint of the
 *      head, so crown ≈ eyes − (chin − eyes). Good to a few percent on most
 *      adults, and wrong on tall hair — which is why the UI lets you nudge it.
 */

import {
  pixelSize,
  targetEyeFractionFromTop,
  targetHeadFraction,
  type PhotoSpec,
} from "./specs";

export interface FaceGeometry {
  /** Vertical position of the eye line, in source-image pixels. */
  eyeY: number;
  /** Horizontal midpoint between the pupils, in source-image pixels. */
  eyeX: number;
  /** Bottom of the chin, in source-image pixels. */
  chinY: number;
  /** Top of the head including hair, in source-image pixels. */
  crownY: number;
  /** How the crown was established, so the UI can say which. */
  crownSource: "mask" | "estimated";
  /** Roll angle of the eye line in degrees; positive tilts clockwise. */
  rollDeg: number;
}

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Crown estimated from the eye-to-chin distance when no mask is available. */
export function estimateCrown(eyeY: number, chinY: number): number {
  return eyeY - (chinY - eyeY);
}

/**
 * Scan a silhouette mask upward from the face to find the true top of the
 * head. `mask` is RGBA; a pixel counts as subject when alpha clears the cut.
 */
export function crownFromMask(
  mask: Uint8ClampedArray,
  width: number,
  height: number,
  eyeX: number,
  alphaCut = 128,
): number | null {
  // Only look within a band around the face, so a raised hand or a background
  // object that survived segmentation can't be mistaken for the head.
  const band = Math.max(24, Math.round(width * 0.12));
  const from = Math.max(0, Math.round(eyeX - band));
  const to = Math.min(width - 1, Math.round(eyeX + band));

  for (let y = 0; y < height; y++) {
    for (let x = from; x <= to; x++) {
      if (mask[(y * width + x) * 4 + 3] >= alphaCut) return y;
    }
  }
  return null;
}

/**
 * Solve the crop rectangle that places the head at the requested size and the
 * eyes on the spec's line. Returned in source-image pixels; it may extend past
 * the image edges, which `cropFit` reports so the UI can warn instead of
 * silently producing a photo with a bald strip along the top.
 */
export function solveCrop(
  geo: FaceGeometry,
  spec: PhotoSpec,
  options: { headScale?: number; offsetX?: number; offsetY?: number } = {},
): CropRect {
  const { headScale = 1, offsetX = 0, offsetY = 0 } = options;

  const headPx = geo.chinY - geo.crownY;
  const headFraction = targetHeadFraction(spec) * headScale;

  // If the head must occupy `headFraction` of the photo height, the photo is
  // this tall in source pixels.
  const cropHeight = headPx / headFraction;
  const cropWidth = cropHeight * (spec.widthMm / spec.heightMm);

  // Put the eye line where the spec wants it.
  const eyeFromTop = targetEyeFractionFromTop(spec) * cropHeight;

  return {
    x: geo.eyeX - cropWidth / 2 + offsetX,
    y: geo.eyeY - eyeFromTop + offsetY,
    width: cropWidth,
    height: cropHeight,
  };
}

/** How far the crop falls outside the source image, in pixels per edge. */
export function cropOverflow(
  crop: CropRect,
  imageWidth: number,
  imageHeight: number,
): { top: number; right: number; bottom: number; left: number; any: boolean } {
  const top = Math.max(0, -crop.y);
  const left = Math.max(0, -crop.x);
  const right = Math.max(0, crop.x + crop.width - imageWidth);
  const bottom = Math.max(0, crop.y + crop.height - imageHeight);
  return { top, right, bottom, left, any: top + right + bottom + left > 0.5 };
}

export interface Measurement {
  headMm: number;
  eyeFromBottomMm: number;
  /** Pixels across the finished photo's short edge, for a resolution check. */
  outputPx: { width: number; height: number };
  /** Source pixels available per output pixel; below 1 means upscaling. */
  sampling: number;
}

/** What the chosen crop actually measures, in the spec's own millimetres. */
export function measure(
  geo: FaceGeometry,
  crop: CropRect,
  spec: PhotoSpec,
): Measurement {
  const mmPerPx = spec.heightMm / crop.height;
  const headMm = (geo.chinY - geo.crownY) * mmPerPx;
  const eyeFromTopMm = (geo.eyeY - crop.y) * mmPerPx;
  const out = pixelSize(spec);

  return {
    headMm,
    eyeFromBottomMm: spec.heightMm - eyeFromTopMm,
    outputPx: out,
    sampling: crop.height / out.height,
  };
}

export type CheckStatus = "pass" | "warn" | "fail";

export interface ComplianceCheck {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
}

/**
 * The checks an application actually gets rejected on. Deliberately does not
 * claim to judge expression, glasses glare, or shadowing — a browser can't,
 * and pretending otherwise is what the paid sites do.
 */
export function runChecks(
  geo: FaceGeometry,
  crop: CropRect,
  spec: PhotoSpec,
  imageWidth: number,
  imageHeight: number,
): ComplianceCheck[] {
  const m = measure(geo, crop, spec);
  const checks: ComplianceCheck[] = [];

  const headOk = m.headMm >= spec.headMinMm && m.headMm <= spec.headMaxMm;
  checks.push({
    id: "head",
    label: "Head height",
    status: headOk ? "pass" : "fail",
    detail: `${m.headMm.toFixed(1)} mm (needs ${spec.headMinMm}–${spec.headMaxMm} mm)`,
  });

  if (spec.eyeMinMm !== undefined && spec.eyeMaxMm !== undefined) {
    const eyeOk =
      m.eyeFromBottomMm >= spec.eyeMinMm && m.eyeFromBottomMm <= spec.eyeMaxMm;
    checks.push({
      id: "eyes",
      label: "Eye line",
      status: eyeOk ? "pass" : "fail",
      detail: `${m.eyeFromBottomMm.toFixed(1)} mm from bottom (needs ${spec.eyeMinMm}–${spec.eyeMaxMm} mm)`,
    });
  }

  const overflow = cropOverflow(crop, imageWidth, imageHeight);
  checks.push({
    id: "framing",
    label: "Fits in photo",
    status: overflow.any ? "fail" : "pass",
    detail: overflow.any
      ? "The crop runs past the edge of your photo — move back and retake, or nudge the crop"
      : "Whole crop is inside the original",
  });

  checks.push({
    id: "resolution",
    label: "Resolution",
    status: m.sampling >= 1 ? "pass" : m.sampling >= 0.7 ? "warn" : "fail",
    detail:
      m.sampling >= 1
        ? `Enough detail for ${m.outputPx.width}×${m.outputPx.height} px at ${spec.dpi} DPI`
        : `Upscaling ${(1 / m.sampling).toFixed(1)}× to reach ${m.outputPx.width}×${m.outputPx.height} px — use a higher-resolution photo`,
  });

  const roll = Math.abs(geo.rollDeg);
  checks.push({
    id: "level",
    label: "Head level",
    status: roll <= 3 ? "pass" : roll <= 6 ? "warn" : "fail",
    detail: `Tilted ${roll.toFixed(1)}° — straighten up for a clean pass`,
  });

  if (geo.crownSource === "estimated") {
    checks.push({
      id: "crown",
      label: "Top of head",
      status: "warn",
      detail:
        "Estimated from face proportions. Replace the background for an exact measurement, or nudge the head size if you have tall hair",
    });
  }

  return checks;
}

export function worstStatus(checks: ComplianceCheck[]): CheckStatus {
  if (checks.some((c) => c.status === "fail")) return "fail";
  if (checks.some((c) => c.status === "warn")) return "warn";
  return "pass";
}
