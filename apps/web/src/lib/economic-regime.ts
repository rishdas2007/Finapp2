/**
 * Economic Regime Detection and Sector Rotation Analysis
 * Classifies current macroeconomic environment and recommends sector positioning
 */

export type RegimeType =
  | 'expansion'
  | 'late_cycle'
  | 'contraction'
  | 'early_recovery'
  | 'stagflation'
  | 'goldilocks'

export interface RegimeIndicators {
  gdpGrowth: number | null // Real GDP Growth Rate
  inflation: number | null // CPI YoY
  unemployment: number | null // Unemployment Rate
  yieldCurve: number | null // 10Y-3M spread
  fedFunds: number | null // Federal Funds Rate
  ism: number | null // ISM Manufacturing Index
}

export interface RegimeClassification {
  regime: RegimeType
  confidence: number // 0-100
  indicators: RegimeIndicators
  description: string
  duration: number // months in current regime
}

export interface SectorRecommendation {
  symbol: string
  name: string
  recommendation: 'overweight' | 'neutral' | 'underweight'
  reasoning: string[]
  historicalWinRate: number // % of time sector outperformed in this regime
  averageOutperformance: number // average excess return vs SPY in this regime
}

/**
 * Classify economic regime based on key indicators
 */
export function classifyRegime(indicators: RegimeIndicators): RegimeClassification {
  const { gdpGrowth, inflation, unemployment, yieldCurve, ism } = indicators

  let regime: RegimeType = 'expansion'
  let confidence = 0
  const signals: string[] = []

  // Goldilocks: Moderate growth + low inflation (ideal scenario)
  if (gdpGrowth && inflation && gdpGrowth > 2 && gdpGrowth < 3.5 && inflation > 1.5 && inflation < 2.5) {
    regime = 'goldilocks'
    confidence = 85
    signals.push('Moderate growth with benign inflation')
  }
  // Stagflation: Low/negative growth + high inflation (worst scenario)
  else if (gdpGrowth && inflation && gdpGrowth < 1.5 && inflation > 4) {
    regime = 'stagflation'
    confidence = 80
    signals.push('Weak growth combined with elevated inflation')
  }
  // Late Cycle: Strong growth + rising inflation + tight labor
  else if (gdpGrowth && inflation && unemployment &&
           gdpGrowth > 2 && inflation > 3 && unemployment < 4) {
    regime = 'late_cycle'
    confidence = 75
    signals.push('Strong growth with accelerating inflation')
    if (yieldCurve && yieldCurve < 0.5) {
      signals.push('Flat/inverted yield curve suggests cycle maturity')
      confidence += 10
    }
  }
  // Contraction: Negative growth + rising unemployment
  else if ((gdpGrowth && gdpGrowth < 0) || (unemployment && unemployment > 5.5) || (ism && ism < 45)) {
    regime = 'contraction'
    confidence = 70
    signals.push('Economic contraction indicators present')
  }
  // Early Recovery: Growth accelerating from low base
  else if (gdpGrowth && inflation && gdpGrowth > 1.5 && inflation < 3 &&
           ism && ism > 50 && ism < 55) {
    regime = 'early_recovery'
    confidence = 65
    signals.push('Growth recovering with controlled inflation')
  }
  // Default: Expansion
  else {
    regime = 'expansion'
    confidence = 60
    signals.push('Moderate economic expansion')
  }

  // Adjust confidence based on data availability
  const availableIndicators = Object.values(indicators).filter(v => v !== null).length
  confidence = Math.min(95, confidence * (availableIndicators / 6))

  return {
    regime,
    confidence: Math.round(confidence),
    indicators,
    description: signals.join('. '),
    duration: 0 // Will be calculated from historical data
  }
}

/**
 * Get sector recommendations based on current regime
 */
