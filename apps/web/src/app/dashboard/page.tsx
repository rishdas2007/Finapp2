'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { ETFMetricsTable } from '@/components/etf-metrics-table'
import { ComprehensiveEconomicCalendarEnhanced } from '@/components/comprehensive-economic-calendar-enhanced'

export default function DashboardPage() {
  const [marketData, setMarketData] = useState<any>(null)
  const [economicData, setEconomicData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch market data for SPY
        const marketRes = await fetch('/api/market-data?symbol=SPY&interval=1day')
        const market = await marketRes.json()
        setMarketData(market)

        // Fetch economic data
        const economicRes = await fetch('/api/economic-data')
        const economic = await economicRes.json()
        setEconomicData(economic)
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-8">
          <h1 className="text-4xl font-bold mb-8">Financial Dashboard</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-1/2 mt-2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-muted rounded w-1/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const quote = marketData?.quote
  const healthScore = economicData?.healthScore

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-8">
        <h1 className="text-4xl font-bold mb-8">Financial Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Market Data Cards */}
          {quote && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    SPY Price
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{formatCurrency(quote.close)}</div>
                  <p className={`text-sm mt-2 ${quote.percent_change >= 0 ? 'text-positive' : 'text-negative'}`}>
                    {quote.percent_change >= 0 ? '↑' : '↓'} {formatPercent(Math.abs(quote.percent_change))}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Daily Change
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${quote.change >= 0 ? 'text-positive' : 'text-negative'}`}>
                    {quote.change >= 0 ? '+' : ''}{formatCurrency(quote.change)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Volume: {(quote.volume / 1000000).toFixed(2)}M
                  </p>
                </CardContent>
              </Card>
            </>
          )}

          {/* Economic Health Score */}
          {healthScore && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Economic Health
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{healthScore.overall}/100</div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Trend: {healthScore.trend}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Employment Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{healthScore.categories?.employment || 'N/A'}</div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Growth: {healthScore.categories?.growth || 'N/A'}
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* ETF Technical Metrics Table */}
        <div className="mt-8">
          <ETFMetricsTable />
        </div>

        {/* Economic Calendar */}
        <div className="mt-8">
          <ComprehensiveEconomicCalendarEnhanced />
        </div>
      </div>
    </div>
  )
}
