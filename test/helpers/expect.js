// Minimal expect() so the original vitest-style assertions run on node:test.
import assert from 'node:assert/strict'

export function expect(actual) {
  return {
    toBe: (v) => assert.equal(actual, v),
    toEqual: (v) => assert.deepEqual(actual, v),
    toContain: (v) => assert.ok(actual.includes(v), `${JSON.stringify(actual)} should contain ${JSON.stringify(v)}`),
    toHaveLength: (n) => assert.equal(actual.length, n),
    toMatch: (re) => assert.match(actual, re),
    toMatchObject: (v) => { for (const [k, val] of Object.entries(v)) assert.deepEqual(actual[k], val, k) },
  }
}
