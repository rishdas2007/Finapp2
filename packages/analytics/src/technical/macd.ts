import type { PriceData, MACDResult } from '../types'

/**
 * Calculate EMA (Exponential Moving Average)
 */
function calculateEMA(prices: number[], period: number): number[] {
  if (prices.length < period) {
    return []
  }

  const ema: number[] = []
  const multiplier = 2 / (period + 1)

  // Start with SMA for first value
  let sum = 0
  for (let i = 0; i < period; i++) {
    sum += prices[i]
  }
  ema.push(sum / period)

  // Calculate EMA for remaining values
  for (let i = period; i < prices.length; i++) {
    const currentEMA = (prices[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1]
    ema.push(currentEMA)
  }

  return ema
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 *
 * MACD consists of:
 * - MACD Line: 12-period EMA - 26-period EMA
 * - Signal Line: 9-period EMA of MACD Line
 * - Histogram: MACD Line - Signal Line
 *
 * @param prices Array of price data
 * @param fastPeriod Fast EMA period (default: 12)
 * @param slowPeriod Slow EMA period (default: 26)
 * @param signalPeriod Signal line EMA period (default: 9)
 * @returns MACD values
 */
export function calculateMACD(
  prices: PriceData[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDResult | null {
  const requiredLength = slowPeriod + signalPeriod
  if (prices.length < requiredLength) {
    return null
  }

  const closingPrices = prices.map(p => p.close)

  // Calculate EMAs
  const fastEMA = calculateEMA(closingPrices, fastPeriod)
  const slowEMA = calculateEMA(closingPrices, slowPeriod)

  // Calculate MACD line (fast EMA - slow EMA)
  const macdLine: number[] = []
  const startIndex = slowPeriod - fastPeriod

  for (let i = 0; i < slowEMA.length; i++) {
    macdLine.push(fastEMA[i + startIndex] - slowEMA[i])
  }

  // Calculate signal line (9-period EMA of MACD)
  const signalLine = calculateEMA(macdLine, signalPeriod)

  if (signalLine.length === 0) {
    return null
  }

  // Get current values
  const currentMACD = macdLine[macdLine.length - 1]
  const currentSignal = signalLine[signalLine.length - 1]
  const histogram = currentMACD - currentSignal

  // Detect crossover
  let crossover: MACDResult['crossover'] = 'NONE'
  if (macdLine.length > 1 && signalLine.length > 1) {
    const prevMACD = macdLine[macdLine.length - 2]
    const prevSignal = signalLine[signalLine.length - 2]

    // Bullish crossover: MACD crosses above signal
    if (prevMACD <= prevSignal && currentMACD > currentSignal) {
      crossover = 'BULLISH'
    }
    // Bearish crossover: MACD crosses below signal
    else if (prevMACD >= prevSignal && currentMACD < currentSignal) {
      crossover = 'BEARISH'
    }
  }

  return {
    macd: Math.round(currentMACD * 100) / 100,
    signal: Math.round(currentSignal * 100) / 100,
    histogram: Math.round(histogram * 100) / 100,
    crossover,
  }
}

/**
 * Calculate MACD time series
 */
export function calculateMACDTimeSeries(
  prices: PriceData[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): Array<{
  date: string
  macd: number
  signal: number
  histogram: number
}> {
  const requiredLength = slowPeriod + signalPeriod
  if (prices.length < requiredLength) {
    return []
  }

  const closingPrices = prices.map(p => p.close)

  // Calculate EMAs
  const fastEMA = calculateEMA(closingPrices, fastPeriod)
  const slowEMA = calculateEMA(closingPrices, slowPeriod)

  // Calculate MACD line
  const macdLine: number[] = []
  const startIndex = slowPeriod - fastPeriod

  for (let i = 0; i < slowEMA.length; i++) {
    macdLine.push(fastEMA[i + startIndex] - slowEMA[i])
  }

  // Calculate signal line
  const signalLine = calculateEMA(macdLine, signalPeriod)

  // Build result array
  const result: Array<{
    date: string
    macd: number
    signal: number
    histogram: number
  }> = []

  const dataStartIndex = slowPeriod + signalPeriod - 1

  for (let i = 0; i < signalLine.length; i++) {
    const macd = macdLine[i + signalPeriod - 1]
    const signal = signalLine[i]
    const histogram = macd - signal

    result.push({
      date: prices[dataStartIndex + i].date,
      macd: Math.round(macd * 100) / 100,
      signal: Math.round(signal * 100) / 100,
      histogram: Math.round(histogram * 100) / 100,
    })
  }

  return result
}
