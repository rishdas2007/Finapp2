import { z } from 'zod'

// User Profile
export const ProfileSchema = z.object({
  id: z.string().uuid(),
  preferences: z.object({
    defaultWatchlist: z.string().optional(),
    theme: z.enum(['dark', 'light']).default('dark'),
    refreshInterval: z.number().default(60000),
    alertsEnabled: z.boolean().default(true),
  }).optional(),
  created_at: z.string().datetime(),
})

export type Profile = z.infer<typeof ProfileSchema>

// Watchlist
export const WatchlistSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string(),
  symbols: z.array(z.string()),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
})

export type Watchlist = z.infer<typeof WatchlistSchema>

// Market Data Cache
export const MarketDataCacheSchema = z.object({
  symbol: z.string(),
  interval: z.enum(['1min', '5min', '15min', '1h', '1day']),
  data: z.any(), // JSONB field
  cached_at: z.string().datetime(),
})

export type MarketDataCache = z.infer<typeof MarketDataCacheSchema>

// Economic Data Cache
export const EconomicDataCacheSchema = z.object({
  series_id: z.string(),
  data: z.any(), // JSONB field
  cached_at: z.string().datetime(),
})

export type EconomicDataCache = z.infer<typeof EconomicDataCacheSchema>

// API Metrics
export const ApiMetricsSchema = z.object({
  id: z.string().uuid(),
  endpoint: z.string(),
  response_time: z.number(),
  cache_hit: z.boolean(),
  timestamp: z.string().datetime(),
})

export type ApiMetrics = z.infer<typeof ApiMetricsSchema>

// Economic Score
export const EconomicScoreSchema = z.object({
  id: z.string().uuid(),
  score: z.object({
    overall: z.number(),
    categories: z.object({
      growth: z.number(),
      employment: z.number(),
      inflation: z.number(),
      monetary: z.number(),
      sentiment: z.number(),
    }),
    trend: z.enum(['IMPROVING', 'STABLE', 'DECLINING']),
    zScores: z.record(z.number()),
    historicalPercentile: z.number(),
  }),
  calculated_at: z.string().datetime(),
})

export type EconomicScore = z.infer<typeof EconomicScoreSchema>

// Database Tables Type
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'id' | 'created_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
      }
      watchlists: {
        Row: Watchlist
        Insert: Omit<Watchlist, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Watchlist, 'id' | 'user_id' | 'created_at'>>
      }
      market_data_cache: {
        Row: MarketDataCache
        Insert: MarketDataCache
        Update: Partial<MarketDataCache>
      }
      economic_data_cache: {
        Row: EconomicDataCache
        Insert: EconomicDataCache
        Update: Partial<EconomicDataCache>
      }
      api_metrics: {
        Row: ApiMetrics
        Insert: Omit<ApiMetrics, 'id' | 'timestamp'>
        Update: Partial<Omit<ApiMetrics, 'id'>>
      }
      economic_scores: {
        Row: EconomicScore
        Insert: Omit<EconomicScore, 'id' | 'calculated_at'>
        Update: Partial<Omit<EconomicScore, 'id'>>
      }
    }
  }
}
