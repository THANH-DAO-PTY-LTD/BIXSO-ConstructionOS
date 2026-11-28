#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import * as cos from '../src/index.js'

const HELP = `Construction OS: an outdoor construction job from survey to handover

Usage
  constructionos new <id> [--name N] [--client C] [--contractor C] [--lot 14x12]
  constructionos survey <id> [--findings TEXT] [--check KEY]... [--set field=value]... [--done]
  constructionos design <id> <blocks.json>
  constructionos estimate <id>
  constructionos checks <id>
  constructionos advance <id> <stage> --as contractor|client
  constructionos task <id> add <phase> <title> | done <task-id>     (as contractor)
  constructionos decision <id> request <type> <title> --as ROLE
  constructionos decision <id> approve|decline <decision-id> --as ROLE
  constructionos vary <id> <blocks.json>                            (as contractor)
  constructionos show <id>

Stages: ${cos.STAGES.join(' → ')}
Survey fields: ${cos.SURVEY_EVIDENCE_FIELDS.map((f) => f.key).join(', ')}, servicesChecked, easementsChecked, photoCount
Projects are saved in .construction-os/<id>.json (or CONSTRUCTIONOS_HOME). Use fictional records.`

function parse(argv) {
  const args = { _: [], check: [], set: {} }
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]
    if (!a.startsWith('--')) { args._.push(a); continue }
    const name = a.slice(2)
    const value = argv[i + 1]
    if (value === undefined || value.startsWith('--')) { args[name] = true; continue }
    i += 1
    if (name === 'check') args.check.push(value)
    else if (name === 'set') {
      const at = value.indexOf('=')
      if (at < 1) throw new Error('--set expects field=value')
      const raw = value.slice(at + 1)
      args.set[value.slice(0, at)] = raw === 'true' ? true : raw === 'false' ? false : (raw !== '' && Number.isFinite(Number(raw)) ? Number(raw) : raw)
    } else args[name] = value
  }
  return args
}

const home = () => process.env.CONSTRUCTIONOS_HOME || join(process.cwd(), '.construction-os')
function fileFor(id) {
  if (!/^[a-zA-Z0-9_.-]{1,80}$/.test(id || '')) throw new Error('Project ids use letters, numbers, dot, dash or underscore')
  return join(home(), `${id}.json`)
}
function load(id) {
  const file = fileFor(id)
  if (!existsSync(file)) throw new Error(`No project ${id}. Run constructionos new ${id}`)
  const project = JSON.parse(readFileSync(file, 'utf8'))
  if (project.format !== cos.FORMAT) throw new Error(`Unsupported project format: ${project.format || 'missing'}`)
  return project
}
function save(project) {
  const file = fileFor(project.id)
  mkdirSync(home(), { recursive: true })
  const temp = `${file}.${process.pid}.tmp`
  writeFileSync(temp, `${JSON.stringify(project, null, 2)}\n`)
  renameSync(temp, file)
}
const readBlocks = (file) => JSON.parse(readFileSync(file, 'utf8'))
const aud = (n) => `A$${Math.round(n).toLocaleString('en-AU')}`
const role = (args) => {
  if (!cos.ROLES.includes(args.as)) throw new Error('--as must be contractor or client')
  return args.as
}

