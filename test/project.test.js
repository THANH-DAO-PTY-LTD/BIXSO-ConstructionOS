import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import * as cos from '../src/index.js'

const here = fileURLToPath(new URL('.', import.meta.url))
const design = JSON.parse(readFileSync(join(here, '..', 'examples', 'design.json'), 'utf8'))
const survey = {
  status: 'done', findings: 'Clay; rear fall', checks: [{ key: 'access' }],
  evidence: { accessWidthM: 1, soilType: 'Clay', slopePercent: 3, fallDirection: 'Rear', drainageStrategy: 'Ag-line', bydaReference: 'BYDA-X', servicesChecked: true, easementsChecked: true, photoCount: 2 },
}

function agreedProject() {
  let p = cos.createProject({ id: 'p1' })
  p = cos.advance(p, 'survey', 'contractor')
  p = cos.recordSurvey(p, 'contractor', survey)
  p = cos.advance(p, 'design', 'contractor')
  p = cos.setDesign(p, 'contractor', design)
  p = cos.advance(p, 'quoted', 'contractor')
  return cos.advance(p, 'agreed', 'client')
}

test('BoQ prices drawn areas, plants and elements and lists what to order', () => {
  const boq = cos.computeBoQ(design)
  assert.equal(boq.lines.find((l) => l.label.startsWith('Buffalo turf')).qty, 48)
  assert.equal(boq.total, boq.lines.reduce((s, l) => s + l.subtotal, 0))
  assert.equal(boq.gst_included, Math.round(boq.total / 11))
  assert.ok(boq.range.low < boq.total && boq.total < boq.range.high)
  assert.equal(boq.takeoff.items.find((i) => i.label === 'Turf rolls').qty, Math.ceil((48 / 0.75) * 1.08))
  assert.equal(cos.computeBoQ([]).empty, true)
})

test('stages move one at a time and only for the right role', () => {
  const p = cos.createProject({ id: 'p0' })
  assert.throws(() => cos.advance(p, 'design', 'contractor'), (e) => e.blockers.some((b) => /next stage after enquiry is survey/.test(b)))
  assert.throws(() => cos.advance(p, 'survey', 'client'), (e) => e.code === 'STAGE_BLOCKED')
  assert.throws(() => cos.advance(p, 'survey', 'neighbour'), (e) => e.code === 'ROLE_UNKNOWN')
})

test('design is blocked until the survey has measured evidence', () => {
  let p = cos.advance(cos.createProject({ id: 'p2' }), 'survey', 'contractor')
  p = cos.recordSurvey(p, 'contractor', { status: 'done', checks: [{ key: 'access' }] })
  assert.throws(() => cos.advance(p, 'design', 'contractor'), (e) => e.blockers.some((b) => /Before You Dig/.test(b)))
  p = cos.recordSurvey(p, 'contractor', survey)
  assert.equal(cos.advance(p, 'design', 'contractor').stage, 'design')
})

test('only the client accepts, which locks the concept and fixes the agreed price', () => {
  const p = agreedProject()
  assert.equal(p.stage, 'agreed')
  assert.equal(cos.agreedTotal(p), cos.computeBoQ(design).total)
  assert.throws(() => cos.setDesign(p, 'contractor', []), (e) => e.code === 'CONCEPT_LOCKED')
})

test('a variation prices only the difference and needs the other party to approve it', () => {
  let p = cos.advance(agreedProject(), 'in_progress', 'contractor')
  const extra = design.concat([{ id: 'x', kind: 'plant', plant: { species_id: 'magnolia-little-gem' } }])
  const v = cos.proposeVariation(p, 'contractor', extra)
  assert.equal(v.submission.lines[0].amount_aud, 90)
  p = v.project
  const id = p.decisions.at(-1).id
  assert.throws(() => cos.approveVariation(p, 'contractor', id), (e) => e.code === 'ROLE_FORBIDDEN')
  p = cos.approveVariation(p, 'client', id)
  assert.equal(cos.agreedTotal(p), cos.computeBoQ(design).total + 90)
  assert.equal(cos.proposeVariation(p, 'contractor', design).submission.lines.length, 0)
})

test('handover needs all work done and no pending decisions; only the client completes', () => {
  let p = cos.advance(agreedProject(), 'in_progress', 'contractor')
  p = cos.addTask(p, 'contractor', { phase: 'prep', title: 'Excavate' })
  p = cos.addTask(p, 'contractor', { phase: 'prep', title: 'Excavate' })
  assert.equal(p.tasks.length, 1)
  p = cos.requestDecision(p, 'contractor', { type: 'milestone', title: 'Levels sign-off' })
  assert.throws(() => cos.advance(p, 'handover', 'contractor'), (e) => e.blockers.length === 2)
  p = cos.setTaskStatus(p, 'contractor', p.tasks[0].id, 'done')
  p = cos.resolveDecision(p, 'client', p.decisions.at(-1).id, 'approved')
  p = cos.advance(p, 'handover', 'contractor')
  assert.throws(() => cos.advance(p, 'completed', 'contractor'), (e) => e.code === 'STAGE_BLOCKED')
  p = cos.advance(p, 'completed', 'client')
  assert.equal(cos.hasAcceptedHandover(p.decisions), true)
})

test('CLI runs a job and refuses the wrong role', () => {
  const env = { ...process.env, CONSTRUCTIONOS_HOME: mkdtempSync(join(tmpdir(), 'construction-os-')) }
  const cli = (...args) => execFileSync(process.execPath, [join(here, '..', 'bin', 'constructionos.js'), ...args], { env, encoding: 'utf8' })
  cli('new', 'job1', '--lot', '14x12')
  cli('advance', 'job1', 'survey', '--as', 'contractor')
  const sets = Object.entries(survey.evidence).flatMap(([k, v]) => ['--set', `${k}=${v}`])
  assert.match(cli('survey', 'job1', '--findings', 'Clay', '--check', 'access', '--done', ...sets), /complete/)
  cli('advance', 'job1', 'design', '--as', 'contractor')
  cli('design', 'job1', join(here, '..', 'examples', 'design.json'))
  assert.match(cli('estimate', 'job1'), /Turf rolls/)
  assert.throws(() => cli('advance', 'job1', 'quoted', '--as', 'client'), (e) => /Only the contractor issues the quote/.test(e.stderr))
  cli('advance', 'job1', 'quoted', '--as', 'contractor')
  assert.match(cli('advance', 'job1', 'agreed', '--as', 'client'), /agreed A\$/)
  assert.throws(() => cli('show', '../x'), (e) => /Project ids/.test(e.stderr))
})
