'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, ComposedChart, Bar, ReferenceLine } from 'recharts'
import { X } from 'lucide-react'
import { Button } from '@coinbase/cds-web/buttons'

interface ETFPriceChartModalProps {
  symbol: string
  name?: string
  onClose: () => void
}

interface PriceDataPoint {
  date: string
  price: number
  volume?: number
}

interface RSIDataPoint {
  date: string
  rsi: number
}

interface PriceStats {
  current: number
  high: number
  low: number
  average: number
  change: number
  changePercent: number
}

export function ETFPriceChartModal({ symbol, name, onClose }: ETFPriceChartModalProps) {
  const [priceData, setPriceData] = useState<PriceDataPoint[]>([])
  const [rsiData, setRSIData] = useState<RSIDataPoint[]>([])
  const [statistics, setStatistics] = useState<PriceStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState<number>(30) // Default 30 days
  const [error, setError] = useState<string | null>(null)
  const [dataSource, setDataSource] = useState<string>('')

  const fetchPriceData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch price data
      const priceResponse = await fetch(
        `/api/etf-price-history/${symbol}?days=${timeframe}`
      )
      const priceData = await priceResponse.json()

      if (priceData.error) {
        setError(priceData.message || 'Failed to fetch price data')
        return
      }

      if (priceData.prices) {
        setPriceData(priceData.prices)
      }
      if (priceData.statistics) {
        setStatistics(priceData.statistics)
      }
      if (priceData.source) {
        setDataSource(priceData.source)
      }

      // Fetch RSI indicator data
      try {
        const rsiResponse = await fetch(
          `/api/etf-indicators/${symbol}?days=${timeframe}`
        )
        const rsiData = await rsiResponse.json()

        if (rsiData.indicators && rsiData.indicators.length > 0) {
          const formattedRSI = rsiData.indicators
            .filter((ind: any) => ind.rsi !== null && ind.rsi !== undefined)
            .map((ind: any) => ({
              date: ind.date,
              rsi: ind.rsi,
            }))
          setRSIData(formattedRSI)
        } else {
          setRSIData([])
        }
      } catch (rsiError) {
        console.error('Error fetching RSI data:', rsiError)
        // Don't fail the entire modal if RSI data is unavailable
        setRSIData([])
      }
    } catch (error) {
      console.error('Error fetching price data:', error)
      setError('Network error - unable to fetch price data')
    } finally {
      setLoading(false)
    }
  }, [symbol, timeframe])

  useEffect(() => {
    fetchPriceData()
  }, [fetchPriceData])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    if (timeframe <= 30) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  const formatPrice = (value: number) => {
    return `$${value.toFixed(2)}`
  }

  // Prepare chart data
  const chartData = priceData.map(p => ({
    date: formatDate(p.date),
    price: p.price,
    volume: p.volume || 0,
  }))

  // Prepare RSI chart data
  const rsiChartData = rsiData.map(r => ({
    date: formatDate(r.date),
    rsi: r.rsi,
  }))

  // Calculate dynamic y-axis domain
  const prices = priceData.map(p => p.price)
  const dataMin = prices.length > 0 ? Math.min(...prices) : 0
  const dataMax = prices.length > 0 ? Math.max(...prices) : 100
  const padding = (dataMax - dataMin) * 0.1 || 1
  const yAxisDomain = [
    Math.floor((dataMin - padding) * 100) / 100,
    Math.ceil((dataMax + padding) * 100) / 100
  ]

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-background rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b border-border p-6 flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold">{symbol}</h2>
            </div>
            <p className="text-muted-foreground text-sm">{name || 'ETF Price History'}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors focus-ring"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Current Price Card */}
          {statistics && (
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Current Price</p>
                    <p className="text-3xl font-bold tabular-nums">{formatPrice(statistics.current)}</p>
                    <p className={`text-sm mt-1 ${statistics.change >= 0 ? 'financial-positive' : 'financial-negative'}`}>
                      {statistics.change >= 0 ? '↗' : '↘'} {statistics.change >= 0 ? '+' : ''}{statistics.changePercent.toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Period High</p>
                    <p className="text-xl font-semibold tabular-nums">{formatPrice(statistics.high)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{timeframe}-day high</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Period Low</p>
                    <p className="text-xl font-semibold tabular-nums">{formatPrice(statistics.low)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{timeframe}-day low</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Average</p>
                    <p className="text-xl font-semibold tabular-nums">{formatPrice(statistics.average)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{timeframe}-day average</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timeframe Selector */}
          <div className="flex gap-2">
            {[5, 30, 90, 365].map(days => (
              <Button
                key={days}
                variant={timeframe === days ? 'primary' : 'secondary'}
                onClick={() => setTimeframe(days)}
              >
                {days}D
              </Button>
            ))}
          </div>

          {/* Price Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Price History</CardTitle>
              <CardDescription>
                {timeframe}-day price chart {dataSource && <span className="text-xs ml-2">• Data from {dataSource}</span>}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-80 flex items-center justify-center">
                  <div className="animate-pulse text-muted-foreground">Loading chart data...</div>
                </div>
              ) : error ? (
                <div className="h-80 flex flex-col items-center justify-center text-muted-foreground">
                  <p className="text-red-600 mb-2">Error loading data</p>
                  <p className="text-sm">{error}</p>
                </div>
              ) : priceData.length > 0 ? (
                <div className="space-y-6">
                  {/* Price Chart */}
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart
                      data={chartData}
                      margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                    >
                      <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#93C5FD" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#93C5FD" stopOpacity={0.3}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#E5E7EB"
                        strokeWidth={1}
                        vertical={false}
                        horizontal={true}
                      />
                      <XAxis
                        dataKey="date"
                        stroke="#9CA3AF"
                        style={{ fontSize: '11px' }}
                        angle={-45}
                        textAnchor="end"
                        height={70}
                        tick={{ fill: '#6B7280' }}
                      />
                      <YAxis
                        stroke="#9CA3AF"
                        style={{ fontSize: '11px' }}
                        tickFormatter={formatPrice}
                        domain={yAxisDomain}
                        tick={{ fill: '#6B7280' }}
                        orientation="right"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #E5E7EB',
                          borderRadius: '8px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}
                        formatter={(value: number) => [formatPrice(value), 'Price']}
                        labelStyle={{ color: '#111827', fontWeight: 600 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="price"
                        stroke="none"
                        fill="url(#colorPrice)"
                        fillOpacity={1}
                      />
                      <Line
                        type="monotone"
                        dataKey="price"
                        stroke="#1a73e8"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: '#1a73e8' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>

                  {/* Volume Chart */}
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground mb-2 ml-4">Volume</p>
                    <ResponsiveContainer width="100%" height={100}>
                      <ComposedChart
                        data={chartData}
                        margin={{ top: 0, right: 30, left: 20, bottom: 20 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#E5E7EB"
                          strokeWidth={1}
                          vertical={false}
                          horizontal={true}
                        />
                        <XAxis
                          dataKey="date"
                          stroke="#9CA3AF"
                          style={{ fontSize: '10px' }}
                          angle={-45}
                          textAnchor="end"
                          height={50}
                          tick={{ fill: '#6B7280' }}
                        />
                        <YAxis
                          stroke="#9CA3AF"
                          style={{ fontSize: '10px' }}
                          tick={{ fill: '#6B7280' }}
                          orientation="right"
                          tickFormatter={(value) => {
                            if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
                            if (value >= 1000) return `${(value / 1000).toFixed(0)}K`
                            return value.toString()
                          }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                          }}
                          formatter={(value: number) => [value.toLocaleString(), 'Volume']}
                          labelStyle={{ color: '#111827', fontWeight: 600 }}
                        />
                        <Bar
                          dataKey="volume"
                          fill="#93C5FD"
                          opacity={0.6}
                          radius={[2, 2, 0, 0]}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>

                  {/* RSI Chart */}
                  {rsiChartData.length > 0 && (
                    <div className="mt-6">
                      <p className="text-xs text-muted-foreground mb-2 ml-4">RSI (14)</p>
                      <ResponsiveContainer width="100%" height={200}>
                        <ComposedChart
                          data={rsiChartData}
                          margin={{ top: 0, right: 30, left: 20, bottom: 20 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#E5E7EB"
                            strokeWidth={1}
                            vertical={false}
                            horizontal={true}
                          />
                          <XAxis
                            dataKey="date"
                            stroke="#9CA3AF"
                            style={{ fontSize: '10px' }}
                            angle={-45}
                            textAnchor="end"
                            height={50}
                            tick={{ fill: '#6B7280' }}
                          />
                          <YAxis
                            domain={[0, 100]}
                            stroke="#9CA3AF"
                            style={{ fontSize: '10px' }}
                            tick={{ fill: '#6B7280' }}
                            orientation="right"
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #E5E7EB',
                              borderRadius: '8px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                            }}
                            formatter={(value: number) => [value.toFixed(2), 'RSI']}
                            labelStyle={{ color: '#111827', fontWeight: 600 }}
                          />
                          <ReferenceLine
                            y={70}
                            stroke="#DC2626"
                            strokeDasharray="3 3"
                            label={{ value: 'Overbought', position: 'insideTopRight', fill: '#DC2626', fontSize: 10 }}
                          />
                          <ReferenceLine
                            y={30}
                            stroke="#16A34A"
                            strokeDasharray="3 3"
                            label={{ value: 'Oversold', position: 'insideBottomRight', fill: '#16A34A', fontSize: 10 }}
                          />
                          <Line
                            dataKey="rsi"
                            stroke="#8B5CF6"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4, fill: '#8B5CF6' }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  No price data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
