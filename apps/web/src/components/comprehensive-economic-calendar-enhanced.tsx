'use client'

import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { useEffect, useState } from 'react'
import {
  getDisplayValue,
  getValueTypeLabel,
  getPriorValueLabel,
  formatChangeValue,
  formatDataDate,
  getRelativeTime,
  getZScoreColor,
  getSignalColor,
  type EconomicIndicator
} from '@/lib/indicator-display'
import { IndicatorDetailModal } from './indicator-detail-modal'

interface GroupedIndicators {
  [category: string]: {
    Leading: EconomicIndicator[]
    Coincident: EconomicIndicator[]
    Lagging: EconomicIndicator[]
  }
}

type SortField = 'name' | 'value' | 'change' | 'zscore' | 'date'
type SortDirection = 'asc' | 'desc'

export function ComprehensiveEconomicCalendarEnhanced() {
  const [indicators, setIndicators] = useState<EconomicIndicator[]>([])
  const [grouped, setGrouped] = useState<GroupedIndicators>({})
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string>('Growth')
  const [activeTiming, setActiveTiming] = useState<string | null>(null)
  const [signalFilter, setSignalFilter] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<string>('')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [selectedIndicator, setSelectedIndicator] = useState<EconomicIndicator | null>(null)

  useEffect(() => {
    // Check if mobile
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)

    fetchIndicators()
    const interval = setInterval(fetchIndicators, 3600000) // Update every hour

    return () => {
      clearInterval(interval)
      window.removeEventListener('resize', checkMobile)
    }
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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const exportToCSV = () => {
    const headers = ['Indicator', 'Category', 'Timing', 'Value', 'Prior Value', 'Change', 'Signal', 'Z-Score', 'Date', 'Frequency']
    const rows = indicators.map(ind => [
      ind.indicator_name,
      ind.category,
      ind.timing ?? '',
      getDisplayValue(ind),
      ind.prior_value ?? '',
      formatChangeValue(ind, ind.value, ind.prior_value),
      ind.signal ?? '',
      ind.z_score ?? '',
      ind.date,
      ind.frequency
    ])

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `economic-indicators-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '📈'
      case 'down': return '📉'
      default: return '📊'
    }
  }

  const categories = ['Growth', 'Inflation', 'Labor', 'Sentiment']
  const timings = ['Leading', 'Coincident', 'Lagging']

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Growth': return '📊'
      case 'Inflation': return '💵'
      case 'Labor': return '👷'
      case 'Sentiment': return '💭'
      default: return '📈'
    }
  }

  const getTimingBadgeColor = (timing: string) => {
    switch (timing) {
      case 'Leading': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'Coincident': return 'bg-green-500/10 text-green-400 border-green-500/20'
      case 'Lagging': return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
      default: return 'bg-muted text-muted-foreground border-border'
    }
  }

  const getIndicatorsToDisplay = () => {
    if (!grouped[activeCategory]) return []

    let indicators: EconomicIndicator[] = []

    if (activeTiming) {
      indicators = grouped[activeCategory][activeTiming as keyof typeof grouped[typeof activeCategory]] || []
    } else {
      indicators = [
        ...grouped[activeCategory].Leading,
        ...grouped[activeCategory].Coincident,
        ...grouped[activeCategory].Lagging
      ]
    }

    // Apply signal filter
    if (signalFilter) {
      indicators = indicators.filter(ind => ind.signal?.toLowerCase() === signalFilter.toLowerCase())
    }

    // Apply sorting
    indicators = [...indicators].sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'name':
          comparison = a.indicator_name.localeCompare(b.indicator_name)
          break
        case 'value':
          comparison = a.value - b.value
          break
        case 'change':
          const aChange = a.prior_value ? ((a.value - a.prior_value) / a.prior_value) : 0
          const bChange = b.prior_value ? ((b.value - b.prior_value) / b.prior_value) : 0
          comparison = aChange - bChange
          break
        case 'zscore':
          comparison = (a.z_score ?? 0) - (b.z_score ?? 0)
          break
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime()
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })

    return indicators
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

  // Mobile Card View
  if (isMobile) {
    return (
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">📅 Economic Calendar</CardTitle>
              <button
                onClick={fetchIndicators}
                className="px-3 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm"
              >
                🔄
              </button>
            </div>

            <div className="text-xs text-muted-foreground">
              {indicators.length} indicators • {lastUpdate}
            </div>

            {/* Category Tabs */}
            <div className="flex gap-2 flex-wrap">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => {
                    setActiveCategory(category)
                    setActiveTiming(null)
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    activeCategory === category
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {getCategoryIcon(category)} {category}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {displayedIndicators.map((indicator) => {
            const isExpanded = expandedRow === indicator.series_id

            return (
              <div
                key={indicator.series_id}
                className="border border-border rounded-lg p-4 space-y-2 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setSelectedIndicator(indicator)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{indicator.indicator_name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {getValueTypeLabel(indicator)}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-xs border ${getTimingBadgeColor(indicator.timing ?? '')}`}>
                    {indicator.timing}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Value</div>
                    <div className="text-lg font-semibold">{getDisplayValue(indicator)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Change</div>
                    <div className="text-sm font-medium">
                      {formatChangeValue(indicator, indicator.value, indicator.prior_value)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className={`px-2 py-1 rounded-full text-xs border ${getSignalColor(indicator.signal)}`}>
                    {indicator.signal}
                  </span>
                  <div className="text-xs text-muted-foreground">
                    {formatDataDate(indicator.date, indicator.frequency)} • {getRelativeTime(indicator.date)}
                  </div>
                </div>

                {isExpanded && (
                  <div className="pt-2 border-t border-border mt-2 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Timing:</span>
                      <span className={`px-2 py-0.5 rounded-full border ${getTimingBadgeColor(indicator.timing ?? '')}`}>
                        {indicator.timing}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Current Z-Score:</span>
                      <span className={getZScoreColor(indicator.z_score)}>
                        {indicator.z_score !== null && indicator.z_score !== undefined
                          ? `${indicator.z_score >= 0 ? '+' : ''}${indicator.z_score.toFixed(2)}σ`
                          : '-'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>
    )
  }

  // Desktop Table View
  return (
    <>
      <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            📅 Economic Calendar
            <span className="text-xs text-muted-foreground font-normal">
              {indicators.length} indicators
            </span>
          </CardTitle>
          <div className="flex gap-2">
            <button
              onClick={exportToCSV}
              className="px-3 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm"
            >
              📥 Export CSV
            </button>
            <button
              onClick={fetchIndicators}
              className="px-3 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Last refreshed: {lastUpdate}
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

        {/* Filters Row */}
        <div className="flex gap-2 mt-2 flex-wrap">
          {/* Timing Filter */}
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

          {/* Signal Filter */}
          <div className="border-l border-border ml-2 pl-2 flex gap-2">
            <button
              onClick={() => setSignalFilter(null)}
              className={`px-3 py-1 rounded-md text-xs transition-colors ${
                signalFilter === null
                  ? 'bg-primary/20 text-primary'
                  : 'bg-background text-muted-foreground hover:bg-muted'
              }`}
            >
              All Signals
            </button>
            {['Bullish', 'Bearish', 'Neutral'].map((signal) => (
              <button
                key={signal}
                onClick={() => setSignalFilter(signal)}
                className={`px-3 py-1 rounded-md text-xs transition-colors border ${
                  signalFilter === signal
                    ? getSignalColor(signal)
                    : 'bg-background text-muted-foreground hover:bg-muted border-border'
                }`}
              >
                {signal}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th
                  className="text-left py-3 px-4 font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                  onClick={() => handleSort('name')}
                >
                  Indicator {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground">Timing</th>
                <th
                  className="text-center py-3 px-4 font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                  onClick={() => handleSort('date')}
                >
                  Date {sortField === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="text-right py-3 px-4 font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                  onClick={() => handleSort('value')}
                >
                  Value {sortField === 'value' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                  {activeTiming ? getPriorValueLabel({ timing: activeTiming } as any) : 'Prior Value'}
                </th>
                <th
                  className="text-right py-3 px-4 font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                  onClick={() => handleSort('change')}
                >
                  Change {sortField === 'change' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground">Signal</th>
                <th
                  className="text-right py-3 px-4 font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                  onClick={() => handleSort('zscore')}
                >
                  Current Z-Score {sortField === 'zscore' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody>
              {displayedIndicators.map((indicator) => {
                return (
                  <tr
                    key={indicator.series_id}
                    className="border-b border-border/50 hover:bg-muted/50 transition-colors cursor-pointer"
                    title={indicator.description || "Click to view details"}
                    onClick={() => setSelectedIndicator(indicator)}
                  >
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium">{indicator.indicator_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {getValueTypeLabel(indicator)}
                        </div>
                      </div>
                    </td>
                    <td className="text-center py-3 px-4">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getTimingBadgeColor(indicator.timing ?? '')}`}>
                        {indicator.timing}
                      </span>
                    </td>
                    <td className="text-center py-3 px-4">
                      <div className="text-sm">
                        {formatDataDate(indicator.date, indicator.frequency)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {getRelativeTime(indicator.date)}
                      </div>
                    </td>
                    <td className="text-right py-3 px-4 font-medium">
                      {getDisplayValue(indicator)}
                    </td>
                    <td className="text-right py-3 px-4 text-muted-foreground">
                      {indicator.prior_value !== null && indicator.prior_value !== undefined
                        ? getDisplayValue({ ...indicator, value: indicator.prior_value })
                        : '-'}
                    </td>
                    <td className="text-right py-3 px-4 font-medium">
                      {formatChangeValue(indicator, indicator.value, indicator.prior_value)}
                    </td>
                    <td className="text-center py-3 px-4">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getSignalColor(indicator.signal)}`}>
                        {indicator.signal}
                      </span>
                    </td>
                    <td className={`text-right py-3 px-4 font-medium ${getZScoreColor(indicator.z_score)}`}>
                      {indicator.z_score !== null && indicator.z_score !== undefined
                        ? `${indicator.z_score >= 0 ? '+' : ''}${indicator.z_score.toFixed(2)}σ`
                        : '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
      </Card>

      {/* Indicator Detail Modal */}
      {selectedIndicator && (
        <IndicatorDetailModal
          indicator={selectedIndicator}
          onClose={() => setSelectedIndicator(null)}
        />
      )}
    </>
  )
}
