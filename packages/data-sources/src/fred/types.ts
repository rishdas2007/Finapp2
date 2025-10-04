import { z } from 'zod'

// FRED Series Observation
export const FredObservationSchema = z.object({
  realtime_start: z.string(),
  realtime_end: z.string(),
  date: z.string(),
  value: z.string(), // Can be "." for missing values
})

export const FredObservationsResponseSchema = z.object({
  realtime_start: z.string(),
  realtime_end: z.string(),
  observation_start: z.string(),
  observation_end: z.string(),
  units: z.string(),
  output_type: z.number(),
  file_type: z.string(),
  order_by: z.string(),
  sort_order: z.string(),
  count: z.number(),
  offset: z.number(),
  limit: z.number(),
  observations: z.array(FredObservationSchema),
})

export type FredObservation = z.infer<typeof FredObservationSchema>
export type FredObservationsResponse = z.infer<typeof FredObservationsResponseSchema>

// FRED Series Info
export const FredSeriesSchema = z.object({
  id: z.string(),
  realtime_start: z.string(),
  realtime_end: z.string(),
  title: z.string(),
  observation_start: z.string(),
  observation_end: z.string(),
  frequency: z.string(),
  frequency_short: z.string(),
  units: z.string(),
  units_short: z.string(),
  seasonal_adjustment: z.string(),
  seasonal_adjustment_short: z.string(),
  last_updated: z.string(),
  popularity: z.number(),
  notes: z.string().optional(),
})

export const FredSeriesResponseSchema = z.object({
  realtime_start: z.string(),
  realtime_end: z.string(),
  seriess: z.array(FredSeriesSchema),
})

export type FredSeries = z.infer<typeof FredSeriesSchema>
export type FredSeriesResponse = z.infer<typeof FredSeriesResponseSchema>

// FRED Release
export const FredReleaseSchema = z.object({
  id: z.number(),
  realtime_start: z.string(),
  realtime_end: z.string(),
  name: z.string(),
  press_release: z.boolean(),
  link: z.string().optional(),
})

export const FredReleasesResponseSchema = z.object({
  realtime_start: z.string(),
  realtime_end: z.string(),
  releases: z.array(FredReleaseSchema),
})

export type FredRelease = z.infer<typeof FredReleaseSchema>
export type FredReleasesResponse = z.infer<typeof FredReleasesResponseSchema>

// API Configuration
export interface FredApiConfig {
  apiKey: string
  baseUrl?: string
}

// Common FRED Series IDs for Economic Health Scoring
export const FRED_SERIES = {
  // GDP & Growth
  GDP: 'GDP',
  GDPC1: 'GDPC1', // Real GDP
  GDPPOT: 'GDPPOT', // Potential GDP

  // Employment
  UNRATE: 'UNRATE', // Unemployment Rate
  PAYEMS: 'PAYEMS', // Total Nonfarm Payroll
  CIVPART: 'CIVPART', // Labor Force Participation Rate
  ICSA: 'ICSA', // Initial Jobless Claims

  // Inflation
  CPIAUCSL: 'CPIAUCSL', // Consumer Price Index
  CPILFESL: 'CPILFESL', // CPI Less Food & Energy
  PCEPI: 'PCEPI', // Personal Consumption Expenditures Price Index
  PPIFIS: 'PPIFIS', // Producer Price Index

  // Interest Rates & Monetary Policy
  DFF: 'DFF', // Federal Funds Rate
  DGS10: 'DGS10', // 10-Year Treasury Rate
  DGS2: 'DGS2', // 2-Year Treasury Rate
  T10Y2Y: 'T10Y2Y', // 10Y-2Y Treasury Spread

  // Manufacturing & Production
  INDPRO: 'INDPRO', // Industrial Production Index
  TCU: 'TCU', // Capacity Utilization
  MANEMP: 'MANEMP', // Manufacturing Employment

  // Consumer Sentiment
  UMCSENT: 'UMCSENT', // University of Michigan Consumer Sentiment
  CSCICP03USM665S: 'CSCICP03USM665S', // Consumer Confidence Index

  // Housing
  HOUST: 'HOUST', // Housing Starts
  MORTGAGE30US: 'MORTGAGE30US', // 30-Year Mortgage Rate
  CSUSHPISA: 'CSUSHPISA', // Case-Shiller Home Price Index

  // Retail & Sales
  RSXFS: 'RSXFS', // Retail Sales
  RETAILSMSA: 'RETAILSMSA', // Retail Sales (excl. motor vehicles)
} as const

export type FredSeriesId = typeof FRED_SERIES[keyof typeof FRED_SERIES]

// Economic Category Mapping
export const ECONOMIC_CATEGORIES = {
  GROWTH: [FRED_SERIES.GDP, FRED_SERIES.GDPC1, FRED_SERIES.GDPPOT],
  EMPLOYMENT: [FRED_SERIES.UNRATE, FRED_SERIES.PAYEMS, FRED_SERIES.CIVPART, FRED_SERIES.ICSA],
  INFLATION: [FRED_SERIES.CPIAUCSL, FRED_SERIES.CPILFESL, FRED_SERIES.PCEPI, FRED_SERIES.PPIFIS],
  MONETARY: [FRED_SERIES.DFF, FRED_SERIES.DGS10, FRED_SERIES.DGS2, FRED_SERIES.T10Y2Y],
  SENTIMENT: [FRED_SERIES.UMCSENT, FRED_SERIES.CSCICP03USM665S],
} as const
