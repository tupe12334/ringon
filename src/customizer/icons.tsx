// SVG pictograms for every design option, so the customizer reads at a glance.
// All icons are 24×24, inherit currentColor, and are decorative (the chip text names the option).

import type { ReactNode, SVGProps } from 'react'
import { GEM_INFO, METAL_INFO, SHAPE_INFO, gemColor } from '../ring/catalog'
import { outline } from '../ring/outline'
import type {
  Accent,
  BezelEdge,
  EngravingFont,
  Finish,
  Gem,
  HaloStyle,
  HalfBezelWalls,
  Metal,
  Profile,
  ProngTip,
  RingSpec,
  Setting,
  SideLayout,
  StoneShape,
} from '../ring/spec'

export function Svg({ children, ...rest }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className="ico"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  )
}

const dot = (x: number, y: number, r = 1.1, key?: string | number) => <circle key={key ?? `${x},${y}`} cx={x} cy={y} r={r} fill="currentColor" stroke="none" />
/** Points on a circle, starting at 12 o'clock. */
const around = (n: number, r: number, from = 0, to = 360, cx = 12, cy = 12) =>
  Array.from({ length: n }, (_, k) => {
    const a = ((from + ((to - from) * k) / (to - from >= 360 ? n : Math.max(1, n - 1))) * Math.PI) / 180
    return [cx + r * Math.sin(a), cy - r * Math.cos(a)] as const
  })

/** Face-up outline of a stone shape as an SVG path, fitted to `size` and centred on (cx, cy). */
export function shapePath(shape: StoneShape, size = 18, cx = 12, cy = 12) {
  const { length1ct: l, width1ct: w } = SHAPE_INFO[shape]
  const k = size / Math.max(l, w)
  // Outline +y is the stone's front (pear point); draw it pointing up.
  return outline(shape, l * k, w * k, 64).map(([x, y], i) => `${i ? 'L' : 'M'}${(cx + x).toFixed(2)} ${(cy - y).toFixed(2)}`).join('') + 'Z'
}

export function ShapeIcon({ shape, rotate = 0, size = 18, fill = 'none' }: { shape: StoneShape; rotate?: number; size?: number; fill?: string }) {
  return (
    <Svg>
      <path d={shapePath(shape, size)} fill={fill} transform={rotate ? `rotate(${rotate} 12 12)` : undefined} />
    </Svg>
  )
}

/** A gem in its colour: brilliant-cut side view with a table and facet lines. */
export function GemIcon({ color }: { color: string }) {
  return (
    <Svg strokeWidth={1}>
      <path d="M6 5h12l4 5-10 11L2 10z" fill={color} stroke="currentColor" />
      <path d="M2 10h20M6 5l3 5 3-5 3 5 3-5M9 10l3 11 3-11" opacity={0.55} />
    </Svg>
  )
}

/** A ring in its metal colour, with a highlight. */
export function MetalIcon({ color }: { color: string }) {
  return (
    <Svg strokeWidth={1}>
      <circle cx={12} cy={12} r={8} stroke="currentColor" strokeOpacity={0.35} strokeWidth={6} />
      <circle cx={12} cy={12} r={8} stroke={color} strokeWidth={4.6} />
      <path d="M6.5 8.5a7 7 0 0 1 4-3" stroke="#fff" strokeOpacity={0.85} strokeWidth={1.4} />
    </Svg>
  )
}

export const metalIcons = Object.fromEntries(
  Object.entries(METAL_INFO).map(([k, v]) => [k, <MetalIcon key={k} color={v.color} />]),
) as Record<Metal, ReactNode>

export const gemIcons = (customColor: string) =>
  Object.fromEntries(
    Object.entries(GEM_INFO).map(([k, v]) => [k, <GemIcon key={k} color={k === 'custom' ? customColor : v.color} />]),
  ) as Record<Gem, ReactNode>

