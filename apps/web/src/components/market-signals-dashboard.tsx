'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react'

interface ETFMetric {
  symbol: string
  name: string
  signal: string
  rsi: number
  rsiZ: number
  percentB: number
  percentBZ: number
  change5Day: number
}

interface EconomicIndicator {
  name: string
  current_value: number
  signal: string
  z_score: number
  category: string
}

interface MarketSignal {
  type: 'positive' | 'negative' | 'neutral'
  category: string
  title: string
  description: string
  strength: number // 0-100
}

export default function MarketSignalsDashboard() {
  const [signals, setSignals] = useState<MarketSignal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAndAnalyzeData() {
      try {
        setLoading(true)

        // Fetch ETF metrics and economic indicators in parallel
        const [etfResponse, economicResponse] = await Promise.all([
          fetch('/api/etf-metrics/latest'),
          fetch('/api/economic-indicators/latest')
        ])

        const etfData = await etfResponse.json()
        const economicData = await economicResponse.json()

        // Generate signals from data
        const generatedSignals = generateSignals(
          etfData.metrics || [],
          economicData.indicators || []
        )

        setSignals(generatedSignals)
      } catch (error) {
        console.error('Error fetching market data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAndAnalyzeData()
  }, [])

  function generateSignals(etfs: ETFMetric[], economics: EconomicIndicator[]): MarketSignal[] {
    const signals: MarketSignal[] = []

    // 1. ETF Momentum Analysis
    const strongBuys = etfs.filter(e => e.signal === 'STRONG BUY' || e.signal === 'BUY')
    const strongSells = etfs.filter(e => e.signal === 'STRONG SELL' || e.signal === 'SELL')

    if (strongBuys.length >= 3) {
      signals.push({
        type: 'positive',
        category: 'Technical',
        title: `${strongBuys.length} ETF Buy Signals`,
        description: `Strong oversold conditions detected in ${strongBuys.map(e => e.symbol).join(', ')}`,
        strength: Math.min(100, strongBuys.length * 20)
      })
    }

    if (strongSells.length >= 3) {
      signals.push({
        type: 'negative',
        category: 'Technical',
        title: `${strongSells.length} ETF Sell Signals`,
        description: `Overbought conditions in ${strongSells.map(e => e.symbol).join(', ')}`,
        strength: Math.min(100, strongSells.length * 20)
      })
    }

    // 2. SPY Momentum
    const spy = etfs.find(e => e.symbol === 'SPY')
    if (spy) {
      if (spy.change5Day > 3) {
        signals.push({
          type: 'positive',
          category: 'Market',
          title: 'Strong SPY Momentum',
          description: `S&P 500 up ${spy.change5Day.toFixed(2)}% over 5 days`,
          strength: Math.min(100, Math.abs(spy.change5Day) * 15)
        })
      } else if (spy.change5Day < -3) {
        signals.push({
          type: 'negative',
          category: 'Market',
          title: 'SPY Downtrend',
          description: `S&P 500 down ${Math.abs(spy.change5Day).toFixed(2)}% over 5 days`,
          strength: Math.min(100, Math.abs(spy.change5Day) * 15)
        })
      }

      // RSI extremes for SPY
      if (spy.rsi > 70) {
        signals.push({
          type: 'negative',
          category: 'Technical',
          title: 'SPY Overbought',
          description: `RSI at ${spy.rsi.toFixed(1)} indicates potential pullback`,
          strength: Math.min(100, (spy.rsi - 70) * 3)
        })
      } else if (spy.rsi < 30) {
        signals.push({
          type: 'positive',
          category: 'Technical',
          title: 'SPY Oversold',
          description: `RSI at ${spy.rsi.toFixed(1)} suggests potential bounce`,
          strength: Math.min(100, (30 - spy.rsi) * 3)
        })
      }
    }

    // 3. Sector Rotation Analysis
    const techETFs = etfs.filter(e => ['XLK', 'XLC'].includes(e.symbol))
    const defensiveETFs = etfs.filter(e => ['XLP', 'XLU', 'XLV'].includes(e.symbol))

    const techAvgChange = techETFs.reduce((sum, e) => sum + e.change5Day, 0) / techETFs.length
    const defensiveAvgChange = defensiveETFs.reduce((sum, e) => sum + e.change5Day, 0) / defensiveETFs.length

    if (techAvgChange > defensiveAvgChange + 2) {
      signals.push({
        type: 'positive',
        category: 'Sector',
        title: 'Tech Sector Leadership',
        description: 'Growth sectors outperforming defensive sectors',
        strength: Math.min(100, (techAvgChange - defensiveAvgChange) * 20)
      })
    } else if (defensiveAvgChange > techAvgChange + 2) {
      signals.push({
        type: 'negative',
        category: 'Sector',
        title: 'Defensive Rotation',
        description: 'Money flowing into defensive sectors - risk-off sentiment',
        strength: Math.min(100, (defensiveAvgChange - techAvgChange) * 20)
      })
    }

    // 4. Economic Indicators Analysis
    const inflationIndicators = economics.filter(e =>
      e.category === 'Inflation' || e.name.toLowerCase().includes('cpi')
    )

    for (const indicator of inflationIndicators) {
      if (indicator.z_score > 2) {
        signals.push({
          type: 'negative',
          category: 'Economic',
          title: `Elevated ${indicator.name}`,
          description: `${indicator.current_value.toFixed(2)}% is significantly above historical average`,
          strength: Math.min(100, Math.abs(indicator.z_score) * 30)
        })
      } else if (indicator.z_score < -2) {
        signals.push({
          type: 'positive',
          category: 'Economic',
          title: `${indicator.name} Cooling`,
          description: `${indicator.current_value.toFixed(2)}% below historical average`,
          strength: Math.min(100, Math.abs(indicator.z_score) * 30)
        })
      }
    }

    // 5. Volatility Analysis (using RSI z-scores as proxy)
    const avgRSIZ = etfs.reduce((sum, e) => sum + Math.abs(e.rsiZ), 0) / etfs.length
    if (avgRSIZ > 1.5) {
      signals.push({
        type: 'neutral',
        category: 'Market',
        title: 'Elevated Market Volatility',
        description: 'Technical indicators showing increased dispersion',
        strength: Math.min(100, avgRSIZ * 40)
      })
    }

    // Sort by strength and limit to top 8 signals
    return signals
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 8)
  }

  const positiveSignals = signals.filter(s => s.type === 'positive')
  const negativeSignals = signals.filter(s => s.type === 'negative')
  const neutralSignals = signals.filter(s => s.type === 'neutral')

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Market Signals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-pulse text-muted-foreground">Analyzing market data...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Market Signals
          <span className="text-sm font-normal text-muted-foreground ml-2">
            Programmatic analysis of technical and economic indicators
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Positive Signals */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-green-700 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Positive Signals ({positiveSignals.length})
            </h3>
            {positiveSignals.length === 0 ? (
              <p className="text-sm text-muted-foreground">No strong positive signals</p>
            ) : (
              <div className="space-y-2">
                {positiveSignals.map((signal, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-green-50 border border-green-200 rounded-lg"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-sm font-semibold text-green-900">{signal.title}</p>
                      <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded">
                        {signal.category}
                      </span>
                    </div>
                    <p className="text-xs text-green-800">{signal.description}</p>
                    <div className="mt-2 w-full bg-green-200 rounded-full h-1.5">
                      <div
                        className="bg-green-600 h-1.5 rounded-full transition-all"
                        style={{ width: `${signal.strength}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Negative Signals */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-amber-700 flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Negative Signals ({negativeSignals.length})
            </h3>
            {negativeSignals.length === 0 ? (
              <p className="text-sm text-muted-foreground">No strong negative signals</p>
            ) : (
              <div className="space-y-2">
                {negativeSignals.map((signal, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-amber-50 border border-amber-200 rounded-lg"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-sm font-semibold text-amber-900">{signal.title}</p>
                      <span className="text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                        {signal.category}
                      </span>
                    </div>
                    <p className="text-xs text-amber-800">{signal.description}</p>
                    <div className="mt-2 w-full bg-amber-200 rounded-full h-1.5">
                      <div
                        className="bg-amber-600 h-1.5 rounded-full transition-all"
                        style={{ width: `${signal.strength}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Neutral Signals */}
        {neutralSignals.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
              <CheckCircle className="h-4 w-4" />
              Noteworthy Observations ({neutralSignals.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {neutralSignals.map((signal, idx) => (
                <div
                  key={idx}
                  className="p-2 bg-gray-50 border border-gray-200 rounded-lg"
                >
                  <p className="text-xs font-semibold text-gray-900">{signal.title}</p>
                  <p className="text-xs text-gray-700">{signal.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
