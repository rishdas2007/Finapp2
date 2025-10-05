'use client'

import { useEffect, useState } from 'react'
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface PriceData {
  date: string
  price: number
}

interface SpyData {
  symbol: string
  prices: PriceData[]
  statistics: {
    current: number
    high: number
    low: number
    average: number
    change: number
    changePercent: number
  }
  source: string
}

export default function SpySparkChart() {
  const [data, setData] = useState<SpyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSpyData() {
      try {
        setLoading(true)
        const response = await fetch('/api/etf-price-history/SPY?days=30')

        if (!response.ok) {
          throw new Error('Failed to fetch SPY data')
        }

        const result = await response.json()
        setData(result)
      } catch (err) {
        console.error('Error fetching SPY data:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchSpyData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-24 bg-gray-50 rounded-lg animate-pulse">
        <div className="text-sm text-gray-500">Loading SPY data...</div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-24 bg-red-50 rounded-lg">
        <div className="text-sm text-red-600">Error: {error || 'No data available'}</div>
      </div>
    )
  }

  const { statistics, prices } = data
  const isPositive = statistics.changePercent >= 0
  const chartColor = isPositive ? '#10b981' : '#ef4444'

  // Format prices for Recharts
  const chartData = prices.map(p => ({
    date: p.date,
    value: p.price
  }))

  // Calculate y-axis domain with some padding
  const yMin = statistics.low * 0.995
  const yMax = statistics.high * 1.005

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-medium text-gray-700">S&P 500 (SPY)</h3>
          <p className="text-xs text-gray-500">30-Day Trend</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-gray-900">
            ${statistics.current.toFixed(2)}
          </div>
          <div className={`flex items-center justify-end gap-1 text-sm font-medium ${
            isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>{isPositive ? '+' : ''}{statistics.changePercent.toFixed(2)}%</span>
          </div>
        </div>
      </div>

      {/* Sparkline Chart */}
      <div className="h-16 -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <YAxis domain={[yMin, yMax]} hide />
            <Line
              type="monotone"
              dataKey="value"
              stroke={chartColor}
              strokeWidth={2}
              dot={false}
              animationDuration={500}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Statistics Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 text-xs text-gray-600">
        <div>
          <span className="font-medium">High:</span> ${statistics.high.toFixed(2)}
        </div>
        <div>
          <span className="font-medium">Low:</span> ${statistics.low.toFixed(2)}
        </div>
        <div>
          <span className="font-medium">Avg:</span> ${statistics.average.toFixed(2)}
        </div>
      </div>
    </div>
  )
}
