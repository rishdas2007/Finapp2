import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  calculateReturns,
  calculateMomentumScore,
  determineTrend,
  calculatePercentileRank,
  calculateVsSpyExcess,
  type RelativeStrengthScore
} from '@/lib/relative-strength'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const ETF_NAMES: Record<string, string> = {
  SPY: 'S&P 500',
  XLP: 'Consumer Staples',
  XLK: 'Technology',
  XLI: 'Industrials',
  XLF: 'Financials',
  XLE: 'Energy',
  XLC: 'Communications',
  XLB: 'Materials',
  XLY: 'Consumer Discretionary',
  XLV: 'Healthcare',
  XLU: 'Utilities',
  XLRE: 'Real Estate'
}

/**
 * GET /api/market-analysis/relative-strength
 * Calculate relative strength rankings for all ETFs
 */
export async function GET() {
  try {
    const symbols = Object.keys(ETF_NAMES)

    // Fetch price history for all ETFs (last 180 days)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 200) // Extra buffer for trading days

    const priceHistoryPromises = symbols.map(async symbol => {
      const { data, error } = await supabase
        .from('etf_price_history')
        .select('date, price, symbol')
        .eq('symbol', symbol)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: true })

      if (error) {
        console.error(`Error fetching history for ${symbol}:`, error)
        return { symbol, prices: [] }
      }

      return {
        symbol,
        prices: data?.map(d => ({ date: d.date, price: d.price })) || []
      }
    })

    const priceHistories = await Promise.all(priceHistoryPromises)

    // Calculate returns and momentum for each ETF
    const etfScores: RelativeStrengthScore[] = []
    let spyReturns: ReturnType<typeof calculateReturns> | null = null

    for (const { symbol, prices } of priceHistories) {
      if (prices.length === 0) {
        console.warn(`No price history for ${symbol}`)
        continue
      }

      const currentPrice = prices[prices.length - 1].price
      const returns = calculateReturns(prices, currentPrice)
      const momentumScore = calculateMomentumScore(returns)
      const trend = determineTrend(returns)

      // Store SPY returns for excess return calculations
      if (symbol === 'SPY') {
        spyReturns = returns
      }

      etfScores.push({
        symbol,
        name: ETF_NAMES[symbol] || symbol,
        returns,
        momentumScore,
        percentileRank: 0, // Will be calculated after all scores are collected
        trend,
        vsSpyExcess: {
          oneWeek: null,
          oneMonth: null,
          threeMonth: null,
          sixMonth: null
        },
        rank: 0
      })
    }

    // Calculate percentile ranks
    const allScores = etfScores.map(e => e.momentumScore)
    etfScores.forEach(etf => {
      etf.percentileRank = calculatePercentileRank(etf.momentumScore, allScores)
    })

    // Calculate vs SPY excess returns
    if (spyReturns) {
      etfScores.forEach(etf => {
        etf.vsSpyExcess = calculateVsSpyExcess(etf.returns, spyReturns!)
      })
    }

    // Sort by momentum score and assign ranks
    etfScores.sort((a, b) => b.momentumScore - a.momentumScore)
    etfScores.forEach((etf, index) => {
      etf.rank = index + 1
    })

    // Identify rotation signals
    const rotationSignals: Array<{ from: string; to: string; strength: string }> = []

    const topPerformers = etfScores.slice(0, 3)
    const bottomPerformers = etfScores.slice(-3).reverse()

    // Check for significant momentum divergence
    if (topPerformers.length > 0 && bottomPerformers.length > 0) {
      const topMomentum = topPerformers[0].momentumScore
      const bottomMomentum = bottomPerformers[0].momentumScore

      if (topMomentum - bottomMomentum > 5) { // >5% difference
        rotationSignals.push({
          from: bottomPerformers[0].symbol,
          to: topPerformers[0].symbol,
          strength: 'strong'
        })
      }
    }

    return NextResponse.json({
      rankings: etfScores,
      summary: {
        topPerformers: topPerformers.map(e => ({
          symbol: e.symbol,
          name: e.name,
          momentumScore: e.momentumScore,
          trend: e.trend
        })),
        bottomPerformers: bottomPerformers.map(e => ({
          symbol: e.symbol,
          name: e.name,
          momentumScore: e.momentumScore,
          trend: e.trend
        })),
        rotationSignals
      },
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Error in relative strength analysis:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
