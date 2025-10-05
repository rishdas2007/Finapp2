import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const ETF_SYMBOLS = [
  { symbol: 'SPY', name: 'S&P 500 Index' },
  { symbol: 'XLB', name: 'Materials' },
  { symbol: 'XLC', name: 'Communication Services' },
  { symbol: 'XLE', name: 'Energy' },
  { symbol: 'XLF', name: 'Financials' },
  { symbol: 'XLI', name: 'Industrials' },
  { symbol: 'XLK', name: 'Technology' },
  { symbol: 'XLP', name: 'Consumer Staples' },
  { symbol: 'XLRE', name: 'Real Estate' },
  { symbol: 'XLU', name: 'Utilities' },
  { symbol: 'XLV', name: 'Health Care' },
  { symbol: 'XLY', name: 'Consumer Discretionary' },
]

// Calculate RSI
function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50

  let gains = 0
  let losses = 0

  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1]
    if (change > 0) gains += change
    else losses += Math.abs(change)
  }

  const avgGain = gains / period
  const avgLoss = losses / period

  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - (100 / (1 + rs))
}

// Calculate Bollinger Bands %B
function calculatePercentB(prices: number[], period: number = 20, stdDev: number = 2): number {
  if (prices.length < period) return 50

  const recentPrices = prices.slice(-period)
  const sma = recentPrices.reduce((a, b) => a + b, 0) / period
  const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period
  const std = Math.sqrt(variance)

  const upperBand = sma + (stdDev * std)
  const lowerBand = sma - (stdDev * std)
  const currentPrice = prices[prices.length - 1]

  return ((currentPrice - lowerBand) / (upperBand - lowerBand)) * 100
}

// Calculate MA Gap
function calculateMAGap(prices: number[], shortPeriod: number = 50, longPeriod: number = 200): number {
  if (prices.length < longPeriod) return 0

  const shortMA = prices.slice(-shortPeriod).reduce((a, b) => a + b, 0) / shortPeriod
  const longMA = prices.slice(-longPeriod).reduce((a, b) => a + b, 0) / longPeriod

  return ((shortMA - longMA) / longMA) * 100
}

// Calculate Z-score
function calculateZScore(value: number, values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
  const std = Math.sqrt(variance)

  if (std === 0) return 0
  return (value - mean) / std
}

/**
 * Daily Update Endpoint - Fast endpoint for cron jobs
 * Fetches only 1 day of new data for each ETF (~12 API calls)
 * Should complete in under 10 seconds with 144 req/min limit
 */
