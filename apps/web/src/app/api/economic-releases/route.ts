import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const ECONOMIC_INDICATORS = [
  { id: 'PCE', name: 'Personal Consumption Expenditures', category: 'Consumption', frequency: 'Monthly', units: 'pc1' },
  { id: 'FEDFUNDS', name: 'Federal Funds Rate', category: 'Finance', frequency: 'Monthly', units: 'lin' },
  { id: 'PCEPILFE', name: 'PCE Price Index', category: 'Inflation', frequency: 'Monthly', units: 'pc1' },
  { id: 'CPIAUCSL', name: 'Consumer Price Index', category: 'Inflation', frequency: 'Monthly', units: 'pc1' },
  { id: 'UNRATE', name: 'Unemployment Rate', category: 'Labor', frequency: 'Monthly', units: 'lin' },
  { id: 'PAYEMS', name: 'Nonfarm Payrolls', category: 'Labor', frequency: 'Monthly', units: 'pc1' },
  { id: 'INDPRO', name: 'Industrial Production Index', category: 'Growth', frequency: 'Monthly', units: 'pc1' },
  { id: 'HOUST', name: 'Housing Starts', category: 'Housing', frequency: 'Monthly', units: 'pc1' },
  { id: 'GDPC1', name: 'Real GDP', category: 'Growth', frequency: 'Quarterly', units: 'lin' },
  { id: 'GDP', name: 'Gross Domestic Product', category: 'Growth', frequency: 'Quarterly', units: 'lin' },
]

function determineSignal(current: number, prior: number, seriesId: string): string {
  const change = current - prior
  const changePercent = (change / prior) * 100

  // Unemployment and inflation going down is bullish
  if (['UNRATE', 'CPIAUCSL', 'PCEPILFE'].includes(seriesId)) {
    if (changePercent < -0.5) return 'Bullish'
    if (changePercent > 0.5) return 'Bearish'
  }
  // GDP, employment, housing going up is bullish
  else if (['GDP', 'GDPC1', 'PAYEMS', 'HOUST', 'INDPRO'].includes(seriesId)) {
    if (changePercent > 0.5) return 'Bullish'
    if (changePercent < -0.5) return 'Bearish'
  }

  return 'Neutral'
}

function determineTrend(current: number, prior: number): string {
  const change = current - prior
  if (change > 0.01) return 'up'
  if (change < -0.01) return 'down'
  return 'stable'
}

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.FRED_API_KEY

    if (!apiKey) {
      throw new Error('FRED_API_KEY is not configured')
    }

    const releases = []

    for (const indicator of ECONOMIC_INDICATORS) {
      try {
        // Fetch latest 2 observations to compare
        // Use units transformation for appropriate indicators (pc1 = Percent Change from Year Ago)
        const response = await fetch(
          `https://api.stlouisfed.org/fred/series/observations?series_id=${indicator.id}&api_key=${apiKey}&file_type=json&limit=2&sort_order=desc&units=${indicator.units}`
        )
        const result = await response.json()

        if (!result.observations || result.observations.length === 0) {
          console.error(`No data for ${indicator.id}`)
          continue
        }

        const observations = result.observations.reverse() // Oldest first
        const latest = observations[observations.length - 1]
        const prior = observations.length > 1 ? observations[observations.length - 2] : latest

        const currentValue = parseFloat(latest.value)
        const priorValue = parseFloat(prior.value)

        if (isNaN(currentValue) || isNaN(priorValue)) {
          console.error(`Invalid data for ${indicator.id}`)
          continue
        }

        const signal = determineSignal(currentValue, priorValue, indicator.id)
        const trend = determineTrend(currentValue, priorValue)

        // Determine unit based on series
        let unit = 'Percent'
        let actualValueFormatted = `${currentValue.toFixed(2)}%`
        let priorValueFormatted = `${priorValue.toFixed(2)}%`

        if (['PAYEMS', 'HOUST'].includes(indicator.id)) {
          unit = 'Thousands'
          const currentInThousands = Math.round(currentValue / 1000)
          const priorInThousands = Math.round(priorValue / 1000)
          actualValueFormatted = `${currentInThousands}K`
          priorValueFormatted = `${priorInThousands}K`
        } else if (['GDP', 'GDPC1'].includes(indicator.id)) {
          actualValueFormatted = `${currentValue.toFixed(2)}%`
          priorValueFormatted = priorValue ? `${priorValue.toFixed(2)}%` : 'N/A'
        }

        const release = {
          release_date: latest.date,
          frequency: indicator.frequency,
          metric_name: indicator.name,
          series_id: indicator.id,
          category: indicator.category,
          actual_value: actualValueFormatted,
          prior_reading: priorValueFormatted,
          signal,
          trend,
          description: `Percent Change from ${indicator.frequency === 'Quarterly' ? 'Previous Quarter' : 'Previous Month'}${
            ['CPIAUCSL', 'PCEPILFE', 'INDPRO'].includes(indicator.id) ? ', Seasonally Adjusted' : ''
          }`,
          unit,
        }

        releases.push(release)

        // Store in Supabase
        await supabase
          .from('economic_releases')
          .upsert(release, {
            onConflict: 'series_id,release_date',
          })

        // Respect FRED API rate limits (120/min)
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (error) {
        console.error(`Error processing ${indicator.id}:`, error)
      }
    }

    return NextResponse.json({
      releases,
      timestamp: new Date().toISOString(),
      count: releases.length,
    })
  } catch (error: any) {
    console.error('Economic releases error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch economic releases' },
      { status: 500 }
    )
  }
}
