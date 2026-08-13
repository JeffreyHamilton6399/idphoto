"use client";

/**
 * Image loading, the finished photo, and the printable sheet.
 */

import { pixelSize, type PhotoSpec } from "./specs";
import type { CropRect } from "./geometry";

/** Decode a dropped file to a canvas, converting HEIC from iPhones first. */
export async function fileToCanvas(file: File): Promise<HTMLCanvasElement> {
  let blob: Blob = file;

  const isHeic =
    /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
  if (isHeic) {
    const heic2any = (await import("heic2any")).default;
    const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.95 });
    blob = Array.isArray(converted) ? converted[0] : converted;
  }

  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable in this browser.");
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return canvas;
}

/**
 * Render the finished photo at the spec's print size. Anything outside the
 * source is filled with the spec background rather than left transparent, so
 * a slightly oversized crop still prints sensibly.
 */
export function renderPhoto(
  source: CanvasImageSource,
  crop: CropRect,
  spec: PhotoSpec,
  background: string,
): HTMLCanvasElement {
  const { width, height } = pixelSize(spec);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable in this browser.");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    source,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    width,
    height,
  );
  return canvas;
}

export interface SheetLayout {
  id: string;
  label: string;
  widthMm: number;
  heightMm: number;
}

export const SHEETS: SheetLayout[] = [
  { id: "4x6", label: '4×6 in print', widthMm: 152.4, heightMm: 101.6 },
  { id: "a4", label: "A4", widthMm: 297, heightMm: 210 },
  { id: "letter", label: "US Letter", widthMm: 279.4, heightMm: 215.9 },
];

export interface SheetPlan {
  cols: number;
  rows: number;
  copies: number;
  /** Millimetres between photos, and from the block to the sheet edge. */
  gapMm: number;
  startXMm: number;
  startYMm: number;
}

/** Widest gap we'll leave between photos when there's paper to spare. */
const MAX_GAP_MM = 3;

/**
 * Fit as many photos on the sheet as it physically holds, then spend whatever
 * paper is left over on gaps for cutting.
 *
 * Fitting has to come first: a 2×2 in photo divides a 4×6 in print exactly, so
 * reserving even a 5 mm margin up front drops the sheet from six copies to
 * two. That is the difference between this and a photo counter.
 */
export function planSheet(
  photoWMm: number,
  photoHMm: number,
  sheetWMm: number,
  sheetHMm: number,
): SheetPlan {
  const cols = Math.max(1, Math.floor(sheetWMm / photoWMm));
  const rows = Math.max(1, Math.floor(sheetHMm / photoHMm));

  const leftoverW = sheetWMm - cols * photoWMm;
  const leftoverH = sheetHMm - rows * photoHMm;
  // Same gap both ways so the grid stays square, and never more than needed.
  const gapMm = Math.max(
    0,
    Math.min(MAX_GAP_MM, leftoverW / (cols + 1), leftoverH / (rows + 1)),
  );

  const blockW = cols * photoWMm + (cols - 1) * gapMm;
  const blockH = rows * photoHMm + (rows - 1) * gapMm;

  return {
    cols,
    rows,
    copies: cols * rows,
    gapMm,
    startXMm: (sheetWMm - blockW) / 2,
    startYMm: (sheetHMm - blockH) / 2,
  };
}

/**
 * Tile copies of the photo across a print sheet with cut guides — the part the
 * paid sites charge the most for.
 */
export function renderSheet(
  photo: HTMLCanvasElement,
  spec: PhotoSpec,
  sheet: SheetLayout,
): { canvas: HTMLCanvasElement; copies: number } {
  const dpi = spec.dpi;
  const mmToPx = (mm: number) => (mm / 25.4) * dpi;

  const plan = planSheet(spec.widthMm, spec.heightMm, sheet.widthMm, sheet.heightMm);

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(mmToPx(sheet.widthMm));
  canvas.height = Math.round(mmToPx(sheet.heightMm));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable in this browser.");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cellW = mmToPx(spec.widthMm);
  const cellH = mmToPx(spec.heightMm);
  const gap = mmToPx(plan.gapMm);

  ctx.strokeStyle = "#c8c8c8";
  ctx.lineWidth = Math.max(1, Math.round(dpi / 300));
  ctx.imageSmoothingQuality = "high";

  for (let r = 0; r < plan.rows; r++) {
    for (let c = 0; c < plan.cols; c++) {
      const x = mmToPx(plan.startXMm) + c * (cellW + gap);
      const y = mmToPx(plan.startYMm) + r * (cellH + gap);
      ctx.drawImage(photo, x, y, cellW, cellH);
      ctx.strokeRect(x + 0.5, y + 0.5, cellW, cellH);
    }
  }

  return { canvas, copies: plan.copies };
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type = "image/jpeg",
  quality = 0.95,
): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not encode the image."))),
      type,
      quality,
    ),
  );
}

export function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Replace the background with a flat colour using @imgly's isnet model.
 * Loaded on demand — nobody downloads 40 MB of model to crop a photo.
 */
export async function replaceBackground(
  source: HTMLCanvasElement,
  color: string,
  onProgress?: (ratio: number) => void,
): Promise<{ canvas: HTMLCanvasElement; mask: ImageData }> {
  const { removeBackground } = await import("@imgly/background-removal");

  const input = await canvasToBlob(source, "image/png", 1);
  const cutout = await removeBackground(input, {
    model: "isnet_fp16",
    proxyToWorker: true,
    device: "cpu",
    output: { format: "image/png" },
    progress: (_key: string, current: number, total: number) => {
      if (total > 0) onProgress?.(Math.min(1, current / total));
    },
  });

  const bitmap = await createImageBitmap(cutout);
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas unavailable in this browser.");

  // Keep the transparent version around to measure the crown from, then paint
  // the flat background underneath it.
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const mask = ctx.getImageData(0, 0, canvas.width, canvas.height);

  ctx.globalCompositeOperation = "destination-over";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = "source-over";
  bitmap.close();

  return { canvas, mask };
}
