/**
 * FRED (Federal Reserve Economic Data) API Integration
 * https://fred.stlouisfed.org/docs/api/fred/
 */

interface FREDObservation {
  date: string
  value: string
  realtime_start?: string
  realtime_end?: string
}

interface FREDResponse {
  observations: FREDObservation[]
}

export interface ProcessedIndicatorData {
  seriesId: string
  date: string
  value: number
  priorValue?: number
  yoyChange?: number
  momChange?: number
  historicalValues: Array<{ date: string; value: number }>
}

/**
 * Fetch data from FRED API for a specific series
 * @param seriesId - FRED series ID
 * @param observationStart - Start date for observations (YYYY-MM-DD)
 * @param observationEnd - End date for observations (YYYY-MM-DD)
 * @param units - Units transformation: 'lin' (default), 'pc1' (Percent Change from Year Ago), 'pch' (Percent Change), 'chg' (Change)
 */
export async function fetchFREDSeries(
  seriesId: string,
  observationStart?: string,
  observationEnd?: string,
  units: string = 'lin'
): Promise<FREDObservation[]> {
  const apiKey = process.env.FRED_API_KEY

  if (!apiKey) {
    throw new Error('FRED_API_KEY is not configured')
  }

  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: apiKey,
    file_type: 'json',
    sort_order: 'desc', // Most recent first
    units: units,
  })

  if (observationStart) {
    params.append('observation_start', observationStart)
  }
  if (observationEnd) {
    params.append('observation_end', observationEnd)
  }

  const url = `https://api.stlouisfed.org/fred/series/observations?${params.toString()}`

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`FRED API error: ${response.statusText}`)
  }

  const data: FREDResponse = await response.json()

  return data.observations.filter(obs => obs.value !== '.')
}

/**
 * Calculate Year-over-Year percentage change
 */
export function calculateYoYChange(
  currentValue: number,
  yearAgoValue: number | undefined
): number | undefined {
  if (yearAgoValue === undefined || yearAgoValue === 0) return undefined
  return ((currentValue - yearAgoValue) / yearAgoValue) * 100
}

/**
 * Calculate Month-over-Month percentage change
 */
export function calculateMoMChange(
  currentValue: number,
  monthAgoValue: number | undefined
): number | undefined {
  if (monthAgoValue === undefined || monthAgoValue === 0) return undefined
  return ((currentValue - monthAgoValue) / monthAgoValue) * 100
}

/**
 * Calculate Quarter-over-Quarter percentage change (annualized)
 */
export function calculateQoQAnnualized(
  currentValue: number,
  quarterAgoValue: number | undefined
): number | undefined {
  if (quarterAgoValue === undefined || quarterAgoValue === 0) return undefined
  const qoq = ((currentValue - quarterAgoValue) / quarterAgoValue) * 100
  return Math.pow(1 + qoq / 100, 4) - 1 * 100 // Annualize
}

/**
 * Calculate 4-week moving average
 */
export function calculate4WeekAverage(values: number[]): number {
  if (values.length < 4) return values[0] || 0
  const last4 = values.slice(0, 4)
  return last4.reduce((sum, val) => sum + val, 0) / 4
}

/**
 * Get value from N periods ago
 */
export function getValueNPeriodsAgo(
  observations: FREDObservation[],
  periods: number
): number | undefined {
  if (observations.length <= periods) return undefined
  const value = observations[periods]?.value
  return value ? parseFloat(value) : undefined
}

/**
 * Process FRED data based on presentation format
 * Determines appropriate units transformation for FRED API
 */
export async function processFREDData(
  seriesId: string,
  presentationFormat: string,
  frequency: string
): Promise<ProcessedIndicatorData> {
  // Fetch 2 years of data to calculate YoY changes
  const twoYearsAgo = new Date()
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)
  const observationStart = twoYearsAgo.toISOString().split('T')[0]

  // Determine units parameter based on presentation format
  // Use 'pc1' (Percent Change from Year Ago) for YoY indicators to get pre-calculated values
  let units = 'lin' // Default: linear (no transformation)

  if (presentationFormat === 'yoy_pct_change') {
    units = 'pc1' // Percent Change from 1 Year Ago
  }

  const observations = await fetchFREDSeries(seriesId, observationStart, undefined, units)

  if (observations.length === 0) {
    throw new Error(`No data available for ${seriesId}`)
  }

  // Most recent observation is first (sorted desc)
  const latest = observations[0]
  const currentValue = parseFloat(latest.value)

  // Get prior value (previous period)
  const priorValue = observations.length > 1 ? parseFloat(observations[1].value) : undefined

  let yoyChange: number | undefined
  let momChange: number | undefined

  // Calculate changes based on frequency
  switch (presentationFormat) {
    case 'yoy_pct_change':
      // Need value from 12 months ago for monthly, 4 quarters ago for quarterly
      const periodsPerYear = frequency === 'Quarterly' ? 4 : frequency === 'Monthly' ? 12 : 252
      const yearAgoValue = getValueNPeriodsAgo(observations, periodsPerYear)
      yoyChange = calculateYoYChange(currentValue, yearAgoValue)
      momChange = calculateMoMChange(currentValue, priorValue)
      break

    case 'mom_pct_change':
      // Need value from 1 period ago
      const periodAgoValue = getValueNPeriodsAgo(observations, 1)
      momChange = calculateMoMChange(currentValue, periodAgoValue)
      yoyChange = calculateYoYChange(currentValue, getValueNPeriodsAgo(observations, frequency === 'Monthly' ? 12 : 4))
      break

    case 'annualized_quarterly':
      // For GDP-like indicators, FRED already provides annualized values
      // But we can calculate QoQ for reference
      const quarterAgoValue = getValueNPeriodsAgo(observations, 1)
      momChange = calculateMoMChange(currentValue, quarterAgoValue)
      break

    case '4wk_avg':
      // Calculate 4-week moving average
      const last4Weeks = observations.slice(0, 4).map(obs => parseFloat(obs.value))
      const avg = calculate4WeekAverage(last4Weeks)
      // Calculate prior 4-week average
      const prior4Weeks = observations.slice(1, 5).map(obs => parseFloat(obs.value))
      const priorAvg = prior4Weeks.length === 4 ? calculate4WeekAverage(prior4Weeks) : undefined
      momChange = calculateMoMChange(avg, priorAvg)
      // Override current value with 4-week average
      return {
        seriesId,
        date: latest.date,
        value: avg,
        priorValue: priorAvg,
        momChange,
        historicalValues: observations.slice(0, 90).map(obs => ({
          date: obs.date,
          value: parseFloat(obs.value)
        }))
      }

    case 'level':
    case 'index':
    case 'ratio':
    case 'percentage':
    case 'currency':
    case 'count':
    case 'basis_points':
      // Use raw value, no transformation
      // Calculate MoM and YoY for reference
      const periodsBack = frequency === 'Quarterly' ? 4 : frequency === 'Monthly' ? 12 : frequency === 'Weekly' ? 52 : 252
      momChange = calculateMoMChange(currentValue, priorValue)
      yoyChange = calculateYoYChange(currentValue, getValueNPeriodsAgo(observations, periodsBack))
      break
  }

  return {
    seriesId,
    date: latest.date,
    value: currentValue,
    priorValue,
    yoyChange,
    momChange,
    historicalValues: observations.slice(0, 90).map(obs => ({
      date: obs.date,
      value: parseFloat(obs.value)
    }))
  }
}