export const shapeIcons = Object.fromEntries(
  (Object.keys(SHAPE_INFO) as StoneShape[]).map((s) => [s, <ShapeIcon key={s} shape={s} />]),
) as Record<StoneShape, ReactNode>

/** Band cross-sections: outside of the ring on top, finger side below. */
export const profileIcons: Record<Profile, ReactNode> = {
  flat: <Svg><path d="M3 9h18v7H3z" /></Svg>,
  'd-shape': <Svg><path d="M3 16v-3c0-3 4-5 9-5s9 2 9 5v3z" /></Svg>,
  court: <Svg><path d="M3 12c0-3 4-5 9-5s9 2 9 5-4 5-9 5-9-2-9-5z" /></Svg>,
  'half-round': <Svg><path d="M3 17C3 10 7 6 12 6s9 4 9 11z" /></Svg>,
  'knife-edge': <Svg><path d="M3 17l9-11 9 11z" /></Svg>,
  square: <Svg><path d="M6 5h12v13H6z" /></Svg>,
}

export const finishIcons: Record<Finish, ReactNode> = {
  polished: (
    <Svg>
      <circle cx={12} cy={12} r={9} />
      <path d="M7 10a6 6 0 0 1 4-4M7.5 14l6.5-6.5" opacity={0.7} />
    </Svg>
  ),
  satin: (
    <Svg>
      <circle cx={12} cy={12} r={9} />
      <path d="M5 9.5h14M4 12h16M5 14.5h14" opacity={0.35} />
    </Svg>
  ),
  brushed: (
    <Svg strokeWidth={1}>
      <circle cx={12} cy={12} r={9} strokeWidth={1.5} />
      <path d="M6 7h12M4.5 9.5h15M4 12h16M4.5 14.5h15M6 17h12" />
    </Svg>
  ),
  hammered: (
    <Svg strokeWidth={1}>
      <circle cx={12} cy={12} r={9} strokeWidth={1.5} />
      <circle cx={9} cy={9} r={2} /><circle cx={14.5} cy={8.5} r={1.8} /><circle cx={8.5} cy={14.5} r={1.8} /><circle cx={14} cy={14} r={2.2} />
    </Svg>
  ),
  matte: (
    <Svg>
      <circle cx={12} cy={12} r={9} fill="currentColor" fillOpacity={0.25} />
    </Svg>
  ),
  sandblasted: (
    <Svg>
      <circle cx={12} cy={12} r={9} />
      {[[8, 8], [12, 7], [16, 9], [7, 12], [11, 11], [15, 13], [9, 16], [13, 15], [17, 12], [12, 18]].map(([x, y]) => dot(x, y, 0.6))}
    </Svg>
  ),
}

/** Settings seen from above: the stone and what holds it. */
export const settingIcons: Record<Setting, ReactNode> = {
  'prong-4': <Svg><circle cx={12} cy={12} r={6} />{around(4, 7, 45).map(([x, y]) => dot(x, y, 1.6))}</Svg>,
  'prong-6': <Svg><circle cx={12} cy={12} r={6} />{around(6, 7).map(([x, y]) => dot(x, y, 1.4))}</Svg>,
  bezel: <Svg><circle cx={12} cy={12} r={5.5} /><circle cx={12} cy={12} r={8.2} strokeWidth={3} /></Svg>,
  'half-bezel': (
    <Svg>
      <circle cx={12} cy={12} r={5.5} />
      <path d="M6.2 6.5a8 8 0 0 0 0 11M17.8 6.5a8 8 0 0 1 0 11" strokeWidth={3} />
    </Svg>
  ),
  // Front view: the band is open at the top and the stone is held by its ends.
  tension: (
    <Svg>
      <path d="M9.2 7.2A8 8 0 1 0 14.8 7.2" strokeWidth={3} />
      <path d="M9 4h6l1.5 2-4.5 5-4.5-5z" />
    </Svg>
  ),
}

