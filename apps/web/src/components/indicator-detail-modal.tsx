'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'
import { X, TrendingUp, TrendingDown, AlertTriangle, Info, ExternalLink } from 'lucide-react'
import { getDisplayValue, getSignalColor, type EconomicIndicator } from '@/lib/indicator-display'

interface IndicatorDetailModalProps {
  indicator: EconomicIndicator
  onClose: () => void
}

interface HistoricalDataPoint {
  date: string
  value: number
}

interface Statistics {
  mean: number
  median: number
  stdDev: number
  min: number
  max: number
  percentile_25: number
  percentile_75: number
  current: number
  currentZScore: number
  count: number
}

interface RelatedIndicator {
  series_id: string
  indicator_name: string
  category: string
  value: number
  signal: string
  correlation: number
  lag_months: number
}

export function IndicatorDetailModal({ indicator, onClose }: IndicatorDetailModalProps) {
  const [history, setHistory] = useState<HistoricalDataPoint[]>([])
  const [statistics, setStatistics] = useState<Statistics | null>(null)
  const [relatedIndicators, setRelatedIndicators] = useState<RelatedIndicator[]>([])
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState<number>(24)

  useEffect(() => {
    fetchHistoricalData()
  }, [indicator.series_id, timeframe])

  const fetchHistoricalData = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/indicators/${indicator.series_id}/history?months=${timeframe}&includeStats=true`
      )
      const data = await response.json()

      if (data.history) {
        setHistory(data.history)
      }
      if (data.statistics) {
        setStatistics(data.statistics)
      }
      if (data.relatedIndicators) {
        setRelatedIndicators(data.relatedIndicators)
      }
    } catch (error) {
      console.error('Error fetching historical data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  const formatValue = (value: number) => {
    return value.toFixed(2)
  }

  const getTrendIcon = () => {
    if (indicator.trend === 'up') return <TrendingUp className="h-5 w-5 text-positive" />
    if (indicator.trend === 'down') return <TrendingDown className="h-5 w-5 text-negative" />
    return <Info className="h-5 w-5 text-muted-foreground" />
  }

  const getZScoreInterpretation = (zScore: number) => {
    if (Math.abs(zScore) > 2) return { text: 'Extreme', color: 'text-red-600', icon: <AlertTriangle className="h-4 w-4" /> }
    if (Math.abs(zScore) > 1.5) return { text: 'Elevated', color: 'text-orange-600', icon: <AlertTriangle className="h-4 w-4" /> }
    if (Math.abs(zScore) > 1) return { text: 'Above Average', color: 'text-yellow-600', icon: <Info className="h-4 w-4" /> }
    return { text: 'Normal Range', color: 'text-green-600', icon: <Info className="h-4 w-4" /> }
  }

  // Prepare chart data with mean reference line
  const chartData = history.map(h => ({
    date: formatDate(h.date),
    value: h.value,
    mean: statistics?.mean || 0
  }))

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-background rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b border-border p-6 flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold">{indicator.indicator_name}</h2>
              {getTrendIcon()}
            </div>
            <p className="text-muted-foreground text-sm">{indicator.description || indicator.series_id}</p>
            <div className="flex gap-4 mt-3 text-sm">
              <span className="px-2 py-1 bg-muted rounded-md">{indicator.category}</span>
              <span className="px-2 py-1 bg-muted rounded-md">{indicator.timing}</span>
              <span className="px-2 py-1 bg-muted rounded-md">{indicator.frequency}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Current Value Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Current Value</p>
                  <p className="text-3xl font-bold">{getDisplayValue(indicator)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    as of {new Date(indicator.date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Signal</p>
                  <p className={`text-xl font-semibold ${getSignalColor(indicator.signal || '')}`}>
                    {indicator.signal || 'Neutral'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Market sentiment</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Z-Score</p>
                  <p className="text-xl font-semibold">
                    {indicator.z_score?.toFixed(2) || 'N/A'}
                  </p>
                  {statistics && (
                    <div className={`text-xs mt-1 flex items-center gap-1 ${getZScoreInterpretation(statistics.currentZScore).color}`}>
                      {getZScoreInterpretation(statistics.currentZScore).icon}
                      <span>{getZScoreInterpretation(statistics.currentZScore).text}</span>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Trend</p>
                  <p className="text-xl font-semibold capitalize">{indicator.trend || 'stable'}</p>
                  <p className="text-xs text-muted-foreground mt-1">Directional momentum</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeframe Selector */}
          <div className="flex gap-2">
            {[6, 12, 24, 36].map(months => (
              <button
                key={months}
                onClick={() => setTimeframe(months)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  timeframe === months
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                {months}M
              </button>
            ))}
          </div>

          {/* Historical Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Historical Trend</CardTitle>
              <CardDescription>
                {timeframe}-month historical data with statistical mean reference
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-80 flex items-center justify-center">
                  <div className="animate-pulse text-muted-foreground">Loading chart data...</div>
                </div>
              ) : history.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                      dataKey="date"
                      stroke="#9CA3AF"
                      style={{ fontSize: '12px' }}
                      angle={-45}
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis
                      stroke="#9CA3AF"
                      style={{ fontSize: '12px' }}
                      tickFormatter={formatValue}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [formatValue(value), 'Value']}
                    />
                    <Legend />
                    <ReferenceLine
                      y={statistics?.mean || 0}
                      stroke="#EF4444"
                      strokeDasharray="5 5"
                      label={{ value: 'Mean', position: 'right', fill: '#EF4444' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      dot={{ fill: '#3B82F6', r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  No historical data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Statistics Grid */}
          {statistics && (
            <Card>
              <CardHeader>
                <CardTitle>Statistical Analysis</CardTitle>
                <CardDescription>
                  Based on {statistics.count} data points over {timeframe} months
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Mean</p>
                    <p className="text-lg font-semibold">{statistics.mean.toFixed(2)}</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Median</p>
                    <p className="text-lg font-semibold">{statistics.median.toFixed(2)}</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Std Deviation</p>
                    <p className="text-lg font-semibold">{statistics.stdDev.toFixed(2)}</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Range</p>
                    <p className="text-lg font-semibold">
                      {statistics.min.toFixed(1)} - {statistics.max.toFixed(1)}
                    </p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">25th Percentile</p>
                    <p className="text-lg font-semibold">{statistics.percentile_25.toFixed(2)}</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">75th Percentile</p>
                    <p className="text-lg font-semibold">{statistics.percentile_75.toFixed(2)}</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Current Z-Score</p>
                    <p className="text-lg font-semibold">{statistics.currentZScore.toFixed(2)}</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Current vs Mean</p>
                    <p className={`text-lg font-semibold ${
                      statistics.current > statistics.mean ? 'text-positive' : 'text-negative'
                    }`}>
                      {((statistics.current - statistics.mean) / statistics.mean * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Related Indicators */}
          {relatedIndicators.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Related Indicators</CardTitle>
                <CardDescription>
                  Indicators with strong correlation to {indicator.indicator_name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {relatedIndicators.map(related => (
                    <div
                      key={related.series_id}
                      className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{related.indicator_name}</p>
                        <p className="text-xs text-muted-foreground">{related.category}</p>
                      </div>
                      <div className="text-right mr-4">
                        <p className="text-sm font-medium">
                          Correlation: {(related.correlation * 100).toFixed(0)}%
                        </p>
                        {related.lag_months !== 0 && (
                          <p className="text-xs text-muted-foreground">
                            {Math.abs(related.lag_months)}mo {related.lag_months < 0 ? 'lead' : 'lag'}
                          </p>
                        )}
                      </div>
                      <div className={`px-3 py-1 rounded-md text-sm ${getSignalColor(related.signal)}`}>
                        {related.signal}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Context and Interpretation */}
          <Card>
            <CardHeader>
              <CardTitle>What This Means</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                <strong>{indicator.indicator_name}</strong> is a {indicator.timing.toLowerCase()} economic indicator
                in the {indicator.category} category, updated {indicator.frequency.toLowerCase()}.
              </p>
              {statistics && (
                <p>
                  The current value of <strong>{statistics.current.toFixed(2)}</strong> is{' '}
                  <strong>
                    {Math.abs((statistics.current - statistics.mean) / statistics.mean * 100).toFixed(1)}%{' '}
                    {statistics.current > statistics.mean ? 'above' : 'below'}
                  </strong> the {timeframe}-month average of {statistics.mean.toFixed(2)}.
                </p>
              )}
              {indicator.z_score && Math.abs(indicator.z_score) > 1.5 && (
                <p className="text-orange-600 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>
                    This indicator is showing elevated deviation from historical norms, which may signal
                    {indicator.z_score > 0 ? ' expansion' : ' contraction'} in economic activity.
                  </span>
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
