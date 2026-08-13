"use client";

import * as React from "react";
import { toast } from "sonner";

import { Header } from "@/components/idphoto/header";
import { Dropzone } from "@/components/idphoto/dropzone";
import { Preview } from "@/components/idphoto/preview";
import { Controls } from "@/components/idphoto/controls";
import { CardEditor } from "@/components/idphoto/card-editor";
import { CardPreview } from "@/components/idphoto/card-preview";
import { SiteFooter } from "@/components/site-footer";
import { cardSizeMm, emptyCard, renderCard, type CardData } from "@/lib/card";

import { DEFAULT_SPEC_ID, getSpec } from "@/lib/specs";
import {
  crownFromMask,
  runChecks,
  solveCrop,
  type FaceGeometry,
} from "@/lib/geometry";
import { detectFace, ManyFacesError, NoFaceError } from "@/lib/detect";
import {
  SHEETS,
  canvasToBlob,
  download,
  fileToCanvas,
  renderPhoto,
  renderSheet,
  replaceBackground,
  tileSheet,
} from "@/lib/render";
import { CARD_DPI } from "@/lib/card";

type Mode = "photo" | "card";

export default function Page() {
  const [source, setSource] = React.useState<HTMLCanvasElement | null>(null);
  const [geometry, setGeometry] = React.useState<FaceGeometry | null>(null);
  const [specId, setSpecId] = React.useState(DEFAULT_SPEC_ID);
  const [sheetId, setSheetId] = React.useState(SHEETS[0].id);
  const [busy, setBusy] = React.useState(false);
  const [bgApplied, setBgApplied] = React.useState(false);
  const [bgBusy, setBgBusy] = React.useState(false);
  const [bgProgress, setBgProgress] = React.useState(0);
  const [headScale, setHeadScale] = React.useState(1);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const [fileName, setFileName] = React.useState("photo");
  const [mode, setMode] = React.useState<Mode>("photo");
  const [card, setCard] = React.useState<CardData>(emptyCard);

  const spec = getSpec(specId);
  const sheet = SHEETS.find((s) => s.id === sheetId) ?? SHEETS[0];

  const crop = React.useMemo(
    () =>
      geometry
        ? solveCrop(geometry, spec, {
            headScale,
            offsetX: offset.x,
            offsetY: offset.y,
          })
        : null,
    [geometry, spec, headScale, offset],
  );

  const checks = React.useMemo(
    () =>
      geometry && crop && source
        ? runChecks(geometry, crop, spec, source.width, source.height)
        : [],
    [geometry, crop, spec, source],
  );

  // The finished photo, re-rendered whenever the crop or spec moves.
  const photo = React.useMemo(() => {
    if (!source || !crop) return null;
    return renderPhoto(source, crop, spec, spec.background);
  }, [source, crop, spec]);

  const sheetCopies = React.useMemo(() => {
    if (!photo) return null;
    // Cheap enough to lay out for the count; the download re-renders anyway.
    return renderSheet(photo, spec, sheet).copies;
  }, [photo, spec, sheet]);

  // The badge reuses the cropped headshot, so both modes share one pipeline.
  const cardCanvas = React.useMemo(
    () => (mode === "card" ? renderCard(card, photo) : null),
    [mode, card, photo],
  );

  const cardSheetCopies = React.useMemo(() => {
    if (!cardCanvas) return null;
    const { widthMm, heightMm } = cardSizeMm(card.orientation);
    return tileSheet(cardCanvas, widthMm, heightMm, sheet, CARD_DPI).copies;
  }, [cardCanvas, card.orientation, sheet]);

  const handleFile = React.useCallback(async (file: File) => {
    setBusy(true);
    try {
      const canvas = await fileToCanvas(file);
      const geo = await detectFace(canvas);
      setSource(canvas);
      setGeometry(geo);
      setFileName(file.name.replace(/\.[^.]+$/, "") || "photo");
      setBgApplied(false);
      setHeadScale(1);
      setOffset({ x: 0, y: 0 });
    } catch (err) {
      if (err instanceof NoFaceError) {
        toast.error("No face found", {
          description:
            "Use a photo taken straight on, with your whole head in frame.",
        });
      } else if (err instanceof ManyFacesError) {
        toast.error("More than one face", { description: err.message });
      } else {
        console.error(err);
        toast.error("Couldn't read that photo", {
          description: err instanceof Error ? err.message : "Unknown error.",
        });
      }
    } finally {
      setBusy(false);
    }
  }, []);

  const handleReplaceBackground = React.useCallback(async () => {
    if (!source || !geometry) return;
    setBgBusy(true);
    setBgProgress(0);
    try {
      const { canvas, mask } = await replaceBackground(
        source,
        spec.background,
        setBgProgress,
      );

      // The silhouette gives us the real top of the head, hair included.
      const crownY = crownFromMask(
        mask.data,
        mask.width,
        mask.height,
        geometry.eyeX,
      );

      setSource(canvas);
      if (crownY !== null && crownY < geometry.chinY) {
        setGeometry({ ...geometry, crownY, crownSource: "mask" });
        toast.success("Background replaced", {
          description: "Head height is now measured from your hairline, exactly.",
        });
      } else {
        toast.success("Background replaced");
      }
      setBgApplied(true);
    } catch (err) {
      console.error(err);
      toast.error("Background removal failed", {
        description:
          err instanceof Error ? err.message : "Try again, or use a plain wall.",
      });
    } finally {
      setBgBusy(false);
    }
  }, [source, geometry, spec.background]);

  const handleDownloadPhoto = React.useCallback(async () => {
    if (!photo) return;
    const blob = await canvasToBlob(photo);
    download(blob, `${fileName}-${spec.id}.jpg`);
    toast.success(`Saved ${spec.widthMm}×${spec.heightMm} mm photo`);
  }, [photo, fileName, spec]);

  const handleDownloadSheet = React.useCallback(async () => {
    if (!photo) return;
    const { canvas, copies } = renderSheet(photo, spec, sheet);
    const blob = await canvasToBlob(canvas);
    download(blob, `${fileName}-${spec.id}-${sheet.id}-sheet.jpg`);
    toast.success(`Saved a ${sheet.label} sheet with ${copies} copies`);
  }, [photo, spec, sheet, fileName]);

  const handleLogoFile = React.useCallback(async (file: File) => {
    try {
      const canvas = await fileToCanvas(file);
      setCard((prev) => ({ ...prev, logo: canvas }));
    } catch (err) {
      console.error(err);
      toast.error("Couldn't read that logo");
    }
  }, []);

  const handleArtworkFile = React.useCallback(async (file: File) => {
    try {
      const canvas = await fileToCanvas(file);
      setCard((prev) => ({ ...prev, artwork: canvas }));
      toast.success("Artwork applied", {
        description: "Switch the style to Plain if the chrome covers your design.",
      });
    } catch (err) {
      console.error(err);
      toast.error("Couldn't read that artwork");
    }
  }, []);

  const handleDownloadCard = React.useCallback(async () => {
    if (!cardCanvas) return;
    const blob = await canvasToBlob(cardCanvas, "image/png");
    const name = card.orgName.trim() || "badge";
    download(blob, `${name.toLowerCase().replace(/\s+/g, "-")}-card.png`);
    toast.success("Saved card at 600 DPI");
  }, [cardCanvas, card.orgName]);

  const handleDownloadCardSheet = React.useCallback(async () => {
    if (!cardCanvas) return;
    const { widthMm, heightMm } = cardSizeMm(card.orientation);
    const { canvas, copies } = tileSheet(
      cardCanvas,
      widthMm,
      heightMm,
      sheet,
      CARD_DPI,
    );
    const blob = await canvasToBlob(canvas);
    const name = card.orgName.trim() || "badge";
    download(
      blob,
      `${name.toLowerCase().replace(/\s+/g, "-")}-${sheet.id}-sheet.jpg`,
    );
    toast.success(`Saved a ${sheet.label} sheet with ${copies} cards`);
  }, [cardCanvas, card.orientation, card.orgName, sheet]);

  const startOver = React.useCallback(() => {
    setSource(null);
    setGeometry(null);
    setBgApplied(false);
    setHeadScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const modeTabs = (
    <div className="flex shrink-0 items-center gap-1 border-b px-3 py-1.5">
      {(
        [
          ["photo", "Passport photo"],
          ["card", "ID card"],
        ] as const
      ).map(([id, label]) => (
        <button
          key={id}
          type="button"
          onClick={() => setMode(id)}
          className={
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors " +
            (mode === id
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "text-muted-foreground hover:bg-muted")
          }
        >
          {label}
        </button>
      ))}
    </div>
  );

  // Photo mode needs a face before it can do anything; card mode doesn't.
  if (mode === "photo" && (!source || !geometry)) {
    return (
      <div className="flex h-dvh flex-col overflow-hidden bg-background">
        <Header />
        {modeTabs}
        <main className="flex min-h-0 flex-1 flex-col">
          <Dropzone onFile={handleFile} busy={busy} />
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (mode === "card") {
    return (
      <div className="flex h-dvh flex-col overflow-hidden bg-background">
        <Header onStartOver={source ? startOver : undefined} />
        {modeTabs}
        <main className="flex min-h-0 flex-1 flex-col-reverse md:flex-row">
          <aside className="flex max-h-[55%] min-h-0 shrink-0 flex-col border-t md:max-h-none md:w-80 md:border-r md:border-t-0">
            <CardEditor
              data={card}
              onChange={setCard}
              onLogoFile={handleLogoFile}
              onArtworkFile={handleArtworkFile}
              hasPhoto={photo !== null}
              sheet={sheet}
              onSheetChange={setSheetId}
              sheetCopies={cardSheetCopies}
              onDownloadCard={handleDownloadCard}
              onDownloadSheet={handleDownloadCardSheet}
            />
          </aside>
          <section className="flex min-h-0 flex-1 flex-col">
            <CardPreview card={cardCanvas} data={card} />
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <Header onStartOver={startOver} />
      {modeTabs}

      <main className="flex min-h-0 flex-1 flex-col-reverse md:flex-row">
        <aside className="flex max-h-[50%] min-h-0 shrink-0 flex-col border-t md:max-h-none md:w-80 md:border-r md:border-t-0">
          <Controls
            spec={spec}
            onSpecChange={setSpecId}
            checks={checks}
            headScale={headScale}
            onHeadScale={setHeadScale}
            offsetX={offset.x}
            offsetY={offset.y}
            onOffset={(x, y) => setOffset({ x, y })}
            onReset={() => {
              setHeadScale(1);
              setOffset({ x: 0, y: 0 });
            }}
            bgApplied={bgApplied}
            bgBusy={bgBusy}
            bgProgress={bgProgress}
            onReplaceBackground={handleReplaceBackground}
            sheet={sheet}
            onSheetChange={setSheetId}
            sheetCopies={sheetCopies}
            onDownloadPhoto={handleDownloadPhoto}
            onDownloadSheet={handleDownloadSheet}
          />
        </aside>

        <section className="flex min-h-0 flex-1 flex-col">
          <Preview
            photo={photo}
            spec={spec}
            geometry={geometry}
            crop={crop}
            showGuides
          />
        </section>
      </main>
    </div>
  );
}
