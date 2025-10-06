'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react'

interface RegimeClassification {
  regime: string
  confidence: number
  description: string
  duration: number
  metadata: {
    name: string
    color: string
    icon: string
    description: string
  }
  indicators: {
    gdpGrowth: number | null
    inflation: number | null
    unemployment: number | null
    yieldCurve: number | null
    fedFunds: number | null
    ism: number | null
  }
}

interface SectorRecommendation {
  symbol: string
  name: string
  recommendation: 'overweight' | 'neutral' | 'underweight'
  reasoning: string[]
  historicalWinRate: number
  averageOutperformance: number
}

interface RegimeData {
  classification: RegimeClassification
  recommendations: SectorRecommendation[]
  dataQuality: {
    indicatorsAvailable: number
    totalIndicators: number
    lastUpdated: string | null
  }
}

export function EconomicRegimeDashboard() {
  const [data, setData] = useState<RegimeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchRegimeData()
  }, [])

  const fetchRegimeData = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/market-analysis/regime')

      if (!response.ok) {
        throw new Error('Failed to fetch regime data')
      }

      const result = await response.json()
      setData(result)
    } catch (err: any) {
      console.error('Error fetching regime data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getRecommendationIcon = (rec: 'overweight' | 'neutral' | 'underweight') => {
    switch (rec) {
      case 'overweight':
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'underweight':
        return <TrendingDown className="h-4 w-4 text-red-600" />
      default:
        return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  const getRecommendationColor = (rec: 'overweight' | 'neutral' | 'underweight') => {
    switch (rec) {
      case 'overweight':
        return 'bg-green-50 border-green-200 text-green-900'
      case 'underweight':
        return 'bg-red-50 border-red-200 text-red-900'
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700'
    }
  }

  const getRegimeColor = (color: string) => {
    const colorMap: Record<string, string> = {
      green: 'bg-green-100 text-green-800 border-green-300',
      emerald: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      blue: 'bg-blue-100 text-blue-800 border-blue-300',
      amber: 'bg-amber-100 text-amber-800 border-amber-300',
      orange: 'bg-orange-100 text-orange-800 border-orange-300',
      red: 'bg-red-100 text-red-800 border-red-300'
    }
    return colorMap[color] || 'bg-gray-100 text-gray-800 border-gray-300'
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Economic Regime Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48">
            <div className="animate-pulse text-muted-foreground">Analyzing economic conditions...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Economic Regime Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-red-600">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{error || 'Failed to load regime data'}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { classification, recommendations, dataQuality } = data
  const overweights = recommendations.filter(r => r.recommendation === 'overweight')
  const underweights = recommendations.filter(r => r.recommendation === 'underweight')

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {classification.metadata.icon} Economic Regime & Sector Playbook
        </CardTitle>
        <CardDescription>
          AI-driven regime classification with historical sector performance analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Regime */}
        <div className="p-4 rounded-lg border-2" style={{ borderColor: `var(--${classification.metadata.color}-300)` }}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-2xl font-bold">{classification.metadata.name}</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getRegimeColor(classification.metadata.color)}`}>
                  {classification.confidence}% Confidence
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {classification.metadata.description}
              </p>
              <p className="text-xs text-muted-foreground italic">
                {classification.description}
              </p>
            </div>
          </div>

          {/* Key Indicators */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-4 pt-4 border-t border-border">
            {classification.indicators.gdpGrowth !== null && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground">GDP Growth</p>
                <p className="text-lg font-semibold">{classification.indicators.gdpGrowth.toFixed(1)}%</p>
              </div>
            )}
            {classification.indicators.inflation !== null && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground">CPI YoY</p>
                <p className="text-lg font-semibold">{classification.indicators.inflation.toFixed(1)}%</p>
              </div>
            )}
            {classification.indicators.unemployment !== null && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Unemployment</p>
                <p className="text-lg font-semibold">{classification.indicators.unemployment.toFixed(1)}%</p>
              </div>
            )}
            {classification.indicators.yieldCurve !== null && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Yield Curve</p>
                <p className="text-lg font-semibold">{classification.indicators.yieldCurve.toFixed(2)}bp</p>
              </div>
            )}
            {classification.indicators.ism !== null && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground">ISM PMI</p>
                <p className="text-lg font-semibold">{classification.indicators.ism.toFixed(1)}</p>
              </div>
            )}
            {classification.indicators.fedFunds !== null && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Fed Funds</p>
                <p className="text-lg font-semibold">{classification.indicators.fedFunds.toFixed(2)}%</p>
              </div>
            )}
          </div>
        </div>

        {/* Sector Recommendations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Overweight Sectors */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <h4 className="font-semibold text-green-900">Overweight ({overweights.length})</h4>
            </div>
            <div className="space-y-2">
              {overweights.map(rec => (
                <div key={rec.symbol} className={`p-3 rounded-lg border ${getRecommendationColor(rec.recommendation)}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {getRecommendationIcon(rec.recommendation)}
                      <span className="font-semibold">{rec.symbol}</span>
                      <span className="text-xs text-muted-foreground">- {rec.name}</span>
                    </div>
                    <span className="text-xs font-medium bg-white px-2 py-0.5 rounded">
                      {rec.historicalWinRate}% Win Rate
                    </span>
                  </div>
                  <ul className="text-xs space-y-0.5 mt-2">
                    {rec.reasoning.slice(0, 2).map((reason, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="mr-1">•</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 pt-2 border-t border-green-200">
                    <span className="text-xs font-medium">
                      Avg Outperformance: <span className="text-green-700">+{rec.averageOutperformance.toFixed(1)}%</span>
                    </span>
                  </div>
                </div>
              ))}
              {overweights.length === 0 && (
                <p className="text-sm text-muted-foreground italic">No strong overweight recommendations</p>
              )}
            </div>
          </div>

          {/* Underweight Sectors */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              <h4 className="font-semibold text-red-900">Underweight ({underweights.length})</h4>
            </div>
            <div className="space-y-2">
              {underweights.map(rec => (
                <div key={rec.symbol} className={`p-3 rounded-lg border ${getRecommendationColor(rec.recommendation)}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {getRecommendationIcon(rec.recommendation)}
                      <span className="font-semibold">{rec.symbol}</span>
                      <span className="text-xs text-muted-foreground">- {rec.name}</span>
                    </div>
                    <span className="text-xs font-medium bg-white px-2 py-0.5 rounded">
                      {rec.historicalWinRate}% Win Rate
                    </span>
                  </div>
                  <ul className="text-xs space-y-0.5 mt-2">
                    {rec.reasoning.slice(0, 2).map((reason, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="mr-1">•</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 pt-2 border-t border-red-200">
                    <span className="text-xs font-medium">
                      Avg Outperformance: <span className="text-red-700">{rec.averageOutperformance.toFixed(1)}%</span>
                    </span>
                  </div>
                </div>
              ))}
              {underweights.length === 0 && (
                <p className="text-sm text-muted-foreground italic">No strong underweight recommendations</p>
              )}
            </div>
          </div>
        </div>

        {/* Methodology */}
        <div className="mt-4 p-4 bg-muted/30 rounded-lg text-sm">
          <p className="font-semibold mb-2">Methodology</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs">
            <li>
              <strong>Regime Classification:</strong> Based on GDP growth, inflation, unemployment, yield curve, and ISM PMI
            </li>
            <li>
              <strong>Historical Analysis:</strong> Win rates and outperformance calculated from 20+ years of sector returns
            </li>
            <li>
              <strong>Data Quality:</strong> {dataQuality.indicatorsAvailable}/{dataQuality.totalIndicators} indicators available
            </li>
            <li>
              <strong>Rebalancing:</strong> Review recommendations monthly or when regime changes
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
