/**
 * Alert Engine - Evaluates alert rules against economic indicators
 * Supports threshold, pattern, correlation, and data quality alerts
 */

import { EconomicIndicator } from './indicator-display'

export interface AlertRule {
  id: string
  alert_name: string
  alert_type: 'threshold' | 'pattern' | 'correlation' | 'data_quality' | 'divergence'
  indicator_series_id: string | null
  condition_config: Record<string, any>
  severity: 'INFO' | 'WARNING' | 'CRITICAL'
  enabled: boolean
}

export interface AlertTrigger {
  alert_rule_id: string
  triggered: boolean
  message: string
  severity: 'INFO' | 'WARNING' | 'CRITICAL'
  indicator_series_id?: string
  trigger_value?: number
  context_data?: Record<string, any>
}

export interface HistoricalDataPoint {
  date: string
  value: number
}

/**
 * Main alert evaluation function
 */
export async function evaluateAlerts(
  indicators: EconomicIndicator[],
  alertRules: AlertRule[],
  historicalData: Map<string, HistoricalDataPoint[]>
): Promise<AlertTrigger[]> {
  const triggers: AlertTrigger[] = []

  for (const rule of alertRules) {
    if (!rule.enabled) continue

    try {
      let trigger: AlertTrigger | null = null

      switch (rule.alert_type) {
        case 'threshold':
          trigger = evaluateThresholdAlert(indicators, rule, historicalData)
          break
        case 'pattern':
          trigger = evaluatePatternAlert(indicators, rule, historicalData)
          break
        case 'correlation':
          trigger = evaluateCorrelationAlert(indicators, rule)
          break
        case 'data_quality':
          trigger = evaluateDataQualityAlert(indicators, rule)
          break
        case 'divergence':
          trigger = evaluateDivergenceAlert(indicators, rule)
          break
      }

      if (trigger && trigger.triggered) {
        triggers.push(trigger)
      }
    } catch (error) {
      console.error(`Error evaluating alert ${rule.id}:`, error)
    }
  }

  return triggers
}

/**
 * Threshold Alert Evaluation
 * Triggers when an indicator crosses a specified threshold
 */
function evaluateThresholdAlert(
  indicators: EconomicIndicator[],
  rule: AlertRule,
  historicalData: Map<string, HistoricalDataPoint[]>
): AlertTrigger | null {
  const indicator = indicators.find(ind => ind.series_id === rule.indicator_series_id)
  if (!indicator) return null

  const config = rule.condition_config
  const { threshold, operator, consecutive_periods } = config

  let triggered = false
  let message = ''

  // Check threshold condition
  if (operator === 'greater_than' && indicator.value > threshold) {
    triggered = true
  } else if (operator === 'less_than' && indicator.value < threshold) {
    triggered = true
  } else if (operator === 'equals' && Math.abs(indicator.value - threshold) < 0.01) {
    triggered = true
  }

  // If consecutive periods required, check historical data
  if (triggered && consecutive_periods && consecutive_periods > 1) {
    const history = historicalData.get(indicator.series_id) || []
    const recentHistory = history.slice(-consecutive_periods)

    if (recentHistory.length < consecutive_periods) {
      return null // Not enough historical data
    }

    // Check if all recent periods meet the condition
    const allMeetCondition = recentHistory.every(h => {
      if (operator === 'greater_than') return h.value > threshold
      if (operator === 'less_than') return h.value < threshold
      return false
    })

    if (!allMeetCondition) {
      triggered = false
    } else {
      message = `${indicator.indicator_name} has ${operator === 'greater_than' ? 'exceeded' : 'fallen below'} ${threshold} for ${consecutive_periods} consecutive periods (current: ${indicator.value.toFixed(2)})`
    }
  } else if (triggered) {
    message = `${indicator.indicator_name} is ${indicator.value.toFixed(2)}, ${operator === 'greater_than' ? 'above' : 'below'} threshold of ${threshold}`
  }

  return {
    alert_rule_id: rule.id,
    triggered,
    message,
    severity: rule.severity,
    indicator_series_id: indicator.series_id,
    trigger_value: indicator.value,
    context_data: {
      threshold,
      operator,
      consecutive_periods
    }
  }
}

/**
 * Pattern Alert Evaluation
 * Detects specific patterns like consecutive increases/decreases
 */
