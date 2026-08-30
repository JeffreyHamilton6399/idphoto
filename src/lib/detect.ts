"use client";

/**
 * Face detection. TinyFaceDetector finds the face, the 68-point landmark model
 * gives the eye centres and chin. Both models are self-hosted under
 * /models/face-api and total under 600 KB - the photo never leaves the tab.
 */

import type { FaceGeometry } from "./geometry";
import { estimateCrown } from "./geometry";

type FaceApi = typeof import("@vladmandic/face-api");

let apiPromise: Promise<FaceApi> | null = null;
let modelsLoaded = false;

async function getApi(): Promise<FaceApi> {
  if (!apiPromise) {
    apiPromise = import("@vladmandic/face-api");
  }
  return apiPromise;
}

export async function loadModels(): Promise<void> {
  if (modelsLoaded) return;
  const api = await getApi();
  await Promise.all([
    api.nets.tinyFaceDetector.loadFromUri("/models/face-api"),
    api.nets.faceLandmark68Net.loadFromUri("/models/face-api"),
  ]);
  modelsLoaded = true;
}

export class NoFaceError extends Error {
  constructor() {
    super("No face found in that photo.");
    this.name = "NoFaceError";
  }
}

export class ManyFacesError extends Error {
  constructor(public count: number) {
    super(`Found ${count} faces, a passport photo must show one person alone.`);
    this.name = "ManyFacesError";
  }
}

function mean(points: { x: number; y: number }[]): { x: number; y: number } {
  const sum = points.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
    { x: 0, y: 0 },
  );
  return { x: sum.x / points.length, y: sum.y / points.length };
}

/**
 * Detect exactly one face and reduce it to the measurements a spec needs.
 * `source` must already be drawn at natural size.
 */
export async function detectFace(
  source: HTMLCanvasElement,
): Promise<FaceGeometry> {
  await loadModels();
  const api = await getApi();

  // 416 is the largest standard input size for TinyFaceDetector; the lower
  // score threshold matters because passport photos are often flatly lit.
  const options = new api.TinyFaceDetectorOptions({
    inputSize: 416,
    scoreThreshold: 0.3,
  });

  const results = await api
    .detectAllFaces(source, options)
    .withFaceLandmarks();

  if (results.length === 0) throw new NoFaceError();

  // More than one face is usually a bystander, not a second applicant, so
  // work with the largest and let the UI mention what happened.
  if (results.length > 1) {
    const byArea = [...results].sort(
      (a, b) =>
        b.detection.box.width * b.detection.box.height -
        a.detection.box.width * a.detection.box.height,
    );
    const [biggest, second] = byArea;
    const biggestArea = biggest.detection.box.width * biggest.detection.box.height;
    const secondArea = second.detection.box.width * second.detection.box.height;
    // Only complain when another face is a comparable size - a small face in
    // the background will be cropped out anyway.
    if (secondArea > biggestArea * 0.5) throw new ManyFacesError(results.length);
  }

  const best = results.reduce((a, b) =>
    a.detection.box.width * a.detection.box.height >
    b.detection.box.width * b.detection.box.height
      ? a
      : b,
  );

  const lm = best.landmarks;
  const leftEye = mean(lm.getLeftEye());
  const rightEye = mean(lm.getRightEye());
  const jaw = lm.getJawOutline();
  // Point 8 of the 68-point model is the bottom of the chin.
  const chin = jaw[8] ?? jaw[Math.floor(jaw.length / 2)];

  const eyeY = (leftEye.y + rightEye.y) / 2;
  const eyeX = (leftEye.x + rightEye.x) / 2;
  const rollDeg =
    (Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * 180) / Math.PI;

  return {
    eyeX,
    eyeY,
    chinY: chin.y,
    crownY: estimateCrown(eyeY, chin.y),
    crownSource: "estimated",
    rollDeg,
  };
}
