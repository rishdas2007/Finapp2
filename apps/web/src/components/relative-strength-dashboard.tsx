'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { ArrowUp, ArrowDown, TrendingUp, AlertCircle } from 'lucide-react'
import { getTrendIcon, getStrengthCategory } from '@/lib/relative-strength'

interface RelativeStrengthScore {
  symbol: string
  name: string
  returns: {
    oneWeek: number | null
    oneMonth: number | null
    threeMonth: number | null
    sixMonth: number | null
  }
  momentumScore: number
  percentileRank: number
  trend: 'accelerating' | 'steady' | 'decelerating' | 'reversing'
  vsSpyExcess: {
    oneWeek: number | null
    oneMonth: number | null
    threeMonth: number | null
    sixMonth: number | null
  }
  rank: number
}

interface RSData {
  rankings: RelativeStrengthScore[]
  summary: {
    topPerformers: Array<{ symbol: string; name: string; momentumScore: number; trend: string }>
    bottomPerformers: Array<{ symbol: string; name: string; momentumScore: number; trend: string }>
    rotationSignals: Array<{ from: string; to: string; strength: string }>
  }
}

export function RelativeStrengthDashboard() {
  const [data, setData] = useState<RSData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchRSData()
  }, [])

  const fetchRSData = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/market-analysis/relative-strength')

      if (!response.ok) {
        throw new Error('Failed to fetch relative strength data')
      }

      const result = await response.json()
      setData(result)
    } catch (err: any) {
      console.error('Error fetching RS data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatPercent = (value: number | null, showSign: boolean = true): string => {
    if (value === null) return 'N/A'
    const sign = showSign && value > 0 ? '+' : ''
    return `${sign}${value.toFixed(2)}%`
  }

  const getPercentColor = (value: number | null): string => {
    if (value === null) return 'text-gray-500'
    return value >= 0 ? 'text-green-600' : 'text-red-600'
  }

  const getRankBadgeColor = (rank: number, total: number): string => {
    if (rank <= 3) return 'bg-green-100 text-green-800 border-green-300'
    if (rank >= total - 2) return 'bg-red-100 text-red-800 border-red-300'
    return 'bg-gray-100 text-gray-700 border-gray-300'
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Relative Strength Rankings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48">
            <div className="animate-pulse text-muted-foreground">Calculating momentum rankings...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Relative Strength Rankings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-red-600">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{error || 'Failed to load RS data'}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { rankings, summary } = data

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Relative Strength Rankings
        </CardTitle>
        <CardDescription>
          Multi-timeframe momentum analysis with percentile rankings vs historical performance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Rotation Signals */}
        {summary.rotationSignals.length > 0 && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <ArrowUp className="h-4 w-4" />
              Rotation Signal Detected
            </h4>
            {summary.rotationSignals.map((signal, idx) => (
              <p key={idx} className="text-sm text-blue-800">
                <span className="font-medium">Money rotating FROM {signal.from} TO {signal.to}</span>
                {' '}({signal.strength} signal)
              </p>
            ))}
          </div>
        )}

        {/* Rankings Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Rank</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">ETF</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">1W</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">1M</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">3M</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">6M</th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground">Score</th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground">Percentile</th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground">Trend</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((etf) => {
                const strength = getStrengthCategory(etf.percentileRank)

                return (
                  <tr
                    key={etf.symbol}
                    className={`border-b border-border/50 hover:bg-muted/50 transition-colors ${
                      etf.symbol === 'SPY' ? 'bg-yellow-50' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-1 rounded-md text-xs font-semibold border ${getRankBadgeColor(etf.rank, rankings.length)}`}>
                        #{etf.rank}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-semibold">{etf.symbol}</div>
                        <div className="text-xs text-muted-foreground">{etf.name}</div>
                      </div>
                    </td>
                    <td className={`text-right py-3 px-4 font-medium tabular-nums ${getPercentColor(etf.returns.oneWeek)}`}>
                      {formatPercent(etf.returns.oneWeek)}
                      {etf.vsSpyExcess.oneWeek !== null && (
                        <div className="text-xs text-muted-foreground">
                          vs SPY: {formatPercent(etf.vsSpyExcess.oneWeek, true)}
                        </div>
                      )}
                    </td>
                    <td className={`text-right py-3 px-4 font-medium tabular-nums ${getPercentColor(etf.returns.oneMonth)}`}>
                      {formatPercent(etf.returns.oneMonth)}
                      {etf.vsSpyExcess.oneMonth !== null && (
                        <div className="text-xs text-muted-foreground">
                          vs SPY: {formatPercent(etf.vsSpyExcess.oneMonth, true)}
                        </div>
                      )}
                    </td>
                    <td className={`text-right py-3 px-4 font-medium tabular-nums ${getPercentColor(etf.returns.threeMonth)}`}>
                      {formatPercent(etf.returns.threeMonth)}
                      {etf.vsSpyExcess.threeMonth !== null && (
                        <div className="text-xs text-muted-foreground">
                          vs SPY: {formatPercent(etf.vsSpyExcess.threeMonth, true)}
                        </div>
                      )}
                    </td>
                    <td className={`text-right py-3 px-4 font-medium tabular-nums ${getPercentColor(etf.returns.sixMonth)}`}>
                      {formatPercent(etf.returns.sixMonth)}
                      {etf.vsSpyExcess.sixMonth !== null && (
                        <div className="text-xs text-muted-foreground">
                          vs SPY: {formatPercent(etf.vsSpyExcess.sixMonth, true)}
                        </div>
                      )}
                    </td>
                    <td className="text-center py-3 px-4">
                      <div className={`font-semibold ${getPercentColor(etf.momentumScore)}`}>
                        {formatPercent(etf.momentumScore)}
                      </div>
                    </td>
                    <td className="text-center py-3 px-4">
                      <div>
                        <span className={`inline-block px-2 py-1 rounded-md text-xs font-semibold ${
                          strength.color === 'green' ? 'bg-green-100 text-green-800' :
                          strength.color === 'emerald' ? 'bg-emerald-100 text-emerald-800' :
                          strength.color === 'amber' ? 'bg-amber-100 text-amber-800' :
                          strength.color === 'red' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {etf.percentileRank}th
                        </span>
                        <div className="text-xs text-muted-foreground mt-1">{strength.label}</div>
                      </div>
                    </td>
                    <td className="text-center py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-lg">{getTrendIcon(etf.trend)}</span>
                        <span className="text-xs text-muted-foreground capitalize">{etf.trend}</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Top/Bottom Performers Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
              <ArrowUp className="h-4 w-4" />
              Top 3 Performers
            </h4>
            <div className="space-y-2">
              {summary.topPerformers.map((etf, idx) => (
                <div key={etf.symbol} className="flex items-center justify-between text-sm">
                  <span className="font-medium">
                    #{idx + 1} {etf.symbol} - {etf.name}
                  </span>
                  <span className="text-green-700 font-semibold">
                    {formatPercent(etf.momentumScore)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
              <ArrowDown className="h-4 w-4" />
              Bottom 3 Performers
            </h4>
            <div className="space-y-2">
              {summary.bottomPerformers.map((etf, idx) => (
                <div key={etf.symbol} className="flex items-center justify-between text-sm">
                  <span className="font-medium">
                    {etf.symbol} - {etf.name}
                  </span>
                  <span className="text-red-700 font-semibold">
                    {formatPercent(etf.momentumScore)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Methodology */}
        <div className="mt-4 p-4 bg-muted/30 rounded-lg text-sm">
          <p className="font-semibold mb-2">Methodology</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs">
            <li>
              <strong>Momentum Score:</strong> Weighted average (10% 1W, 20% 1M, 35% 3M, 35% 6M)
            </li>
            <li>
              <strong>vs SPY:</strong> Excess return over S&P 500 benchmark
            </li>
            <li>
              <strong>Percentile Rank:</strong> Current score vs all ETFs (higher = stronger momentum)
            </li>
            <li>
              <strong>Trend:</strong> Accelerating (improving), Steady, Decelerating, or Reversing
            </li>
            <li>
              <strong>Usage:</strong> Favor ETFs in top quartile (≥75th percentile) with accelerating trends
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
