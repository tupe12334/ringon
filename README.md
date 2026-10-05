# Ringon

Design a ring, then see it live on your hand through your phone camera. Free and open source,
runs in the browser, installable as an app (PWA), works offline once loaded.

**Open it:** https://tupe12334.github.io/ringon/ (on your phone; the camera needs HTTPS)

## What you can do

- **Design by jeweler conventions** – ring size in US/CA, EU/ISO, UK/AU or JP charts; band
  profile, width, thickness, comfort fit and shank taper; 13 metals and 6 finishes, two-tone heads;
  10 stone shapes sized by carat weight (and gem density), 13 gems; prong (4/6, round/claw/V tips),
  bezel, half-bezel or tension settings with adjustable height; halo; pavé, channel, three-stone
  and eternity accents; inside engraving.
- **Templates** – start from classic designs, save your own, export/import them as JSON, or share
  a design as a link.
- **Live try-on** – point the camera at your hand: the ring follows your finger in real time,
  turns with it, and hides behind it like a real ring. Pick the finger, flip the stone side,
  fine-tune the fit, take a photo or record a video clip to share.

## How it works

| Part | Where |
|---|---|
| Ring sizes, design spec and validation | [`src/ring/sizes.ts`](src/ring/sizes.ts), [`src/ring/spec.ts`](src/ring/spec.ts) |
| Metal, gem and stone reference data | [`src/ring/catalog.ts`](src/ring/catalog.ts) |
| 3D geometry (band sweep, faceted gems, settings) | [`src/ring/geometry.ts`](src/ring/geometry.ts) |
| Templates, sharing, saved designs | [`src/templates/`](src/templates) |
| Hand tracking → ring pose | [`src/tryon/pose.ts`](src/tryon/pose.ts), [`src/tryon/TryOn.tsx`](src/tryon/TryOn.tsx) |

Rendering uses [three.js](https://threejs.org) via React Three Fiber; hand tracking uses
[MediaPipe Hand Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker),
served from this app (no third-party requests).

## Develop

```sh
pnpm install
pnpm dev        # http://localhost:5173 — open on a phone via `pnpm dev --host` + an HTTPS tunnel
pnpm test       # unit tests
pnpm e2e        # browser tests, incl. live tracking on a fake camera feed (needs ffmpeg)
```

## License

MIT. The bundled hand landmark model (`public/models/hand_landmarker.task`) and the test hand
image are from Google MediaPipe, Apache-2.0.