/** Prong tops, side view. */
export const prongTipIcons: Record<ProngTip, ReactNode> = {
  round: <Svg><path d="M9 21V8a3 3 0 0 1 6 0v13" /></Svg>,
  claw: <Svg><path d="M10 21V9c0-3 2-5 6-5-1 2-2 3-2 5v12" /></Svg>,
  'v-tip': <Svg><path d="M8 21V9l4-5 4 5v12" /></Svg>,
}

/** Band stones on a ring seen from the front. */
export const accentIcons: Record<Accent, ReactNode> = {
  none: <Svg><circle cx={12} cy={12} r={8} strokeWidth={2.5} /></Svg>,
  pave: (
    <Svg>
      <circle cx={12} cy={12} r={8} strokeWidth={2.5} opacity={0.4} />
      {around(5, 8, -60, 60).map(([x, y]) => dot(x, y, 1.3))}
    </Svg>
  ),
  channel: (
    <Svg>
      <circle cx={12} cy={12} r={8} strokeWidth={2.5} opacity={0.4} />
      <path d="M5.5 7.5a9.5 9.5 0 0 1 13 0M7.6 9.6a6.5 6.5 0 0 1 8.8 0" />
      {around(4, 8, -40, 40).map(([x, y]) => <rect key={`${x}`} x={x - 1} y={y - 1} width={2} height={2} fill="currentColor" stroke="none" />)}
    </Svg>
  ),
  eternity: <Svg><circle cx={12} cy={12} r={8} strokeWidth={2.5} opacity={0.4} />{around(12, 8).map(([x, y]) => dot(x, y, 1.2))}</Svg>,
  'half-eternity': (
    <Svg>
      <circle cx={12} cy={12} r={8} strokeWidth={2.5} opacity={0.4} />
      {around(7, 8, -90, 90).map(([x, y]) => dot(x, y, 1.2))}
    </Svg>
  ),
}

export const sideLayoutIcons: Record<SideLayout, ReactNode> = {
  both: <Svg><circle cx={12} cy={12} r={4.5} /><circle cx={4.5} cy={12} r={2.5} /><circle cx={19.5} cy={12} r={2.5} /></Svg>,
  'toi-et-moi': <Svg><circle cx={8.5} cy={14.5} r={5} /><circle cx={15.5} cy={9.5} r={5} /></Svg>,
}

/** Stones on each side of the centre: 0–3, graduated and packed edge to edge, fitted to 22 wide. */
export const sideCountIcons: ReactNode[] = [0, 1, 2, 3].map((n) => {
  const r = Array.from({ length: n + 1 }, (_, k) => 0.68 ** k)
  const x = r.map((_, k) => r.slice(0, k + 1).reduce((a, rk, i) => a + (i ? r[i - 1] + rk + 0.15 : 0), 0))
  const half = x[n] + r[n]
  const k = Math.min(4.5, 11 / half)
  return (
    <Svg key={n} strokeWidth={1.2}>
      {x.flatMap((xi, i) => (i ? [-1, 1] : [1]).map((side) => <circle key={`${i}${side}`} cx={12 + side * xi * k} cy={12} r={r[i] * k - 0.3} />))}
    </Svg>
  )
})

export const haloStyleIcons: Record<HaloStyle, ReactNode> = {
  classic: <Svg><circle cx={12} cy={12} r={5.5} />{around(14, 8.5).map(([x, y]) => dot(x, y, 0.9))}</Svg>,
  // Side view: the halo is a ring of stones tucked under the girdle.
  hidden: (
    <Svg>
      <path d="M4 9l3-3h10l3 3-8 10z" />
      {[7, 10, 14, 17].map((x) => dot(x, 11.5, 0.9))}
    </Svg>
  ),
}

