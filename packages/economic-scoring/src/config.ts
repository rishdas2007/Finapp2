import type { EconomicIndicatorConfig } from './types'
import { FRED_SERIES } from '@financial-dashboard/data-sources'

/**
 * Economic indicators configuration
 * Each indicator is assigned a category, weight, and scoring direction
 */
export const ECONOMIC_INDICATORS: EconomicIndicatorConfig[] = [
  // Growth Indicators
  {
    seriesId: FRED_SERIES.GDPC1,
    name: 'Real GDP',
    category: 'growth',
    weight: 0.40,
    inverted: false,
  },
  {
    seriesId: FRED_SERIES.INDPRO,
    name: 'Industrial Production',
    category: 'growth',
    weight: 0.30,
    inverted: false,
  },
  {
    seriesId: FRED_SERIES.RSXFS,
    name: 'Retail Sales',
    category: 'growth',
    weight: 0.30,
    inverted: false,
  },

  // Employment Indicators
  {
    seriesId: FRED_SERIES.UNRATE,
    name: 'Unemployment Rate',
    category: 'employment',
    weight: 0.40,
    inverted: true, // Lower is better
    targetValue: 4.0,
    optimalRange: { min: 3.5, max: 5.0 },
  },
  {
    seriesId: FRED_SERIES.PAYEMS,
    name: 'Nonfarm Payrolls',
    category: 'employment',
    weight: 0.35,
    inverted: false,
  },
  {
    seriesId: FRED_SERIES.CIVPART,
    name: 'Labor Force Participation',
    category: 'employment',
    weight: 0.25,
    inverted: false,
  },

  // Inflation Indicators
  {
    seriesId: FRED_SERIES.CPIAUCSL,
    name: 'Consumer Price Index',
    category: 'inflation',
    weight: 0.40,
    inverted: true, // Lower inflation is better
    targetValue: 2.0,
    optimalRange: { min: 1.5, max: 2.5 },
  },
  {
    seriesId: FRED_SERIES.PCEPI,
    name: 'PCE Price Index',
    category: 'inflation',
    weight: 0.35,
    inverted: true,
    targetValue: 2.0,
  },
  {
    seriesId: FRED_SERIES.PPIFIS,
    name: 'Producer Price Index',
    category: 'inflation',
    weight: 0.25,
    inverted: true,
  },

  // Monetary Indicators
  {
    seriesId: FRED_SERIES.DFF,
    name: 'Federal Funds Rate',
    category: 'monetary',
    weight: 0.40,
    inverted: false, // Context-dependent
  },
  {
    seriesId: FRED_SERIES.DGS10,
    name: '10-Year Treasury',
    category: 'monetary',
    weight: 0.35,
    inverted: false,
  },
  {
    seriesId: FRED_SERIES.T10Y2Y,
    name: 'Treasury Yield Spread',
    category: 'monetary',
    weight: 0.25,
    inverted: true, // Inverted curve is bad
    optimalRange: { min: 0.5, max: 2.0 },
  },

  // Sentiment Indicators
  {
    seriesId: FRED_SERIES.UMCSENT,
    name: 'Consumer Sentiment',
    category: 'sentiment',
    weight: 0.60,
    inverted: false,
  },
  {
    seriesId: FRED_SERIES.CSCICP03USM665S,
    name: 'Consumer Confidence',
    category: 'sentiment',
    weight: 0.40,
    inverted: false,
  },
]

/**
 * Get indicators by category
 */
export function getIndicatorsByCategory(
  category: keyof typeof import('./types').DEFAULT_SCORING_WEIGHTS
): EconomicIndicatorConfig[] {
  return ECONOMIC_INDICATORS.filter(indicator => indicator.category === category)
}

/**
 * Get all series IDs
 */
export function getAllSeriesIds(): string[] {
  return ECONOMIC_INDICATORS.map(indicator => indicator.seriesId)
}
