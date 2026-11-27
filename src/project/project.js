// A construction project as one plain object moving through fixed stages.
// Each move is checked against the evidence recorded on the project and the
// role of the person asking. Functions return a new project; nothing mutates.
import { computeBoQ, boqToQuoteLines } from '../estimate/boq.js'
import { evaluateSiteDesign } from '../estimate/siteChecks.js'
import { surveyReadiness, surveyReadyForQuote } from './survey.js'
import { stageReadiness } from './stages.js'
import { inspectWorkPlan } from './workPlan.js'
import { agreementTotal } from './ledger.js'
import { estimateToSubmission } from './quote.js'

export const STAGES = ['enquiry', 'survey', 'design', 'quoted', 'agreed', 'in_progress', 'handover', 'completed']
export const ROLES = ['contractor', 'client']
export const FORMAT = 'construction-os/project'

const clone = (value) => JSON.parse(JSON.stringify(value))
const now = (at) => new Date(at || Date.now()).toISOString()

export class ProjectError extends Error {
  constructor(code, message, blockers = []) { super(message); this.code = code; this.blockers = blockers }
}

function assertRole(role) {
  if (!ROLES.includes(role)) throw new ProjectError('ROLE_UNKNOWN', `Role must be one of ${ROLES.join(', ')}`)
}

function log(project, role, action, detail, at) {
  project.history.push({ at: now(at), role, action, ...(detail ? { detail } : {}) })
  project.updatedAt = now(at)
}

export function createProject({ id, name, client, contractor, lot = {}, at } = {}) {
  if (!id || !/^[a-zA-Z0-9_.-]{1,80}$/.test(id)) throw new ProjectError('ID_INVALID', 'Project id uses letters, numbers, dot, dash or underscore')
  const stamp = now(at)
  return {
    format: FORMAT, version: 1, id, name: String(name || id), client: String(client || ''), contractor: String(contractor || ''),
    lot: { width_m: Number(lot.width_m) || 20, depth_m: Number(lot.depth_m) || 15 },
    stage: 'enquiry',
    survey: { status: 'open', findings: '', checklist: [], evidence: {} },
    design: { blocks: [], concept_locked: null },
    quote: null, agreement: null, variations: [],
    tasks: [], decisions: [], history: [{ at: stamp, role: 'contractor', action: 'created' }],
    createdAt: stamp, updatedAt: stamp,
  }
}

export function recordSurvey(previous, role, input = {}, at) {
  assertRole(role)
  if (role !== 'contractor') throw new ProjectError('ROLE_FORBIDDEN', 'Only the contractor records the site survey')
  const project = clone(previous)
  const survey = project.survey
  if (input.findings !== undefined) survey.findings = String(input.findings)
  Object.assign(survey.evidence, input.evidence || {})
  for (const item of input.checks || []) {
    const row = survey.checklist.find((c) => c.key === item.key)
    if (row) row.done = item.done !== false; else survey.checklist.push({ key: item.key, label: item.label || item.key, done: item.done !== false })
  }
  if (input.status) survey.status = input.status
  log(project, role, 'survey_updated', null, at)
  return project
}

export function setDesign(previous, role, blocks = [], at) {
  assertRole(role)
  if (previous.design.concept_locked) throw new ProjectError('CONCEPT_LOCKED', 'The concept is locked; record a variation instead')
  if (!Array.isArray(blocks)) throw new ProjectError('DESIGN_INVALID', 'A design is an array of blocks')
  const project = clone(previous)
  project.design.blocks = clone(blocks)
  log(project, role, 'design_updated', `${blocks.length} blocks`, at)
  return project
}

export const estimate = (project) => computeBoQ(project.design.blocks)
export const siteChecks = (project) => evaluateSiteDesign(project.design.blocks, project.lot)

export function readiness(project, target, role) {
  const blockers = []
  const order = STAGES.indexOf(project.stage)
  if (STAGES.indexOf(target) !== order + 1) blockers.push(`The next stage after ${project.stage} is ${STAGES[order + 1] || 'none'}.`)
  if (target === 'survey' || target === 'design') {
    if (role !== 'contractor') blockers.push('Only the contractor moves the project into survey and design.')
  }
  if (target === 'design' && !surveyReadyForQuote(project.survey)) {
    blockers.push(...surveyReadiness(project.survey).missing.map((m) => `Survey: ${m}`))
    if (project.survey.status !== 'done') blockers.push('Survey: mark the survey done')
  }
  if (target === 'quoted') {
    if (role !== 'contractor') blockers.push('Only the contractor issues the quote.')
    if (estimate(project).empty) blockers.push('Draw at least one priced element before quoting.')
  }
  if (target === 'agreed') {
    if (role !== 'client') blockers.push('Only the client accepts the quote.')
    if (!project.quote) blockers.push('There is no quote to accept.')
  }
  if (['in_progress', 'handover', 'completed'].includes(target)) {
    const tasks = inspectWorkPlan(project.tasks).keep
    blockers.push(...stageReadiness({ target, role, project: { ...project, concept_locked: project.design.concept_locked }, tasks, decisions: project.decisions }).blockers)
  }
  return { ready: blockers.length === 0, blockers }
}

