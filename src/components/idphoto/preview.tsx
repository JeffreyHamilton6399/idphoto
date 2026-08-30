"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { PhotoSpec } from "@/lib/specs";
import { targetEyeFractionFromTop } from "@/lib/specs";
import type { CropRect, FaceGeometry } from "@/lib/geometry";

interface PreviewProps {
  photo: HTMLCanvasElement | null;
  spec: PhotoSpec;
  geometry: FaceGeometry | null;
  crop: CropRect | null;
  showGuides: boolean;
}

/**
 * The finished photo at print proportions, with the spec's own guide lines
 * drawn over it - the crown line, the chin line, and the eye line - so the
 * measurement is something you can see rather than something you're told.
 */
export function Preview({ photo, spec, geometry, crop, showGuides }: PreviewProps) {
  const holderRef = React.useRef<HTMLDivElement>(null);

  // The photo is a canvas built outside React, so it gets adopted rather than
  // rendered. Sizing lives in the holder's CSS so the canvas isn't mutated.
  React.useEffect(() => {
    const holder = holderRef.current;
    if (!holder) return;
    if (photo) holder.replaceChildren(photo);
    else holder.replaceChildren();
  }, [photo]);

  // Guide positions as fractions of the photo height.
  const guides = React.useMemo(() => {
    if (!geometry || !crop) return null;
    const f = (y: number) => (y - crop.y) / crop.height;
    return {
      crown: f(geometry.crownY),
      chin: f(geometry.chinY),
      eye: f(geometry.eyeY),
      target: targetEyeFractionFromTop(spec),
    };
  }, [geometry, crop, spec]);

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-4">
      <div
        className="relative max-h-full shadow-lg ring-1 ring-border"
        style={{
          aspectRatio: `${spec.widthMm} / ${spec.heightMm}`,
          height: "min(60vh, 420px)",
        }}
      >
        <div
          ref={holderRef}
          className="size-full bg-muted [&>canvas]:block [&>canvas]:size-full"
        />

        {showGuides && guides && (
          <>
            {/* Head extent */}
            <Guide top={guides.crown} label="crown" tone="emerald" />
            <Guide top={guides.chin} label="chin" tone="emerald" />
            {/* Where the eyes are, and where the spec wants them */}
            <Guide top={guides.eye} label="eyes" tone="sky" />
            {spec.eyeMinMm !== undefined && (
              <Guide top={guides.target} label="target" tone="amber" dashed />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Guide({
  top,
  label,
  tone,
  dashed,
}: {
  top: number;
  label: string;
  tone: "emerald" | "sky" | "amber";
  dashed?: boolean;
}) {
  if (top < -0.05 || top > 1.05) return null;
  const color =
    tone === "emerald"
      ? "border-emerald-500"
      : tone === "sky"
        ? "border-sky-500"
        : "border-amber-500";
  const text =
    tone === "emerald"
      ? "bg-emerald-500"
      : tone === "sky"
        ? "bg-sky-500"
        : "bg-amber-500";

  return (
    <div
      className="pointer-events-none absolute inset-x-0"
      style={{ top: `${Math.max(0, Math.min(1, top)) * 100}%` }}
    >
      <div className={cn("border-t", color, dashed && "border-dashed")} />
      <span
        className={cn(
          "absolute right-0 -translate-y-1/2 rounded-l px-1 py-px text-[9px] font-medium text-white",
          text,
        )}
      >
        {label}
      </span>
    </div>
  );
}
