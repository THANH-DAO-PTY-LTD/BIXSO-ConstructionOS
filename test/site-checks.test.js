import { describe, it } from 'node:test'
import { expect } from './helpers/expect.js'
import { evaluateSiteDesign } from '../src/estimate/siteChecks.js'

const block = (id, template_id, x, z, footprint = [1, 1]) => ({ id, kind: 'template', template_id, meta: { footprint }, transform: { pos: [x, 0, z], scale: 1 } })

describe('site checks', () => {
  it('flags an indicative pool boundary clearance without calling it approval advice', () => {
    const result = evaluateSiteDesign([block('p1', 'pool', 7, 0, [4, 2.4])], { width_m: 20, depth_m: 15 })
    expect(result.risks[0].title).toContain('Pool')
    expect(result.risks[0].detail).toContain('confirm local rules')
  })

  it('suggests missing experience layers on an empty house-only site', () => {
    const result = evaluateSiteDesign([{ id: 'h', kind: 'param', meta: { param: 'house' } }], { width_m: 18, depth_m: 25 })
    expect(result.suggestions.map((item) => item.id)).toEqual(['ground', 'access', 'planting', 'living'])
  })

  it('does not invent boundary risk for ordinary ground elements', () => {
    const result = evaluateSiteDesign([block('g1', 'grass-patch', 8, 0, [3, 3])], { width_m: 20, depth_m: 15 })
    expect(result.risks).toHaveLength(0)
  })
})
