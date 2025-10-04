import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  try {
    // Get latest metrics for each symbol
    const { data, error } = await supabase
      .from('etf_metrics')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) throw error

    // Group by symbol and get the most recent
    const latestMetrics = new Map()
    data?.forEach((metric: any) => {
      if (!latestMetrics.has(metric.symbol)) {
        latestMetrics.set(metric.symbol, metric)
      }
    })

    const metrics = Array.from(latestMetrics.values())

    // Check if data is stale (older than 1 hour)
    const isStale = metrics.length === 0 ||
      (metrics[0] && new Date().getTime() - new Date(metrics[0].updated_at).getTime() > 3600000)

    return NextResponse.json({
      metrics,
      isStale,
      timestamp: new Date().toISOString(),
      count: metrics.length,
    })
  } catch (error: any) {
    console.error('Error fetching latest ETF metrics:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch ETF metrics' },
      { status: 500 }
    )
  }
}
