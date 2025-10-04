import type { ZScoreResult, TimeSeriesStats } from '../types'
import { mean, standardDeviation, median, variance } from './utils'

/**
 * Calculate z-score for a single value
 *
 * Z-score measures how many standard deviations a value is from the mean
 * - |z| < 1: Within 1 standard deviation (normal)
 * - 1 < |z| < 2: Within 2 standard deviations (high)
 * - |z| > 2: Beyond 2 standard deviations (extreme)
 *
 * @param value Current value
 * @param historicalValues Historical values for context
 * @returns Z-score with significance level
 */
export function calculateZScore(
  value: number,
  historicalValues: number[]
): ZScoreResult {
  if (historicalValues.length === 0) {
    return {
      value: 0,
      significance: 'NORMAL',
      standardDeviations: 0,
    }
  }

  const avg = mean(historicalValues)
  const stdDev = standardDeviation(historicalValues)

  // If no variation in data, return 0
  if (stdDev === 0) {
    return {
      value: 0,
      significance: 'NORMAL',
      standardDeviations: 0,
    }
  }

  const zScore = (value - avg) / stdDev
  const absZScore = Math.abs(zScore)

  // Determine significance
  let significance: ZScoreResult['significance']
  if (absZScore > 2) {
    significance = 'EXTREME'
  } else if (absZScore > 1) {
    significance = 'HIGH'
  } else {
    significance = 'NORMAL'
  }

  return {
    value: Math.round(zScore * 100) / 100,
    significance,
    standardDeviations: absZScore,
  }
}

/**
 * Calculate rolling z-scores for time series data
 *
 * @param values Time series values
 * @param window Window size for rolling calculation (default: 12 for 12 months)
 * @returns Array of z-scores with dates
 */
export function calculateRollingZScores(
  values: Array<{ date: string; value: number }>,
  window: number = 12
): Array<{ date: string; zScore: number; significance: ZScoreResult['significance'] }> {
  if (values.length < window) {
    return []
  }

  const result: Array<{
    date: string
    zScore: number
    significance: ZScoreResult['significance']
  }> = []

  // Calculate z-score for each point using previous window
  for (let i = window; i < values.length; i++) {
    const historicalWindow = values.slice(i - window, i).map(v => v.value)
    const currentValue = values[i].value

    const zScoreResult = calculateZScore(currentValue, historicalWindow)

    result.push({
      date: values[i].date,
      zScore: zScoreResult.value,
      significance: zScoreResult.significance,
    })
  }

  return result
}

/**
 * Calculate comprehensive time series statistics
 *
 * @param values Array of numeric values
 * @returns Statistical summary
 */
export function calculateTimeSeriesStats(values: number[]): TimeSeriesStats {
  if (values.length === 0) {
    return {
      mean: 0,
      median: 0,
      stdDev: 0,
      min: 0,
      max: 0,
      variance: 0,
      range: 0,
    }
  }

  const meanValue = mean(values)
  const medianValue = median(values)
  const stdDevValue = standardDeviation(values)
  const varianceValue = variance(values)
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const rangeValue = maxValue - minValue

  return {
    mean: Math.round(meanValue * 100) / 100,
    median: Math.round(medianValue * 100) / 100,
    stdDev: Math.round(stdDevValue * 100) / 100,
    min: Math.round(minValue * 100) / 100,
    max: Math.round(maxValue * 100) / 100,
    variance: Math.round(varianceValue * 100) / 100,
    range: Math.round(rangeValue * 100) / 100,
  }
}

/**
 * Detect anomalies using z-score method
 *
 * @param values Time series values
 * @param threshold Z-score threshold for anomaly (default: 2)
 * @returns Array of anomaly indices and values
 */
export function detectAnomalies(
  values: Array<{ date: string; value: number }>,
  threshold: number = 2
): Array<{
  date: string
  value: number
  zScore: number
  isAnomaly: boolean
}> {
  if (values.length === 0) {
    return []
  }

  const numericValues = values.map(v => v.value)
  const avg = mean(numericValues)
  const stdDev = standardDeviation(numericValues)

  if (stdDev === 0) {
    return values.map(v => ({
      date: v.date,
      value: v.value,
      zScore: 0,
      isAnomaly: false,
    }))
  }

  return values.map(v => {
    const zScore = (v.value - avg) / stdDev
    const isAnomaly = Math.abs(zScore) > threshold

    return {
      date: v.date,
      value: v.value,
      zScore: Math.round(zScore * 100) / 100,
      isAnomaly,
    }
  })
}

/**
 * Calculate modified z-score using median absolute deviation (MAD)
 * More robust to outliers than standard z-score
 *
 * @param value Current value
 * @param historicalValues Historical values
 * @returns Modified z-score
 */
export function calculateModifiedZScore(
  value: number,
  historicalValues: number[]
): number {
  if (historicalValues.length === 0) return 0

  const medianValue = median(historicalValues)
  const deviations = historicalValues.map(v => Math.abs(v - medianValue))
  const mad = median(deviations)

  if (mad === 0) return 0

  const modifiedZScore = 0.6745 * (value - medianValue) / mad
  return Math.round(modifiedZScore * 100) / 100
}
