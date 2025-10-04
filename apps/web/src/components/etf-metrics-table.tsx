'use client'

import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { useEffect, useState } from 'react'

interface ETFMetric {
  symbol: string
  name: string
  change1Day: number
  change5Day: number
  signal: 'BUY' | 'SELL' | 'HOLD'
  rsi: number
  rsiZ: number
  percentB: number
  percentBZ: number
  maGap: number
  maTrend: 'Bull' | 'Bear'
}

export function ETFMetricsTable() {
  const [etfData, setEtfData] = useState<ETFMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<string>('')

  useEffect(() => {
    fetchETFData()
    const interval = setInterval(fetchETFData, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [])

  const fetchETFData = async () => {
    try {
      const response = await fetch('/api/etf-metrics/latest')
      const data = await response.json()

      if (data.metrics) {
        const formattedData = data.metrics.map((m: any) => ({
          symbol: m.symbol,
          name: m.name,
          change1Day: m.change_1day,
          change5Day: m.change_5day,
          signal: m.signal,
          rsi: m.rsi,
          rsiZ: m.rsi_z,
          percentB: m.percent_b,
          percentBZ: m.percent_b_z,
          maGap: m.ma_gap,
          maTrend: m.ma_trend,
        }))
        setEtfData(formattedData)
        setLastUpdate(new Date(data.timestamp).toLocaleString())
      }
    } catch (error) {
      console.error('Error fetching ETF data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'BUY': return 'bg-positive/10 text-positive border-positive/20'
      case 'SELL': return 'bg-negative/10 text-negative border-negative/20'
      default: return 'bg-muted text-muted-foreground border-border'
    }
  }

  const formatPercent = (value: number | undefined) => {
    if (value === undefined || value === null) return 'N/A'
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  const formatNumber = (value: number | undefined) => {
    if (value === undefined || value === null) return 'N/A'
    return value.toFixed(2)
  }

  const getBuySignals = () => etfData.filter(e => e.signal === 'BUY').length
  const getSellSignals = () => etfData.filter(e => e.signal === 'SELL').length
  const getHoldSignals = () => etfData.filter(e => e.signal === 'HOLD').length

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>📊 ETF Technical Metrics</CardTitle>
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
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2">
          📊 ETF Technical Metrics
          <span className="text-xs text-muted-foreground font-normal">
            Updated: {lastUpdate}
          </span>
        </CardTitle>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">
            Signals: <span className="text-positive">{getBuySignals()} BUY</span>,{' '}
            <span className="text-negative">{getSellSignals()} SELL</span>,{' '}
            <span>{getHoldSignals()} HOLD</span>
          </span>
          <button
            onClick={fetchETFData}
            className="px-3 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            🔄 Refresh
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Symbol</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">5-Day</th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground">Signal</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">RSI</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">%B</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">MA Gap</th>
              </tr>
            </thead>
            <tbody>
              {etfData.map((etf) => (
                <tr key={etf.symbol} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                  <td className="py-3 px-4">
                    <div>
                      <div className="font-semibold">{etf.symbol}</div>
                      <div className="text-xs text-muted-foreground">{etf.name}</div>
                      <div className={`text-xs ${etf.change1Day !== undefined && etf.change1Day >= 0 ? 'text-positive' : etf.change1Day !== undefined ? 'text-negative' : 'text-muted-foreground'}`}>
                        {formatPercent(etf.change1Day)}
                      </div>
                    </div>
                  </td>
                  <td className="text-right py-3 px-4">
                    <div className={etf.change5Day >= 0 ? 'text-positive' : 'text-negative'}>
                      {formatPercent(etf.change5Day)}
                    </div>
                    <div className="text-xs text-muted-foreground">5D %</div>
                  </td>
                  <td className="text-center py-3 px-4">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getSignalColor(etf.signal)}`}>
                      {etf.signal}
                    </span>
                  </td>
                  <td className="text-right py-3 px-4">
                    <div className={etf.rsi > 70 ? 'text-negative' : etf.rsi < 30 ? 'text-positive' : ''}>
                      {formatNumber(etf.rsi)}
                    </div>
                    <div className="text-xs text-muted-foreground">Z: {formatNumber(etf.rsiZ)}</div>
                  </td>
                  <td className="text-right py-3 px-4">
                    <div className={etf.percentB > 80 ? 'text-negative' : etf.percentB < 20 ? 'text-positive' : ''}>
                      {formatNumber(etf.percentB)}%
                    </div>
                    <div className="text-xs text-muted-foreground">Z: {formatNumber(etf.percentBZ)}</div>
                  </td>
                  <td className="text-right py-3 px-4">
                    <div className={etf.maGap >= 0 ? 'text-positive' : 'text-negative'}>
                      {formatNumber(etf.maGap)}%
                    </div>
                    <div className="text-xs text-muted-foreground">{etf.maTrend}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 text-xs text-muted-foreground">
          Data source: Twelve Data API • Last updated: {lastUpdate}
        </div>
      </CardContent>
    </Card>
  )
}