export const haloRowIcons = {
  '1': <Svg><circle cx={12} cy={12} r={5} />{around(12, 7.5).map(([x, y]) => dot(x, y, 0.9))}</Svg>,
  '2': (
    <Svg>
      <circle cx={12} cy={12} r={4} />
      {around(10, 6.2).map(([x, y]) => dot(x, y, 0.8, `a${x}`))}
      {around(14, 9.3).map(([x, y]) => dot(x, y, 0.8, `b${x}`))}
    </Svg>
  ),
}

/** Bezel wall tops, in section. */
export const bezelEdgeIcons: Record<BezelEdge, ReactNode> = {
  plain: <Svg><path d="M4 20V8h5v12M20 20V8h-5v12" /></Svg>,
  rounded: <Svg><path d="M4 20V9.5a2.5 2.5 0 0 1 5 0V20M20 20V9.5a2.5 2.5 0 0 0-5 0V20" /></Svg>,
  milgrain: (
    <Svg>
      <path d="M4 20V9h5v11M20 20V9h-5v11" />
      {[4.8, 6.5, 8.2, 15.8, 17.5, 19.2].map((x) => dot(x, 7.6, 0.9))}
    </Svg>
  ),
}

export const halfWallIcons: Record<HalfBezelWalls, ReactNode> = {
  sides: <Svg><circle cx={12} cy={12} r={5} /><path d="M6 6.5a8 8 0 0 0 0 11M18 6.5a8 8 0 0 1 0 11" strokeWidth={3} /></Svg>,
  ends: <Svg><circle cx={12} cy={12} r={5} /><path d="M6.5 6a8 8 0 0 1 11 0M6.5 18a8 8 0 0 0 11 0" strokeWidth={3} /></Svg>,
}

const FONT_FAMILY: Record<EngravingFont, string> = {
  serif: 'Georgia, "Times New Roman", serif',
  sans: 'system-ui, Helvetica, Arial, sans-serif',
  script: '"Snell Roundhand", "Brush Script MT", "Segoe Script", cursive',
}
export const fontIcons = Object.fromEntries(
  Object.entries(FONT_FAMILY).map(([k, family]) => [
    k,
    <Svg key={k} stroke="none">
      <text x={12} y={17} textAnchor="middle" fontSize={k === 'script' ? 15 : 13} fontFamily={family} fill="currentColor" fontStyle={k === 'script' ? 'italic' : undefined}>
        Ag
      </text>
    </Svg>,
  ]),
) as Record<EngravingFont, ReactNode>

export const autoIcon = (
  <Svg>
    <path d="M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4z" />
    <path d="M18 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
  </Svg>
)
export const matchIcon = (
  <Svg>
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
  </Svg>
)

