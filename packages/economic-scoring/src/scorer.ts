import type {
  EconomicHealthScore,
  CategoryDetail,
  MetricDetail,
  ScoringWeights,
  EconomicIndicatorConfig,
} from './types'
import { DEFAULT_SCORING_WEIGHTS } from './types'
import { ECONOMIC_INDICATORS, getIndicatorsByCategory } from './config'
import { calculateZScore, mean, percentile } from '@financial-dashboard/analytics'
import type { FredObservationsResponse } from '@financial-dashboard/data-sources'

/**
 * Calculate economic health score from FRED data
 *
 * @param fredData Map of series ID to FRED observations
 * @param weights Custom category weights (optional)
 * @returns Comprehensive economic health score
 */
export function calculateEconomicHealthScore(
  fredData: Map<string, FredObservationsResponse>,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS
): EconomicHealthScore {
  const categoryScores = {
    growth: calculateCategoryScore(fredData, 'growth'),
    employment: calculateCategoryScore(fredData, 'employment'),
    inflation: calculateCategoryScore(fredData, 'inflation'),
    monetary: calculateCategoryScore(fredData, 'monetary'),
    sentiment: calculateCategoryScore(fredData, 'sentiment'),
  }

  // Calculate weighted overall score
  const overall =
    categoryScores.growth.score * weights.growth +
    categoryScores.employment.score * weights.employment +
    categoryScores.inflation.score * weights.inflation +
    categoryScores.monetary.score * weights.monetary +
    categoryScores.sentiment.score * weights.sentiment

  // Collect all z-scores
  const zScores: Record<string, number> = {}
  Object.values(categoryScores).forEach(category => {
    category.metrics.forEach(metric => {
      zScores[metric.seriesId] = metric.zScore
    })
  })

  // Determine overall trend
  const trends = Object.values(categoryScores).map(c => c.trend)
  const improvingCount = trends.filter(t => t === 'IMPROVING').length
  const decliningCount = trends.filter(t => t === 'DECLINING').length

  let overallTrend: EconomicHealthScore['trend']
  if (improvingCount > decliningCount + 1) {
    overallTrend = 'IMPROVING'
  } else if (decliningCount > improvingCount + 1) {
    overallTrend = 'DECLINING'
  } else {
    overallTrend = 'STABLE'
  }

  // Calculate historical percentile (simulated - would need historical scores in practice)
  const historicalPercentile = calculateHistoricalPercentile(overall)

  return {
    overall: Math.round(overall * 100) / 100,
    categories: {
      growth: Math.round(categoryScores.growth.score * 100) / 100,
      employment: Math.round(categoryScores.employment.score * 100) / 100,
      inflation: Math.round(categoryScores.inflation.score * 100) / 100,
      monetary: Math.round(categoryScores.monetary.score * 100) / 100,
      sentiment: Math.round(categoryScores.sentiment.score * 100) / 100,
    },
    trend: overallTrend,
    zScores,
    historicalPercentile,
    lastUpdated: new Date(),
    details: categoryScores,
  }
}

/**
 * Calculate score for a single category
 */
function calculateCategoryScore(
  fredData: Map<string, FredObservationsResponse>,
  category: keyof ScoringWeights
): CategoryDetail {
  const indicators = getIndicatorsByCategory(category)
  const metrics: MetricDetail[] = []
  let totalWeight = 0
  let weightedScore = 0

  indicators.forEach(indicator => {
    const data = fredData.get(indicator.seriesId)
    if (!data || data.observations.length < 2) return

    const metricDetail = calculateMetricScore(indicator, data)
    metrics.push(metricDetail)

    totalWeight += indicator.weight
    weightedScore += metricDetail.contribution
  })

  // Normalize to 0-100 scale
  const categoryScore = totalWeight > 0 ? (weightedScore / totalWeight) * 100 : 50

  // Determine category trend based on metric changes
  const positiveChanges = metrics.filter(m => m.change > 0).length
  const negativeChanges = metrics.filter(m => m.change < 0).length

  let trend: CategoryDetail['trend']
  if (positiveChanges > negativeChanges + 1) {
    trend = 'IMPROVING'
  } else if (negativeChanges > positiveChanges + 1) {
    trend = 'DECLINING'
  } else {
    trend = 'STABLE'
  }

  return {
    score: Math.round(categoryScore * 100) / 100,
    metrics,
    trend,
    description: getCategoryDescription(category, categoryScore, trend),
  }
}

/**
 * Calculate score for a single metric
 */
