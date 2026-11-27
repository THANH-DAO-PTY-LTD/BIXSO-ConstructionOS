// Bill of Quantities: the bridge that makes the design produce the quote.
// Pure and deterministic, works offline. Reads placed blocks and returns grouped
// line items (surfaces by area, plants by count, objects by unit) with an
// indicative AU rate and a running estimate. The contractor turns this into
// quote line items. Every figure is an estimate to confirm on site.

import { SURFACE_MAP, SURFACE_TAKEOFF, ringArea, ringPerimeter } from '../catalogue/surfaces.js'
import { PLANT_MAP } from '../catalogue/plants.js'
import { ELEMENT_MAP as TEMPLATE_MAP } from '../catalogue/elements.js'
import { plantsPerArea } from './growth.js'

// Point-estimate installed cost per placed object (AUD) + a ± band for honesty.
// The midpoint is the line rate; a house is context, not scope.
const OBJECT_COST = {
  'house-small': null, 'house-wide': null,
  'fence-panel': [300, 600], deck: [6000, 14000], pool: [35000, 70000],
  'path-straight': [400, 900], pavers: [800, 1800], rock: [80, 250],
  'tree-round': [150, 450], eucalypt: [200, 500], shrub: [40, 120],
  hedge: [150, 400], 'garden-bed': [250, 700], 'grass-patch': [300, 800],
  bench: [400, 900], 'table-set': [800, 2500],
}
const mid = ([lo, hi]) => Math.round((lo + hi) / 2)

// Placed surface-like templates are measured from their true footprint and
// transform, never counted as a generic "each". Rates are indicative installed
// consumer rates and therefore GST-inclusive; the quote still requires a site
// survey and supplier confirmation.
const TEMPLATE_AREA_RATE = {
  deck: { label: 'Timber deck (frame + boards)', rate: 350, waste: 0.1 },
  'path-straight': { label: 'Paved path', rate: 130, waste: 0.08 },
  pavers: { label: 'Paving (base + pavers)', rate: 130, waste: 0.08 },
  'garden-bed': { label: 'Garden bed (soil + edging + prep)', rate: 60, waste: 0.1 },
  'grass-patch': { label: 'Turf (supplied + laid)', rate: 45, waste: 0.05 },
  'mulch-patch': { label: 'Mulched garden area', rate: 45, waste: 0.1 },
  'gravel-patch': { label: 'Decomposed granite / gravel', rate: 55, waste: 0.1 },
  'concrete-pad': { label: 'Concrete pad', rate: 180, waste: 0.05 },
  'rain-garden': { label: 'Rain garden / biofilter zone', rate: 250, waste: 0.1 },
  pond: { label: 'Water feature / pond', rate: 400, waste: 0.1 },
}

const templateArea = (block, template) => {
  const footprint = block.meta?.footprint || template?.footprint || [1, 1]
  const scale = block.transform?.scale || [1, 1, 1]
  return Math.abs(Number(footprint[0] || 1) * Number(scale[0] || 1) * Number(footprint[1] || 1) * Number(scale[2] || scale[0] || 1))
}

const round1 = (n) => Math.round(n * 10) / 10

export function computeBoQ(blocks = []) {
  const surfaces = new Map() // surfaceId -> {label, unit, area, rate}
  const plants = new Map() // speciesId -> {label, count, rate}
  const objects = new Map() // templateId -> {label, count, rate, lo, hi}
  let low = 0
  let high = 0

  for (const b of blocks) {
    if (b.kind === 'region' && b.region) {
      const s = SURFACE_MAP[b.region.surface]
      if (!s) continue
      const area = ringArea(b.region.points)
      const cur = surfaces.get(s.id) || { label: s.boq.label, unit: s.unit, area: 0, rate: s.rate }
      cur.area += area
      surfaces.set(s.id, cur)
      low += area * s.rate * 0.85
      high += area * s.rate * 1.2
    } else if (b.kind === 'plant' && b.plant) {
      const p = PLANT_MAP[b.plant.species_id]
      if (!p) continue
      const cur = plants.get(p.id) || { label: `${p.common}`, count: 0, rate: p.cost }
      cur.count += 1
      plants.set(p.id, cur)
      // plant supply + a share of planting labour (~$18/plant)
      low += (p.cost + 12)
      high += (p.cost + 28)
    } else if (b.kind === 'template') {
      const t = TEMPLATE_MAP[b.template_id]
      const areaRate = TEMPLATE_AREA_RATE[b.template_id]
      if (areaRate) {
        const area = templateArea(b, t)
        const cur = surfaces.get(`template:${b.template_id}`) || { label: areaRate.label, unit: 'm²', area: 0, rate: areaRate.rate, waste: areaRate.waste }
        cur.area += area
        surfaces.set(`template:${b.template_id}`, cur)
        low += area * areaRate.rate * 0.85
        high += area * areaRate.rate * 1.2
        continue
      }
      const band = OBJECT_COST[b.template_id]
      if (!band) continue
      const cur = objects.get(b.template_id) || { label: t?.name || b.template_id, count: 0, rate: mid(band), lo: band[0], hi: band[1] }
      cur.count += 1
      objects.set(b.template_id, cur)
      low += band[0]
      high += band[1]
    }
  }

  const lines = []
  for (const s of surfaces.values()) {
    lines.push({
      group: 'Surfaces', label: s.label, unit: s.unit,
      qty: round1(s.area), rate: s.rate, subtotal: Math.round(s.area * s.rate), waste_percent: Math.round((s.waste || 0) * 100),
    })
  }
  for (const p of plants.values()) {
    lines.push({
      group: 'Planting', label: p.label, unit: 'each',
      qty: p.count, rate: p.rate, subtotal: p.count * p.rate,
    })
  }
  for (const o of objects.values()) {
    lines.push({
      group: 'Elements', label: o.label, unit: 'each',
      qty: o.count, rate: o.rate, subtotal: o.count * o.rate,
    })
  }

  const total = lines.reduce((s, l) => s + l.subtotal, 0)
  return {
    lines,
    total,
    gst_included: Math.round(total / 11),
    ex_gst: total - Math.round(total / 11),
    range: { low: Math.round(low), high: Math.round(high) },
    takeoff: computeTakeoff(blocks),
    empty: lines.length === 0,
  }
}

