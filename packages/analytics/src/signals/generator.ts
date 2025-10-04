import type { PriceData, RSIResult, BollingerBandsResult, MACDResult, ZScoreResult } from '../types'
import type { TechnicalSignal, SignalWeights } from './types'
import { DEFAULT_SIGNAL_WEIGHTS } from './types'
import { calculateRSI } from '../technical/rsi'
import { calculateBollingerBands } from '../technical/bollinger-bands'
import { calculateMACD } from '../technical/macd'
import { calculateZScore } from '../statistical/z-score'

/**
 * Generate comprehensive buy/sell signal from technical indicators
 *
 * @param prices Historical price data (at least 30 days)
 * @param weights Custom weights for each indicator (optional)
 * @returns Technical signal with confidence and reasoning
 */
export function generateTechnicalSignal(
  prices: PriceData[],
  weights: SignalWeights = DEFAULT_SIGNAL_WEIGHTS
): TechnicalSignal {
  const reasoning: string[] = []
  let buyScore = 0
  let sellScore = 0

  // Calculate all indicators
  const rsi = calculateRSI(prices, 14)
  const bb = calculateBollingerBands(prices, 20, 2)
  const macd = calculateMACD(prices, 12, 26, 9)

  // Calculate price z-score (using 12-month history)
  const closingPrices = prices.map(p => p.close)
  const currentPrice = closingPrices[closingPrices.length - 1]
  const historicalPrices = closingPrices.slice(0, -1)
  const zScore = calculateZScore(currentPrice, historicalPrices)

  // Analyze RSI
  if (rsi) {
    if (rsi.isOversold) {
      buyScore += weights.rsi * 100
      reasoning.push(`RSI is oversold at ${rsi.value} (< 30), suggesting potential buying opportunity`)
    } else if (rsi.isOverbought) {
      sellScore += weights.rsi * 100
      reasoning.push(`RSI is overbought at ${rsi.value} (> 70), suggesting potential selling opportunity`)
    } else if (rsi.value < 45) {
      buyScore += weights.rsi * 50
      reasoning.push(`RSI at ${rsi.value} shows moderate buying pressure`)
    } else if (rsi.value > 55) {
      sellScore += weights.rsi * 50
      reasoning.push(`RSI at ${rsi.value} shows moderate selling pressure`)
    }
  }

  // Analyze Bollinger Bands
  if (bb) {
    if (bb.signal === 'BELOW_LOWER') {
      buyScore += weights.bollingerBands * 100
      reasoning.push(`Price is below lower Bollinger Band, indicating oversold condition`)
    } else if (bb.signal === 'ABOVE_UPPER') {
      sellScore += weights.bollingerBands * 100
      reasoning.push(`Price is above upper Bollinger Band, indicating overbought condition`)
    } else if (bb.signal === 'BELOW_MIDDLE') {
      buyScore += weights.bollingerBands * 40
      reasoning.push(`Price is below middle Bollinger Band, showing weakness`)
    } else if (bb.signal === 'ABOVE_MIDDLE') {
      sellScore += weights.bollingerBands * 40
      reasoning.push(`Price is above middle Bollinger Band, showing strength`)
    }

    // Bollinger squeeze indicates potential breakout
    if (bb.bandwidth < 5) {
      reasoning.push(`Bollinger Bands squeeze detected (bandwidth: ${bb.bandwidth}%), potential breakout imminent`)
    }
  }

  // Analyze MACD
  if (macd) {
    if (macd.crossover === 'BULLISH') {
      buyScore += weights.macd * 100
      reasoning.push(`MACD bullish crossover detected, strong buy signal`)
    } else if (macd.crossover === 'BEARISH') {
      sellScore += weights.macd * 100
      reasoning.push(`MACD bearish crossover detected, strong sell signal`)
    } else {
      // Check histogram direction
      if (macd.histogram > 0 && macd.macd > macd.signal) {
        buyScore += weights.macd * 60
        reasoning.push(`MACD histogram positive (${macd.histogram}), bullish momentum`)
      } else if (macd.histogram < 0 && macd.macd < macd.signal) {
        sellScore += weights.macd * 60
        reasoning.push(`MACD histogram negative (${macd.histogram}), bearish momentum`)
      }
    }
  }

  // Analyze Z-Score
  if (zScore.significance === 'EXTREME') {
    if (zScore.value < -2) {
      buyScore += weights.zScore * 100
      reasoning.push(`Z-score at ${zScore.value} indicates extreme undervaluation`)
    } else if (zScore.value > 2) {
      sellScore += weights.zScore * 100
      reasoning.push(`Z-score at ${zScore.value} indicates extreme overvaluation`)
    }
  } else if (zScore.significance === 'HIGH') {
    if (zScore.value < -1) {
      buyScore += weights.zScore * 60
      reasoning.push(`Z-score at ${zScore.value} suggests undervaluation`)
    } else if (zScore.value > 1) {
      sellScore += weights.zScore * 60
      reasoning.push(`Z-score at ${zScore.value} suggests overvaluation`)
    }
  }

  // Determine final signal
  const totalScore = buyScore + sellScore
  const netScore = buyScore - sellScore

  let signalType: TechnicalSignal['type']
  let strength: number
  let confidence: number

  if (Math.abs(netScore) < totalScore * 0.2) {
    // Weak signal, hold
    signalType = 'HOLD'
    strength = 50
    confidence = Math.max(0, 100 - Math.abs(netScore) / totalScore * 100)
    reasoning.push(`Mixed signals, recommendation is to HOLD`)
  } else if (netScore > 0) {
    // Buy signal
    signalType = 'BUY'
    strength = Math.min(100, Math.round((buyScore / (weights.rsi + weights.bollingerBands + weights.macd + weights.zScore)) * 100))
    confidence = Math.round((Math.abs(netScore) / totalScore) * 100)
    reasoning.push(`Overall assessment: BUY signal with ${confidence}% confidence`)
  } else {
    // Sell signal
    signalType = 'SELL'
    strength = Math.min(100, Math.round((sellScore / (weights.rsi + weights.bollingerBands + weights.macd + weights.zScore)) * 100))
    confidence = Math.round((Math.abs(netScore) / totalScore) * 100)
    reasoning.push(`Overall assessment: SELL signal with ${confidence}% confidence`)
  }

  return {
    type: signalType,
    strength: Math.round(strength),
    confidence: Math.round(confidence),
    indicators: {
      rsi: rsi
        ? {
            value: rsi.value,
            signal: rsi.signal || 'NEUTRAL',
            weight: weights.rsi,
          }
        : undefined,
      bollingerBands: bb
        ? {
            position: bb.signal,
            signal: bb.signal.includes('UPPER') ? 'SELL' : bb.signal.includes('LOWER') ? 'BUY' : 'NEUTRAL',
            weight: weights.bollingerBands,
          }
        : undefined,
      macd: macd
        ? {
            crossover: macd.crossover,
            histogram: macd.histogram,
            signal: macd.crossover === 'BULLISH' ? 'BUY' : macd.crossover === 'BEARISH' ? 'SELL' : 'NEUTRAL',
            weight: weights.macd,
          }
        : undefined,
      zScore: {
        value: zScore.value,
        significance: zScore.significance,
        signal: zScore.value < -1 ? 'BUY' : zScore.value > 1 ? 'SELL' : 'NEUTRAL',
        weight: weights.zScore,
      },
    },
    timestamp: new Date(),
    reasoning,
  }
}

/**
 * Generate simple buy/sell signal for quick evaluation
 */
export function generateSimpleSignal(prices: PriceData[]): 'BUY' | 'SELL' | 'HOLD' {
  const signal = generateTechnicalSignal(prices)
  return signal.type
}

/**
 * Batch generate signals for multiple symbols
 */
export function batchGenerateSignals(
  priceData: Map<string, PriceData[]>,
  weights?: SignalWeights
): Map<string, TechnicalSignal> {
  const signals = new Map<string, TechnicalSignal>()

  for (const [symbol, prices] of priceData.entries()) {
    try {
      const signal = generateTechnicalSignal(prices, weights)
      signals.set(symbol, signal)
    } catch (error) {
      console.error(`Error generating signal for ${symbol}:`, error)
    }
  }

  return signals
}
