import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * Get latest economic indicators
 * Supports filtering by category and timing
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') // Growth, Inflation, Labor, Sentiment
    const timing = searchParams.get('timing') // Leading, Coincident, Lagging

    let query = supabase
      .from('economic_indicators')
      .select('*')

    if (category) {
      query = query.eq('category', category)
    }

    if (timing) {
      query = query.eq('timing', timing)
    }

    const { data, error } = await query.order('category').order('timing').order('indicator_name')

    if (error) {
      throw error
    }

    // Group by category and timing
    const grouped = data?.reduce((acc: any, indicator) => {
      if (!acc[indicator.category]) {
        acc[indicator.category] = {
          Leading: [],
          Coincident: [],
          Lagging: []
        }
      }
      acc[indicator.category][indicator.timing].push(indicator)
      return acc
    }, {})

    return NextResponse.json({
      indicators: data,
      grouped,
      count: data?.length || 0,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Error fetching indicators:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch economic indicators',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