// ── Material take-off ────────────────────────────────────────────────────────
// The order list, derived from the geometry that is already on the canvas: cubic
// metres of soil and mulch, rolls of turf, pavers, lineal metres of edging. A
// price per square metre wins the job; these are the numbers that get the job
// built without a second trip to the supplier.
//
// Every figure is an ESTIMATE off schematic geometry, with the trade's standard
// waste allowance already added — and the panel says so.
export function computeTakeoff(blocks = []) {
  const byArea = new Map() // surfaceId -> { area, perimeter }
  for (const b of blocks) {
    if (b.kind !== 'region' || !b.region) continue
    const s = SURFACE_MAP[b.region.surface]
    if (!s) continue
    const cur = byArea.get(s.id) || { area: 0, perimeter: 0 }
    cur.area += ringArea(b.region.points)
    cur.perimeter += ringPerimeter(b.region.points)
    byArea.set(s.id, cur)
  }

  const items = []
  for (const [sid, { area, perimeter }] of byArea) {
    const spec = SURFACE_TAKEOFF[sid]
    const s = SURFACE_MAP[sid]
    if (!spec || area <= 0) continue
    for (const b of spec.bulk || []) {
      items.push({
        surface: s.label,
        label: b.label,
        qty: Math.round(area * b.depth * (1 + b.waste) * 100) / 100,
        unit: b.unit,
        basis: `${round1(area)} m² × ${b.depth * 1000} mm + ${Math.round(b.waste * 100)}% waste`,
      })
    }
    for (const p of spec.piece || []) {
      items.push({
        surface: s.label,
        label: p.label,
        qty: Math.ceil((area / p.per) * (1 + p.waste)),
        unit: p.unit,
        basis: `${round1(area)} m² + ${Math.round(p.waste * 100)}% cuts${p.note ? ` · ${p.note}` : ''}`,
      })
    }
    if (spec.edge && perimeter > 0) {
      items.push({
        surface: s.label,
        label: spec.edge.label,
        qty: round1(perimeter),
        unit: spec.edge.unit,
        basis: 'measured around the drawn edge',
      })
    }
  }

  // How many plants it would take to fill the beds at the grower's spacing —
  // next to how many are actually drawn. The gap is the conversation.
  const bedArea = (byArea.get('bed')?.area || 0) + (byArea.get('mulch')?.area || 0)
  const drawn = blocks.filter((b) => b.kind === 'plant' && PLANT_MAP[b.plant?.species_id]).length
  let planting = null
  if (bedArea > 0) {
    // Use the median spacing of the species actually chosen for this design, so
    // the target reflects the palette rather than an arbitrary default.
    const used = [...new Set(blocks.filter((b) => b.kind === 'plant').map((b) => b.plant?.species_id))].filter((id) => PLANT_MAP[id])
    const ref = used.length
      ? used.map((id) => plantsPerArea(id, bedArea)).sort((a, b) => a - b)[Math.floor(used.length / 2)]
      : null
    if (ref) planting = { bedArea: round1(bedArea), drawn, target: ref, short: Math.max(0, ref - drawn) }
  }

  return { items, planting }
}

// Quote line items for the contractor's agreement, derived from the BoQ.
// Field names match the agreement line schema: {desc, qty, unit, amount_aud}.
export function boqToQuoteLines(boq) {
  return boq.lines.map((l) => ({
    desc: l.label,
    qty: l.qty ?? null,
    unit: l.unit || null,
    amount_aud: l.subtotal,
  }))
}
