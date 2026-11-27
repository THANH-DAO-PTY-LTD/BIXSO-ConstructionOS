import { crowdingIssues } from './growth.js'

const LOCAL_REVIEW = new Set(['pool', 'pergola', 'garden-shed', 'water-tank', 'fire-pit'])
const GROUND = new Set(['grass-patch', 'garden-bed', 'mulch-patch', 'gravel-patch', 'concrete-pad', 'rain-garden', 'pond', 'pavers'])
const SITE_TEMPLATES = {
  pool: { name: 'Pool', footprint: [4, 2.4] },
  pergola: { name: 'Pergola', footprint: [3, 2.3] },
  'garden-shed': { name: 'Garden shed', footprint: [2, 1.6] },
  'water-tank': { name: 'Water tank', footprint: [1.6, 1.6] },
  'fire-pit': { name: 'Fire pit', footprint: [1.5, 1.5] },
}

function footprint(block) {
  const base = block.meta?.footprint || SITE_TEMPLATES[block.template_id]?.footprint || [1, 1]
  const raw = block.transform?.scale ?? 1
  const sx = Array.isArray(raw) ? (Number(raw[0]) || 1) : Number(raw) || 1
  const sz = Array.isArray(raw) ? (Number(raw[2] ?? raw[0]) || 1) : Number(raw) || 1
  return [base[0] * sx, base[1] * sz]
}

export function evaluateSiteDesign(blocks = [], lot = {}) {
  const width = Number(lot.width_m) || 20
  const depth = Number(lot.depth_m) || 15
  const risks = []
  const suggestions = []

  for (const block of blocks) {
    if (!LOCAL_REVIEW.has(block.template_id)) continue
    const [w, d] = footprint(block)
    const pos = block.transform?.pos || [0, 0, 0]
    const clearance = Math.min(width / 2 - Math.abs(pos[0]) - w / 2, depth / 2 - Math.abs(pos[2]) - d / 2)
    const target = block.template_id === 'pool' ? 1.5 : 0.5
    if (clearance < target) {
      risks.push({
        id: `boundary:${block.id}`,
        level: 'review',
        title: `${SITE_TEMPLATES[block.template_id]?.name || 'Element'} near the boundary`,
        detail: `${Math.max(0, clearance).toFixed(1)} m shown; allow about ${target} m for this concept check and confirm local rules.`,
      })
    }
  }

  const crowding = crowdingIssues(blocks)
  if (crowding.length) {
    risks.push({
      id: 'plant-crowding', level: 'review', title: `${crowding.length} mature plant spacing conflict${crowding.length === 1 ? '' : 's'}`,
      detail: 'Canopies are projected to overlap at mature size. Open Plant spacing to inspect them on the plan.',
    })
  }

  const ids = new Set(blocks.map((block) => block.template_id).filter(Boolean))
  const hasPlants = blocks.some((block) => block.kind === 'plant' || ['tree-round', 'eucalypt', 'shrub', 'hedge'].includes(block.template_id))
  const hasGround = blocks.some((block) => block.kind === 'region' || GROUND.has(block.template_id))
  if (!hasGround) suggestions.push({ id: 'ground', title: 'Define at least one ground zone', detail: 'A lawn, bed, paving or gravel zone makes area and materials measurable.' })
  if (!ids.has('path-straight') && !ids.has('pavers')) suggestions.push({ id: 'access', title: 'Show how people move through the yard', detail: 'Add a path or stepping-paver route between the home and the main garden zone.' })
  if (!hasPlants) suggestions.push({ id: 'planting', title: 'Add planting structure', detail: 'Start with one tree, screening line or native planting group.' })
  if (![...ids].some((id) => ['deck', 'pergola', 'table-set', 'bench'].includes(id))) suggestions.push({ id: 'living', title: 'Add a place to use the garden', detail: 'A deck, shade structure, table or bench turns layout into an experience.' })

  return {
    risks,
    suggestions,
    checked: 4,
    passed: Math.max(0, 4 - risks.length),
  }
}