function evaluatePatternAlert(
  indicators: EconomicIndicator[],
  rule: AlertRule,
  historicalData: Map<string, HistoricalDataPoint[]>
): AlertTrigger | null {
  const indicator = indicators.find(ind => ind.series_id === rule.indicator_series_id)
  if (!indicator) return null

  const config = rule.condition_config
  const { pattern_type, periods, threshold_pct } = config

  const history = historicalData.get(indicator.series_id) || []
  if (history.length < periods) return null

  const recentHistory = [...history.slice(-periods), { date: indicator.date, value: indicator.value }]
  let triggered = false
  let message = ''

  switch (pattern_type) {
    case 'consecutive_increase': {
      triggered = true
      for (let i = 1; i < recentHistory.length; i++) {
        if (recentHistory[i].value <= recentHistory[i - 1].value) {
          triggered = false
          break
        }
      }
      if (triggered) {
        message = `${indicator.indicator_name} has increased for ${periods} consecutive periods`
      }
      break
    }

    case 'consecutive_decrease': {
      triggered = true
      for (let i = 1; i < recentHistory.length; i++) {
        if (recentHistory[i].value >= recentHistory[i - 1].value) {
          triggered = false
          break
        }
      }
      if (triggered) {
        message = `${indicator.indicator_name} has decreased for ${periods} consecutive periods`
      }
      break
    }

    case 'high_volatility': {
      // Calculate percentage changes
      const changes = []
      for (let i = 1; i < recentHistory.length; i++) {
        const pctChange = Math.abs((recentHistory[i].value - recentHistory[i - 1].value) / recentHistory[i - 1].value * 100)
        changes.push(pctChange)
      }

      const avgChange = changes.reduce((sum, c) => sum + c, 0) / changes.length
      triggered = avgChange > (threshold_pct || 2.0)

      if (triggered) {
        message = `${indicator.indicator_name} showing high volatility: avg ${avgChange.toFixed(1)}% change over ${periods} periods`
      }
      break
    }

    case 'trend_reversal': {
      // Detect trend reversal (was trending up, now trending down or vice versa)
      if (recentHistory.length >= 4) {
        const firstHalf = recentHistory.slice(0, Math.floor(recentHistory.length / 2))
        const secondHalf = recentHistory.slice(Math.floor(recentHistory.length / 2))

        const firstTrend = firstHalf[firstHalf.length - 1].value > firstHalf[0].value ? 'up' : 'down'
        const secondTrend = secondHalf[secondHalf.length - 1].value > secondHalf[0].value ? 'up' : 'down'

        triggered = firstTrend !== secondTrend

        if (triggered) {
          message = `${indicator.indicator_name} trend reversed from ${firstTrend} to ${secondTrend}`
        }
      }
      break
    }
  }

  return {
    alert_rule_id: rule.id,
    triggered,
    message,
    severity: rule.severity,
    indicator_series_id: indicator.series_id,
    trigger_value: indicator.value,
    context_data: { pattern_type, periods, historical_values: recentHistory.map(h => h.value) }
  }
}

/**
 * Correlation Alert Evaluation
 * Detects unusual correlation breakdowns between indicators
 */
function evaluateCorrelationAlert(
  indicators: EconomicIndicator[],
  rule: AlertRule
): AlertTrigger | null {
  const config = rule.condition_config
  const { indicators: indicatorIds, correlation_type } = config

  if (!indicatorIds || indicatorIds.length < 2) return null

  const ind1 = indicators.find(i => i.series_id === indicatorIds[0])
  const ind2 = indicators.find(i => i.series_id === indicatorIds[1])

  if (!ind1 || !ind2) return null

  let triggered = false
  let message = ''

  // Expected correlation patterns
  if (correlation_type === 'inverse') {
    // Indicators should move in opposite directions
    const ind1Direction = ind1.trend === 'up' ? 1 : ind1.trend === 'down' ? -1 : 0
    const ind2Direction = ind2.trend === 'up' ? 1 : ind2.trend === 'down' ? -1 : 0

    if (ind1Direction * ind2Direction > 0 && ind1Direction !== 0) {
      triggered = true
      message = `${ind1.indicator_name} and ${ind2.indicator_name} are moving in the same direction (expected inverse correlation)`
    }
  } else if (correlation_type === 'positive') {
    // Indicators should move in the same direction
    const ind1Direction = ind1.trend === 'up' ? 1 : ind1.trend === 'down' ? -1 : 0
    const ind2Direction = ind2.trend === 'up' ? 1 : ind2.trend === 'down' ? -1 : 0

    if (ind1Direction * ind2Direction < 0) {
      triggered = true
      message = `${ind1.indicator_name} and ${ind2.indicator_name} are moving in opposite directions (expected positive correlation)`
    }
  }

  return {
    alert_rule_id: rule.id,
    triggered,
    message,
    severity: rule.severity,
    context_data: {
      indicator1: { series_id: ind1.series_id, name: ind1.indicator_name, value: ind1.value, trend: ind1.trend },
      indicator2: { series_id: ind2.series_id, name: ind2.indicator_name, value: ind2.value, trend: ind2.trend }
    }
  }
}

