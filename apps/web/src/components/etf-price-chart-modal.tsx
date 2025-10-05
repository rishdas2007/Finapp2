'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area } from 'recharts'
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
  const [statistics, setStatistics] = useState<PriceStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState<number>(30) // Default 30 days

  const fetchPriceData = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/etf-price-history/${symbol}?days=${timeframe}`
      )
      const data = await response.json()

      if (data.prices) {
        setPriceData(data.prices)
      }
      if (data.statistics) {
        setStatistics(data.statistics)
      }
    } catch (error) {
      console.error('Error fetching price data:', error)
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
                {timeframe}-day price chart
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-80 flex items-center justify-center">
                  <div className="animate-pulse text-muted-foreground">Loading chart data...</div>
                </div>
              ) : priceData.length > 0 ? (
                <ResponsiveContainer width="100%" height={450}>
                  <LineChart
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
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
                      vertical={true}
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
                      stroke="#000000"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 4, fill: '#000000' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
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
