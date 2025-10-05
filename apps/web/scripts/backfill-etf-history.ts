#!/usr/bin/env tsx

/**
 * Backfill script for ETF price history
 *
 * This script fetches historical price data for all ETFs from Yahoo Finance
 * and stores it in the Supabase database for caching.
 */

import { createClient } from '@supabase/supabase-js'

// ETF symbols to backfill
const ETF_SYMBOLS = [
  'XLP',  // Consumer Staples
  'XLK',  // Technology
  'XLI',  // Industrials
  'XLF',  // Financials
  'XLE',  // Energy
  'XLC',  // Communication Services
  'XLB',  // Materials
  'SPY',  // S&P 500
  'XLY',  // Consumer Discretionary
  'XLV',  // Healthcare
  'XLU',  // Utilities
  'XLRE', // Real Estate
]

// Timeframes to backfill (in days)
const TIMEFRAMES = [365] // 1 year of daily data

interface PriceDataPoint {
  symbol: string
  date: string
  price: number
  volume: number
}

// Initialize Supabase client with service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fetchYahooFinanceData(symbol: string, days: number): Promise<PriceDataPoint[]> {
  const endDate = Math.floor(Date.now() / 1000)
  const startDate = Math.floor((Date.now() - (days * 24 * 60 * 60 * 1000)) / 1000)

  const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${startDate}&period2=${endDate}&interval=1d`

  try {
    const response = await fetch(yahooUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status}`)
    }

    const data = await response.json()

    if (!data.chart?.result?.[0]) {
      throw new Error('Invalid response from Yahoo Finance')
    }

    const result = data.chart.result[0]
    const timestamps = result.timestamp
    const prices = result.indicators.quote[0].close
    const volumes = result.indicators.quote[0].volume

    if (!timestamps || !prices) {
      throw new Error('No price data available')
    }

    const priceData: PriceDataPoint[] = timestamps
      .map((timestamp: number, index: number) => ({
        symbol,
        date: new Date(timestamp * 1000).toISOString().split('T')[0],
        price: prices[index] ? parseFloat(prices[index].toFixed(4)) : null,
        volume: volumes[index] || 0,
      }))
      .filter((item: any) => item.price !== null)

    return priceData
  } catch (error) {
    console.error(`Error fetching data for ${symbol}:`, error)
    throw error
  }
}

async function storePriceData(priceData: PriceDataPoint[]): Promise<void> {
  const { error } = await supabase
    .from('etf_price_history')
    .upsert(priceData, {
      onConflict: 'symbol,date',
      ignoreDuplicates: false,
    })

  if (error) {
    throw error
  }
}

async function backfillSymbol(symbol: string, days: number): Promise<void> {
  console.log(`\n📊 Backfilling ${symbol} (${days} days)...`)

  try {
    // Fetch data from Yahoo Finance
    const priceData = await fetchYahooFinanceData(symbol, days)
    console.log(`✓ Fetched ${priceData.length} data points from Yahoo Finance`)

    // Store in database
    await storePriceData(priceData)
    console.log(`✓ Stored ${priceData.length} records in database`)

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500))
  } catch (error) {
    console.error(`✗ Failed to backfill ${symbol}:`, error)
  }
}

async function main() {
  console.log('🚀 Starting ETF price history backfill...')
  console.log(`📈 Symbols: ${ETF_SYMBOLS.join(', ')}`)
  console.log(`📅 Timeframe: ${TIMEFRAMES[0]} days\n`)

  let successCount = 0
  let failureCount = 0

  for (const symbol of ETF_SYMBOLS) {
    for (const days of TIMEFRAMES) {
      try {
        await backfillSymbol(symbol, days)
        successCount++
      } catch (error) {
        failureCount++
      }
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log('✅ Backfill complete!')
  console.log(`   Success: ${successCount}`)
  console.log(`   Failures: ${failureCount}`)
  console.log('='.repeat(50))
}

// Run the backfill
main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
