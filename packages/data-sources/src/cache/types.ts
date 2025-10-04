export interface CacheConfig {
  strategy: 'memory' | 'redis' | 'supabase'
  ttl: {
    realtime: number    // 1 min for quotes
    intraday: number    // 5 min for technical data
    daily: number       // 1 hour for daily data
    economic: number    // 24 hours for FRED data
  }
}

export interface CacheEntry<T> {
  data: T
  cachedAt: number
  expiresAt: number
}

export interface CacheMetrics {
  hits: number
  misses: number
  hitRate: number
  avgResponseTime: number
  totalRequests: number
}

export interface CacheProvider {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttl: number): Promise<void>
  delete(key: string): Promise<void>
  clear(): Promise<void>
  getMetrics(): CacheMetrics
}

export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  strategy: 'memory',
  ttl: {
    realtime: 60 * 1000,           // 1 minute
    intraday: 5 * 60 * 1000,       // 5 minutes
    daily: 60 * 60 * 1000,         // 1 hour
    economic: 24 * 60 * 60 * 1000, // 24 hours
  },
}
