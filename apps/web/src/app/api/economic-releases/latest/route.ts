import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const monthsBack = parseInt(searchParams.get('months') || '6')
    const category = searchParams.get('category')

    // Calculate date threshold
    const dateThreshold = new Date()
    dateThreshold.setMonth(dateThreshold.getMonth() - monthsBack)

    let query = supabase
      .from('economic_releases')
      .select('*')
      .gte('release_date', dateThreshold.toISOString().split('T')[0])
      .order('release_date', { ascending: false })

    if (category && category !== 'All Categories') {
      query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error) throw error

    // Check if data is stale (no data or older than 24 hours)
    const isStale = !data || data.length === 0 ||
      (data[0] && new Date().getTime() - new Date(data[0].updated_at || data[0].created_at).getTime() > 86400000)

    return NextResponse.json({
      releases: data || [],
      isStale,
      timestamp: new Date().toISOString(),
      count: data?.length || 0,
    })
  } catch (error: any) {
    console.error('Error fetching economic releases:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch economic releases' },
      { status: 500 }
    )
  }
}
