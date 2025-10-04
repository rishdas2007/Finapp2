/**
 * Utility functions for displaying economic indicators properly
 * Handles data freshness, value formatting, and display logic for macro analysis
 */

export type DataFreshness = 'fresh' | 'recent' | 'stale'
export type ValueDisplayType = 'level' | 'yoy_pct' | 'mom_pct' | 'index' | 'rate'

export interface EconomicIndicator {
  series_id: string
  indicator_name: string
  category: string
  timing?: string
  frequency: string
  presentation_format: string
  unit: string
  value: number
  value_display_type?: ValueDisplayType
  value_level?: number
  value_yoy_pct?: number
  value_mom_pct?: number
  prior_value?: number | null
  date: string
  data_as_of_date?: string
  release_date?: string
  yoy_change?: number | null
  mom_change?: number | null
  z_score?: number | null
  signal?: string
  trend?: string
  description?: string
}

/**
 * Calculate data freshness based on date and frequency
 */
export function getDataFreshness(date: Date | string, frequency: string): DataFreshness {
  const dataDate = typeof date === 'string' ? new Date(date) : date
  const daysSinceUpdate = (Date.now() - dataDate.getTime()) / (1000 * 60 * 60 * 24)

  if (frequency === 'Daily') {
    if (daysSinceUpdate < 3) return 'fresh'
    if (daysSinceUpdate < 7) return 'recent'
    return 'stale'
  }

  if (frequency === 'Weekly') {
    if (daysSinceUpdate < 10) return 'fresh'
    if (daysSinceUpdate < 21) return 'recent'
    return 'stale'
  }

  if (frequency === 'Monthly') {
    if (daysSinceUpdate < 45) return 'fresh'
    if (daysSinceUpdate < 75) return 'recent'
    return 'stale'
  }

  if (frequency === 'Quarterly') {
    if (daysSinceUpdate < 120) return 'fresh'
    if (daysSinceUpdate < 150) return 'recent'
    return 'stale'
  }

  return 'stale'
}

/**
 * Get a human-readable freshness label
 */
export function getFreshnessLabel(freshness: DataFreshness): string {
  switch (freshness) {
    case 'fresh': return 'Current'
    case 'recent': return 'Recent'
    case 'stale': return 'Stale'
  }
}

/**
 * Get freshness badge color classes (Tailwind)
 */
export function getFreshnessColor(freshness: DataFreshness): string {
  switch (freshness) {
    case 'fresh': return 'bg-green-100 text-green-800 border-green-200'
    case 'recent': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'stale': return 'bg-red-100 text-red-800 border-red-200'
  }
}

/**
 * Format date for display based on frequency
 */
