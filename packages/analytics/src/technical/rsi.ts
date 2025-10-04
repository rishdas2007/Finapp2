import type { PriceData, RSIResult } from '../types'

/**
 * Calculate RSI (Relative Strength Index)
 *
 * RSI measures the magnitude of recent price changes to evaluate
 * overbought or oversold conditions
 *
 * @param prices Array of price data
 * @param period RSI period (default: 14)
 * @returns RSI value with signal
 */
export function calculateRSI(prices: PriceData[], period: number = 14): RSIResult | null {
  if (prices.length < period + 1) {
    return null
  }

  // Calculate price changes
  const changes: number[] = []
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i].close - prices[i - 1].close)
  }

  // Separate gains and losses
  const gains: number[] = changes.map(change => (change > 0 ? change : 0))
  const losses: number[] = changes.map(change => (change < 0 ? Math.abs(change) : 0))

  // Calculate initial average gain and loss
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period

  // Calculate smoothed averages for remaining periods
  for (let i = period; i < changes.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period
  }

  // Calculate RS and RSI
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
  const rsi = 100 - 100 / (1 + rs)

  // Determine signal
  let signal: RSIResult['signal']
  if (rsi >= 70) {
    signal = 'OVERBOUGHT'
  } else if (rsi <= 30) {
    signal = 'OVERSOLD'
  } else {
    signal = 'NEUTRAL'
  }

  return {
    value: Math.round(rsi * 100) / 100,
    signal,
    isOverbought: rsi >= 70,
    isOversold: rsi <= 30,
    strength: Math.round(rsi),
  }
}

/**
 * Calculate RSI for time series (returns array of RSI values)
 */
export function calculateRSITimeSeries(
  prices: PriceData[],
  period: number = 14
): Array<{ date: string; rsi: number }> {
  if (prices.length < period + 1) {
    return []
  }

  const result: Array<{ date: string; rsi: number }> = []

  // Calculate for each window
  for (let i = period; i < prices.length; i++) {
    const window = prices.slice(i - period, i + 1)
    const rsiResult = calculateRSI(window, period)

    if (rsiResult) {
      result.push({
        date: prices[i].date,
        rsi: rsiResult.value,
      })
    }
  }

  return result
}
