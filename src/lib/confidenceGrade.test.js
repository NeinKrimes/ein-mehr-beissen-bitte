import test from 'node:test'
import assert from 'node:assert/strict'

import {
  calculateConfidenceGrade,
  calculateObservationAgeDays,
} from './confidenceGrade.js'

const AS_OF = '2026-08-11T00:00:00.000Z'

function grade(overrides = {}) {
  return calculateConfidenceGrade({
    observedAt: '2026-08-01T00:00:00.000Z',
    asOf: AS_OF,
    geographicSpecificity: 'exact_region',
    categoryMatchSpecificity: 'exact',
    ...overrides,
  })
}

test('calculates whole elapsed UTC days deterministically', () => {
  assert.equal(
    calculateObservationAgeDays(
      '2026-08-10T00:00:01.000Z',
      '2026-08-11T00:00:00.000Z',
    ),
    0,
  )
  assert.equal(
    calculateObservationAgeDays(
      '2026-08-10T00:00:00.000Z',
      '2026-08-11T00:00:00.000Z',
    ),
    1,
  )
})

test('assigns A only to a recent exact-region exact-category observation', () => {
  assert.equal(grade(), 'A')
  assert.equal(grade({ observedAt: '2026-07-12T00:00:00.000Z' }), 'A')
})

test('applies deterministic grade thresholds across all three factors', () => {
  assert.equal(
    grade({ geographicSpecificity: 'national' }),
    'B',
    'national fallback lowers an otherwise strongest observation to B',
  )
  assert.equal(
    grade({ categoryMatchSpecificity: 'parent_category' }),
    'B',
    'parent-category fallback lowers an otherwise strongest observation to B',
  )
  assert.equal(
    grade({
      geographicSpecificity: 'national',
      categoryMatchSpecificity: 'parent_category',
    }),
    'C',
  )
  assert.equal(
    grade({
      observedAt: '2026-02-11T00:00:00.000Z',
      geographicSpecificity: 'national',
      categoryMatchSpecificity: 'parent_category',
    }),
    'D',
  )
})

test('uses inclusive 30, 90, and 180 day recency boundaries', () => {
  assert.equal(grade({ observedAt: '2026-07-12T00:00:00.000Z' }), 'A')
  assert.equal(grade({ observedAt: '2026-07-11T00:00:00.000Z' }), 'B')
  assert.equal(grade({ observedAt: '2026-05-13T00:00:00.000Z' }), 'B')
  assert.equal(grade({ observedAt: '2026-05-12T00:00:00.000Z' }), 'B')
  assert.equal(grade({ observedAt: '2026-02-12T00:00:00.000Z' }), 'B')
  assert.equal(grade({ observedAt: '2026-02-11T00:00:00.000Z' }), 'C')
})

test('rejects invalid, future, and unsupported inputs', () => {
  assert.throws(() => grade({ observedAt: 'not-a-date' }), TypeError)
  assert.throws(
    () => grade({ observedAt: '2026-08-12T00:00:00.000Z' }),
    RangeError,
  )
  assert.throws(
    () => grade({ geographicSpecificity: 'state' }),
    /geographicSpecificity/,
  )
  assert.throws(
    () => grade({ categoryMatchSpecificity: 'similar' }),
    /categoryMatchSpecificity/,
  )
})