/** Labels and toggles: one glyph per measurement or switch. */
export const fieldIcons = {
  size: <Svg><circle cx={12} cy={12} r={7} /><path d="M5 12h14M8 9.5 5 12l3 2.5M16 9.5l3 2.5-3 2.5" /></Svg>,
  system: <Svg><path d="M4 5h16M4 12h16M4 19h16" opacity={0.4} /><path d="M7 3v4M12 10v4M17 17v4" /></Svg>,
  width: <Svg><path d="M7 4v16M17 4v16" opacity={0.5} /><path d="M7 12h10M10 9l-3 3 3 3M14 9l3 3-3 3" /></Svg>,
  thickness: <Svg><path d="M4 7h16M4 17h16" opacity={0.5} /><path d="M12 7v10M9 10l3-3 3 3M9 14l3 3 3-3" /></Svg>,
  comfort: <Svg><path d="M3 8h18v4c0 3-4 5-9 5s-9-2-9-5z" /><path d="M7 12c2 1.5 8 1.5 10 0" opacity={0.6} /></Svg>,
  headMetal: <Svg><circle cx={12} cy={15} r={6} /><path d="M9 9l-1-5M15 9l1-5M12 9V3" /></Svg>,
  stone: <Svg><path d="M6 5h12l4 5-10 11L2 10z" /><path d="M2 10h20" opacity={0.5} /></Svg>,
  rotate: <Svg><path d="M20 12a8 8 0 1 1-2.3-5.7" /><path d="M20 4v4h-4" /></Svg>,
  height: <Svg><path d="M3 20h18" /><path d="M12 18V5M9 8l3-3 3 3" /><path d="M8 5h8" opacity={0.5} /></Svg>,
  halo: <Svg><circle cx={12} cy={12} r={4.5} />{around(12, 8).map(([x, y]) => dot(x, y, 1))}</Svg>,
  melee: <Svg>{around(6, 6).map(([x, y]) => <circle key={`${x}`} cx={x} cy={y} r={2.2} />)}</Svg>,
  ratio: <Svg><circle cx={8} cy={12} r={5} /><circle cx={18} cy={12} r={3} /></Svg>,
  graduation: <Svg><circle cx={5} cy={12} r={3} /><circle cx={12} cy={12} r={2.2} /><circle cx={18} cy={12} r={1.5} /></Svg>,
  gap: <Svg><circle cx={6} cy={12} r={4} /><circle cx={18} cy={12} r={4} /><path d="M11 12h2" /></Svg>,
  offset: <Svg><circle cx={12} cy={12} r={4} /><circle cx={4} cy={17} r={2.5} /><circle cx={20} cy={7} r={2.5} /><path d="M12 3v3M12 18v3" opacity={0.5} /></Svg>,
  mirror: <Svg><path d="M12 3v18" strokeDasharray="2 2" /><path d="M9 7 4 12l5 5zM15 7l5 5-5 5z" /></Svg>,
  spacing: <Svg>{[5, 12, 19].map((x) => <circle key={x} cx={x} cy={12} r={2.2} />)}<path d="M7.5 17h2M14.5 17h2" /></Svg>,
  coverage: <Svg><path d="M5 17a8 8 0 1 1 14 0" opacity={0.4} strokeWidth={2.5} /><path d="M5.6 9a8 8 0 0 1 12.8 0" strokeWidth={2.5} /></Svg>,
  rows: <Svg>{[7, 12, 17].flatMap((x) => [dot(x, 9, 1.4, `a${x}`), dot(x, 15, 1.4, `b${x}`)])}</Svg>,
  wall: <Svg><circle cx={12} cy={12} r={5} /><circle cx={12} cy={12} r={8.5} strokeWidth={2.5} /></Svg>,
  lip: <Svg><path d="M3 15h4V9M21 15h-4V9" /><path d="M7 11l2-3h6l2 3-5 7z" opacity={0.6} /></Svg>,
  engrave: <Svg><path d="M4 20 15 9l3 3L7 23zM15 9l2-2 3 3-2 2" /><path d="M4 4h8M4 8h5" opacity={0.5} /></Svg>,
  font: <Svg stroke="none"><text x={12} y={17} textAnchor="middle" fontSize={14} fontFamily="Georgia, serif" fill="currentColor">Aa</text></Svg>,
  layout: <Svg><circle cx={12} cy={12} r={4} /><circle cx={4.5} cy={12} r={2.2} /><circle cx={19.5} cy={12} r={2.2} /></Svg>,
  shape: <Svg><path d={shapePath('pear', 17)} /></Svg>,
  orientation: <Svg><path d="M12 3v18M3 12h18" opacity={0.4} /><path d="M9 6l3-3 3 3M18 9l3 3-3 3" /></Svg>,
}
export type FieldIcon = keyof typeof fieldIcons

