/**
 * Statistical utility functions
 */

/**
 * Calculate mean (average) of an array of numbers
 */
export function mean(values: number[]): number {
  if (values.length === 0) return 0
  const sum = values.reduce((acc, val) => acc + val, 0)
  return sum / values.length
}

/**
 * Calculate median of an array of numbers
 */
export function median(values: number[]): number {
  if (values.length === 0) return 0

  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2
  }
  return sorted[mid]
}

/**
 * Calculate standard deviation
 */
export function standardDeviation(values: number[], sample: boolean = true): number {
  if (values.length === 0) return 0

  const avg = mean(values)
  const squaredDiffs = values.map(value => Math.pow(value - avg, 2))
  const avgSquaredDiff = mean(squaredDiffs)

  // Use n-1 for sample standard deviation, n for population
  const divisor = sample ? values.length - 1 : values.length
  const variance = (mean(squaredDiffs) * values.length) / divisor

  return Math.sqrt(variance)
}

/**
 * Calculate variance
 */
export function variance(values: number[], sample: boolean = true): number {
  const stdDev = standardDeviation(values, sample)
  return Math.pow(stdDev, 2)
}

/**
 * Calculate percentile
 */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0
  if (p < 0 || p > 100) throw new Error('Percentile must be between 0 and 100')

  const sorted = [...values].sort((a, b) => a - b)
  const index = (p / 100) * (sorted.length - 1)
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  const weight = index - lower

  if (lower === upper) {
    return sorted[lower]
  }

  return sorted[lower] * (1 - weight) + sorted[upper] * weight
}

/**
 * Calculate z-score for a value
 */
export function zScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0
  return (value - mean) / stdDev
}

/**
 * Calculate rolling mean
 */
export function rollingMean(values: number[], window: number): number[] {
  if (window > values.length) {
    throw new Error('Window size cannot be larger than array length')
  }

  const result: number[] = []
  for (let i = 0; i <= values.length - window; i++) {
    const windowValues = values.slice(i, i + window)
    result.push(mean(windowValues))
  }

  return result
}

/**
 * Calculate rolling standard deviation
 */
export function rollingStdDev(values: number[], window: number): number[] {
  if (window > values.length) {
    throw new Error('Window size cannot be larger than array length')
  }

  const result: number[] = []
  for (let i = 0; i <= values.length - window; i++) {
    const windowValues = values.slice(i, i + window)
    result.push(standardDeviation(windowValues))
  }

  return result
}

/**
 * Linear regression
 * Returns { slope, intercept, rSquared }
 */
export function linearRegression(xValues: number[], yValues: number[]): {
  slope: number
  intercept: number
  rSquared: number
} {
  if (xValues.length !== yValues.length || xValues.length === 0) {
    throw new Error('x and y arrays must have the same non-zero length')
  }

  const n = xValues.length
  const sumX = xValues.reduce((a, b) => a + b, 0)
  const sumY = yValues.reduce((a, b) => a + b, 0)
  const sumXY = xValues.reduce((acc, x, i) => acc + x * yValues[i], 0)
  const sumXX = xValues.reduce((acc, x) => acc + x * x, 0)

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n

  // Calculate R²
  const yMean = mean(yValues)
  const ssTotal = yValues.reduce((acc, y) => acc + Math.pow(y - yMean, 2), 0)
  const ssResidual = yValues.reduce((acc, y, i) => {
    const predicted = slope * xValues[i] + intercept
    return acc + Math.pow(y - predicted, 2)
  }, 0)

  const rSquared = 1 - ssResidual / ssTotal

  return { slope, intercept, rSquared }
}

/**
 * Normalize values to 0-100 scale
 */
export function normalize(value: number, min: number, max: number): number {
  if (max === min) return 50 // Return middle value if no range
  return ((value - min) / (max - min)) * 100
}

/**
 * Exponential Moving Average helper
 */
export function calculateEMAMultiplier(period: number): number {
  return 2 / (period + 1)
}