/**
 * Data Quality Alert Evaluation
 * Detects stale data or missing updates
 */
function evaluateDataQualityAlert(
  indicators: EconomicIndicator[],
  rule: AlertRule
): AlertTrigger | null {
  const config = rule.condition_config
  const { max_staleness_days, check_frequency } = config

  const now = new Date()
  const staleIndicators = indicators.filter(ind => {
    const dataDate = new Date(ind.date)
    const daysSinceUpdate = (now.getTime() - dataDate.getTime()) / (1000 * 60 * 60 * 24)

    // Adjust staleness threshold based on frequency
    let threshold = max_staleness_days || 45
    if (ind.frequency === 'Daily') threshold = 7
    else if (ind.frequency === 'Weekly') threshold = 14
    else if (ind.frequency === 'Monthly') threshold = 45
    else if (ind.frequency === 'Quarterly') threshold = 120

    return daysSinceUpdate > threshold
  })

  const triggered = staleIndicators.length > 0
  const message = triggered
    ? `${staleIndicators.length} indicator(s) have stale data: ${staleIndicators.slice(0, 3).map(i => i.indicator_name).join(', ')}${staleIndicators.length > 3 ? '...' : ''}`
    : ''

  return {
    alert_rule_id: rule.id,
    triggered,
    message,
    severity: rule.severity,
    context_data: {
      stale_indicators: staleIndicators.map(i => ({
        series_id: i.series_id,
        name: i.indicator_name,
        last_updated: i.date,
        days_old: Math.floor((now.getTime() - new Date(i.date).getTime()) / (1000 * 60 * 60 * 24))
      }))
    }
  }
}

/**
 * Divergence Alert Evaluation
 * Detects when related indicators diverge unexpectedly
 */
function evaluateDivergenceAlert(
  indicators: EconomicIndicator[],
  rule: AlertRule
): AlertTrigger | null {
  const config = rule.condition_config
  const { indicator1_id, indicator2_id, divergence_threshold } = config

  const ind1 = indicators.find(i => i.series_id === indicator1_id)
  const ind2 = indicators.find(i => i.series_id === indicator2_id)

  if (!ind1 || !ind2) return null

  // Calculate z-score divergence
  const zScoreDiff = Math.abs((ind1.z_score || 0) - (ind2.z_score || 0))
  const triggered = zScoreDiff > (divergence_threshold || 2.0)

  const message = triggered
    ? `${ind1.indicator_name} (z-score: ${(ind1.z_score || 0).toFixed(2)}) and ${ind2.indicator_name} (z-score: ${(ind2.z_score || 0).toFixed(2)}) are showing significant divergence`
    : ''

  return {
    alert_rule_id: rule.id,
    triggered,
    message,
    severity: rule.severity,
    context_data: {
      indicator1: { series_id: ind1.series_id, name: ind1.indicator_name, z_score: ind1.z_score },
      indicator2: { series_id: ind2.series_id, name: ind2.indicator_name, z_score: ind2.z_score },
      z_score_difference: zScoreDiff
    }
  }
}

/**
 * Helper function to format alert messages with context
 */
export function formatAlertMessage(trigger: AlertTrigger): string {
  const emoji = trigger.severity === 'CRITICAL' ? '🚨' : trigger.severity === 'WARNING' ? '⚠️' : 'ℹ️'
  return `${emoji} ${trigger.message}`
}

/**
 * Group alerts by severity for display
 */
export function groupAlertsBySeverity(triggers: AlertTrigger[]): Record<string, AlertTrigger[]> {
  return {
    CRITICAL: triggers.filter(t => t.severity === 'CRITICAL'),
    WARNING: triggers.filter(t => t.severity === 'WARNING'),
    INFO: triggers.filter(t => t.severity === 'INFO')
  }
}