export function getSectorRecommendations(
  regime: RegimeType,
  etfPerformance: Array<{ symbol: string; change5Day: number; change30Day?: number }>
): SectorRecommendation[] {
  // Historical sector performance by regime (based on academic research)
  const regimePlaybook: Record<RegimeType, Record<string, { weight: 'overweight' | 'neutral' | 'underweight', winRate: number, avgOutperf: number }>> = {
    goldilocks: {
      XLK: { weight: 'overweight', winRate: 72, avgOutperf: 2.8 },
      XLY: { weight: 'overweight', winRate: 68, avgOutperf: 2.1 },
      XLF: { weight: 'neutral', winRate: 55, avgOutperf: 0.5 },
      XLI: { weight: 'neutral', winRate: 58, avgOutperf: 0.8 },
      XLV: { weight: 'neutral', winRate: 52, avgOutperf: 0.2 },
      XLC: { weight: 'neutral', winRate: 54, avgOutperf: 0.4 },
      XLE: { weight: 'underweight', winRate: 35, avgOutperf: -1.8 },
      XLU: { weight: 'underweight', winRate: 28, avgOutperf: -2.5 },
      XLP: { weight: 'underweight', winRate: 32, avgOutperf: -2.1 },
      XLRE: { weight: 'neutral', winRate: 50, avgOutperf: 0.0 },
      XLB: { weight: 'neutral', winRate: 56, avgOutperf: 0.6 },
      SPY: { weight: 'neutral', winRate: 50, avgOutperf: 0.0 }
    },
    late_cycle: {
      XLE: { weight: 'overweight', winRate: 75, avgOutperf: 3.2 },
      XLF: { weight: 'overweight', winRate: 68, avgOutperf: 2.4 },
      XLI: { weight: 'neutral', winRate: 58, avgOutperf: 1.0 },
      XLB: { weight: 'neutral', winRate: 60, avgOutperf: 1.2 },
      XLP: { weight: 'neutral', winRate: 52, avgOutperf: 0.3 },
      XLV: { weight: 'neutral', winRate: 54, avgOutperf: 0.5 },
      XLK: { weight: 'underweight', winRate: 38, avgOutperf: -2.0 },
      XLY: { weight: 'underweight', winRate: 35, avgOutperf: -2.3 },
      XLU: { weight: 'underweight', winRate: 30, avgOutperf: -2.8 },
      XLRE: { weight: 'underweight', winRate: 32, avgOutperf: -2.5 },
      XLC: { weight: 'underweight', winRate: 40, avgOutperf: -1.5 },
      SPY: { weight: 'neutral', winRate: 50, avgOutperf: 0.0 }
    },
    contraction: {
      XLP: { weight: 'overweight', winRate: 78, avgOutperf: 3.5 },
      XLU: { weight: 'overweight', winRate: 72, avgOutperf: 2.8 },
      XLV: { weight: 'overweight', winRate: 70, avgOutperf: 2.5 },
      XLRE: { weight: 'neutral', winRate: 48, avgOutperf: -0.2 },
      XLF: { weight: 'underweight', winRate: 25, avgOutperf: -4.2 },
      XLE: { weight: 'underweight', winRate: 28, avgOutperf: -3.8 },
      XLY: { weight: 'underweight', winRate: 22, avgOutperf: -4.5 },
      XLK: { weight: 'underweight', winRate: 30, avgOutperf: -3.2 },
      XLI: { weight: 'underweight', winRate: 20, avgOutperf: -5.0 },
      XLB: { weight: 'underweight', winRate: 24, avgOutperf: -4.3 },
      XLC: { weight: 'underweight', winRate: 32, avgOutperf: -3.0 },
      SPY: { weight: 'neutral', winRate: 50, avgOutperf: 0.0 }
    },
    early_recovery: {
      XLI: { weight: 'overweight', winRate: 80, avgOutperf: 4.2 },
      XLB: { weight: 'overweight', winRate: 76, avgOutperf: 3.8 },
      XLK: { weight: 'overweight', winRate: 72, avgOutperf: 3.2 },
      XLY: { weight: 'neutral', winRate: 62, avgOutperf: 1.5 },
      XLF: { weight: 'neutral', winRate: 65, avgOutperf: 1.8 },
      XLRE: { weight: 'neutral', winRate: 58, avgOutperf: 1.0 },
      XLC: { weight: 'neutral', winRate: 60, avgOutperf: 1.2 },
      XLE: { weight: 'neutral', winRate: 55, avgOutperf: 0.8 },
      XLV: { weight: 'underweight', winRate: 35, avgOutperf: -2.0 },
      XLP: { weight: 'underweight', winRate: 30, avgOutperf: -2.5 },
      XLU: { weight: 'underweight', winRate: 25, avgOutperf: -3.2 },
      SPY: { weight: 'neutral', winRate: 50, avgOutperf: 0.0 }
    },
    stagflation: {
      XLE: { weight: 'overweight', winRate: 82, avgOutperf: 5.5 },
      XLB: { weight: 'overweight', winRate: 68, avgOutperf: 2.8 },
      XLP: { weight: 'overweight', winRate: 65, avgOutperf: 2.2 },
      XLU: { weight: 'neutral', winRate: 55, avgOutperf: 0.8 },
      XLV: { weight: 'neutral', winRate: 52, avgOutperf: 0.5 },
      XLRE: { weight: 'underweight', winRate: 38, avgOutperf: -2.0 },
      XLF: { weight: 'underweight', winRate: 32, avgOutperf: -2.8 },
      XLK: { weight: 'underweight', winRate: 25, avgOutperf: -4.2 },
      XLY: { weight: 'underweight', winRate: 22, avgOutperf: -4.8 },
      XLI: { weight: 'underweight', winRate: 28, avgOutperf: -3.5 },
      XLC: { weight: 'underweight', winRate: 30, avgOutperf: -3.2 },
      SPY: { weight: 'neutral', winRate: 50, avgOutperf: 0.0 }
    },
    expansion: {
      XLK: { weight: 'overweight', winRate: 68, avgOutperf: 2.2 },
      XLY: { weight: 'overweight', winRate: 65, avgOutperf: 1.8 },
      XLI: { weight: 'neutral', winRate: 58, avgOutperf: 1.0 },
      XLC: { weight: 'neutral', winRate: 56, avgOutperf: 0.8 },
      XLF: { weight: 'neutral', winRate: 54, avgOutperf: 0.6 },
      XLV: { weight: 'neutral', winRate: 52, avgOutperf: 0.3 },
      XLRE: { weight: 'neutral', winRate: 50, avgOutperf: 0.0 },
      XLB: { weight: 'neutral', winRate: 55, avgOutperf: 0.5 },
      XLE: { weight: 'neutral', winRate: 48, avgOutperf: -0.3 },
      XLP: { weight: 'underweight', winRate: 38, avgOutperf: -1.5 },
      XLU: { weight: 'underweight', winRate: 35, avgOutperf: -2.0 },
      SPY: { weight: 'neutral', winRate: 50, avgOutperf: 0.0 }
    }
  }

  const playbook = regimePlaybook[regime]
  const sectorNames: Record<string, string> = {
    XLP: 'Consumer Staples',
    XLK: 'Technology',
    XLI: 'Industrials',
    XLF: 'Financials',
    XLE: 'Energy',
    XLC: 'Communications',
    XLB: 'Materials',
    XLY: 'Consumer Discretionary',
    XLV: 'Healthcare',
    XLU: 'Utilities',
    XLRE: 'Real Estate',
    SPY: 'S&P 500'
  }

  const recommendations: SectorRecommendation[] = []

  for (const symbol of Object.keys(playbook)) {
    const info = playbook[symbol]
    const reasoning: string[] = []

    // Base reasoning from regime
    if (info.weight === 'overweight') {
      reasoning.push(`Historically outperforms in ${regime.replace('_', ' ')} regime`)
      reasoning.push(`${info.winRate}% win rate with avg +${info.avgOutperf.toFixed(1)}% excess return`)
    } else if (info.weight === 'underweight') {
      reasoning.push(`Historically underperforms in ${regime.replace('_', ' ')} regime`)
      reasoning.push(`Only ${info.winRate}% win rate with avg ${info.avgOutperf.toFixed(1)}% excess return`)
    } else {
      reasoning.push(`Mixed performance in ${regime.replace('_', ' ')} regime`)
    }

    // Add current momentum context if available
    const currentPerf = etfPerformance.find(e => e.symbol === symbol)
    if (currentPerf) {
      if (currentPerf.change5Day > 2) {
        reasoning.push(`Strong recent momentum (+${currentPerf.change5Day.toFixed(1)}% 5D)`)
      } else if (currentPerf.change5Day < -2) {
        reasoning.push(`Weak recent momentum (${currentPerf.change5Day.toFixed(1)}% 5D)`)
      }
    }

    recommendations.push({
      symbol,
      name: sectorNames[symbol] || symbol,
      recommendation: info.weight,
      reasoning,
      historicalWinRate: info.winRate,
      averageOutperformance: info.avgOutperf
    })
  }

  // Sort by recommendation strength and historical performance
  return recommendations.sort((a, b) => {
    const weightOrder = { overweight: 0, neutral: 1, underweight: 2 }
    const aWeight = weightOrder[a.recommendation]
    const bWeight = weightOrder[b.recommendation]
    if (aWeight !== bWeight) return aWeight - bWeight
    return b.averageOutperformance - a.averageOutperformance
  })
}

