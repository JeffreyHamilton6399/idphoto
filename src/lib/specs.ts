/**
 * Photo specifications by country.
 *
 * Every figure here is in millimetres, taken from the issuing authority's
 * published requirements. "Head" means crown of the head (including hair) to
 * the bottom of the chin - that is what the official diagrams measure, and it
 * is the rule most free tools ignore, since they only crop to the right
 * aspect ratio and let the applicant fail on head size.
 *
 * The eye line is measured from the BOTTOM edge of the photo, matching the US
 * State Department diagram. Specs that publish no eye rule leave it undefined
 * and are checked on head height alone.
 */

export interface PhotoSpec {
  id: string;
  country: string;
  document: string;
  /** Finished photo size in millimetres. */
  widthMm: number;
  heightMm: number;
  /** Crown-to-chin height range in millimetres. */
  headMinMm: number;
  headMaxMm: number;
  /** Distance from the bottom edge up to the eye line, in millimetres. */
  eyeMinMm?: number;
  eyeMaxMm?: number;
  /** Minimum printed resolution the authority expects. */
  dpi: number;
  /** Background the authority asks for, as a hex colour. */
  background: string;
  backgroundLabel: string;
  /** Where the numbers came from, shown in the UI so people can verify. */
  source: string;
  notes?: string;
}

export const SPECS: PhotoSpec[] = [
  {
    id: "us-passport",
    country: "United States",
    document: "Passport / visa",
    widthMm: 50.8,
    heightMm: 50.8,
    headMinMm: 25.4,
    headMaxMm: 34.9,
    eyeMinMm: 28.6,
    eyeMaxMm: 34.9,
    dpi: 300,
    background: "#ffffff",
    backgroundLabel: "Plain white or off-white",
    source: "US Dept. of State, 2×2 in, head 1–1⅜ in, eyes 1⅛–1⅜ in from bottom",
  },
  {
    id: "uk-passport",
    country: "United Kingdom",
    document: "Passport",
    widthMm: 35,
    heightMm: 45,
    headMinMm: 29,
    headMaxMm: 34,
    dpi: 300,
    background: "#f2f2f2",
    backgroundLabel: "Plain light grey or cream",
    source: "HM Passport Office, 35×45 mm, crown to chin 29–34 mm",
  },
  {
    id: "schengen",
    country: "Schengen / EU",
    document: "Passport / visa",
    widthMm: 35,
    heightMm: 45,
    headMinMm: 32,
    headMaxMm: 36,
    dpi: 300,
    background: "#f2f2f2",
    backgroundLabel: "Plain light grey",
    source: "ICAO 9303 / EU visa code, 35×45 mm, face 70–80% of height",
  },
  {
    id: "canada-passport",
    country: "Canada",
    document: "Passport",
    widthMm: 50,
    heightMm: 70,
    headMinMm: 31,
    headMaxMm: 36,
    dpi: 300,
    background: "#ffffff",
    backgroundLabel: "Plain white",
    source: "IRCC: 50×70 mm, crown to chin 31–36 mm",
  },
  {
    id: "australia-passport",
    country: "Australia",
    document: "Passport",
    widthMm: 35,
    heightMm: 45,
    headMinMm: 32,
    headMaxMm: 36,
    dpi: 300,
    background: "#f2f2f2",
    backgroundLabel: "Plain light grey or white",
    source: "Australian Passport Office, 35×45 mm, chin to crown 32–36 mm",
  },
  {
    id: "india-passport",
    country: "India",
    document: "Passport",
    widthMm: 51,
    heightMm: 51,
    headMinMm: 25,
    headMaxMm: 35,
    dpi: 300,
    background: "#ffffff",
    backgroundLabel: "Plain white",
    source: "Passport Seva, 51×51 mm, face covering 70–80% of the frame",
  },
  {
    id: "japan-passport",
    country: "Japan",
    document: "Passport",
    widthMm: 35,
    heightMm: 45,
    headMinMm: 32,
    headMaxMm: 36,
    dpi: 300,
    background: "#ffffff",
    backgroundLabel: "Plain white or light blue",
    source: "MOFA Japan, 35×45 mm, crown to chin 34 mm ±2 mm",
  },
  {
    id: "china-visa",
    country: "China",
    document: "Visa",
    widthMm: 33,
    heightMm: 48,
    headMinMm: 28,
    headMaxMm: 33,
    dpi: 300,
    background: "#ffffff",
    backgroundLabel: "Plain white",
    source: "China visa centre, 33×48 mm, head 28–33 mm",
  },
];

export const DEFAULT_SPEC_ID = "us-passport";

export function getSpec(id: string): PhotoSpec {
  return SPECS.find((s) => s.id === id) ?? SPECS[0];
}

/** Target pixel size of the finished photo at the spec's print resolution. */
export function pixelSize(spec: PhotoSpec): { width: number; height: number } {
  const mmPerInch = 25.4;
  return {
    width: Math.round((spec.widthMm / mmPerInch) * spec.dpi),
    height: Math.round((spec.heightMm / mmPerInch) * spec.dpi),
  };
}

/** Midpoint of the allowed head-height range - what we aim for by default. */
export function targetHeadFraction(spec: PhotoSpec): number {
  return (spec.headMinMm + spec.headMaxMm) / 2 / spec.heightMm;
}

/**
 * Where the eye line should sit, as a fraction measured DOWN from the top
 * edge. Specs publish it from the bottom, so this flips it for canvas work.
 */
export function targetEyeFractionFromTop(spec: PhotoSpec): number {
  if (spec.eyeMinMm === undefined || spec.eyeMaxMm === undefined) {
    // No published eye rule: centre the head, which puts the eyes in the
    // right place for every spec that does publish one.
    return 0.5 - targetHeadFraction(spec) * 0.08;
  }
  const midFromBottom = (spec.eyeMinMm + spec.eyeMaxMm) / 2;
  return 1 - midFromBottom / spec.heightMm;
}
