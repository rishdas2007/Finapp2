import { z } from 'zod'

export interface EconomicHealthScore {
  overall: number // 0-100 composite score
  categories: {
    growth: number // GDP metrics
    employment: number // Labor market
    inflation: number // Price stability
    monetary: number // Interest rate environment
    sentiment: number // Consumer/business confidence
  }
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING'
  zScores: Record<string, number>
  historicalPercentile: number
  lastUpdated: Date
  details: {
    growth: CategoryDetail
    employment: CategoryDetail
    inflation: CategoryDetail
    monetary: CategoryDetail
    sentiment: CategoryDetail
  }
}

export interface CategoryDetail {
  score: number
  metrics: MetricDetail[]
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING'
  description: string
}

export interface MetricDetail {
  seriesId: string
  name: string
  value: number
  previousValue: number
  change: number
  percentChange: number
  zScore: number
  weight: number
  contribution: number
}

export interface ScoringWeights {
  growth: number
  employment: number
  inflation: number
  monetary: number
  sentiment: number
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  growth: 0.25,
  employment: 0.30,
  inflation: 0.20,
  monetary: 0.15,
  sentiment: 0.10,
}

export interface EconomicIndicatorConfig {
  seriesId: string
  name: string
  category: keyof ScoringWeights
  weight: number
  inverted: boolean // True if lower is better (e.g., unemployment, inflation)
  targetValue?: number
  optimalRange?: { min: number; max: number }
}
