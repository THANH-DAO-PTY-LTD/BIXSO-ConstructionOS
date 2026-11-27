import { describe, it } from 'node:test'
import { expect } from './helpers/expect.js'
import { stageReadiness } from '../src/project/stages.js'

const project = { concept_locked: { version: 2 }, agreement: { amount_aud: 23000 } }

describe('project stage readiness', () => {
  it('never lets a client act as the contractor', () => {
    expect(stageReadiness({ target: 'handover', role: 'client', project, tasks: [{ status: 'done' }], decisions: [] }).ready).toBe(false)
  })

  it('blocks handover while work or approvals remain', () => {
    const result = stageReadiness({
      target: 'handover', role: 'contractor', project,
      tasks: [{ status: 'done' }, { status: 'todo' }],
      decisions: [{ status: 'pending' }],
    })
    expect(result.ready).toBe(false)
    expect(result.blockers).toHaveLength(2)
  })

  it('allows handover only after all tracked work is done', () => {
    const result = stageReadiness({
      target: 'handover', role: 'contractor', project,
      tasks: [{ status: 'done' }, { status: 'done' }], decisions: [{ status: 'approved' }],
    })
    expect(result).toMatchObject({ ready: true, completedTasks: 2, totalTasks: 2, pendingDecisions: 0 })
  })

  it('requires a locked concept and agreement to start building', () => {
    expect(stageReadiness({ target: 'in_progress', role: 'contractor', project: {}, tasks: [], decisions: [] }).blockers).toHaveLength(2)
  })
})
