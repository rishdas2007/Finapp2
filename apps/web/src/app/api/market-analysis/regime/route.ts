import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { classifyRegime, getSectorRecommendations, getRegimeMetadata, type RegimeIndicators } from '@/lib/economic-regime'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * GET /api/market-analysis/regime
 * Get current economic regime classification and sector recommendations
 */
export async function GET() {
  try {
    // Fetch key economic indicators from database
    const indicatorIds = [
      'A191RL1Q225SBEA', // Real GDP Growth
      'CPIAUCSL',         // CPI (Headline) - YoY
      'UNRATE',           // Unemployment Rate
      'T10Y3M',           // 10Y-3M Treasury Spread
      'FEDFUNDS',         // Federal Funds Rate
      'NAPM'              // ISM Manufacturing PMI
    ]

    const { data: indicators, error: indicatorError } = await supabase
      .from('economic_indicators')
      .select('series_id, value, date')
      .in('series_id', indicatorIds)

    if (indicatorError) {
      console.error('Error fetching indicators:', indicatorError)
      return NextResponse.json(
        { error: 'Failed to fetch economic indicators' },
        { status: 500 }
      )
    }

    // Map indicators to RegimeIndicators format
    const regimeIndicators: RegimeIndicators = {
      gdpGrowth: null,
      inflation: null,
      unemployment: null,
      yieldCurve: null,
      fedFunds: null,
      ism: null
    }

    indicators?.forEach(ind => {
      switch (ind.series_id) {
        case 'A191RL1Q225SBEA':
          regimeIndicators.gdpGrowth = ind.value
          break
        case 'CPIAUCSL':
          regimeIndicators.inflation = ind.value
          break
        case 'UNRATE':
          regimeIndicators.unemployment = ind.value
          break
        case 'T10Y3M':
          regimeIndicators.yieldCurve = ind.value
          break
        case 'FEDFUNDS':
          regimeIndicators.fedFunds = ind.value
          break
        case 'NAPM':
          regimeIndicators.ism = ind.value
          break
      }
    })

    // Classify regime
    const classification = classifyRegime(regimeIndicators)

    // Get ETF performance data for sector recommendations
    const { data: etfMetrics, error: etfError } = await supabase
      .from('etf_metrics')
      .select('symbol, change_5day, change_1day')
      .order('symbol', { ascending: true })

    if (etfError) {
      console.error('Error fetching ETF metrics:', etfError)
    }

    const etfPerformance = etfMetrics?.map(e => ({
      symbol: e.symbol,
      change5Day: e.change_5day,
      change30Day: undefined // Could add if we have 30-day data
    })) || []

    // Get sector recommendations
    const recommendations = getSectorRecommendations(classification.regime, etfPerformance)

    // Get regime metadata
    const metadata = getRegimeMetadata(classification.regime)

    // Calculate regime duration by checking historical data
    // For now, set to 0 (would need historical regime tracking)
    const duration = 0

    return NextResponse.json({
      classification: {
        ...classification,
        duration,
        metadata
      },
      recommendations,
      dataQuality: {
        indicatorsAvailable: Object.values(regimeIndicators).filter(v => v !== null).length,
        totalIndicators: 6,
        lastUpdated: indicators?.[0]?.date || null
      },
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Error in regime analysis:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
