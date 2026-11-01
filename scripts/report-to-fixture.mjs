// Turns a try-on bug report (src/tryon/report.ts) into a photo fixture for the accuracy tests:
// writes the raw camera frame to e2e/fixtures/photos/ and prints a truth.json entry to fill in.
//
//   node scripts/report-to-fixture.mjs ringon-report-….json [name]

import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const [file, nameArg] = process.argv.slice(2)
if (!file) {
  console.error('usage: node scripts/report-to-fixture.mjs <report.json> [name]')
  process.exit(1)
}
const r = JSON.parse(readFileSync(file, 'utf8'))
if (r.ringonReport !== 1) throw new Error(`not a version 1 Ringon report: ${file}`)
const raw = r.images?.raw
if (!raw?.dataUrl?.startsWith('data:image/jpeg;base64,')) throw new Error('the report has no camera frame')

const name = `${nameArg ?? `report-${r.createdAt.slice(0, 19).replace(/:/g, '-')}`}.jpg`.replace(/\.jpg\.jpg$/, '.jpg')
const out = new URL(`../e2e/fixtures/photos/${name}`, import.meta.url)
if (existsSync(out)) throw new Error(`${name} already exists`)
writeFileSync(out, Buffer.from(raw.dataUrl.split(',')[1], 'base64'))

// Where the app drew the ring, in frame px (the inverse of toScreen in src/tryon/pose.ts): a
// starting point only; truth.json must hold what is measured on the photo.
const f = r.frame
let drawn = 'no hand was tracked in this frame'
if (f?.pose) {
  const v = f.view
  const s = Math.max(v.width / v.videoWidth, v.height / v.videoHeight)
  const [ox, oy] = [(v.width - v.videoWidth * s) / 2, (v.height - v.videoHeight * s) / 2]
  const [px, py] = [f.pose.position[0] + v.width / 2, v.height / 2 - f.pose.position[1]]
  const x = (px - ox) / s
  const centre = [Math.round(v.mirrored ? v.videoWidth - x : x), Math.round((py - oy) / s)]
  const width = ((f.pose.pxPerMm * r.spec.innerDiameterMm) / s).toFixed(1)
  drawn = `ring centre ${JSON.stringify(centre)}, finger width ${width} px, stone side z ${f.pose.dorsal[2].toFixed(2)}`
}

const entry = {
  ...(r.tryOn.finger !== 'ring' && { finger: r.tryOn.finger }),
  ringCentre: null,
  fingerWidthPx: null,
  facing: null,
  flatFinger: null,
}
console.log(`Wrote e2e/fixtures/photos/${name} (${raw.width}×${raw.height}).
Reported: ${r.user.category}${r.user.comment ? ` – "${r.user.comment}"` : ''}
The app drew: ${drawn}

Measure the photo by hand, fill in (or drop) the nulls and add this to e2e/fixtures/photos/truth.json:
${JSON.stringify({ [name]: entry }, null, 1)}

Then: add the photo to e2e/fixtures/photos/ATTRIBUTION.md (the reporter must agree to it being
public), refresh the landmarks with \`DUMP=1 PORT=4199 pnpm e2e --project photos\` and run \`pnpm test\`.`)
