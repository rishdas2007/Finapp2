import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ECONOMIC_INDICATORS } from '@/config/economic-indicators'
import {
  processFREDData,
  determineSignal,
  determineTrend,
  calculateZScore
} from '@/lib/fred-api'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * Backfill endpoint - Populates all 54 indicators with historical data
 * Run this ONCE to initialize the database
 * Duration: ~5-10 minutes due to API rate limiting
 */
export async function GET(request: NextRequest) {
  try {
    const results: any[] = []
    const errors: any[] = []
    let processed = 0

    console.log(`Starting backfill of ${ECONOMIC_INDICATORS.length} economic indicators...`)

    for (const indicator of ECONOMIC_INDICATORS) {
      try {
        console.log(`Processing ${indicator.seriesId}: ${indicator.name}...`)

        // Fetch and process data from FRED
        const data = await processFREDData(
          indicator.seriesId,
          indicator.presentationFormat,
          indicator.frequency
        )

        // Calculate z-score from historical values
        const zScore = calculateZScore(
          data.value,
          data.historicalValues.map(h => h.value)
        )

        // Determine signal and trend
        const signal = determineSignal(
          data.value,
          data.yoyChange,
          indicator.name,
          indicator.presentationFormat
        )

        const trend = determineTrend(data.momChange, data.yoyChange)

        // Store main indicator
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
          console.error(`Error storing ${indicator.seriesId}:`, indicatorError)
          errors.push({
            seriesId: indicator.seriesId,
            name: indicator.name,
            error: indicatorError.message
          })
          continue
        }

        // Store historical data (last 90 observations for z-score calculations)
        const historicalRecords = data.historicalValues.map(h => ({
          series_id: indicator.seriesId,
          date: h.date,
          value: h.value
        }))

        const { error: historyError } = await supabase
          .from('economic_indicator_history')
          .upsert(historicalRecords, {
            onConflict: 'series_id,date',
            ignoreDuplicates: true
          })

        if (historyError) {
          console.error(`Error storing history for ${indicator.seriesId}:`, historyError)
        }

        processed++
        results.push({
          seriesId: indicator.seriesId,
          name: indicator.name,
          date: data.date,
          value: data.value,
          yoyChange: data.yoyChange,
          signal,
          trend,
          zScore,
          historicalCount: data.historicalValues.length
        })

        console.log(`✓ ${indicator.seriesId} complete (${processed}/${ECONOMIC_INDICATORS.length})`)

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
      message: `Backfill complete: ${processed}/${ECONOMIC_INDICATORS.length} indicators`,
      processed,
      total: ECONOMIC_INDICATORS.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Backfill error:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to backfill economic indicators',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
