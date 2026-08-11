const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000

const RECENCY_POINTS = Object.freeze([
  Object.freeze({ maximumAgeDays: 30, points: 3 }),
  Object.freeze({ maximumAgeDays: 90, points: 2 }),
  Object.freeze({ maximumAgeDays: 180, points: 1 }),
  Object.freeze({ maximumAgeDays: Infinity, points: 0 }),
])

const GEOGRAPHY_POINTS = Object.freeze({
  exact_region: 2,
  national: 0,
})

const CATEGORY_POINTS = Object.freeze({
  exact: 2,
  parent_category: 0,
})

const GRADE_THRESHOLDS = Object.freeze([
  Object.freeze({ minimumScore: 7, grade: 'A' }),
  Object.freeze({ minimumScore: 5, grade: 'B' }),
  Object.freeze({ minimumScore: 3, grade: 'C' }),
  Object.freeze({ minimumScore: 0, grade: 'D' }),
])

function toTimestamp(value, fieldName) {
  if (!(typeof value === 'string' || value instanceof Date)) {
    throw new TypeError(`${fieldName} must be an ISO date string or Date`)
  }

  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) {
    throw new TypeError(`${fieldName} must be a valid date`)
  }

  return timestamp
}

function pointsFor(value, scores, fieldName) {
  if (!Object.hasOwn(scores, value)) {
    throw new TypeError(
      `${fieldName} must be one of: ${Object.keys(scores).join(', ')}`,
    )
  }

  return scores[value]
}

/**
 * Returns the number of complete 24-hour periods between two timestamps.
 * Supplying `asOf` explicitly keeps confidence grading reproducible and pure.
 */
export function calculateObservationAgeDays(observedAt, asOf) {
  const observedTimestamp = toTimestamp(observedAt, 'observedAt')
  const asOfTimestamp = toTimestamp(asOf, 'asOf')
  const elapsedMilliseconds = asOfTimestamp - observedTimestamp

  if (elapsedMilliseconds < 0) {
    throw new RangeError('observedAt cannot be later than asOf')
  }

  return Math.floor(elapsedMilliseconds / MILLISECONDS_PER_DAY)
}

/**
 * Deterministic confidence formula (maximum 7 points):
 * - recency: <=30 days 3, <=90 days 2, <=180 days 1, older 0
 * - geography: exact region 2, national fallback 0
 * - category: exact FDC/F-MAP match 2, parent-category fallback 0
 * Grades: A = 7, B = 5-6, C = 3-4, D = 0-2.
 */
export function calculateConfidenceGrade({
  observedAt,
  asOf,
  geographicSpecificity,
  categoryMatchSpecificity,
}) {
  const ageDays = calculateObservationAgeDays(observedAt, asOf)
  const recencyScore = RECENCY_POINTS.find(
    ({ maximumAgeDays }) => ageDays <= maximumAgeDays,
  ).points
  const score =
    recencyScore +
    pointsFor(
      geographicSpecificity,
      GEOGRAPHY_POINTS,
      'geographicSpecificity',
    ) +
    pointsFor(
      categoryMatchSpecificity,
      CATEGORY_POINTS,
      'categoryMatchSpecificity',
    )

  return GRADE_THRESHOLDS.find(
    ({ minimumScore }) => score >= minimumScore,
  ).grade
}
