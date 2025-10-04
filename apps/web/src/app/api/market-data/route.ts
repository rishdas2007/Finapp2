import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const symbol = searchParams.get('symbol') || 'SPY'
    const apiKey = process.env.TWELVE_DATA_API_KEY

    if (!apiKey) {
      throw new Error('TWELVE_DATA_API_KEY is not configured')
    }

    // Get quote data from Twelve Data API
    const quoteResponse = await fetch(
      `https://api.twelvedata.com/quote?symbol=${symbol}&apikey=${apiKey}`
    )
    const quote = await quoteResponse.json()

    if (quote.status === 'error') {
      throw new Error(quote.message || 'Failed to fetch quote data')
    }

    return NextResponse.json({
      quote,
      symbol,
    })
  } catch (error: any) {
    console.error('Market data error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch market data' },
      { status: 500 }
    )
  }
}
