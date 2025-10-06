import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ECONOMIC_INDICATORS } from '@/config/economic-indicators'
import { fetchFREDSeries } from '@/lib/fred-api'

// Helper function to map presentation format to FRED units parameter
function getUnitsParameter(presentationFormat: string): string {
  if (presentationFormat === 'yoy_pct_change') {
    return 'pc1' // Percent Change from 1 Year Ago
  }
  if (presentationFormat === 'mom_pct_change') {
    return 'pch' // Percent Change
  }
  return 'lin' // Linear (no transformation)
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * GET /api/indicators/[seriesId]/history
 * Fetch historical data for a specific economic indicator
 *
 * Query params:
 * - months: number of months of history to fetch (default: 24)
 * - includeStats: whether to include statistical analysis (default: true)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { seriesId: string } }
) {
  try {
    const { seriesId } = params
    const searchParams = request.nextUrl.searchParams
    const months = parseInt(searchParams.get('months') || '24')
    const includeStats = searchParams.get('includeStats') !== 'false'

    // Fetch current indicator info
    const { data: indicator, error: indicatorError } = await supabase
      .from('economic_indicators')
      .select('*')
      .eq('series_id', seriesId)
      .single()

    if (indicatorError || !indicator) {
      return NextResponse.json(
        { error: 'Indicator not found' },
        { status: 404 }
      )
    }

    // Find indicator configuration to get presentation format
    const indicatorConfig = ECONOMIC_INDICATORS.find(i => i.seriesId === seriesId)
    if (!indicatorConfig) {
      return NextResponse.json(
        { error: 'Indicator configuration not found' },
        { status: 404 }
      )
    }

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - months)

    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]

    // Fetch historical data directly from FRED with correct units parameter
    const units = getUnitsParameter(indicatorConfig.presentationFormat)
    const observations = await fetchFREDSeries(seriesId, startDateStr, endDateStr, units)

    if (!observations || observations.length === 0) {
      return NextResponse.json(
        { error: 'Failed to fetch historical data from FRED' },
        { status: 500 }
      )
    }

    // Format observations for history
    const history = observations.map(obs => ({
      date: obs.date,
      value: parseFloat(obs.value)
    })).reverse() // Reverse to get chronological order (fetchFREDSeries returns desc)

    // Calculate statistics if requested
    let stats = null
    if (includeStats && history && history.length > 0) {
      const values = history.map(h => h.value)
      const sortedValues = [...values].sort((a, b) => a - b)

      const mean = values.reduce((sum, v) => sum + v, 0) / values.length
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
      const stdDev = Math.sqrt(variance)

      stats = {
        mean: parseFloat(mean.toFixed(4)),
        median: sortedValues[Math.floor(sortedValues.length / 2)],
        stdDev: parseFloat(stdDev.toFixed(4)),
        min: Math.min(...values),
        max: Math.max(...values),
        percentile_25: sortedValues[Math.floor(sortedValues.length * 0.25)],
        percentile_75: sortedValues[Math.floor(sortedValues.length * 0.75)],
        current: indicator.value,
        currentZScore: stdDev > 0 ? (indicator.value - mean) / stdDev : 0,
        count: values.length
      }
    }

    // Fetch related indicators (by correlation)
    const { data: correlations } = await supabase
      .from('indicator_correlations')
      .select('indicator_a, indicator_b, correlation_coefficient, lag_months')
      .or(`indicator_a.eq.${seriesId},indicator_b.eq.${seriesId}`)
      .order('correlation_coefficient', { ascending: false })
      .limit(5)

    const relatedIndicators = []
    if (correlations) {
      for (const corr of correlations) {
        const relatedId = corr.indicator_a === seriesId ? corr.indicator_b : corr.indicator_a
        const { data: related } = await supabase
          .from('economic_indicators')
          .select('series_id, indicator_name, category, value, signal')
          .eq('series_id', relatedId)
          .single()

        if (related) {
          relatedIndicators.push({
            ...related,
            correlation: corr.correlation_coefficient,
            lag_months: corr.lag_months
          })
        }
      }
    }

    return NextResponse.json({
      indicator: {
        series_id: indicator.series_id,
        indicator_name: indicator.indicator_name,
        category: indicator.category,
        timing: indicator.timing,
        frequency: indicator.frequency,
        unit: indicator.unit,
        description: indicator.description,
        current_value: indicator.value,
        current_date: indicator.date,
        signal: indicator.signal,
        trend: indicator.trend,
        z_score: indicator.z_score
      },
      history: history || [],
      statistics: stats,
      relatedIndicators,
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
        months
      },
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Error in indicator history API:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
