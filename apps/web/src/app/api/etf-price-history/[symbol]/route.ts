import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  try {
    const { symbol } = params
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')

    // Calculate start date based on days parameter
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Determine interval based on timeframe
    let interval = '1day'
    if (days <= 7) {
      interval = '1hour'
    } else if (days <= 30) {
      interval = '1day'
    } else if (days <= 90) {
      interval = '1day'
    } else {
      interval = '1day'
    }

    // Fetch data from Polygon.io or Alpha Vantage
    const apiKey = process.env.POLYGON_API_KEY || process.env.ALPHA_VANTAGE_API_KEY

    if (!apiKey) {
      // Return mock data for development
      const mockData = generateMockPriceData(symbol, days)
      return NextResponse.json(mockData)
    }

    // For now, return mock data
    // TODO: Integrate with actual API when keys are available
    const mockData = generateMockPriceData(symbol, days)
    return NextResponse.json(mockData)

  } catch (error) {
    console.error('Error fetching ETF price history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch price history' },
      { status: 500 }
    )
  }
}

// Generate realistic mock price data for development
function generateMockPriceData(symbol: string, days: number) {
  const prices = []
  const basePrice = getBasePriceForSymbol(symbol)
  let currentPrice = basePrice

  const endDate = new Date()

  for (let i = days; i >= 0; i--) {
    const date = new Date(endDate)
    date.setDate(date.getDate() - i)

    // Add some realistic variation
    const randomChange = (Math.random() - 0.5) * (basePrice * 0.02) // +/- 1% daily
    currentPrice = currentPrice + randomChange

    prices.push({
      date: date.toISOString().split('T')[0],
      price: parseFloat(currentPrice.toFixed(2)),
      volume: Math.floor(Math.random() * 10000000) + 1000000
    })
  }

  // Calculate statistics
  const priceValues = prices.map(p => p.price)
  const current = priceValues[priceValues.length - 1]
  const firstPrice = priceValues[0]
  const high = Math.max(...priceValues)
  const low = Math.min(...priceValues)
  const average = priceValues.reduce((sum, p) => sum + p, 0) / priceValues.length
  const change = current - firstPrice
  const changePercent = (change / firstPrice) * 100

  return {
    symbol,
    prices,
    statistics: {
      current,
      high,
      low,
      average: parseFloat(average.toFixed(2)),
      change: parseFloat(change.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2))
    }
  }
}

// Base prices for common ETFs
function getBasePriceForSymbol(symbol: string): number {
  const basePrices: { [key: string]: number } = {
    'SPY': 550,
    'QQQ': 470,
    'IWM': 220,
    'DIA': 420,
    'VTI': 260,
    'VOO': 480,
    'VEA': 50,
    'VWO': 45,
    'AGG': 100,
    'BND': 75,
    'GLD': 200,
    'SLV': 25,
    'USO': 75,
    'UNG': 20,
    'TLT': 90,
    'HYG': 75,
    'LQD': 110,
    'EEM': 42,
    'EFA': 80,
    'XLF': 40
  }

  return basePrices[symbol.toUpperCase()] || 100
}
