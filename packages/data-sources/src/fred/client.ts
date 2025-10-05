import type {
  FredApiConfig,
  FredObservationsResponse,
  FredSeriesResponse,
  FredReleasesResponse,
} from './types'
import {
  FredObservationsResponseSchema,
  FredSeriesResponseSchema,
  FredReleasesResponseSchema,
} from './types'

export class FredApiClient {
  private apiKey: string
  private baseUrl: string

  constructor(config: FredApiConfig) {
    this.apiKey = config.apiKey
    this.baseUrl = config.baseUrl || 'https://api.stlouisfed.org/fred'
  }

  private async fetch<T>(endpoint: string, params: Record<string, string | number>): Promise<T> {
    const url = new URL(endpoint, this.baseUrl)
    url.searchParams.append('api_key', this.apiKey)
    url.searchParams.append('file_type', 'json')

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
      throw new Error(`FRED API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get observations (data points) for an economic time series
   * @param seriesId FRED series ID (e.g., 'GDP', 'UNRATE')
   * @param observationStart Start date (YYYY-MM-DD)
   * @param observationEnd End date (YYYY-MM-DD)
   * @param units Units transformation (e.g., 'chg', 'pch', 'pc1')
   */
  async getSeriesObservations(
    seriesId: string,
    observationStart?: string,
    observationEnd?: string,
    units: string = 'lin'
  ): Promise<FredObservationsResponse> {
    const params: Record<string, string | number> = {
      series_id: seriesId,
      units,
    }

    if (observationStart) {
      params.observation_start = observationStart
    }
    if (observationEnd) {
      params.observation_end = observationEnd
    }

    const data = await this.fetch<unknown>('/series/observations', params)
    return FredObservationsResponseSchema.parse(data)
  }

  /**
   * Get 12 months of historical data for a series
   * @param seriesId FRED series ID
   * @param units Units transformation (default: 'lin')
   */
  async getLast12Months(seriesId: string, units: string = 'lin'): Promise<FredObservationsResponse> {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - 12)

    return this.getSeriesObservations(
      seriesId,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0],
      units
    )
  }

  /**
   * Get multiple years of historical data for a series
   * @param seriesId FRED series ID
   * @param years Number of years of history (default: 5)
   * @param units Units transformation (default: 'lin')
   */
  async getHistoricalData(seriesId: string, years: number = 5, units: string = 'lin'): Promise<FredObservationsResponse> {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setFullYear(startDate.getFullYear() - years)

    return this.getSeriesObservations(
      seriesId,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0],
      units
    )
  }

  /**
   * Get information about an economic data series
   * @param seriesId FRED series ID
   */
  async getSeriesInfo(seriesId: string): Promise<FredSeriesResponse> {
    const data = await this.fetch<unknown>('/series', {
      series_id: seriesId,
    })

    return FredSeriesResponseSchema.parse(data)
  }

  /**
   * Search for economic data series
   * @param searchText Search query
   * @param limit Maximum number of results
   */
  async searchSeries(searchText: string, limit: number = 10): Promise<FredSeriesResponse> {
    const data = await this.fetch<unknown>('/series/search', {
      search_text: searchText,
      limit,
    })

    return FredSeriesResponseSchema.parse(data)
  }

  /**
   * Get all releases of economic data
   */
  async getReleases(): Promise<FredReleasesResponse> {
    const data = await this.fetch<unknown>('/releases', {})
    return FredReleasesResponseSchema.parse(data)
  }

  /**
   * Get releases with dates in a specific time range
   * @param realtimeStart Start date (YYYY-MM-DD)
   * @param realtimeEnd End date (YYYY-MM-DD)
   */
  async getReleasesInRange(
    realtimeStart: string,
    realtimeEnd: string
  ): Promise<FredReleasesResponse> {
    const data = await this.fetch<unknown>('/releases', {
      realtime_start: realtimeStart,
      realtime_end: realtimeEnd,
    })

    return FredReleasesResponseSchema.parse(data)
  }

  /**
   * Batch fetch multiple series at once
   * @param seriesIds Array of FRED series IDs
   * @param months Number of months of historical data (default: 12)
   */
  async batchFetchSeries(
    seriesIds: string[],
    months: number = 12
  ): Promise<Map<string, FredObservationsResponse>> {
    const results = new Map<string, FredObservationsResponse>()

    // Fetch all series in parallel
    const promises = seriesIds.map(async (seriesId) => {
      try {
        const data = await this.getLast12Months(seriesId)
        results.set(seriesId, data)
      } catch (error) {
        console.error(`Error fetching series ${seriesId}:`, error)
      }
    })

    await Promise.all(promises)
    return results
  }

  /**
   * Helper to parse numeric values from FRED observations
   * FRED returns "." for missing values
   */
  parseObservationValue(value: string): number | null {
    if (value === '.' || value === '') {
      return null
    }
    const parsed = parseFloat(value)
    return isNaN(parsed) ? null : parsed
  }
}

// Export factory function
export function createFredApiClient(config: FredApiConfig): FredApiClient {
  return new FredApiClient(config)
}
