import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.TWELVE_DATA_API_KEY

    if (!apiKey) {
      throw new Error('TWELVE_DATA_API_KEY is not configured')
    }

    const etfMetrics = []

    // Fetch data for each ETF
    for (const etf of ETF_SYMBOLS) {
      try {
        // Get quote data
        const quoteResponse = await fetch(
          `https://api.twelvedata.com/quote?symbol=${etf.symbol}&apikey=${apiKey}`
        )
        const quote = await quoteResponse.json()

        // Get time series for technical analysis
        const timeSeriesResponse = await fetch(
          `https://api.twelvedata.com/time_series?symbol=${etf.symbol}&interval=1day&outputsize=250&apikey=${apiKey}`
        )
        const timeSeries = await timeSeriesResponse.json()

        if (quote.status === 'error' || timeSeries.status === 'error') {
          console.error(`Error fetching ${etf.symbol}:`, quote.message || timeSeries.message)
          continue
        }

        // Extract prices and dates for calculations
        // TwelveData returns data in reverse chronological order (newest first)
        const pricesNewestFirst = timeSeries.values?.map((v: any) => parseFloat(v.close)) || []
        const datesNewestFirst = timeSeries.values?.map((v: any) => v.datetime) || []
        const volumesNewestFirst = timeSeries.values?.map((v: any) => parseInt(v.volume) || 0) || []

        if (pricesNewestFirst.length === 0) {
          console.error(`No price data for ${etf.symbol}`)
          continue
        }

        // Reverse to get oldest-first for proper indicator calculations
        const prices = pricesNewestFirst.slice().reverse()
        const dates = datesNewestFirst.slice().reverse()
        const volumes = volumesNewestFirst.slice().reverse()

        // Store historical indicators for each of the last 90 days
        // For each day, we need to calculate indicators using only data up to that point
        const historicalIndicators = []
        const totalDays = prices.length
        const daysToStore = Math.min(90, totalDays)

        for (let i = totalDays - daysToStore; i < totalDays; i++) {
          // Get all prices up to and including this day (oldest to current day)
          const pricesUpToDay = prices.slice(0, i + 1)

          // Need at least 20 days for Bollinger Bands calculation
          if (pricesUpToDay.length >= 20) {
            const historicalRsi = calculateRSI(pricesUpToDay)
            const historicalPercentB = calculatePercentB(pricesUpToDay)
            const historicalMaGap = pricesUpToDay.length >= 200
              ? calculateMAGap(pricesUpToDay)
              : 0

            historicalIndicators.push({
              symbol: etf.symbol,
              date: dates[i],
              rsi: historicalRsi,
              percent_b: historicalPercentB,
              ma_gap: historicalMaGap,
              close_price: prices[i],
              volume: volumes[i],
            })
          }
        }

        // Store historical indicators in batch
        if (historicalIndicators.length > 0) {
          await supabase.from('etf_indicator_history').upsert(historicalIndicators, {
            onConflict: 'symbol,date',
            ignoreDuplicates: false,
          })
        }

        // Calculate current technical indicators (using all historical data)
        const rsi = calculateRSI(prices)
        const percentB = calculatePercentB(prices)
        const maGap = prices.length >= 200 ? calculateMAGap(prices) : 0

        // Get historical indicators from database for z-score calculation (minimum 45 days)
        const { data: historicalData, error: histError } = await supabase
          .from('etf_indicator_history')
          .select('rsi, percent_b, ma_gap')
          .eq('symbol', etf.symbol)
          .order('date', { ascending: false })
          .limit(90)

        if (histError) {
          console.error(`Error fetching historical data for ${etf.symbol}:`, histError)
        }

        // Calculate z-scores using 45-day minimum historical baseline from database
        let rsiZ = 0
        let percentBZ = 0
        let maGapZ = 0

        if (historicalData && historicalData.length >= 45) {
          const historicalRsiValues = historicalData.map(d => d.rsi).filter(v => v !== null && v !== 0)
          const historicalPercentBValues = historicalData.map(d => d.percent_b).filter(v => v !== null && v !== 0)
          const historicalMaGapValues = historicalData.map(d => d.ma_gap).filter(v => v !== null)

          if (historicalRsiValues.length >= 45) {
            rsiZ = calculateZScore(rsi, historicalRsiValues)
          }

          if (historicalPercentBValues.length >= 45) {
            percentBZ = calculateZScore(percentB, historicalPercentBValues)
          }

          if (historicalMaGapValues.length >= 45 && maGap !== 0) {
            maGapZ = calculateZScore(maGap, historicalMaGapValues)
          }

          console.log(`${etf.symbol}: Using ${historicalData.length} days of historical data for z-scores`)
        } else {
          console.log(`${etf.symbol}: Insufficient historical data (${historicalData?.length || 0} days, need 45+). Z-scores set to 0.`)
        }

        // Determine signal based on RSI and %B
        let signal = 'HOLD'
        if (rsi < 30 && percentB < 20) signal = 'BUY'
        else if (rsi > 70 && percentB > 80) signal = 'SELL'

        // Calculate 1-day price change
        const change1Day = prices.length >= 2
          ? ((prices[prices.length - 1] - prices[prices.length - 2]) / prices[prices.length - 2]) * 100
          : 0

        // Calculate 5-day price change
        const change5Day = prices.length >= 5
          ? ((prices[prices.length - 1] - prices[prices.length - 5]) / prices[prices.length - 5]) * 100
          : 0

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

        // Store in Supabase
        await supabase.from('etf_metrics').insert(metric)

        // Small delay to respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 8000)) // 8 req/min = 7.5s between requests
      } catch (error) {
        console.error(`Error processing ${etf.symbol}:`, error)
      }
    }

    return NextResponse.json({
      metrics: etfMetrics,
      timestamp: new Date().toISOString(),
      count: etfMetrics.length,
    })
  } catch (error: any) {
    console.error('ETF metrics error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch ETF metrics' },
      { status: 500 }
    )
  }
}