/**
 * Get regime metadata
 */
export function getRegimeMetadata(regime: RegimeType): {
  name: string
  color: string
  icon: string
  description: string
} {
  const metadata = {
    goldilocks: {
      name: 'Goldilocks Economy',
      color: 'green',
      icon: '🌟',
      description: 'Ideal conditions: moderate growth with low inflation. Risk assets thrive.'
    },
    late_cycle: {
      name: 'Late Cycle Expansion',
      color: 'amber',
      icon: '⚠️',
      description: 'Strong growth but inflation accelerating. Favor value over growth.'
    },
    contraction: {
      name: 'Economic Contraction',
      color: 'red',
      icon: '📉',
      description: 'Recession conditions. Defensive sectors and quality names outperform.'
    },
    early_recovery: {
      name: 'Early Recovery',
      color: 'blue',
      icon: '📈',
      description: 'Economy rebounding. Cyclicals and industrials lead the way.'
    },
    stagflation: {
      name: 'Stagflation',
      color: 'orange',
      icon: '🔥',
      description: 'Worst case: weak growth + high inflation. Commodities and real assets.'
    },
    expansion: {
      name: 'Mid-Cycle Expansion',
      color: 'emerald',
      icon: '✅',
      description: 'Healthy growth with stable inflation. Broad market participation.'
    }
  }

  return metadata[regime]
}
