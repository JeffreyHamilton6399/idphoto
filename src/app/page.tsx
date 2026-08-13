"use client";

import * as React from "react";
import { toast } from "sonner";

import { Header } from "@/components/idphoto/header";
import { Dropzone } from "@/components/idphoto/dropzone";
import { Preview } from "@/components/idphoto/preview";
import { Controls } from "@/components/idphoto/controls";
import { SiteFooter } from "@/components/site-footer";

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
} from "@/lib/render";

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

  const startOver = React.useCallback(() => {
    setSource(null);
    setGeometry(null);
    setBgApplied(false);
    setHeadScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  if (!source || !geometry) {
    return (
      <div className="flex h-dvh flex-col overflow-hidden bg-background">
        <Header />
        <main className="flex min-h-0 flex-1 flex-col">
          <Dropzone onFile={handleFile} busy={busy} />
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <Header onStartOver={startOver} />

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
