"use client";

/**
 * Badge maker.
 *
 * This produces cards for an organisation the holder actually belongs to —
 * staff passes, student cards, gym memberships, volunteer and event badges.
 * The organisation's name, fields and logo all come from the user.
 *
 * It deliberately has no templates for government-issued documents: no state
 * licence layouts, no official seals, no AAMVA/MRZ encoding. Those exist to
 * make a card pass as one issued by an authority, which is not what this is
 * for, and every legitimate use above is served without them.
 */

export type CardOrientation = "landscape" | "portrait";

/** CR80 — the credit-card size every badge printer and lanyard holder takes. */
export const CARD_MM = { long: 85.6, short: 53.98 };

export const CARD_DPI = 600;

export interface CardField {
  id: string;
  label: string;
  value: string;
}

export interface CardData {
  orgName: string;
  orgTagline: string;
  holderName: string;
  role: string;
  fields: CardField[];
  accent: string;
  orientation: CardOrientation;
  /** Optional logo, already decoded. */
  logo: HTMLImageElement | HTMLCanvasElement | null;
}

export const ACCENTS = [
  { id: "emerald", label: "Emerald", value: "#10b981" },
  { id: "slate", label: "Slate", value: "#334155" },
  { id: "blue", label: "Blue", value: "#2563eb" },
  { id: "violet", label: "Violet", value: "#7c3aed" },
  { id: "amber", label: "Amber", value: "#d97706" },
  { id: "rose", label: "Rose", value: "#e11d48" },
];

export function emptyCard(): CardData {
  return {
    orgName: "",
    orgTagline: "",
    holderName: "",
    role: "",
    fields: [
      { id: "id", label: "ID No.", value: "" },
      { id: "issued", label: "Issued", value: "" },
    ],
    accent: ACCENTS[0].value,
    orientation: "landscape",
    logo: null,
  };
}

export function cardSizeMm(orientation: CardOrientation): {
  widthMm: number;
  heightMm: number;
} {
  return orientation === "landscape"
    ? { widthMm: CARD_MM.long, heightMm: CARD_MM.short }
    : { widthMm: CARD_MM.short, heightMm: CARD_MM.long };
}

/** Measure-agnostic so it can be unit tested without a canvas. */
export type Measure = (text: string, fontPx: number) => number;

/**
 * Shrink text until it fits, then ellipsise if even the floor is too wide.
 * Returns the size to draw at and the string to draw.
 */
export function fitText(
  text: string,
  maxWidth: number,
  startPx: number,
  minPx: number,
  measure: Measure,
): { text: string; fontPx: number } {
  let fontPx = startPx;
  while (fontPx > minPx && measure(text, fontPx) > maxWidth) {
    fontPx -= 1;
  }
  if (measure(text, fontPx) <= maxWidth) return { text, fontPx };

  // Still too wide at the floor — cut characters until the ellipsis fits.
  let cut = text;
  while (cut.length > 1 && measure(cut + "…", fontPx) > maxWidth) {
    cut = cut.slice(0, -1);
  }
  return { text: cut.trimEnd() + "…", fontPx };
}

/** Fields with both a label and a value, capped to what the card can hold. */
export function usableFields(data: CardData, max: number): CardField[] {
  return data.fields
    .filter((f) => f.label.trim() !== "" && f.value.trim() !== "")
    .slice(0, max);
}

export function maxFieldsFor(orientation: CardOrientation): number {
  return orientation === "landscape" ? 4 : 5;
}

/**
 * Draw the badge at print resolution. `photo` is the cropped headshot from
 * the passport-photo step, so both modes share one pipeline.
 */
