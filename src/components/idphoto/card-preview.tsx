"use client";

import * as React from "react";
import type { CardData } from "@/lib/card";
import { cardSizeMm } from "@/lib/card";

interface CardPreviewProps {
  card: HTMLCanvasElement | null;
  data: CardData;
}

export function CardPreview({ card, data }: CardPreviewProps) {
  const holderRef = React.useRef<HTMLDivElement>(null);
  const { widthMm, heightMm } = cardSizeMm(data.orientation);

  React.useEffect(() => {
    const holder = holderRef.current;
    if (!holder) return;
    if (card) holder.replaceChildren(card);
    else holder.replaceChildren();
  }, [card]);

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-4">
      <div
        className="rounded-xl shadow-xl ring-1 ring-border"
        style={{
          aspectRatio: `${widthMm} / ${heightMm}`,
          width: data.orientation === "landscape" ? "min(90%, 520px)" : undefined,
          height: data.orientation === "portrait" ? "min(60vh, 460px)" : undefined,
        }}
      >
        <div
          ref={holderRef}
          className="size-full overflow-hidden rounded-xl bg-muted [&>canvas]:block [&>canvas]:size-full"
        />
      </div>
    </div>
  );
}
