import type { CacheConfig, CacheProvider, CacheMetrics } from './types'
import { DEFAULT_CACHE_CONFIG } from './types'
import { getMemoryCache } from './memory-cache'

/**
 * Cache Manager - High-level caching interface
 * Manages cache providers and provides convenience methods
 */
export class CacheManager {
  private provider: CacheProvider
  private config: CacheConfig

  constructor(provider?: CacheProvider, config?: Partial<CacheConfig>) {
    this.provider = provider || getMemoryCache()
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config }
  }

  /**
   * Get cached data or fetch from source if not available
   * @param key Cache key
   * @param fetchFn Function to fetch data if not in cache
   * @param ttl Time to live in milliseconds
   */
  async getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.provider.get<T>(key)
    if (cached !== null) {
      return cached
    }

    // Fetch from source
    const data = await fetchFn()

    // Store in cache
    const cacheTtl = ttl || this.config.ttl.daily
    await this.provider.set(key, data, cacheTtl)

    return data
  }

  /**
   * Get data from cache
   * @param key Cache key
   */
  async get<T>(key: string): Promise<T | null> {
    return this.provider.get<T>(key)
  }

  /**
   * Set data in cache
   * @param key Cache key
   * @param value Data to cache
   * @param ttl Time to live in milliseconds (optional)
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const cacheTtl = ttl || this.config.ttl.daily
    return this.provider.set(key, value, cacheTtl)
  }

  /**
   * Delete data from cache
   * @param key Cache key
   */
  async delete(key: string): Promise<void> {
    return this.provider.delete(key)
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    return this.provider.clear()
  }

  /**
   * Get cache performance metrics
   */
  getMetrics(): CacheMetrics {
    return this.provider.getMetrics()
  }

  /**
   * Generate cache key for market data
   */
  static marketDataKey(symbol: string, interval: string): string {
    return `market:${symbol}:${interval}`
  }

  /**
   * Generate cache key for quote data
   */
  static quoteKey(symbol: string): string {
    return `quote:${symbol}`
  }

  /**
   * Generate cache key for technical indicator
   */
  static technicalKey(symbol: string, indicator: string, interval: string): string {
    return `technical:${symbol}:${indicator}:${interval}`
  }

  /**
   * Generate cache key for economic data
   */
  static economicKey(seriesId: string): string {
    return `economic:${seriesId}`
  }

  /**
   * Generate cache key for economic score
   */
  static economicScoreKey(): string {
    return 'economic:score:latest'
  }

  /**
   * Get appropriate TTL for data type
   */
  getTTL(type: keyof CacheConfig['ttl']): number {
    return this.config.ttl[type]
  }
}

// Export singleton instance
let cacheManager: CacheManager | null = null

export function getCacheManager(
  provider?: CacheProvider,
  config?: Partial<CacheConfig>
): CacheManager {
  if (!cacheManager) {
    cacheManager = new CacheManager(provider, config)
  }
  return cacheManager
}
