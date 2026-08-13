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

/**
 * Chrome style. `plain` draws no background of its own, which is what you want
 * when compositing onto artwork your organisation already designed.
 */
export type CardLayout = "band" | "sidebar" | "plain";

/** CR80 — the credit-card size every badge printer and lanyard holder takes. */
export const CARD_MM = { long: 85.6, short: 53.98 };

export const CARD_DPI = 600;

export interface CardField {
  id: string;
  label: string;
  value: string;
}

export interface CardData {
  templateId: string;
  orgName: string;
  orgTagline: string;
  holderName: string;
  role: string;
  fields: CardField[];
  accent: string;
  layout: CardLayout;
  orientation: CardOrientation;
  /** Optional logo, already decoded. */
  logo: HTMLImageElement | HTMLCanvasElement | null;
  /**
   * A blank card design supplied by the user's own organisation, drawn
   * full-bleed underneath the photo and text.
   */
  artwork: HTMLCanvasElement | null;
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
    templateId: "staff",
    orgName: "",
    orgTagline: "",
    holderName: "",
    role: "",
    fields: [
      { id: "t0", label: "Employee No.", value: "" },
      { id: "t1", label: "Department", value: "" },
      { id: "t2", label: "Issued", value: "" },
    ],
    accent: ACCENTS[0].value,
    layout: "band",
    orientation: "landscape",
    logo: null,
    artwork: null,
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

  // --- Supplied artwork, full-bleed under everything -----------------------
  if (data.artwork) {
    ctx.imageSmoothingQuality = "high";
    // Cover the card without distorting the artwork's own proportions.
    const scale = Math.max(
      canvas.width / data.artwork.width,
      canvas.height / data.artwork.height,
    );
    const w = data.artwork.width * scale;
    const h = data.artwork.height * scale;
    ctx.drawImage(data.artwork, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
  }

  const pad = mm(4);
  const bandH = mm(data.orientation === "landscape" ? 11 : 13);
  const stripeW = mm(7);
  const headerH = data.layout === "band" ? bandH : 0;

  // --- Chrome --------------------------------------------------------------
  if (data.layout === "band") {
    ctx.fillStyle = data.accent;
    ctx.fillRect(0, 0, canvas.width, bandH);
  } else if (data.layout === "sidebar") {
    ctx.fillStyle = data.accent;
    ctx.fillRect(0, 0, stripeW, canvas.height);
  }

  const chromeLeft = data.layout === "sidebar" ? stripeW + pad : pad;

  // The org name rides in the band when there is one; otherwise it sits above
  // the holder's name in the body, in the accent colour.
  ctx.textBaseline = "middle";
  let headerTextX = chromeLeft;

  if (data.layout === "band") {
    if (data.logo) {
      const logoH = bandH - mm(3);
      const ratio = data.logo.width / data.logo.height;
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
    draw(
      orgFit.text,
      headerTextX,
      bandH / 2 - (data.orgTagline ? mm(1.6) : 0),
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
      draw(tagFit.text, headerTextX, bandH / 2 + mm(1.8), tagFit.fontPx, "400", "#ffffff");
      ctx.globalAlpha = 1;
    }
  } else if (data.logo) {
    // No band to hold it, so the logo goes top-right of the body.
    const logoH = mm(8);
    const ratio = data.logo.width / data.logo.height;
    const logoW = logoH * (Number.isFinite(ratio) && ratio > 0 ? ratio : 1);
    ctx.drawImage(data.logo, canvas.width - pad - logoW, pad, logoW, logoH);
  }

  // --- Photo ---------------------------------------------------------------
  ctx.textBaseline = "alphabetic";
  const bodyTop = headerH + pad;
  const photoW =
    data.orientation === "landscape"
      ? mm(24)
      : canvas.width - chromeLeft - pad;
  const photoH = photoW * (45 / 35);
  const photoX = chromeLeft;
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
    data.orientation === "landscape" ? photoX + photoW + mm(4) : chromeLeft;
  let textTop =
    data.orientation === "landscape" ? bodyTop + mm(4) : photoY + photoH + mm(5);
  const textW = canvas.width - textX - pad;

  // Without a band, the organisation is named above the holder instead.
  if (data.layout !== "band" && data.orgName) {
    const orgFit = fitText(data.orgName, textW, mm(3), mm(2), measure);
    draw(orgFit.text, textX, textTop, orgFit.fontPx, "700", data.accent);
    textTop += mm(4.5);
  }

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
