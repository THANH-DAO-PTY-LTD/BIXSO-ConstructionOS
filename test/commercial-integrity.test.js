import { describe, it } from 'node:test'
import { expect } from './helpers/expect.js'
import { surveyReadiness, surveyReadyForQuote } from '../src/project/survey.js'
import { agreementTotal, paymentCanBeDeleted, supplyCanBeDeleted, supplyIdentity } from '../src/project/ledger.js'

const completeSurvey = {
  status: 'done',
  findings: 'Clay soil; rear fall; 950 mm side access.',
  checklist: [{ key: 'access', done: true }, { key: 'services', done: true }],
  evidence: {
    accessWidthM: 0.95,
    soilType: 'Reactive clay',
    slopePercent: 6,
    fallDirection: 'Rear-left',
    drainageStrategy: 'Ag-line to legal point of discharge',
    bydaReference: 'BYDA-2026-12345',
    servicesChecked: true,
    easementsChecked: true,
    photoCount: 8,
  },
}

describe('commercial integrity', () => {
  it('does not unlock a quote from a status flag without measured evidence', () => {
    expect(surveyReadyForQuote({ status: 'done', checklist: [{ done: true }] })).toBe(false)
    expect(surveyReadiness(completeSurvey)).toEqual({ ready: true, missing: [] })
    expect(surveyReadyForQuote(completeSurvey)).toBe(true)
  })

  it('keeps a legacy Done survey repairable until its evidence is complete', () => {
    const legacy = { status: 'done', findings: '', checklist: [{ done: true }] }
    const readiness = surveyReadiness(legacy)
    expect(readiness.ready).toBe(false)
    expect(surveyReadyForQuote(legacy)).toBe(false)
    expect(readiness.missing).toContain('Record the site findings')
  })

  it('keeps paid and invoiced records immutable while drafts remain removable', () => {
    expect(paymentCanBeDeleted({ kind: 'milestone', status: 'proposed' })).toBe(true)
    expect(paymentCanBeDeleted({ kind: 'milestone', status: 'agreed' })).toBe(false)
    expect(paymentCanBeDeleted({ kind: 'deposit', status: 'paid' })).toBe(false)
    expect(paymentCanBeDeleted({ kind: 'milestone', status: 'invoiced' })).toBe(false)
    expect(paymentCanBeDeleted({ kind: 'quote', status: 'agreed' })).toBe(false)
  })

  it('tracks approved variations without overwriting the original agreement', () => {
    expect(agreementTotal({ amount_aud: 15200, variations: [{ amount_aud: 1800 }, { amount_aud: -400 }] })).toBe(16600)
  })

  it('deduplicates catalogue materials and locks committed procurement', () => {
    expect(supplyIdentity({ catalogue_id: 'DECKING-BOARD', name: 'Merbau board' })).toBe('decking-board')
    expect(supplyCanBeDeleted({ status: 'planned' })).toBe(true)
    expect(supplyCanBeDeleted({ status: 'ordered' })).toBe(false)
    expect(supplyCanBeDeleted({ status: 'delivered' })).toBe(false)
  })
})
