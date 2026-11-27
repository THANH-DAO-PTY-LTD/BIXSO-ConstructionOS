// Surface catalogue: the freeform zones an outdoor job is made of. Each is a
// material drawn as an area (m²), not a fixed block. `color`/`side`/`height`
// are display hints for a plan or 3D view.
// AU rate = indicative supply + install per unit. It is an estimate; the
// contractor confirms on site. `boq` maps to a Bill-of-Quantities material
// line so what is drawn drives the quote.

export const SURFACES = [
  {
    id: 'lawn', label: 'Lawn / turf', emoji: '🟩', color: '#7FA86C', side: '#6E9A5C',
    height: 0, unit: 'm²', rate: 45, boq: { label: 'Buffalo turf (supplied & laid)', material: 'buffalo-turf' },
    hint: 'Soft open surface for play + relaxing. Highest upkeep (mow/water/edge).',
  },
  {
    id: 'bed', label: 'Garden bed', emoji: '🟫', color: '#6B4E33', side: '#553D28',
    height: 0.05, unit: 'm²', rate: 60, boq: { label: 'Garden bed (soil + edging + prep)', material: 'garden-soil' },
    hint: 'Planting zone — pair with the plant palette to fill it.',
  },
  {
    id: 'mulch', label: 'Mulch', emoji: '🟤', color: '#4A3524', side: '#3A2A1C',
    height: 0.04, unit: 'm²', rate: 25, boq: { label: 'Eucalyptus mulch (75mm)', material: 'mulch-euc' },
    hint: 'Low-water ground cover that suppresses weeds around plants.',
  },
  {
    id: 'paving', label: 'Paving', emoji: '⬜', color: '#C9C2B4', side: '#A8A192',
    height: 0.06, unit: 'm²', rate: 130, boq: { label: 'Paving (pavers on base, laid)', material: 'paver-conc' },
    hint: 'Hard, clean walking + entertaining surface.',
  },
  {
    id: 'deck', label: 'Timber deck', emoji: '🟧', color: '#A9825B', side: '#8A6B47',
    height: 0.24, unit: 'm²', rate: 350, boq: { label: 'Timber deck (frame + boards)', material: 'decking-board' },
    hint: 'Raised timber platform — the top-value entertaining zone.',
  },
  {
    id: 'concrete', label: 'Concrete', emoji: '◻️', color: '#B6B2AA', side: '#98948C',
    height: 0.1, unit: 'm²', rate: 90, boq: { label: 'Concrete (reinforced, finished)', material: 'concrete' },
    hint: 'Durable slab for driveways, sheds and utility areas.',
  },
  {
    id: 'gravel', label: 'Gravel', emoji: '⚪', color: '#CBBFA6', side: '#B0A488',
    height: 0.05, unit: 'm²', rate: 55, boq: { label: 'Decomposed granite / gravel', material: 'crushed-rock' },
    hint: 'Permeable, low-cost path + informal surface.',
  },
  {
    id: 'water', label: 'Water / pond', emoji: '🟦', color: '#7FB8D4', side: '#5E9BBA',
    height: 0, unit: 'm²', rate: 400, boq: { label: 'Water feature / pond (lined + pump)', material: 'water-feature' },
    hint: 'Reflective water feature — a focal point (check pool-fence rules if deep).',
  },
]

export const SURFACE_MAP = Object.fromEntries(SURFACES.map((s) => [s.id, s]))

// ── What you actually ORDER ─────────────────────────────────────────────────
// A rate per square metre prices a job; it does not order a truck. A landscaper
// standing at the supplier needs cubic metres of soil, rolls of turf, lineal
// metres of edging — and getting those wrong is what turns a good quote into a
// bad week. Depths are the standard AU installed depths for each material.
//
//   bulk    — loose material sold by volume: m³ = area × depth (plus waste).
//   piece   — things sold as countable units: turf rolls, pavers.
//   edge    — anything charged along the boundary of the area.
// `waste` is the industry allowance for cuts, compaction and settling.
export const SURFACE_TAKEOFF = {
  lawn: {
    bulk: [{ label: 'Underlay / topdressing sand', depth: 0.03, unit: 'm³', waste: 0.1 }],
    piece: [{ label: 'Turf rolls', per: 0.75, unit: 'roll', waste: 0.08, note: 'a standard AU roll covers ~0.75 m²' }],
    edge: { label: 'Lawn edging', unit: 'l.m.' },
  },
  bed: {
    bulk: [{ label: 'Garden mix / soil', depth: 0.3, unit: 'm³', waste: 0.1 }],
    edge: { label: 'Bed edging', unit: 'l.m.' },
  },
  mulch: {
    bulk: [{ label: 'Mulch', depth: 0.075, unit: 'm³', waste: 0.1 }],
  },
  paving: {
    bulk: [{ label: 'Road base', depth: 0.1, unit: 'm³', waste: 0.15 }, { label: 'Bedding sand', depth: 0.03, unit: 'm³', waste: 0.1 }],
    piece: [{ label: 'Pavers 400×400', per: 0.16, unit: 'ea', waste: 0.07, note: '6.25 per m² before cuts' }],
    edge: { label: 'Paving edge restraint', unit: 'l.m.' },
  },
  deck: {
    piece: [{ label: 'Decking board (86 mm, 5.4 m)', per: 0.464, unit: 'ea', waste: 0.1, note: '~2.15 boards of 5.4 m per m² before cuts' }],
    edge: { label: 'Fascia / trim', unit: 'l.m.' },
  },
  concrete: {
    bulk: [{ label: 'Concrete (N20)', depth: 0.1, unit: 'm³', waste: 0.08 }],
    edge: { label: 'Formwork', unit: 'l.m.' },
  },
  gravel: {
    bulk: [{ label: 'Decomposed granite / gravel', depth: 0.075, unit: 'm³', waste: 0.12 }],
    edge: { label: 'Gravel edging', unit: 'l.m.' },
  },
  water: {
    bulk: [{ label: 'Excavation (spoil removed)', depth: 0.6, unit: 'm³', waste: 0.05 }],
    edge: { label: 'Pond liner overlap / coping', unit: 'l.m.' },
  },
}

// Shoelace area (m²) of a ring of [x,z] points.
export function ringArea(points = []) {
  if (!points || points.length < 3) return 0
  let a = 0
  for (let i = 0; i < points.length; i += 1) {
    const [x1, z1] = points[i]
    const [x2, z2] = points[(i + 1) % points.length]
    a += x1 * z2 - x2 * z1
  }
  return Math.abs(a) / 2
}

// Perimeter (l.m.) of a closed ring.
export function ringPerimeter(points = []) {
  if (!points || points.length < 2) return 0
  let p = 0
  for (let i = 0; i < points.length; i += 1) {
    const [x1, z1] = points[i]
    const [x2, z2] = points[(i + 1) % points.length]
    p += Math.hypot(x2 - x1, z2 - z1)
  }
  return p
}

// Centroid of a ring (for labels).
export function ringCentroid(points = []) {
  if (!points?.length) return [0, 0]
  const cx = points.reduce((s, p) => s + p[0], 0) / points.length
  const cz = points.reduce((s, p) => s + p[1], 0) / points.length
  return [cx, cz]
}
