# Ringon

Design a ring, then see it live on your hand through your phone camera. Free and open source,
runs in the browser, installable as an app (PWA), works offline once loaded.

**Open it:** https://tupe12334.github.io/ringon/ (on your phone; the camera needs HTTPS)

## What you can do

- **Design by jeweler conventions** – ring size in US/CA, EU/ISO, UK/AU or JP charts; band
  profile, width, thickness, comfort fit and shank taper; 13 metals and 6 finishes, two-tone heads;
  15 stone shapes (incl. baguette, tapered baguette, trapezoid, half moon, trillion) sized by carat
  weight (and gem density); prong (4/6, round/claw/V tips), bezel (wall thickness, lip, plain /
  rounded / milgrain edge, half bezel open at the sides or ends) or tension settings; classic,
  double or hidden halo; inside engraving.
- **Side stones** – three, five or seven stones or a toi et moi pair, each with its own shape, gem,
  size and graduation, orientation (pears pointing in or out, half moons flat edge to the centre),
  prong or bezel setting, gap and offset along the finger.
- **Band stones** – pavé, channel, full or half eternity in any cut, rows, coverage, spacing
  (stations) and bezel-set stones; combine with side stones.
- **Real-ring examples** – [templates rebuilt from jewelers' listings](src/templates/examples.ts),
  each linked to its source.
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
PORT=4199 pnpm e2e --project photos   # try-on on real hand photos; another port if 4173 is taken
```

Try-on accuracy is checked on real photos of hands in [`e2e/fixtures/photos/`](e2e/fixtures/photos):
[`truth.json`](e2e/fixtures/photos/truth.json) holds what was measured on them by hand (where real
rings sit, finger widths, which side faces the camera). `DUMP=1` on the photos project refreshes
the landmarks that [`src/tryon/photos.test.ts`](src/tryon/photos.test.ts) checks the pose against.

## License

MIT. The bundled hand landmark model (`public/models/hand_landmarker.task`) and the test hand
image are from Google MediaPipe, Apache-2.0. Test photos: see
[`e2e/fixtures/photos/ATTRIBUTION.md`](e2e/fixtures/photos/ATTRIBUTION.md).