export function renderCard(
  data: CardData,
  photo: HTMLCanvasElement | null,
): HTMLCanvasElement {
  const { widthMm, heightMm } = cardSizeMm(data.orientation);
  const mm = (v: number) => (v / 25.4) * CARD_DPI;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(mm(widthMm));
  canvas.height = Math.round(mm(heightMm));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable in this browser.");

  const measure: Measure = (text, fontPx) => {
    ctx.font = `${fontPx}px ui-sans-serif, system-ui, sans-serif`;
    return ctx.measureText(text).width;
  };
  const draw = (
    text: string,
    x: number,
    y: number,
    fontPx: number,
    weight = "400",
    color = "#111827",
  ) => {
    ctx.fillStyle = color;
    ctx.font = `${weight} ${fontPx}px ui-sans-serif, system-ui, sans-serif`;
    ctx.fillText(text, x, y);
  };

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const pad = mm(4);
  const headerH = mm(data.orientation === "landscape" ? 11 : 13);

  // --- Header band ---------------------------------------------------------
  ctx.fillStyle = data.accent;
  ctx.fillRect(0, 0, canvas.width, headerH);

  let headerTextX = pad;
  if (data.logo) {
    const logoH = headerH - mm(3);
    const ratio =
      ("width" in data.logo ? data.logo.width : 1) /
      ("height" in data.logo ? data.logo.height : 1);
    const logoW = logoH * (Number.isFinite(ratio) && ratio > 0 ? ratio : 1);
    ctx.drawImage(data.logo, pad, mm(1.5), logoW, logoH);
    headerTextX = pad + logoW + mm(2.5);
  }

  const orgFit = fitText(
    data.orgName || "Organisation",
    canvas.width - headerTextX - pad,
    mm(4.2),
    mm(2.4),
    measure,
  );
  ctx.textBaseline = "middle";
  draw(
    orgFit.text,
    headerTextX,
    headerH / 2 - (data.orgTagline ? mm(1.6) : 0),
    orgFit.fontPx,
    "600",
    "#ffffff",
  );
  if (data.orgTagline) {
    const tagFit = fitText(
      data.orgTagline,
      canvas.width - headerTextX - pad,
      mm(2.4),
      mm(1.8),
      measure,
    );
    ctx.globalAlpha = 0.85;
    draw(tagFit.text, headerTextX, headerH / 2 + mm(1.8), tagFit.fontPx, "400", "#ffffff");
    ctx.globalAlpha = 1;
  }

  // --- Photo ---------------------------------------------------------------
  ctx.textBaseline = "alphabetic";
  const bodyTop = headerH + pad;
  const photoW =
    data.orientation === "landscape" ? mm(24) : canvas.width - pad * 2;
  const photoH = photoW * (45 / 35);
  const photoX = pad;
  const photoY = bodyTop;

  if (photo) {
    ctx.save();
    roundRect(ctx, photoX, photoY, photoW, photoH, mm(1.5));
    ctx.clip();
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(photo, photoX, photoY, photoW, photoH);
    ctx.restore();
  } else {
    ctx.fillStyle = "#e5e7eb";
    roundRect(ctx, photoX, photoY, photoW, photoH, mm(1.5));
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(0,0,0,0.12)";
  ctx.lineWidth = Math.max(1, mm(0.2));
  roundRect(ctx, photoX, photoY, photoW, photoH, mm(1.5));
  ctx.stroke();

  // --- Holder + fields -----------------------------------------------------
  const textX =
    data.orientation === "landscape" ? photoX + photoW + mm(4) : pad;
  const textTop =
    data.orientation === "landscape" ? bodyTop + mm(4) : photoY + photoH + mm(5);
  const textW = canvas.width - textX - pad;

  const nameFit = fitText(
    data.holderName || "Full Name",
    textW,
    mm(5.2),
    mm(3),
    measure,
  );
  draw(nameFit.text, textX, textTop, nameFit.fontPx, "700");

  let cursor = textTop + mm(4.5);
  if (data.role) {
    const roleFit = fitText(data.role, textW, mm(3.2), mm(2.2), measure);
    draw(roleFit.text, textX, cursor, roleFit.fontPx, "500", data.accent);
    cursor += mm(4.5);
  }

  for (const field of usableFields(data, maxFieldsFor(data.orientation))) {
    const labelFit = fitText(field.label.toUpperCase(), textW, mm(2.1), mm(1.6), measure);
    draw(labelFit.text, textX, cursor, labelFit.fontPx, "600", "#9ca3af");
    const valueFit = fitText(field.value, textW, mm(3), mm(2), measure);
    draw(valueFit.text, textX, cursor + mm(3.2), valueFit.fontPx, "500");
    cursor += mm(6.4);
  }

  // Rounded card edge over the top, so the header band follows the corners.
  ctx.globalCompositeOperation = "destination-in";
  ctx.fillStyle = "#000";
  roundRect(ctx, 0, 0, canvas.width, canvas.height, mm(3));
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";

  return canvas;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
