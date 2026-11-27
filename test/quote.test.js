import { describe, it } from 'node:test'
import { expect } from './helpers/expect.js'
import { estimateToSubmission } from '../src/project/quote.js'

const estimate = [
  { label: 'Timber deck', amount: 20000 },
  { label: 'Planting', amount: 8152 },
]

describe('estimate → quote hand-off', () => {
  it('without an agreement the whole estimate is the quote', () => {
    const out = estimateToSubmission(estimate, null)
    expect(out.type).toBe('quote')
    expect(out.lines.reduce((s, l) => s + l.amount_aud, 0)).toBe(28152)
  })
  it('under an agreement only the difference becomes a variation', () => {
    const out = estimateToSubmission(estimate, { amount_aud: 23000 })
    expect(out.type).toBe('variation')
    expect(out.lines).toHaveLength(1)
    expect(out.lines[0].amount_aud).toBe(5152)
  })
  it('counts already-approved variations as agreed money', () => {
    expect(estimateToSubmission(estimate, { amount_aud: 23000, variations: [{ amount_aud: 2000 }] }).lines[0].amount_aud).toBe(3152)
  })
  it('imports nothing when the live design is not above the agreed price', () => {
    const out = estimateToSubmission(estimate, { amount_aud: 30000 })
    expect(out.lines).toEqual([])
    expect(out.note).toMatch(/nothing was imported/)
  })
})
