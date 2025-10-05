import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

interface PriceDataPoint {
  date: string
  price: number
  volume: number
}

export async function GET(
  request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  try {
    const { symbol } = params
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')

    // Calculate date range
    // For short timeframes (5-30 days), fetch extra calendar days to ensure we get enough trading days
    // Markets are closed on weekends and holidays, so 5 trading days could be 7-10 calendar days
    const multiplier = days <= 30 ? 1.5 : days <= 90 ? 1.4 : 1.3
    const calendarDaysToFetch = Math.ceil(days * multiplier)

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - calendarDaysToFetch)

    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]

    console.log(`Fetching price data for ${symbol} (${days} trading days, ~${calendarDaysToFetch} calendar days)`)

    // First, try to get data from database
    // Get ALL cached data for this symbol (we'll filter by date range later)
    const { data: allCachedData, error: dbError } = await supabaseServer
      .from('etf_price_history')
      .select('date, price, volume')
      .eq('symbol', symbol)
      .order('date', { ascending: true })

    if (dbError) {
      console.error('Database error:', dbError)
    }

    console.log(`Found ${allCachedData?.length || 0} total cached records for ${symbol}`)

    // Check if we have recent data (within last 4 days to account for weekends)
    let useCache = false
    if (allCachedData && allCachedData.length > 0) {
      const mostRecentDataDate = new Date(allCachedData[allCachedData.length - 1].date)
      const daysSinceLastData = Math.floor((Date.now() - mostRecentDataDate.getTime()) / (1000 * 60 * 60 * 24))
      console.log(`Most recent cached data: ${allCachedData[allCachedData.length - 1].date} (${daysSinceLastData} days ago)`)

      // Use cache if data is within last 4 days and we have at least 200 data points
      if (daysSinceLastData <= 4 && allCachedData.length >= 200) {
        useCache = true
        console.log(`✓ Using cached data for ${symbol}`)
      }
    }

    // If we have sufficient cached data, filter it and return
    if (useCache) {
      // Filter cached data by date range
      const filteredData = allCachedData!.filter(d => {
        return d.date >= startDateStr && d.date <= endDateStr
      })

      console.log(`Returning ${filteredData.length} cached data points (filtered from ${allCachedData!.length})`)

      const priceData = filteredData.map(d => ({
        date: d.date,
        price: parseFloat(d.price.toString()),
        volume: d.volume || 0
      }))

      // Limit to exactly the requested number of trading days for statistics calculation
      // This ensures consistency with the table which uses exact trading days
      const limitedPriceData = priceData.slice(-days)

      const priceValues = limitedPriceData.map(p => p.price)
      const current = priceValues[priceValues.length - 1]
      const firstPrice = priceValues[0]
      const high = Math.max(...priceValues)
      const low = Math.min(...priceValues)
      const average = priceValues.reduce((sum, p) => sum + p, 0) / priceValues.length
      const change = current - firstPrice
      const changePercent = (change / firstPrice) * 100

      return NextResponse.json({
        symbol,
        prices: priceData,
        statistics: {
          current,
          high,
          low,
          average: parseFloat(average.toFixed(2)),
          change: parseFloat(change.toFixed(2)),
          changePercent: parseFloat(changePercent.toFixed(2))
        },
        source: 'Database Cache'
      })
    }

    // If no cached data or stale data, fetch from Yahoo Finance
    console.log(`Fetching fresh data for ${symbol} from Yahoo Finance...`)

    const startTimestamp = Math.floor(startDate.getTime() / 1000)
    const endTimestamp = Math.floor(endDate.getTime() / 1000)

    // Determine interval based on timeframe
    let interval = '1d'
    if (days <= 7) {
      interval = '1h'
    }

    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${startTimestamp}&period2=${endTimestamp}&interval=${interval}`

    const response = await fetch(yahooUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status}`)
    }

    const data = await response.json()

    if (!data.chart?.result?.[0]) {
      throw new Error('Invalid response from Yahoo Finance')
    }

    const result = data.chart.result[0]
    const timestamps = result.timestamp
    const prices = result.indicators.quote[0].close
    const volumes = result.indicators.quote[0].volume

    if (!timestamps || !prices) {
      throw new Error('No price data available')
    }

    // Format data for our frontend
    const priceData: PriceDataPoint[] = timestamps
      .map((timestamp: number, index: number) => ({
        date: new Date(timestamp * 1000).toISOString().split('T')[0],
        price: prices[index] ? parseFloat(prices[index].toFixed(4)) : null,
        volume: volumes[index] || 0
      }))
      .filter((item: any) => item.price !== null)

    if (priceData.length === 0) {
      throw new Error('No valid price data after filtering')
    }

    // Store data in database (only for daily intervals to avoid too much data)
    if (interval === '1d') {
      const recordsToInsert = priceData.map(p => ({
        symbol,
        date: p.date,
        price: p.price,
        volume: p.volume
      }))

      const { error: insertError } = await supabaseServer
        .from('etf_price_history')
        .upsert(recordsToInsert, {
          onConflict: 'symbol,date',
          ignoreDuplicates: false
        })

      if (insertError) {
        console.error('Error storing data in database:', insertError)
      } else {
        console.log(`Stored ${recordsToInsert.length} records for ${symbol} in database`)
      }
    }

    // Calculate statistics
    // Limit to exactly the requested number of trading days for consistency with table
    const limitedPriceData = priceData.slice(-days)
    const priceValues = limitedPriceData.map(p => p.price)
    const current = priceValues[priceValues.length - 1]
    const firstPrice = priceValues[0]
    const high = Math.max(...priceValues)
    const low = Math.min(...priceValues)
    const average = priceValues.reduce((sum: number, p: number) => sum + p, 0) / priceValues.length
    const change = current - firstPrice
    const changePercent = (change / firstPrice) * 100

    console.log(`Successfully fetched ${priceData.length} price points for ${symbol} from Yahoo Finance`)

    return NextResponse.json({
      symbol,
      prices: priceData,
      statistics: {
        current,
        high,
        low,
        average: parseFloat(average.toFixed(2)),
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2))
      },
      source: 'Yahoo Finance'
    })

  } catch (error) {
    console.error('Error fetching ETF price history:', error)

    return NextResponse.json(
      {
        error: 'Failed to fetch price history',
        message: error instanceof Error ? error.message : 'Unknown error',
        symbol: params.symbol
      },
      { status: 500 }
    )
  }
}
