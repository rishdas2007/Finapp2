import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ECONOMIC_INDICATORS } from '@/config/economic-indicators'
import {
  processFREDData,
  determineSignal,
  determineTrend,
  calculateZScore,
  fetchFREDSeries
} from '@/lib/fred-api'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * Daily update endpoint - Updates all 54 indicators with latest data
 * Run this via cron job daily
 * Duration: ~30 seconds with rate limiting
 */
export async function GET(request: NextRequest) {
  try {
    const results: any[] = []
    const errors: any[] = []
    let updated = 0

    console.log(`Starting daily update of ${ECONOMIC_INDICATORS.length} economic indicators...`)

    for (const indicator of ECONOMIC_INDICATORS) {
      try {
        // Fetch latest data from FRED
        const data = await processFREDData(
          indicator.seriesId,
          indicator.presentationFormat,
          indicator.frequency
        )

        // Get historical data from database for z-score
        const { data: historicalData } = await supabase
          .from('economic_indicator_history')
          .select('value')
          .eq('series_id', indicator.seriesId)
          .order('date', { ascending: false })
          .limit(90)

        const historicalValues = historicalData?.map(h => h.value) || []

        // Calculate z-score
        const zScore = historicalValues.length >= 10
          ? calculateZScore(data.value, historicalValues)
          : 0

        // Determine signal and trend
        const signal = determineSignal(
          data.value,
          data.yoyChange,
          indicator.name,
          indicator.presentationFormat
        )

        const trend = determineTrend(data.momChange, data.yoyChange)

        // Update main indicator
        const { error: indicatorError } = await supabase
          .from('economic_indicators')
          .upsert({
            series_id: indicator.seriesId,
            indicator_name: indicator.name,
            category: indicator.category,
            timing: indicator.timing,
            frequency: indicator.frequency,
            presentation_format: indicator.presentationFormat,
            unit: indicator.unit,
            date: data.date,
            value: data.value,
            prior_value: data.priorValue,
            yoy_change: data.yoyChange,
            mom_change: data.momChange,
            signal,
            trend,
            z_score: zScore,
            description: indicator.description,
            last_updated: new Date().toISOString()
          }, {
            onConflict: 'series_id',
            ignoreDuplicates: false
          })

        if (indicatorError) {
          console.error(`Error updating ${indicator.seriesId}:`, indicatorError)
          errors.push({
            seriesId: indicator.seriesId,
            name: indicator.name,
            error: indicatorError.message
          })
          continue
        }

        // Store today's value in history
        await supabase
          .from('economic_indicator_history')
          .upsert({
            series_id: indicator.seriesId,
            date: data.date,
            value: data.value
          }, {
            onConflict: 'series_id,date',
            ignoreDuplicates: true
          })

        updated++
        results.push({
          seriesId: indicator.seriesId,
          name: indicator.name,
          date: data.date,
          value: data.value,
          signal,
          trend,
          zScore
        })

        // Rate limiting: 120 req/min = ~500ms between requests
        await new Promise(resolve => setTimeout(resolve, 500))

      } catch (error: any) {
        console.error(`Error processing ${indicator.seriesId}:`, error)
        errors.push({
          seriesId: indicator.seriesId,
          name: indicator.name,
          error: error.message
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Daily update complete: ${updated}/${ECONOMIC_INDICATORS.length} indicators`,
      updated,
      total: ECONOMIC_INDICATORS.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Update error:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to update economic indicators',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
