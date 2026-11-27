// ── Growth over time ─────────────────────────────────────────────────────────
// A planting plan is a promise about the future, and almost every argument
// between a homeowner and a landscaper about "you planted it too sparse" is
// really an argument about time. The species table already carries the mature
// size and the recommended spacing; this turns those into what the garden
// actually looks like in year 1, year 3, year 5 and at maturity — and warns when
// a bed that looks generous today will be a thicket later.
//
// The curve is a saturating approach to mature size, which is how woody plants
// and clumping grasses behave in practice. It is an ESTIMATE — real growth
// depends on soil, water, aspect and luck — and must be labelled as one.

import { PLANTS, PLANT_MAP } from '../catalogue/plants.js'

// Nursery stock is not a seedling: a shrub leaves the nursery around a third of
// its final size, a tree far less, a grass division already close to full.
// Years-to-mature are the figures AU growers quote for these categories.
const PROFILE = {
  Tree: { start: 0.18, years: 12 },
  Screen: { start: 0.25, years: 6 },
  Shrub: { start: 0.3, years: 4 },
  Accent: { start: 0.35, years: 4 },
  Grass: { start: 0.45, years: 2 },
  Groundcover: { start: 0.3, years: 3 },
}
const profileFor = (p) => PROFILE[p?.category] || PROFILE.Shrub

export const TIMELINE = [
  { id: 'planted', years: 0, label: 'Just planted', sub: 'the day it goes in' },
  { id: 'y1', years: 1, label: 'Year 1', sub: 'first summer through' },
  { id: 'y3', years: 3, label: 'Year 3', sub: 'filling in' },
  { id: 'y5', years: 5, label: 'Year 5', sub: 'reading as designed' },
  { id: 'mature', years: null, label: 'Mature', sub: 'full size' },
]
export const DEFAULT_TIMELINE = 'mature'
export const TIMELINE_MAP = Object.fromEntries(TIMELINE.map((t) => [t.id, t]))

/**
 * Size factor (0..1) for a species at an age in years.
 * `years === null` means mature — exactly 1, so the default view is unchanged.
 */
export function growthFactor(species, years) {
  if (years == null) return 1
  const p = typeof species === 'string' ? PLANT_MAP[species] : species
  const { start, years: full } = profileFor(p)
  if (years <= 0) return start
  // k chosen so the curve reaches ~95% of the remaining gap at `full` years.
  const k = 3 / full
  const f = start + (1 - start) * (1 - Math.exp(-k * years))
  return Math.min(1, f)
}

export const growthForStage = (species, stageId) => growthFactor(species, (TIMELINE_MAP[stageId] || {}).years ?? null)

/** Canopy radius (metres) of a species at a point in time. */
export const canopyRadius = (speciesId, stageId = DEFAULT_TIMELINE) => {
  const p = PLANT_MAP[speciesId]
  if (!p) return 0.5
  return ((p.w || 1) / 2) * growthForStage(p, stageId)
}

/**
 * Crowding check — which plants will grow into each other, and by how much.
 * Uses mature canopies, because that is the state the design has to survive.
 * Two plants are "crowded" when their canopies overlap by more than a quarter
 * of the smaller one; light touching is normal and often intended (hedges).
 * @param blocks scene blocks
 * @returns array of { a, b, speciesA, speciesB, gap, needed }
 */
export function crowdingIssues(blocks) {
  const plants = blocks.filter((b) => b.kind === 'plant' && b.plant?.species_id && PLANT_MAP[b.plant.species_id])
  const out = []
  for (let i = 0; i < plants.length; i += 1) {
    for (let j = i + 1; j < plants.length; j += 1) {
      const A = plants[i]
      const B = plants[j]
      const pa = PLANT_MAP[A.plant.species_id]
      const pb = PLANT_MAP[B.plant.species_id]
      const [ax, , az] = A.transform?.pos || [0, 0, 0]
      const [bx, , bz] = B.transform?.pos || [0, 0, 0]
      const gap = Math.hypot(ax - bx, az - bz)
      // What the grower asks for between these two: the average of their
      // recommended spacings is the usual rule of thumb for mixed planting.
      const needed = ((pa.spacing || pa.w || 1) + (pb.spacing || pb.w || 1)) / 2
      const ra = (pa.w || 1) / 2
      const rb = (pb.w || 1) / 2
      const overlap = ra + rb - gap
      if (overlap > Math.min(ra, rb) * 0.5 && gap < needed) {
        out.push({
          a: A.id, b: B.id,
          speciesA: pa.common, speciesB: pb.common,
          gap: Math.round(gap * 100) / 100,
          needed: Math.round(needed * 100) / 100,
        })
      }
    }
  }
  return out
}

/** How many of a species fit an area at the grower's spacing (triangular grid). */
export function plantsPerArea(speciesId, areaM2) {
  const p = PLANT_MAP[speciesId]
  if (!p || !areaM2) return 0
  const s = p.spacing || p.w || 1
  // Offset (triangular) planting fits ~15% more than a square grid at the same
  // centre-to-centre spacing — this is how planting schedules are actually run.
  return Math.max(1, Math.round((areaM2 / (s * s)) * 1.15))
}

export const GROWTH_NOTE = 'Growth is an estimate — soil, water and aspect change it. Sizes come from the mature dimensions in the species list.'

export const SPECIES_WITH_PROFILE = PLANTS.map((p) => ({
  ...p,
  growthProfile: profileFor(p),
}))
