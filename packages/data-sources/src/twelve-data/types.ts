import { z } from 'zod'

// Time Series Response
export const TimeSeriesValueSchema = z.object({
  datetime: z.string(),
  open: z.string(),
  high: z.string(),
  low: z.string(),
  close: z.string(),
  volume: z.string().optional(),
})

export const TimeSeriesMetaSchema = z.object({
  symbol: z.string(),
  interval: z.string(),
  currency: z.string().optional(),
  exchange_timezone: z.string(),
  exchange: z.string(),
  mic_code: z.string(),
  type: z.string(),
})

export const TimeSeriesResponseSchema = z.object({
  meta: TimeSeriesMetaSchema,
  values: z.array(TimeSeriesValueSchema),
  status: z.string(),
})

export type TimeSeriesValue = z.infer<typeof TimeSeriesValueSchema>
export type TimeSeriesMeta = z.infer<typeof TimeSeriesMetaSchema>
export type TimeSeriesResponse = z.infer<typeof TimeSeriesResponseSchema>

// Quote Response
export const QuoteResponseSchema = z.object({
  symbol: z.string(),
  name: z.string().optional(),
  exchange: z.string().optional(),
  mic_code: z.string().optional(),
  currency: z.string().optional(),
  datetime: z.string(),
  timestamp: z.number(),
  open: z.string(),
  high: z.string(),
  low: z.string(),
  close: z.string(),
  volume: z.string().optional(),
  previous_close: z.string().optional(),
  change: z.string().optional(),
  percent_change: z.string().optional(),
  average_volume: z.string().optional(),
  is_market_open: z.boolean().optional(),
})

export type QuoteResponse = z.infer<typeof QuoteResponseSchema>

// Technical Indicator Response
export const TechnicalIndicatorValueSchema = z.object({
  datetime: z.string(),
  rsi: z.string().optional(),
  ema: z.string().optional(),
  sma: z.string().optional(),
  macd: z.string().optional(),
  macd_signal: z.string().optional(),
  macd_hist: z.string().optional(),
  bb_upper: z.string().optional(),
  bb_middle: z.string().optional(),
  bb_lower: z.string().optional(),
})

export const TechnicalIndicatorResponseSchema = z.object({
  meta: z.object({
    symbol: z.string(),
    interval: z.string(),
    indicator_name: z.string().optional(),
  }),
  values: z.array(TechnicalIndicatorValueSchema),
  status: z.string(),
})

export type TechnicalIndicatorValue = z.infer<typeof TechnicalIndicatorValueSchema>
export type TechnicalIndicatorResponse = z.infer<typeof TechnicalIndicatorResponseSchema>

// API Configuration
export interface TwelveDataConfig {
  apiKey: string
  baseUrl?: string
  rateLimit?: {
    requestsPerMinute: number
    retryAfter: number
  }
}

// Supported intervals
export const INTERVALS = ['1min', '5min', '15min', '30min', '1h', '4h', '1day', '1week', '1month'] as const
export type Interval = typeof INTERVALS[number]

// Supported output sizes
export const OUTPUT_SIZES = [30, 60, 90, 120, 5000] as const
export type OutputSize = typeof OUTPUT_SIZES[number]
