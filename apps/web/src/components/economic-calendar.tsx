'use client'

import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { useEffect, useState } from 'react'

interface EconomicRelease {
  date: string
  frequency: string
  metric: string
  category: string
  actualValue: string
  priorReading: string
  signal: 'Bullish' | 'Bearish' | 'Neutral'
  trend: 'up' | 'down' | 'stable'
  description?: string
}

export function EconomicCalendar() {
  const [releases, setReleases] = useState<EconomicRelease[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'latest' | 'timeline' | 'all'>('all')
  const [timeFilter, setTimeFilter] = useState('Last 6 months')
  const [categoryFilter, setCategoryFilter] = useState('All Categories')

  useEffect(() => {
    fetchEconomicData()
    const interval = setInterval(fetchEconomicData, 3600000) // Update every hour
    return () => clearInterval(interval)
  }, [])

  const fetchEconomicData = async () => {
    try {
      const response = await fetch('/api/economic-releases/latest')
      const data = await response.json()

      if (data.releases) {
        const formattedData = data.releases.map((r: any) => ({
          date: new Date(r.release_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }),
          frequency: r.frequency,
          metric: r.metric_name,
          category: r.category,
          actualValue: r.actual_value,
          priorReading: r.prior_reading,
          signal: r.signal,
          trend: r.trend,
          description: r.description,
        }))
        setReleases(formattedData)
      }
    } catch (error) {
      console.error('Error fetching economic calendar:', error)
    } finally {
      setLoading(false)
    }
  }


  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Consumption': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      'Finance': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      'Inflation': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      'Labor': 'bg-green-500/10 text-green-400 border-green-500/20',
      'Growth': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      'Housing': 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    }
    return colors[category] || 'bg-muted text-muted-foreground border-border'
  }

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'Bullish': return 'text-positive'
      case 'Bearish': return 'text-negative'
      default: return 'text-muted-foreground'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '📈'
      case 'down': return '📉'
      default: return '📊'
    }
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
              📊 {releases.length} releases (10 shown, sorted by date ↓)
            </span>
            <button className="text-xs text-primary hover:underline">🔄</button>
          </CardTitle>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setView('latest')}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                view === 'latest' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              📊 Latest Values
            </button>
            <button
              onClick={() => setView('timeline')}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                view === 'timeline' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              📈 Timeline View
            </button>
            <button
              onClick={() => setView('all')}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                view === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              📋 All Releases
            </button>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="px-3 py-1 rounded-md bg-background border border-border text-sm"
          >
            <option>Last 6 months</option>
            <option>Last 3 months</option>
            <option>Last month</option>
            <option>Last year</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1 rounded-md bg-background border border-border text-sm"
          >
            <option>All Categories</option>
            <option>Consumption</option>
            <option>Finance</option>
            <option>Inflation</option>
            <option>Labor</option>
            <option>Growth</option>
            <option>Housing</option>
          </select>
          <select className="px-3 py-1 rounded-md bg-background border border-border text-sm">
            <option>All Frequencies</option>
            <option>Monthly</option>
            <option>Quarterly</option>
          </select>
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">DATE</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">METRIC</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">ACTUAL VALUE</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">PRIOR READING</th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground">SIGNAL</th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground">TREND</th>
              </tr>
            </thead>
            <tbody>
              {releases.map((release, index) => (
                <tr key={index} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-semibold">{release.date}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      📅 {release.frequency}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium">{release.metric}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs border ${getCategoryColor(release.category)}`}>
                        {release.category}
                      </span>
                    </div>
                    {release.description && (
                      <div className="text-xs text-muted-foreground mt-1">{release.description}</div>
                    )}
                  </td>
                  <td className="text-right py-3 px-4">
                    <div className="font-semibold text-base">{release.actualValue}</div>
                    <div className="text-xs text-muted-foreground">Percent</div>
                  </td>
                  <td className="text-right py-3 px-4">
                    <div className="font-medium">{release.priorReading}</div>
                  </td>
                  <td className="text-center py-3 px-4">
                    <div className={`flex items-center justify-center gap-1 ${getSignalColor(release.signal)}`}>
                      {release.signal === 'Bullish' && '●'}
                      {release.signal === 'Bearish' && '●'}
                      {release.signal === 'Neutral' && '●'}
                      <span className="font-medium">{release.signal}</span>
                    </div>
                  </td>
                  <td className="text-center py-3 px-4">
                    <div className="text-xl">{getTrendIcon(release.trend)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