export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.TWELVE_DATA_API_KEY

    if (!apiKey) {
      throw new Error('TWELVE_DATA_API_KEY is not configured')
    }

    const etfMetrics = []
    const updatedSymbols = []

    // Process all ETFs (12 requests, well under 144/min rate limit)
    for (const etf of ETF_SYMBOLS) {
      try {
        // Get quote data for latest price
        const quoteResponse = await fetch(
          `https://api.twelvedata.com/quote?symbol=${etf.symbol}&apikey=${apiKey}`
        )
        const quote = await quoteResponse.json()

        // Get last 250 days to calculate indicators (need full history for accurate indicators)
        const timeSeriesResponse = await fetch(
          `https://api.twelvedata.com/time_series?symbol=${etf.symbol}&interval=1day&outputsize=250&apikey=${apiKey}`
        )
        const timeSeries = await timeSeriesResponse.json()

        if (quote.status === 'error' || timeSeries.status === 'error') {
          console.error(`Error fetching ${etf.symbol}:`, quote.message || timeSeries.message)
          continue
        }

        // Extract prices and dates
        const pricesNewestFirst = timeSeries.values?.map((v: any) => parseFloat(v.close)) || []
        const datesNewestFirst = timeSeries.values?.map((v: any) => v.datetime) || []
        const volumesNewestFirst = timeSeries.values?.map((v: any) => parseInt(v.volume) || 0) || []

        if (pricesNewestFirst.length === 0) {
          console.error(`No price data for ${etf.symbol}`)
          continue
        }

        // Reverse to get oldest-first
        const prices = pricesNewestFirst.slice().reverse()
        const dates = datesNewestFirst.slice().reverse()
        const volumes = volumesNewestFirst.slice().reverse()

        // Calculate indicators for today only
        const todayDate = dates[dates.length - 1]
        const rsi = calculateRSI(prices)
        const percentB = calculatePercentB(prices)
        const maGap = prices.length >= 200 ? calculateMAGap(prices) : 0

        // Store today's indicators
        await supabase.from('etf_indicator_history').upsert({
          symbol: etf.symbol,
          date: todayDate,
          rsi,
          percent_b: percentB,
          ma_gap: maGap,
          close_price: prices[prices.length - 1],
          volume: volumes[volumes.length - 1],
        }, {
          onConflict: 'symbol,date',
          ignoreDuplicates: false,
        })

        // Get historical indicators for z-scores
        const { data: historicalData, error: histError } = await supabase
          .from('etf_indicator_history')
          .select('rsi, percent_b, ma_gap')
          .eq('symbol', etf.symbol)
          .order('date', { ascending: false })
          .limit(90)

        if (histError) {
          console.error(`Error fetching historical data for ${etf.symbol}:`, histError)
        }

        // Calculate z-scores
        let rsiZ = 0
        let percentBZ = 0
        let maGapZ = 0

        if (historicalData && historicalData.length >= 45) {
          const historicalRsiValues = historicalData.map(d => d.rsi).filter(v => v !== null && v !== 0)
          const historicalPercentBValues = historicalData.map(d => d.percent_b).filter(v => v !== null && v !== 0)
          const historicalMaGapValues = historicalData.map(d => d.ma_gap).filter(v => v !== null)

          if (historicalRsiValues.length >= 45) rsiZ = calculateZScore(rsi, historicalRsiValues)
          if (historicalPercentBValues.length >= 45) percentBZ = calculateZScore(percentB, historicalPercentBValues)
          if (historicalMaGapValues.length >= 45 && maGap !== 0) maGapZ = calculateZScore(maGap, historicalMaGapValues)
        }

        // Statistical signal calculation based on z-scores
        // BUY signal: RSI and %B both below -1.5 standard deviations (oversold) AND bullish MA trend
        // SELL signal: RSI and %B both above +1.5 standard deviations (overbought) AND bearish MA trend
        // STRONG signals: z-scores beyond ±2.0
        let signal = 'HOLD'
        let signalStrength = 0

        if (rsiZ < -1.5 && percentBZ < -1.5) {
          signal = rsiZ < -2.0 && percentBZ < -2.0 ? 'STRONG BUY' : 'BUY'
          signalStrength = Math.abs(rsiZ) + Math.abs(percentBZ)
          if (maGap > 0 && maGapZ > 0.5) signalStrength += 1 // Bonus for bullish MA
        } else if (rsiZ > 1.5 && percentBZ > 1.5) {
          signal = rsiZ > 2.0 && percentBZ > 2.0 ? 'STRONG SELL' : 'SELL'
          signalStrength = rsiZ + percentBZ
          if (maGap < 0 && maGapZ < -0.5) signalStrength += 1 // Bonus for bearish MA
        }

        // Calculate 1-day and 5-day price changes using our cached Yahoo Finance data
        // This ensures consistency with the price charts displayed to users
        const { data: priceHistory, error: priceError } = await supabase
          .from('etf_price_history')
          .select('date, price')
          .eq('symbol', etf.symbol)
          .order('date', { ascending: false })
          .limit(6) // Get last 6 days to calculate 5-day change

        let change1Day = 0
        let change5Day = 0

        if (priceHistory && priceHistory.length >= 2) {
          const todayPrice = priceHistory[0].price
          const yesterdayPrice = priceHistory[1].price
          change1Day = ((todayPrice - yesterdayPrice) / yesterdayPrice) * 100

          if (priceHistory.length >= 6) {
            const price5DaysAgo = priceHistory[5].price
            change5Day = ((todayPrice - price5DaysAgo) / price5DaysAgo) * 100
          }
        }

        if (priceError) {
          console.error(`Error fetching price history for ${etf.symbol}:`, priceError)
          // Fall back to Twelve Data prices if cache is unavailable
          const change1DayFallback = prices.length >= 2
            ? ((prices[prices.length - 1] - prices[prices.length - 2]) / prices[prices.length - 2]) * 100
            : 0
          const change5DayFallback = prices.length >= 5
            ? ((prices[prices.length - 1] - prices[prices.length - 5]) / prices[prices.length - 5]) * 100
            : 0
          change1Day = change1DayFallback
          change5Day = change5DayFallback
        }

        const metric = {
          symbol: etf.symbol,
          name: etf.name,
          change_1day: change1Day,
          change_5day: change5Day,
          signal,
          rsi,
          rsi_z: rsiZ,
          percent_b: percentB,
          percent_b_z: percentBZ,
          ma_gap: maGap,
          ma_trend: maGap > 0 ? 'Bull' : 'Bear',
          volume: parseInt(quote.volume) || 0,
          last_price: parseFloat(quote.close) || 0,
        }

        etfMetrics.push(metric)

        // Store in etf_metrics table
        await supabase.from('etf_metrics').insert(metric)

        updatedSymbols.push(etf.symbol)

        // Small delay to be respectful of API (though 144/min allows this)
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (error) {
        console.error(`Error processing ${etf.symbol}:`, error)
      }
    }

    return NextResponse.json({
      metrics: etfMetrics,
      updated: updatedSymbols,
      timestamp: new Date().toISOString(),
      count: etfMetrics.length,
    })
  } catch (error: any) {
    console.error('ETF daily update error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update ETF metrics' },
      { status: 500 }
    )
  }
}