/**
 * Determine signal based on indicator characteristics
 */
export function determineSignal(
  value: number,
  yoyChange: number | undefined,
  indicatorName: string,
  presentationFormat: string
): 'Bullish' | 'Bearish' | 'Neutral' {
  // For inflation indicators, higher = bearish
  if (indicatorName.includes('CPI') ||
      indicatorName.includes('PCE') ||
      indicatorName.includes('Inflation') ||
      indicatorName.includes('PPI')) {
    if (yoyChange && yoyChange > 1) return 'Bearish'
    if (yoyChange && yoyChange < -1) return 'Bullish'
    return 'Neutral'
  }

  // For unemployment and jobless claims, higher = bearish
  if (indicatorName.includes('Unemployment') ||
      indicatorName.includes('Jobless') ||
      indicatorName.includes('Claims')) {
    if (yoyChange && yoyChange > 5) return 'Bearish'
    if (yoyChange && yoyChange < -5) return 'Bullish'
    return 'Neutral'
  }

  // For growth indicators, higher = bullish
  if (indicatorName.includes('GDP') ||
      indicatorName.includes('Production') ||
      indicatorName.includes('Sales') ||
      indicatorName.includes('Income')) {
    if (yoyChange && yoyChange > 1) return 'Bullish'
    if (yoyChange && yoyChange < -1) return 'Bearish'
    return 'Neutral'
  }

  // For PMI/sentiment indicators, >50 = expansion, <50 = contraction
  if (presentationFormat === 'index' &&
      (indicatorName.includes('PMI') ||
       indicatorName.includes('ISM') ||
       indicatorName.includes('Sentiment') ||
       indicatorName.includes('Confidence'))) {
    if (value > 52) return 'Bullish'
    if (value < 48) return 'Bearish'
    return 'Neutral'
  }

  // For yield curve, negative = bearish (inversion)
  if (indicatorName.includes('Yield Curve')) {
    if (value < -0.5) return 'Bearish'
    if (value > 0.5) return 'Bullish'
    return 'Neutral'
  }

  return 'Neutral'
}

/**
 * Determine trend direction
 */
export function determineTrend(
  momChange: number | undefined,
  yoyChange: number | undefined
): 'up' | 'down' | 'stable' {
  const change = momChange !== undefined ? momChange : yoyChange

  if (change === undefined) return 'stable'
  if (change > 0.5) return 'up'
  if (change < -0.5) return 'down'
  return 'stable'
}

/**
 * Calculate z-score from historical values
 */
export function calculateZScore(
  currentValue: number,
  historicalValues: number[]
): number {
  if (historicalValues.length < 10) return 0

  const mean = historicalValues.reduce((sum, val) => sum + val, 0) / historicalValues.length
  const variance = historicalValues.reduce((sum, val) =>
    sum + Math.pow(val - mean, 2), 0
  ) / historicalValues.length
  const stdDev = Math.sqrt(variance)

  if (stdDev === 0) return 0
  return (currentValue - mean) / stdDev
}

/**
 * Batch fetch multiple FRED series with rate limiting
 */
export async function fetchMultipleSeries(
  seriesIds: string[],
  delayMs: number = 500
): Promise<Map<string, FREDObservation[]>> {
  const results = new Map<string, FREDObservation[]>()

  for (const seriesId of seriesIds) {
    try {
      const observations = await fetchFREDSeries(seriesId)
      results.set(seriesId, observations)

      // Respect rate limits (120 req/min = 500ms between requests)
      await new Promise(resolve => setTimeout(resolve, delayMs))
    } catch (error) {
      console.error(`Error fetching ${seriesId}:`, error)
      results.set(seriesId, [])
    }
  }

  return results
}
