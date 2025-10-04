import type { PriceData, BollingerBandsResult } from '../types'
import { mean, standardDeviation } from '../statistical/utils'

/**
 * Calculate Bollinger Bands
 *
 * Bollinger Bands consist of:
 * - Middle Band: Simple Moving Average
 * - Upper Band: SMA + (standard deviation × multiplier)
 * - Lower Band: SMA - (standard deviation × multiplier)
 *
 * @param prices Array of price data
 * @param period MA period (default: 20)
 * @param stdDevMultiplier Standard deviation multiplier (default: 2)
 * @returns Bollinger Bands values
 */
export function calculateBollingerBands(
  prices: PriceData[],
  period: number = 20,
  stdDevMultiplier: number = 2
): BollingerBandsResult | null {
  if (prices.length < period) {
    return null
  }

  // Get closing prices for the period
  const closingPrices = prices.slice(-period).map(p => p.close)
  const currentPrice = prices[prices.length - 1].close

  // Calculate middle band (SMA)
  const middle = mean(closingPrices)

  // Calculate standard deviation
  const stdDev = standardDeviation(closingPrices, false) // Use population std dev

  // Calculate upper and lower bands
  const upper = middle + stdDevMultiplier * stdDev
  const lower = middle - stdDevMultiplier * stdDev

  // Calculate bandwidth (volatility measure)
  const bandwidth = ((upper - lower) / middle) * 100

  // Calculate %B (price position within bands)
  const percentB = (currentPrice - lower) / (upper - lower)

  // Determine signal based on price position
  let signal: BollingerBandsResult['signal']
  if (currentPrice > upper) {
    signal = 'ABOVE_UPPER'
  } else if (currentPrice > middle) {
    signal = 'ABOVE_MIDDLE'
  } else if (currentPrice > lower) {
    signal = 'BELOW_MIDDLE'
  } else {
    signal = 'BELOW_LOWER'
  }

  return {
    upper: Math.round(upper * 100) / 100,
    middle: Math.round(middle * 100) / 100,
    lower: Math.round(lower * 100) / 100,
    bandwidth: Math.round(bandwidth * 100) / 100,
    percentB: Math.round(percentB * 100) / 100,
    signal,
  }
}

/**
 * Calculate Bollinger Bands time series
 */
export function calculateBollingerBandsTimeSeries(
  prices: PriceData[],
  period: number = 20,
  stdDevMultiplier: number = 2
): Array<{
  date: string
  upper: number
  middle: number
  lower: number
  close: number
}> {
  if (prices.length < period) {
    return []
  }

  const result: Array<{
    date: string
    upper: number
    middle: number
    lower: number
    close: number
  }> = []

  // Calculate for each window
  for (let i = period - 1; i < prices.length; i++) {
    const window = prices.slice(i - period + 1, i + 1)
    const closingPrices = window.map(p => p.close)

    const middle = mean(closingPrices)
    const stdDev = standardDeviation(closingPrices, false)
    const upper = middle + stdDevMultiplier * stdDev
    const lower = middle - stdDevMultiplier * stdDev

    result.push({
      date: prices[i].date,
      upper: Math.round(upper * 100) / 100,
      middle: Math.round(middle * 100) / 100,
      lower: Math.round(lower * 100) / 100,
      close: prices[i].close,
    })
  }

  return result
}

/**
 * Detect Bollinger Band squeeze (low volatility)
 * Squeeze occurs when bandwidth is historically low
 */
export function detectBollingerSqueeze(
  bandwidthHistory: number[],
  threshold: number = 20 // percentile
): boolean {
  if (bandwidthHistory.length < 20) return false

  const currentBandwidth = bandwidthHistory[bandwidthHistory.length - 1]
  const sortedBandwidths = [...bandwidthHistory].sort((a, b) => a - b)
  const thresholdIndex = Math.floor((threshold / 100) * sortedBandwidths.length)
  const thresholdValue = sortedBandwidths[thresholdIndex]

  return currentBandwidth <= thresholdValue
}