function main() {
  const args = parse(process.argv.slice(2))
  const [command, id, ...rest] = args._
  if (!command || command === 'help' || args.help) return console.log(HELP)

  if (command === 'new') {
    if (existsSync(fileFor(id))) throw new Error(`Project ${id} already exists`)
    const [w, d] = String(args.lot || '20x15').split('x').map(Number)
    const p = cos.createProject({ id, name: args.name, client: args.client, contractor: args.contractor, lot: { width_m: w, depth_m: d } })
    save(p)
    return console.log(`Created ${p.id} (${p.lot.width_m} × ${p.lot.depth_m} m) at stage ${p.stage}`)
  }

  let p = load(id)
  if (command === 'survey') {
    p = cos.recordSurvey(p, 'contractor', { findings: typeof args.findings === 'string' ? args.findings : undefined, checks: args.check.map((key) => ({ key })), evidence: args.set, status: args.done ? 'done' : undefined })
    const r = cos.surveyReadiness(p.survey)
    console.log(r.ready ? 'Survey evidence complete' : `Still missing: ${r.missing.join(' · ')}`)
  } else if (command === 'design') {
    p = cos.setDesign(p, 'contractor', readBlocks(rest[0]))
    console.log(`Design has ${p.design.blocks.length} blocks · estimate ${aud(cos.estimate(p).total)}`)
  } else if (command === 'estimate') {
    const boq = cos.estimate(p)
    for (const l of boq.lines) console.log(`${l.group}\t${l.label}\t${l.qty} ${l.unit}\t${aud(l.subtotal)}`)
    console.log(`Total ${aud(boq.total)} incl. GST (${aud(boq.gst_included)} GST) · range ${aud(boq.range.low)}–${aud(boq.range.high)}`)
    for (const i of boq.takeoff.items) console.log(`order\t${i.label}\t${i.qty} ${i.unit}\t${i.basis}`)
    console.log('Every figure is an estimate from schematic geometry. Confirm on site and with suppliers.')
    return
  } else if (command === 'checks') {
    const c = cos.siteChecks(p)
    for (const r of c.risks) console.log(`review\t${r.title}\t${r.detail}`)
    for (const s of c.suggestions) console.log(`idea\t${s.title}\t${s.detail}`)
    return
  } else if (command === 'advance') {
    try {
      p = cos.advance(p, rest[0], role(args))
    } catch (e) {
      if (e.blockers?.length) throw new Error(`${e.message}:\n  - ${e.blockers.join('\n  - ')}`)
      throw e
    }
    console.log(`${p.id} is now ${p.stage}${p.stage === 'agreed' ? ` · agreed ${aud(cos.agreedTotal(p))}` : ''}`)
  } else if (command === 'task') {
    const [action, a, b] = rest
    if (action === 'add') { p = cos.addTask(p, 'contractor', { phase: a, title: b }); console.log(p.tasks.at(-1).id) }
    else if (action === 'done') { p = cos.setTaskStatus(p, 'contractor', a, 'done'); console.log(`${a} done`) }
    else throw new Error('task add <phase> <title> | task done <task-id>')
  } else if (command === 'decision') {
    const [action, a, b] = rest
    if (action === 'request') { p = cos.requestDecision(p, role(args), { type: a, title: b }); console.log(p.decisions.at(-1).id) }
    else if (action === 'approve' && p.decisions.find((d) => d.id === a)?.type === 'variation') { p = cos.approveVariation(p, role(args), a); console.log(`Variation approved · agreed ${aud(cos.agreedTotal(p))}`) }
    else if (action === 'approve' || action === 'decline') { p = cos.resolveDecision(p, role(args), a, action === 'approve' ? 'approved' : 'declined'); console.log(`${a} ${action}d`) }
    else throw new Error('decision request|approve|decline …')
  } else if (command === 'vary') {
    const v = cos.proposeVariation(p, 'contractor', readBlocks(rest[0]))
    p = v.project
    console.log(v.submission.lines.length ? `${p.decisions.at(-1).id}: ${v.submission.title} · ${aud(v.submission.lines[0].amount_aud)}` : v.submission.note)
  } else if (command === 'show') {
    console.log(`${p.id} · ${p.name} · stage ${p.stage}`)
    console.log(`client ${p.client || '-'} · contractor ${p.contractor || '-'} · lot ${p.lot.width_m} × ${p.lot.depth_m} m`)
    console.log(`design ${p.design.blocks.length} blocks${p.design.concept_locked ? ' (locked)' : ''} · agreed ${aud(cos.agreedTotal(p))}`)
    for (const t of p.tasks) console.log(`  task ${t.id} [${t.status}] ${t.phase}: ${t.title}`)
    for (const d of p.decisions) console.log(`  decision ${d.id} [${d.status}] ${d.type}: ${d.title || ''}`)
    return
  } else {
    throw new Error(`Unknown command ${command}. Run constructionos help`)
  }
  save(p)
}

try {
  main()
} catch (error) {
  console.error(error.message)
  process.exit(1)
}