export function formatDataDate(date: string | Date, frequency: string): string {
  const d = typeof date === 'string' ? new Date(date) : date

  if (frequency === 'Quarterly') {
    const quarter = Math.floor(d.getMonth() / 3) + 1
    return `Q${quarter} ${d.getFullYear()}`
  }

  if (frequency === 'Monthly') {
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  if (frequency === 'Weekly') {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // Daily
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/**
 * Get relative time string (e.g., "2mo ago")
 */
export function getRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 1) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
  return `${Math.floor(diffDays / 365)}y ago`
}

/**
 * Get the primary display value for an indicator based on its type and category
 * This is the core logic for showing YoY% for inflation metrics, etc.
 */
export function getDisplayValue(indicator: EconomicIndicator): string {
  // INFLATION INDICATORS: Prefer YoY % change
  if (indicator.category === 'Inflation') {
    // For CPI, PCE, and other price indices, show YoY % change
    if (['CPIAUCSL', 'CPILFESL', 'PCEPI', 'PCEPILFE', 'CUSR0000SAM2', 'CUSR0000SEHC01'].includes(indicator.series_id)) {
      console.log(`[${indicator.series_id}] value_yoy_pct:`, indicator.value_yoy_pct, 'yoy_change:', indicator.yoy_change)
      if (indicator.value_yoy_pct !== null && indicator.value_yoy_pct !== undefined) {
        const result = `${indicator.value_yoy_pct >= 0 ? '+' : ''}${indicator.value_yoy_pct.toFixed(2)}%`
        console.log(`[${indicator.series_id}] Showing YoY%:`, result)
        return result
      }
      // Fallback: calculate from yoy_change if available
      if (indicator.yoy_change !== null && indicator.yoy_change !== undefined) {
        const result = `${indicator.yoy_change >= 0 ? '+' : ''}${indicator.yoy_change.toFixed(2)}%`
        console.log(`[${indicator.series_id}] Showing yoy_change:`, result)
        return result
      }
      console.log(`[${indicator.series_id}] No YoY data, falling back to formatIndicatorValue`)
    }

    // For YoY metrics that already store the rate
    if (indicator.presentation_format === 'yoy_pct_change' || indicator.value_display_type === 'yoy_pct') {
      const val = indicator.value_yoy_pct ?? indicator.value
      return `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`
    }
  }

  // GROWTH INDICATORS: Show YoY % for income/consumption metrics
  if (['Personal Income', 'Personal Consumption', 'Retail Sales', 'Industrial Production'].some(name =>
      indicator.indicator_name.includes(name))) {
    if (indicator.value_yoy_pct !== null && indicator.value_yoy_pct !== undefined) {
      return `${indicator.value_yoy_pct >= 0 ? '+' : ''}${indicator.value_yoy_pct.toFixed(2)}%`
    }
  }

  // For everything else, use the existing format logic
  return formatIndicatorValue(indicator.value, indicator.presentation_format, indicator.unit)
}

/**
 * Get subtitle explaining what the displayed value represents
 */
export function getValueTypeLabel(indicator: EconomicIndicator): string {
  // Inflation indices showing YoY
  if (indicator.category === 'Inflation' &&
      ['CPIAUCSL', 'CPILFESL', 'PCEPI', 'PCEPILFE'].includes(indicator.series_id)) {
    return '12-month % change'
  }

  // YoY metrics
  if (indicator.presentation_format === 'yoy_pct_change' || indicator.value_display_type === 'yoy_pct') {
    return 'Year-over-year % change'
  }

  // MoM metrics
  if (indicator.presentation_format === 'mom_pct_change' || indicator.value_display_type === 'mom_pct') {
    return 'Month-over-month % change'
  }

  // Counts
  if (indicator.presentation_format === 'count') {
    return 'Thousands of units'
  }

  // Index levels
  if (indicator.presentation_format === 'index') {
    return 'Index level'
  }

  // Rates
  if (indicator.presentation_format === 'percentage' || indicator.value_display_type === 'rate') {
    return 'Percentage rate'
  }

  // Currency
  if (indicator.presentation_format === 'currency') {
    return 'Billions of dollars'
  }

  return ''
}

/**
 * Get prior value label based on context
 */
export function getPriorValueLabel(indicator: EconomicIndicator): string {
  // If showing YoY, prior is from year ago
  if (indicator.value_display_type === 'yoy_pct' ||
      indicator.presentation_format === 'yoy_pct_change' ||
      (indicator.category === 'Inflation' && ['CPIAUCSL', 'CPILFESL', 'PCEPI', 'PCEPILFE'].includes(indicator.series_id))) {
    return 'Year Ago'
  }

  // If showing MoM
  if (indicator.value_display_type === 'mom_pct' || indicator.presentation_format === 'mom_pct_change') {
    return 'Prior Month'
  }

  // Quarterly
  if (indicator.frequency === 'Quarterly') {
    return 'Prior Quarter'
  }

  // Default
  return 'Prior Value'
}

/**
 * Format indicator value (original function from config)
 */
export function formatIndicatorValue(value: number, format: string, unit: string): string {
  switch (format) {
    case 'index':
      if (Math.abs(value) >= 1000) {
        return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      }
      return value.toFixed(2)

    case 'percentage':
      return `${value.toFixed(2)}%`

    case 'count':
      if (unit?.includes('Thousand')) {
        return `${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}K`
      }
      if (unit?.includes('Million')) {
        return `${(value / 1000).toFixed(1)}M`
      }
      return value.toLocaleString('en-US', { maximumFractionDigits: 0 })

    case 'currency':
      if (Math.abs(value) >= 1000) {
        return `$${(value / 1000).toFixed(1)}T`
      }
      return `$${value.toFixed(1)}B`

    case 'basis_points':
      if (Math.abs(value) < 1) {
        return `${(value * 100).toFixed(0)}bp`
      }
      return value.toFixed(2)

    case 'yoy_pct_change':
    case 'mom_pct_change':
      return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`

    case 'annualized_quarterly':
      return `${value.toFixed(2)}%`

    case 'level':
    case 'ratio':
    case '4wk_avg':
    default:
      if (Math.abs(value) >= 1000) {
        return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      }
      return value.toFixed(2)
  }
}

/**
 * Format change value with proper units (pp for rates, % for everything else)
 */
export function formatChangeValue(
  indicator: EconomicIndicator,
  currentValue: number,
  priorValue: number | null | undefined
): string {
  if (priorValue === null || priorValue === undefined) return '-'

  // For percentage-based indicators (rates), show percentage point difference
  if (indicator.presentation_format === 'percentage' ||
      indicator.value_display_type === 'rate' ||
      indicator.unit?.includes('Percent')) {
    const diff = currentValue - priorValue
    return `${diff >= 0 ? '+' : ''}${diff.toFixed(2)}pp`
  }

  // For everything else, show percentage change
  const pctChange = ((currentValue - priorValue) / Math.abs(priorValue)) * 100
  return `${pctChange >= 0 ? '+' : ''}${pctChange.toFixed(2)}%`
}

/**
 * Get Z-score color classes
 */
export function getZScoreColor(zScore: number | null | undefined): string {
  if (zScore === null || zScore === undefined) return 'text-gray-500'

  const absZ = Math.abs(zScore)
  if (absZ > 2.0) return 'text-red-600 font-semibold'
  if (absZ > 1.5) return 'text-orange-600 font-medium'
  return 'text-gray-600'
}

/**
 * Get signal badge color
 */
export function getSignalColor(signal: string | undefined): string {
  switch (signal?.toLowerCase()) {
    case 'bullish': return 'bg-green-100 text-green-800 border-green-200'
    case 'bearish': return 'bg-red-100 text-red-800 border-red-200'
    case 'neutral': return 'bg-gray-100 text-gray-800 border-gray-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}