export function advance(previous, target, role, at) {
  assertRole(role)
  const check = readiness(previous, target, role)
  if (!check.ready) throw new ProjectError('STAGE_BLOCKED', `Cannot move to ${target}`, check.blockers)
  const project = clone(previous)
  if (target === 'quoted') {
    const boq = estimate(project)
    project.quote = { lines: boqToQuoteLines(boq), total_aud: boq.total, range: boq.range, issuedAt: now(at) }
  }
  if (target === 'agreed') {
    project.design.concept_locked = { at: now(at), blocks: project.design.blocks.length }
    project.agreement = { amount_aud: project.quote.total_aud, lines: project.quote.lines, variations: [], agreedAt: now(at) }
  }
  if (target === 'completed') project.decisions.push({ id: `handover-${project.decisions.length + 1}`, type: 'handover', status: 'approved', at: now(at) })
  project.stage = target
  log(project, role, `stage:${target}`, null, at)
  return project
}

export function addTask(previous, role, { phase, title, order } = {}, at) {
  assertRole(role)
  if (role !== 'contractor') throw new ProjectError('ROLE_FORBIDDEN', 'Only the contractor plans the work')
  if (!title) throw new ProjectError('TASK_INVALID', 'A task needs a title')
  const project = clone(previous)
  const id = `task-${project.tasks.length + 1}`
  project.tasks.push({ id, phase: String(phase || 'general'), title: String(title), status: 'todo', order: Number(order ?? project.tasks.length + 1), created: now(at) })
  project.tasks = inspectWorkPlan(project.tasks).keep
  log(project, role, 'task_added', title, at)
  return project
}

export function setTaskStatus(previous, role, taskId, status, at) {
  assertRole(role)
  if (role !== 'contractor') throw new ProjectError('ROLE_FORBIDDEN', 'Only the contractor updates work')
  if (!['todo', 'doing', 'done'].includes(status)) throw new ProjectError('STATUS_INVALID', 'Status is todo, doing or done')
  const project = clone(previous)
  const task = project.tasks.find((t) => t.id === taskId)
  if (!task) throw new ProjectError('TASK_NOT_FOUND', `No task ${taskId}`)
  task.status = status
  log(project, role, 'task_status', `${taskId} → ${status}`, at)
  return project
}

export function requestDecision(previous, role, { type, title } = {}, at) {
  assertRole(role)
  const project = clone(previous)
  const id = `decision-${project.decisions.length + 1}`
  project.decisions.push({ id, type: String(type || 'milestone'), title: String(title || type || 'Decision'), status: 'pending', requestedBy: role, at: now(at) })
  log(project, role, 'decision_requested', id, at)
  return project
}

export function resolveDecision(previous, role, decisionId, status, at) {
  assertRole(role)
  if (!['approved', 'declined'].includes(status)) throw new ProjectError('STATUS_INVALID', 'Decisions are approved or declined')
  const project = clone(previous)
  const decision = project.decisions.find((d) => d.id === decisionId)
  if (!decision) throw new ProjectError('DECISION_NOT_FOUND', `No decision ${decisionId}`)
  if (decision.status !== 'pending') throw new ProjectError('DECISION_CLOSED', 'This decision is already resolved')
  if (decision.requestedBy === role) throw new ProjectError('ROLE_FORBIDDEN', 'The other party resolves a decision')
  decision.status = status
  decision.resolvedAt = now(at)
  log(project, role, `decision_${status}`, decisionId, at)
  return project
}

// A change after agreement: only the difference between the live estimate and
// the agreed money becomes a variation, and the client must approve it.
export function proposeVariation(previous, role, blocks, at) {
  assertRole(role)
  if (role !== 'contractor') throw new ProjectError('ROLE_FORBIDDEN', 'Only the contractor proposes a variation')
  if (!previous.agreement) throw new ProjectError('NO_AGREEMENT', 'Variations need an agreement')
  const live = computeBoQ(blocks)
  const submission = estimateToSubmission(boqToQuoteLines(live), previous.agreement)
  const project = clone(previous)
  if (!submission.lines.length) return { project, submission }
  const amount = submission.lines.reduce((sum, l) => sum + l.amount_aud, 0)
  project.decisions.push({ id: `decision-${project.decisions.length + 1}`, type: 'variation', title: submission.title, status: 'pending', requestedBy: role, amount_aud: amount, blocks: clone(blocks), at: now(at) })
  log(project, role, 'variation_proposed', `A$${amount}`, at)
  return { project, submission }
}

export function approveVariation(previous, role, decisionId, at) {
  const project = resolveDecision(previous, role, decisionId, 'approved', at)
  const decision = project.decisions.find((d) => d.id === decisionId)
  if (decision.type !== 'variation') throw new ProjectError('NOT_A_VARIATION', 'That decision is not a variation')
  project.agreement.variations.push({ decisionId, amount_aud: decision.amount_aud, at: now(at) })
  project.design.blocks = decision.blocks
  return project
}

export const agreedTotal = (project) => (project.agreement ? agreementTotal(project.agreement) : 0)
