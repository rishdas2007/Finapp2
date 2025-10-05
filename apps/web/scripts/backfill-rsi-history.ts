/**
 * Backfill RSI Historical Data Script
 *
 * This script fetches 250 days of historical price data for each ETF
 * and calculates RSI, %B, and MA Gap indicators for storage in the database.
 *
 * Usage: npx tsx scripts/backfill-rsi-history.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

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

// Calculate RSI (copied from daily-update route for consistency)
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

// Calculate Bollinger Bands %B (copied from daily-update route for consistency)
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

// Calculate MA Gap (copied from daily-update route for consistency)
function calculateMAGap(prices: number[], shortPeriod: number = 50, longPeriod: number = 200): number {
  if (prices.length < longPeriod) return 0

  const shortMA = prices.slice(-shortPeriod).reduce((a, b) => a + b, 0) / shortPeriod
  const longMA = prices.slice(-longPeriod).reduce((a, b) => a + b, 0) / longPeriod

  return ((shortMA - longMA) / longMA) * 100
}

async function backfillETFIndicators() {
  const apiKey = process.env.TWELVE_DATA_API_KEY

  if (!apiKey) {
    console.error('❌ TWELVE_DATA_API_KEY is not configured in .env.local')
    process.exit(1)
  }

  console.log('🚀 Starting ETF indicator history backfill...\n')
  console.log(`📊 Processing ${ETF_SYMBOLS.length} ETF symbols`)
  console.log(`📅 Fetching 250 days of historical data per symbol\n`)

  let totalProcessed = 0
  let totalIndicators = 0

  for (const etf of ETF_SYMBOLS) {
    try {
      console.log(`\n📈 Processing ${etf.symbol} (${etf.name})...`)

      // Fetch 250 days of historical data from Twelve Data
      const response = await fetch(
        `https://api.twelvedata.com/time_series?symbol=${etf.symbol}&interval=1day&outputsize=250&apikey=${apiKey}`
      )
      const data = await response.json()

      if (data.status === 'error') {
        console.error(`   ❌ Error: ${data.message}`)
        continue
      }

      if (!data.values || data.values.length === 0) {
        console.error(`   ❌ No data available`)
        continue
      }

      console.log(`   ✓ Fetched ${data.values.length} days of price data`)

      // Extract prices, dates, and volumes (newest first from API)
      const pricesNewestFirst = data.values.map((v: any) => parseFloat(v.close))
      const datesNewestFirst = data.values.map((v: any) => v.datetime)
      const volumesNewestFirst = data.values.map((v: any) => parseInt(v.volume) || 0)

      // Reverse to get oldest-first for calculations
      const prices = pricesNewestFirst.slice().reverse()
      const dates = datesNewestFirst.slice().reverse()
      const volumes = volumesNewestFirst.slice().reverse()

      // Calculate indicators for each day (starting from day 200 to have enough data for MA)
      const indicators = []

      for (let i = 0; i < dates.length; i++) {
        // We need at least 15 days for RSI (14 + 1)
        if (i < 14) continue

        const pricesUpToDay = prices.slice(0, i + 1)
        const rsi = calculateRSI(pricesUpToDay)
        const percentB = calculatePercentB(pricesUpToDay)
        const maGap = pricesUpToDay.length >= 200 ? calculateMAGap(pricesUpToDay) : 0

        indicators.push({
          symbol: etf.symbol,
          date: dates[i],
          rsi,
          percent_b: percentB,
          ma_gap: maGap,
          close_price: prices[i],
          volume: volumes[i],
        })
      }

      console.log(`   ✓ Calculated indicators for ${indicators.length} days`)

      // Upsert to database in batches of 50
      const batchSize = 50
      for (let i = 0; i < indicators.length; i += batchSize) {
        const batch = indicators.slice(i, i + batchSize)

        const { error } = await supabase
          .from('etf_indicator_history')
          .upsert(batch, {
            onConflict: 'symbol,date',
            ignoreDuplicates: false,
          })

        if (error) {
          console.error(`   ❌ Database error:`, error.message)
          throw error
        }
      }

      console.log(`   ✅ Successfully stored ${indicators.length} indicator records`)

      totalProcessed++
      totalIndicators += indicators.length

      // Rate limiting: wait 5 seconds between symbols to respect API limits
      // Twelve Data free tier: 8 calls/min, we're making 1 call per symbol
      if (totalProcessed < ETF_SYMBOLS.length) {
        console.log(`   ⏳ Waiting 8 seconds before next symbol...`)
        await new Promise(resolve => setTimeout(resolve, 8000))
      }

    } catch (error: any) {
      console.error(`   ❌ Error processing ${etf.symbol}:`, error.message)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log(`✅ Backfill complete!`)
  console.log(`   • Symbols processed: ${totalProcessed}/${ETF_SYMBOLS.length}`)
  console.log(`   • Total indicators stored: ${totalIndicators}`)
  console.log('='.repeat(60) + '\n')
}

// Run the backfill
backfillETFIndicators()
  .then(() => {
    console.log('🎉 Script completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Script failed:', error)
    process.exit(1)
  })