export const tabIcons: Record<string, ReactNode> = {
  templates: <Svg><rect x={3} y={3} width={8} height={8} rx={1.5} /><rect x={13} y={3} width={8} height={8} rx={1.5} /><rect x={3} y={13} width={8} height={8} rx={1.5} /><rect x={13} y={13} width={8} height={8} rx={1.5} /></Svg>,
  size: fieldIcons.size,
  band: profileIcons.court,
  metal: <Svg><circle cx={12} cy={12} r={8} strokeWidth={3.5} /><path d="M7 8.5a6 6 0 0 1 3.5-2.8" stroke="var(--bg)" /></Svg>,
  stone: fieldIcons.stone,
  setting: settingIcons['prong-6'],
  sides: sideCountIcons[1],
  accents: accentIcons['half-eternity'],
  engrave: fieldIcons.engrave,
}

/** Centre stone flanked by side stones turned `rotate`°; the left one mirrored or turned the same way. */
export function SidePresetIcon({ shape, rotate, mirror, pair }: { shape: StoneShape; rotate: number; mirror: boolean; pair?: boolean }) {
  const d = shapePath(shape, 8, 0, 0)
  return (
    <Svg strokeWidth={1.2}>
      <circle cx={pair ? 9 : 12} cy={12} r={pair ? 5.5 : 4.5} opacity={0.5} />
      <path d={d} transform={`translate(${pair ? 18.5 : 20} 12) rotate(${-rotate})`} />
      {!pair && <path d={d} transform={`translate(4 12) ${mirror ? 'scale(-1 1) ' : ''}rotate(${-rotate})`} />}
    </Svg>
  )
}

/** Thumbnail of a whole design: band in its metal, centre stone in its shape and gem colour. */
export function DesignIcon({ spec }: { spec: RingSpec }) {
  const metal = METAL_INFO[spec.band.metal].color
  const s = spec.stone
  return (
    <Svg strokeWidth={1} viewBox="0 0 24 24">
      <ellipse cx={12} cy={15} rx={8.5} ry={6.5} stroke={metal} strokeWidth={2.6} />
      <ellipse cx={12} cy={15} rx={8.5} ry={6.5} strokeOpacity={0.3} strokeWidth={3.4} fill="none" />
      {spec.accents.style !== 'none' &&
        Array.from({ length: spec.accents.style === 'eternity' ? 14 : 7 }, (_, k, n = spec.accents.style === 'eternity' ? 14 : 7) => {
          // Stones across the top of the band (or all round for a full eternity).
          const t = spec.accents.style === 'eternity' ? (k / n) * Math.PI * 2 : Math.PI * (0.15 + (0.7 * k) / (n - 1))
          return <circle key={k} cx={12 - 8.5 * Math.cos(t)} cy={15 - 6.5 * Math.sin(t)} r={1.1} fill={gemColor(spec.accents.gem, spec.accents.customColor)} strokeWidth={0.5} />
        })}
      {s.enabled &&
        (spec.accents.side.layout === 'toi-et-moi' ? [1] : Array.from({ length: spec.accents.side.count }, (_, k) => k + 1)).flatMap((k) =>
          (spec.accents.side.layout === 'toi-et-moi' ? [1] : [-1, 1]).map((side) => (
            <circle key={`${k}${side}`} cx={12 + side * (3.6 + 2.6 * k)} cy={8.5 + k} r={2.2 * 0.7 ** (k - 1)} fill={gemColor(spec.accents.side.gem, spec.accents.side.customColor)} strokeWidth={0.7} />
          )),
        )}
      {s.enabled && (
        <path
          d={shapePath(s.shape, 11, 12, 7.5)}
          transform={s.rotationDeg ? `rotate(${-s.rotationDeg} 12 7.5)` : undefined}
          fill={gemColor(s.gem, s.customColor)}
          stroke="currentColor"
        />
      )}
    </Svg>
  )
}

/** Shank taper, live: the band seen from the side, `taper` = width underneath / width on top. */
export function TaperIcon({ taper }: { taper: number }) {
  const b = 8 * taper
  return (
    <Svg>
      <path d={`M4 5h16l${-(8 - b)} 14H${12 - b}z`} />
    </Svg>
  )
}