function calculateMetricScore(
  indicator: EconomicIndicatorConfig,
  data: FredObservationsResponse
): MetricDetail {
  const observations = data.observations
  const latestObs = observations[observations.length - 1]
  const previousObs = observations[observations.length - 2]

  // Parse values (FRED uses "." for missing)
  const parseValue = (val: string): number => {
    if (val === '.' || val === '') return 0
    return parseFloat(val)
  }

  const currentValue = parseValue(latestObs.value)
  const previousValue = parseValue(previousObs.value)
  const change = currentValue - previousValue
  const percentChange = previousValue !== 0 ? (change / previousValue) * 100 : 0

  // Calculate z-score using 12-month history
  const historicalValues = observations
    .slice(-12, -1)
    .map(obs => parseValue(obs.value))
    .filter(val => val !== 0)

  const zScoreResult = calculateZScore(currentValue, historicalValues)

  // Calculate normalized score (0-100)
  let normalizedScore = 50 // Default neutral score

  if (indicator.optimalRange) {
    // Score based on optimal range
    const { min, max } = indicator.optimalRange
    if (currentValue >= min && currentValue <= max) {
      normalizedScore = 100
    } else if (currentValue < min) {
      const distance = (min - currentValue) / min
      normalizedScore = Math.max(0, 100 - distance * 100)
    } else {
      const distance = (currentValue - max) / max
      normalizedScore = Math.max(0, 100 - distance * 100)
    }
  } else if (indicator.targetValue) {
    // Score based on distance from target
    const distance = Math.abs(currentValue - indicator.targetValue) / indicator.targetValue
    normalizedScore = Math.max(0, 100 - distance * 100)
  } else {
    // Score based on z-score
    // Z-score of 0 = 50, positive z-score increases score (unless inverted)
    const zScoreImpact = (zScoreResult.value / 3) * 50 // ±3 std devs = ±50 points
    normalizedScore = indicator.inverted
      ? 50 - zScoreImpact
      : 50 + zScoreImpact
  }

  // Clamp to 0-100
  normalizedScore = Math.max(0, Math.min(100, normalizedScore))

  // Calculate contribution to category score
  const contribution = normalizedScore * indicator.weight

  return {
    seriesId: indicator.seriesId,
    name: indicator.name,
    value: Math.round(currentValue * 100) / 100,
    previousValue: Math.round(previousValue * 100) / 100,
    change: Math.round(change * 100) / 100,
    percentChange: Math.round(percentChange * 100) / 100,
    zScore: zScoreResult.value,
    weight: indicator.weight,
    contribution: Math.round(contribution * 100) / 100,
  }
}

/**
 * Calculate historical percentile (simplified version)
 */
function calculateHistoricalPercentile(score: number): number {
  // In a real implementation, this would compare against historical scores
  // For now, we'll use a simple mapping based on score ranges
  if (score >= 80) return 95
  if (score >= 70) return 85
  if (score >= 60) return 70
  if (score >= 50) return 50
  if (score >= 40) return 30
  if (score >= 30) return 15
  return 5
}

/**
 * Get human-readable category description
 */
function getCategoryDescription(
  category: keyof ScoringWeights,
  score: number,
  trend: CategoryDetail['trend']
): string {
  const trendText =
    trend === 'IMPROVING'
      ? 'improving'
      : trend === 'DECLINING'
      ? 'declining'
      : 'stable'

  const scoreText =
    score >= 80
      ? 'strong'
      : score >= 60
      ? 'healthy'
      : score >= 40
      ? 'moderate'
      : 'weak'

  const descriptions: Record<keyof ScoringWeights, string> = {
    growth: `Economic growth is ${scoreText} and ${trendText}`,
    employment: `Labor market conditions are ${scoreText} and ${trendText}`,
    inflation: `Price stability is ${scoreText} and ${trendText}`,
    monetary: `Monetary environment is ${scoreText} and ${trendText}`,
    sentiment: `Consumer and business sentiment is ${scoreText} and ${trendText}`,
  }

  return descriptions[category]
}

/**
 * Get score interpretation
 */
export function interpretScore(score: number): {
  level: string
  description: string
  color: string
} {
  if (score >= 80) {
    return {
      level: 'Excellent',
      description: 'Economy is performing very well across most indicators',
      color: '#10b981',
    }
  } else if (score >= 70) {
    return {
      level: 'Good',
      description: 'Economy is healthy with positive indicators',
      color: '#22c55e',
    }
  } else if (score >= 60) {
    return {
      level: 'Fair',
      description: 'Economy is stable with mixed signals',
      color: '#84cc16',
    }
  } else if (score >= 50) {
    return {
      level: 'Moderate',
      description: 'Economy shows signs of weakness in some areas',
      color: '#f59e0b',
    }
  } else if (score >= 40) {
    return {
      level: 'Weak',
      description: 'Economy is underperforming with concerning indicators',
      color: '#f97316',
    }
  } else {
    return {
      level: 'Poor',
      description: 'Economy is struggling with significant challenges',
      color: '#ef4444',
    }
  }
}
