// A fictional backyard job from enquiry to completion, with one variation.
// Run: npm run demo
import { readFileSync } from 'node:fs'
import * as cos from '../src/index.js'

const design = JSON.parse(readFileSync(new URL('./design.json', import.meta.url), 'utf8'))
const aud = (n) => `A$${Math.round(n).toLocaleString('en-AU')}`
let p = cos.createProject({ id: 'demo-backyard', name: 'Rear yard renovation', client: 'Sam (fictional)', contractor: 'Green Edge Landscapes (fictional)', lot: { width_m: 14, depth_m: 12 } })

function tryMove(target, role) {
  try {
    p = cos.advance(p, target, role)
    console.log(`→ ${target.padEnd(11)} by ${role}`)
  } catch (e) {
    console.log(`✗ ${target} by ${role}: ${e.blockers.join(' · ')}`)
  }
}

tryMove('survey', 'contractor')
tryMove('design', 'contractor')
p = cos.recordSurvey(p, 'contractor', {
  status: 'done',
  findings: 'Reactive clay; falls to rear-left; 1.1 m side access.',
  checks: [{ key: 'access' }, { key: 'services' }, { key: 'levels' }],
  evidence: { accessWidthM: 1.1, soilType: 'Reactive clay', slopePercent: 4, fallDirection: 'Rear-left', drainageStrategy: 'Ag-line to legal point of discharge', bydaReference: 'BYDA-EXAMPLE-0001', servicesChecked: true, easementsChecked: true, photoCount: 6 },
})
tryMove('design', 'contractor')
p = cos.setDesign(p, 'contractor', design)

const boq = cos.estimate(p)
console.log('\nEstimate')
for (const l of boq.lines) console.log(`  ${l.group.padEnd(9)} ${l.label.padEnd(36)} ${String(l.qty).padStart(6)} ${l.unit.padEnd(4)} ${aud(l.subtotal).padStart(9)}`)
console.log(`  Total ${aud(boq.total)} incl. GST · range ${aud(boq.range.low)}–${aud(boq.range.high)}`)
console.log('Order list')
for (const i of boq.takeoff.items) console.log(`  ${i.label.padEnd(34)} ${String(i.qty).padStart(6)} ${i.unit}`)
const checks = cos.siteChecks(p)
console.log(`Site checks: ${checks.risks.map((r) => r.title).join('; ') || 'no risks'} · ${checks.suggestions.length} suggestions\n`)

tryMove('quoted', 'client')
tryMove('quoted', 'contractor')
tryMove('agreed', 'client')
console.log(`Agreed ${aud(cos.agreedTotal(p))}`)
tryMove('in_progress', 'contractor')
for (const [phase, title] of [['prep', 'Excavate and set levels'], ['hardscape', 'Lay paving and build deck'], ['planting', 'Beds, planting and turf']]) {
  p = cos.addTask(p, 'contractor', { phase, title })
}

const bigger = design.concat([{ id: 'p4', kind: 'plant', plant: { species_id: 'magnolia-little-gem' }, transform: { pos: [-5, 0, 5] } }])
const v = cos.proposeVariation(p, 'contractor', bigger)
p = v.project
console.log(`Variation proposed: ${v.submission.lines.map((l) => aud(l.amount_aud)).join(', ')}`)
p = cos.approveVariation(p, 'client', p.decisions.at(-1).id)
console.log(`Agreed now ${aud(cos.agreedTotal(p))} (original ${aud(p.agreement.amount_aud)} + variations)`)

tryMove('handover', 'contractor')
for (const t of p.tasks) p = cos.setTaskStatus(p, 'contractor', t.id, 'done')
tryMove('handover', 'contractor')
tryMove('completed', 'contractor')
tryMove('completed', 'client')
console.log(`\n${p.history.length} history entries · stage ${p.stage}`)
