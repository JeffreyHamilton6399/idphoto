# IDPhoto

Turns a photo into a passport or ID photo that meets the issuing authority's
actual rules, then lays out a printable sheet.

## The part most tools skip

Free passport-photo sites generally crop to the right aspect ratio and stop
there. That isn't what gets an application rejected. The rule that does is head
height: crown of the head, hair included, down to the bottom of the chin, which
every official diagram specifies as a millimetre range.

IDPhoto measures against that range, and against the eye line where the
authority publishes one. The eye line is taken from the bottom edge of the
photo, matching the US State Department diagram. Specs with no eye rule are
checked on head height alone.

Every figure in `src/lib/specs.ts` is in millimetres, taken from the issuing
authority's published requirements, and each spec carries the source it came
from so it's shown in the UI and can be checked.

## Countries

United States, United Kingdom, Schengen / EU, Canada, Australia, India, Japan
and China. Each entry carries its own finished size, head range, eye line where
applicable, minimum DPI and required background colour.

## How the crop is placed

[`@vladmandic/face-api`](https://github.com/vladmandic/face-api) does the work:
TinyFaceDetector locates the face, then the 68-point landmark model gives the
eye centres and the chin. The crown isn't a landmark, so it's estimated from the
face geometry.

Both models are self-hosted under `public/models/face-api` and come to under
600 KB together, so the photo never leaves the tab and nothing is fetched from a
CDN.

Background replacement uses `@imgly/background-removal` when a spec calls for a
particular background colour.

## Printing

The sheet is laid out at the spec's DPI with cut guides, sized for standard
photo paper, so it can go to any print shop or a home printer.

## Running it

```bash
bun install
bun run dev     # http://localhost:3000
bun run lint
```

## Built with

Next.js 16 (App Router), TypeScript, Tailwind CSS 4, shadcn/ui,
[`@vladmandic/face-api`](https://github.com/vladmandic/face-api) for detection
and landmarks, [`@imgly/background-removal`](https://github.com/imgly/background-removal-js)
for backgrounds, `heic2any` for HEIC input, next-themes and sonner.

## Privacy

There's no backend. The photo is decoded, measured, cropped and composited in
the tab, and the model weights are served from this app rather than a third
party. Nothing is uploaded and there's no analytics.

## Deploying

Import the repo on Vercel. No environment variables. The model weights are
committed, so there's nothing else to configure.

---

Jeffrey Hamilton · [GitHub](https://github.com/JeffreyHamilton6399) ·
[buy me a coffee](https://buymeacoffee.com/jeffreyscof)
