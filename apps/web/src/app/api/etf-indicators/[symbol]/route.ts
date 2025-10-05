import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface RouteContext {
  params: {
    symbol: string
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { params } = context
    const symbol = params.symbol.toUpperCase()
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '90', 10)

    // Validate days parameter
    if (isNaN(days) || days < 1 || days > 365) {
      return NextResponse.json(
        { error: 'Invalid days parameter. Must be between 1 and 365.' },
        { status: 400 }
      )
    }

    // Query indicator history from Supabase
    const { data: indicators, error } = await supabase
      .from('etf_indicator_history')
      .select('date, rsi, percent_b, ma_gap, close_price, volume')
      .eq('symbol', symbol)
      .gte('date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date', { ascending: true })

    if (error) {
      console.error('Error fetching indicator history:', error)
      return NextResponse.json(
        { error: 'Failed to fetch indicator history', message: error.message },
        { status: 500 }
      )
    }

    if (!indicators || indicators.length === 0) {
      return NextResponse.json({
        symbol,
        indicators: [],
        message: 'No indicator data available for this symbol and timeframe',
      })
    }

    // Format the response
    const formattedIndicators = indicators.map(ind => ({
      date: ind.date,
      rsi: ind.rsi ? parseFloat(ind.rsi.toString()) : null,
      percent_b: ind.percent_b ? parseFloat(ind.percent_b.toString()) : null,
      ma_gap: ind.ma_gap ? parseFloat(ind.ma_gap.toString()) : null,
      close_price: ind.close_price ? parseFloat(ind.close_price.toString()) : null,
      volume: ind.volume || null,
    }))

    return NextResponse.json({
      symbol,
      indicators: formattedIndicators,
      count: formattedIndicators.length,
      days_requested: days,
    })
  } catch (error: any) {
    console.error('ETF indicators API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}
