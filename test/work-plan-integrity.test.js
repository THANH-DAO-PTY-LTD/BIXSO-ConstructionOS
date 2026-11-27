import { describe, it } from 'node:test'
import { expect } from './helpers/expect.js'
import { hasAcceptedHandover, inspectWorkPlan } from '../src/project/workPlan.js'

describe('work-plan integrity', () => {
  it('keeps one canonical task and preserves the most advanced status', () => {
    const result = inspectWorkPlan([
      { id: 'first', title: 'Planting & garden beds', phase: 'planting', status: 'todo', order: 7, created: '2026-08-01' },
      { id: 'second', title: 'Planting & garden beds', phase: 'planting', status: 'done', order: 17, created: '2026-08-02' },
      { id: 'other', title: 'Lawn / turf', phase: 'planting', status: 'todo', order: 8, created: '2026-08-01' },
    ])

    expect(result.keep.map((task) => task.id)).toEqual(['other', 'second'])
    expect(result.duplicates.map((task) => task.id)).toEqual(['first'])
    expect(result.progress).toBe(50)
  })

  it('requires an approved handover before completed tasks can be reconciled', () => {
    expect(hasAcceptedHandover([{ type: 'handover', status: 'pending' }])).toBe(false)
    expect(hasAcceptedHandover([{ type: 'handover', status: 'approved' }])).toBe(true)
  })

  it('does not confuse a completed status flag with accepted handover evidence', () => {
    const legacyProject = { status: 'completed' }
    const decisions = [{ type: 'milestone', status: 'approved' }]

    expect(legacyProject.status).toBe('completed')
    expect(hasAcceptedHandover(decisions)).toBe(false)
  })
})
