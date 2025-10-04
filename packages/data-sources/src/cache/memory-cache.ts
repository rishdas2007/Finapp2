import type { CacheProvider, CacheEntry, CacheMetrics } from './types'

/**
 * In-memory cache implementation
 * Fast but ephemeral - resets on server restart
 * Good for development and single-instance deployments
 */
export class MemoryCache implements CacheProvider {
  private cache = new Map<string, CacheEntry<any>>()
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    avgResponseTime: 0,
    totalRequests: 0,
  }
  private responseTimes: number[] = []

  async get<T>(key: string): Promise<T | null> {
    const startTime = performance.now()

    const entry = this.cache.get(key)

    if (!entry) {
      this.recordMiss(startTime)
      return null
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      this.recordMiss(startTime)
      return null
    }

    this.recordHit(startTime)
    return entry.data as T
  }

  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    const now = Date.now()
    const entry: CacheEntry<T> = {
      data: value,
      cachedAt: now,
      expiresAt: now + ttl,
    }

    this.cache.set(key, entry)
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key)
  }

  async clear(): Promise<void> {
    this.cache.clear()
    this.resetMetrics()
  }

  getMetrics(): CacheMetrics {
    return { ...this.metrics }
  }

  private recordHit(startTime: number): void {
    const responseTime = performance.now() - startTime
    this.metrics.hits++
    this.metrics.totalRequests++
    this.updateResponseTime(responseTime)
    this.calculateHitRate()
  }

  private recordMiss(startTime: number): void {
    const responseTime = performance.now() - startTime
    this.metrics.misses++
    this.metrics.totalRequests++
    this.updateResponseTime(responseTime)
    this.calculateHitRate()
  }

  private updateResponseTime(responseTime: number): void {
    this.responseTimes.push(responseTime)

    // Keep only last 1000 measurements
    if (this.responseTimes.length > 1000) {
      this.responseTimes.shift()
    }

    const sum = this.responseTimes.reduce((acc, val) => acc + val, 0)
    this.metrics.avgResponseTime = Math.round(sum / this.responseTimes.length)
  }

  private calculateHitRate(): void {
    if (this.metrics.totalRequests === 0) {
      this.metrics.hitRate = 0
    } else {
      this.metrics.hitRate =
        Math.round((this.metrics.hits / this.metrics.totalRequests) * 100 * 100) / 100
    }
  }

  private resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      avgResponseTime: 0,
      totalRequests: 0,
    }
    this.responseTimes = []
  }

  // Utility method to clean expired entries
  cleanExpired(): number {
    const now = Date.now()
    let cleaned = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
        cleaned++
      }
    }

    return cleaned
  }

  // Get cache size
  size(): number {
    return this.cache.size
  }
}

// Create singleton instance
let memoryCache: MemoryCache | null = null

export function getMemoryCache(): MemoryCache {
  if (!memoryCache) {
    memoryCache = new MemoryCache()
  }
  return memoryCache
}
