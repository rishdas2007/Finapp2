'use client'

import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { useEffect, useState } from 'react'
import { formatIndicatorValue, formatIndicatorChange } from '@/config/economic-indicators'

interface EconomicIndicator {
  series_id: string
  indicator_name: string
  category: string
  timing: string
  frequency: string
  presentation_format: string
  unit: string
  date: string
  value: number
  prior_value?: number
  yoy_change?: number
  mom_change?: number
  signal: 'Bullish' | 'Bearish' | 'Neutral'
  trend: 'up' | 'down' | 'stable'
  z_score?: number
  description?: string
}

interface GroupedIndicators {
  [category: string]: {
    Leading: EconomicIndicator[]
    Coincident: EconomicIndicator[]
    Lagging: EconomicIndicator[]
  }
}

export function ComprehensiveEconomicCalendar() {
  const [indicators, setIndicators] = useState<EconomicIndicator[]>([])
  const [grouped, setGrouped] = useState<GroupedIndicators>({})
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string>('Growth')
  const [activeTiming, setActiveTiming] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<string>('')

  useEffect(() => {
    fetchIndicators()
    const interval = setInterval(fetchIndicators, 3600000) // Update every hour
    return () => clearInterval(interval)
  }, [])

  const fetchIndicators = async () => {
    try {
      const response = await fetch('/api/economic-indicators/latest')
      const data = await response.json()

      if (data.indicators) {
        setIndicators(data.indicators)
        setGrouped(data.grouped)
        setLastUpdate(new Date(data.timestamp).toLocaleString())
      }
    } catch (error) {
      console.error('Error fetching economic indicators:', error)
    } finally {
      setLoading(false)
    }
  }

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'Bullish':
        return 'bg-positive/10 text-positive border-positive/20'
      case 'Bearish':
        return 'bg-negative/10 text-negative border-negative/20'
      default:
        return 'bg-muted text-muted-foreground border-border'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return '📈'
      case 'down':
        return '📉'
      default:
        return '📊'
    }
  }

  const formatValue = (indicator: EconomicIndicator) => {
    return formatIndicatorValue(
      indicator.value,
      indicator.presentation_format,
      indicator.unit
    )
  }

  const formatPriorValue = (indicator: EconomicIndicator) => {
    if (indicator.prior_value === undefined || indicator.prior_value === null) return '-'
    return formatIndicatorValue(
      indicator.prior_value,
      indicator.presentation_format,
      indicator.unit
    )
  }

  const formatChange = (indicator: EconomicIndicator) => {
    return formatIndicatorChange(
      indicator.value,
      indicator.prior_value,
      indicator.presentation_format,
      indicator.unit
    )
  }

  const formatZScore = (zScore: number | undefined) => {
    if (zScore === undefined) return '-'
    const prefix = zScore >= 0 ? '+' : ''
    return `${prefix}${zScore.toFixed(2)}σ`
  }

  const getZScoreColor = (zScore: number | undefined) => {
    if (zScore === undefined) return ''
    if (zScore > 2) return 'text-negative font-semibold'
    if (zScore < -2) return 'text-positive font-semibold'
    if (Math.abs(zScore) > 1) return 'text-yellow-500'
    return ''
  }

  const categories = ['Growth', 'Inflation', 'Labor', 'Sentiment']
  const timings = ['Leading', 'Coincident', 'Lagging']

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Growth':
        return '📊'
      case 'Inflation':
        return '💵'
      case 'Labor':
        return '👷'
      case 'Sentiment':
        return '💭'
      default:
        return '📈'
    }
  }

  const getTimingBadgeColor = (timing: string) => {
    switch (timing) {
      case 'Leading':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'Coincident':
        return 'bg-green-500/10 text-green-400 border-green-500/20'
      case 'Lagging':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
      default:
        return 'bg-muted text-muted-foreground border-border'
    }
  }

  const getIndicatorsToDisplay = () => {
    if (!grouped[activeCategory]) return []

    if (activeTiming) {
      return grouped[activeCategory][activeTiming as keyof typeof grouped[typeof activeCategory]] || []
    }

    // Show all timings for the category
    return [
      ...grouped[activeCategory].Leading,
      ...grouped[activeCategory].Coincident,
      ...grouped[activeCategory].Lagging
    ]
  }

  const displayedIndicators = getIndicatorsToDisplay()
  const getCategoryCount = (category: string) => {
    if (!grouped[category]) return 0
    return (
      grouped[category].Leading.length +
      grouped[category].Coincident.length +
      grouped[category].Lagging.length
    )
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>📅 Economic Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 flex items-center justify-center">
            <div className="shimmer h-full w-full rounded-lg bg-muted"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            📅 Economic Calendar
            <span className="text-xs text-muted-foreground font-normal">
              {indicators.length} indicators • Updated: {lastUpdate}
            </span>
          </CardTitle>
          <button
            onClick={fetchIndicators}
            className="px-3 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 mt-4 flex-wrap">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => {
                setActiveCategory(category)
                setActiveTiming(null)
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeCategory === category
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {getCategoryIcon(category)} {category} ({getCategoryCount(category)})
            </button>
          ))}
        </div>

        {/* Timing Filter */}
        <div className="flex gap-2 mt-2 flex-wrap">
          <button
            onClick={() => setActiveTiming(null)}
            className={`px-3 py-1 rounded-md text-xs transition-colors ${
              activeTiming === null
                ? 'bg-primary/20 text-primary'
                : 'bg-background text-muted-foreground hover:bg-muted'
            }`}
          >
            All Timings
          </button>
          {timings.map((timing) => (
            <button
              key={timing}
              onClick={() => setActiveTiming(timing)}
              className={`px-3 py-1 rounded-md text-xs transition-colors border ${
                activeTiming === timing
                  ? getTimingBadgeColor(timing)
                  : 'bg-background text-muted-foreground hover:bg-muted border-border'
              }`}
            >
              {timing} ({grouped[activeCategory]?.[timing as keyof typeof grouped[typeof activeCategory]]?.length || 0})
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Indicator</th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground">Timing</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Value</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Prior Value</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Change</th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground">Signal</th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground">Trend</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Z-Score</th>
              </tr>
            </thead>
            <tbody>
              {displayedIndicators.map((indicator) => (
                <tr
                  key={indicator.series_id}
                  className="border-b border-border/50 hover:bg-muted/50 transition-colors"
                  title={indicator.description}
                >
                  <td className="py-3 px-4">
                    <div>
                      <div className="font-medium">{indicator.indicator_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {indicator.frequency} • {new Date(indicator.date).toLocaleDateString()}
                      </div>
                    </div>
                  </td>
                  <td className="text-center py-3 px-4">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getTimingBadgeColor(indicator.timing)}`}>
                      {indicator.timing}
                    </span>
                  </td>
                  <td className="text-right py-3 px-4 font-medium">
                    {formatValue(indicator)}
                  </td>
                  <td className="text-right py-3 px-4 text-muted-foreground">
                    {formatPriorValue(indicator)}
                  </td>
                  <td className={`text-right py-3 px-4 ${
                    (indicator.yoy_change || indicator.mom_change || 0) >= 0
                      ? 'text-positive'
                      : 'text-negative'
                  }`}>
                    {formatChange(indicator)}
                  </td>
                  <td className="text-center py-3 px-4">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getSignalColor(indicator.signal)}`}>
                      {indicator.signal}
                    </span>
                  </td>
                  <td className="text-center py-3 px-4 text-lg">
                    {getTrendIcon(indicator.trend)}
                  </td>
                  <td className={`text-right py-3 px-4 ${getZScoreColor(indicator.z_score)}`}>
                    {formatZScore(indicator.z_score)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {displayedIndicators.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No indicators available for this category
            </div>
          )}
        </div>

        <div className="mt-4 text-xs text-muted-foreground space-y-1">
          <div>
            <strong>Z-Score:</strong> Standard deviations from historical mean (|Z| &gt; 2 = extreme)
          </div>
          <div>
            <strong>Leading:</strong> Predict future economic activity •
            <strong> Coincident:</strong> Move with the economy •
            <strong> Lagging:</strong> Confirm past trends
          </div>
          <div>Data source: Federal Reserve Economic Data (FRED)</div>
        </div>
      </CardContent>
    </Card>
  )
}
