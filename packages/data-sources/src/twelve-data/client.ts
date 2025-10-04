import type {
  TwelveDataConfig,
  TimeSeriesResponse,
  QuoteResponse,
  TechnicalIndicatorResponse,
  Interval,
  OutputSize
} from './types'
import {
  TimeSeriesResponseSchema,
  QuoteResponseSchema,
  TechnicalIndicatorResponseSchema
} from './types'

export class TwelveDataClient {
  private apiKey: string
  private baseUrl: string
  private rateLimit: {
    requestsPerMinute: number
    retryAfter: number
  }
  private requestQueue: number[] = []

  constructor(config: TwelveDataConfig) {
    this.apiKey = config.apiKey
    this.baseUrl = config.baseUrl || 'https://api.twelvedata.com'
    this.rateLimit = config.rateLimit || {
      requestsPerMinute: 8,
      retryAfter: 60000,
    }
  }

  private async checkRateLimit(): Promise<void> {
    const now = Date.now()
    const oneMinuteAgo = now - 60000

    // Remove requests older than 1 minute
    this.requestQueue = this.requestQueue.filter(time => time > oneMinuteAgo)

    // If we've hit the rate limit, wait
    if (this.requestQueue.length >= this.rateLimit.requestsPerMinute) {
      const oldestRequest = this.requestQueue[0]
      const waitTime = oldestRequest + this.rateLimit.retryAfter - now
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime))
        // Clear queue after waiting
        this.requestQueue = []
      }
    }

    this.requestQueue.push(now)
  }

  private async fetch<T>(endpoint: string, params: Record<string, string | number>): Promise<T> {
    await this.checkRateLimit()

    const url = new URL(endpoint, this.baseUrl)
    url.searchParams.append('apikey', this.apiKey)

    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value))
    })

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Twelve Data API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get time series data (OHLCV) for a symbol
   * @param symbol Stock/ETF ticker symbol
   * @param interval Time interval (1min, 5min, 15min, 1h, 1day, etc.)
   * @param outputSize Number of data points to return (30, 60, 90, 120, 5000)
   */
  async getTimeSeries(
    symbol: string,
    interval: Interval = '1day',
    outputSize: OutputSize = 120
  ): Promise<TimeSeriesResponse> {
    const data = await this.fetch<unknown>('/time_series', {
      symbol,
      interval,
      outputsize: outputSize,
    })

    return TimeSeriesResponseSchema.parse(data)
  }

  /**
   * Get real-time quote for a symbol
   * @param symbol Stock/ETF ticker symbol
   */
  async getQuote(symbol: string): Promise<QuoteResponse> {
    const data = await this.fetch<unknown>('/quote', {
      symbol,
    })

    return QuoteResponseSchema.parse(data)
  }

  /**
   * Get multiple quotes at once
   * @param symbols Array of ticker symbols
   */
  async getQuotes(symbols: string[]): Promise<QuoteResponse[]> {
    const data = await this.fetch<unknown>('/quote', {
      symbol: symbols.join(','),
    })

    // Handle both single and batch responses
    const quotesArray = Array.isArray(data) ? data : [data]
    return quotesArray.map(quote => QuoteResponseSchema.parse(quote))
  }

  /**
   * Get RSI (Relative Strength Index) indicator
   * @param symbol Stock/ETF ticker symbol
   * @param interval Time interval
   * @param timePeriod RSI time period (default: 14)
   * @param outputSize Number of data points
   */
  async getRSI(
    symbol: string,
    interval: Interval = '1day',
    timePeriod: number = 14,
    outputSize: OutputSize = 30
  ): Promise<TechnicalIndicatorResponse> {
    const data = await this.fetch<unknown>('/rsi', {
      symbol,
      interval,
      time_period: timePeriod,
      outputsize: outputSize,
    })

    return TechnicalIndicatorResponseSchema.parse(data)
  }

  /**
   * Get Bollinger Bands indicator
   * @param symbol Stock/ETF ticker symbol
   * @param interval Time interval
   * @param timePeriod BB time period (default: 20)
   * @param sd Standard deviation multiplier (default: 2)
   * @param outputSize Number of data points
   */
  async getBollingerBands(
    symbol: string,
    interval: Interval = '1day',
    timePeriod: number = 20,
    sd: number = 2,
    outputSize: OutputSize = 30
  ): Promise<TechnicalIndicatorResponse> {
    const data = await this.fetch<unknown>('/bbands', {
      symbol,
      interval,
      time_period: timePeriod,
      sd,
      outputsize: outputSize,
    })

    return TechnicalIndicatorResponseSchema.parse(data)
  }

  /**
   * Get MACD (Moving Average Convergence Divergence) indicator
   * @param symbol Stock/ETF ticker symbol
   * @param interval Time interval
   * @param outputSize Number of data points
   */
  async getMACD(
    symbol: string,
    interval: Interval = '1day',
    outputSize: OutputSize = 30
  ): Promise<TechnicalIndicatorResponse> {
    const data = await this.fetch<unknown>('/macd', {
      symbol,
      interval,
      fast_period: 12,
      slow_period: 26,
      signal_period: 9,
      outputsize: outputSize,
    })

    return TechnicalIndicatorResponseSchema.parse(data)
  }

  /**
   * Get EMA (Exponential Moving Average) indicator
   * @param symbol Stock/ETF ticker symbol
   * @param interval Time interval
   * @param timePeriod EMA time period
   * @param outputSize Number of data points
   */
  async getEMA(
    symbol: string,
    interval: Interval = '1day',
    timePeriod: number = 20,
    outputSize: OutputSize = 30
  ): Promise<TechnicalIndicatorResponse> {
    const data = await this.fetch<unknown>('/ema', {
      symbol,
      interval,
      time_period: timePeriod,
      outputsize: outputSize,
    })

    return TechnicalIndicatorResponseSchema.parse(data)
  }
}

// Export factory function
export function createTwelveDataClient(config: TwelveDataConfig): TwelveDataClient {
  return new TwelveDataClient(config)
}
