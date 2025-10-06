/**
 * Relative Strength Analysis
 * Ranks ETFs by momentum across multiple timeframes
 */

export interface PriceHistory {
  date: string
  price: number
}

export interface RelativeStrengthScore {
  symbol: string
  name: string
  returns: {
    oneWeek: number | null
    oneMonth: number | null
    threeMonth: number | null
    sixMonth: number | null
  }
  momentumScore: number // Weighted composite score
  percentileRank: number // 0-100, where this ranks historically
  trend: 'accelerating' | 'steady' | 'decelerating' | 'reversing'
  vsSpyExcess: {
    oneWeek: number | null
    oneMonth: number | null
    threeMonth: number | null
    sixMonth: number | null
  }
  rank: number
}

/**
 * Calculate returns for different timeframes
 */
export function calculateReturns(
  prices: PriceHistory[],
  currentPrice: number
): {
  oneWeek: number | null
  oneMonth: number | null
  threeMonth: number | null
  sixMonth: number | null
} {
  if (!prices || prices.length === 0) {
    return { oneWeek: null, oneMonth: null, threeMonth: null, sixMonth: null }
  }

  // Sort by date ascending
  const sortedPrices = [...prices].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const findPriceNDaysAgo = (days: number): number | null => {
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() - days)

    // Find closest price before or on target date
    let closest: PriceHistory | null = null
    let minDiff = Infinity

    for (const p of sortedPrices) {
      const priceDate = new Date(p.date)
      const diff = Math.abs(targetDate.getTime() - priceDate.getTime())

      if (priceDate <= targetDate && diff < minDiff) {
        minDiff = diff
        closest = p
      }
    }

    return closest ? closest.price : null
  }

  const oneWeekAgo = findPriceNDaysAgo(7)
  const oneMonthAgo = findPriceNDaysAgo(30)
  const threeMonthAgo = findPriceNDaysAgo(90)
  const sixMonthAgo = findPriceNDaysAgo(180)

  const calcReturn = (oldPrice: number | null): number | null => {
    if (oldPrice === null || oldPrice === 0) return null
    return ((currentPrice - oldPrice) / oldPrice) * 100
  }

  return {
    oneWeek: calcReturn(oneWeekAgo),
    oneMonth: calcReturn(oneMonthAgo),
    threeMonth: calcReturn(threeMonthAgo),
    sixMonth: calcReturn(sixMonthAgo)
  }
}

/**
 * Calculate momentum score (weighted average of returns)
 * Weights: 1W: 10%, 1M: 20%, 3M: 35%, 6M: 35%
 */
export function calculateMomentumScore(returns: {
  oneWeek: number | null
  oneMonth: number | null
  threeMonth: number | null
  sixMonth: number | null
}): number {
  const weights = {
    oneWeek: 0.10,
    oneMonth: 0.20,
    threeMonth: 0.35,
    sixMonth: 0.35
  }

  let totalWeight = 0
  let weightedSum = 0

  if (returns.oneWeek !== null) {
    weightedSum += returns.oneWeek * weights.oneWeek
    totalWeight += weights.oneWeek
  }
  if (returns.oneMonth !== null) {
    weightedSum += returns.oneMonth * weights.oneMonth
    totalWeight += weights.oneMonth
  }
  if (returns.threeMonth !== null) {
    weightedSum += returns.threeMonth * weights.threeMonth
    totalWeight += weights.threeMonth
  }
  if (returns.sixMonth !== null) {
    weightedSum += returns.sixMonth * weights.sixMonth
    totalWeight += weights.sixMonth
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0
}

/**
 * Determine trend direction based on acceleration/deceleration
 */
export function determineTrend(returns: {
  oneWeek: number | null
  oneMonth: number | null
  threeMonth: number | null
  sixMonth: number | null
}): 'accelerating' | 'steady' | 'decelerating' | 'reversing' {
  const { oneWeek, oneMonth, threeMonth, sixMonth } = returns

  // Need at least 3 timeframes to determine trend
  const available = [oneWeek, oneMonth, threeMonth, sixMonth].filter(r => r !== null)
  if (available.length < 3) return 'steady'

  // Calculate slopes between consecutive periods
  const slopes: number[] = []

  if (oneWeek !== null && oneMonth !== null) {
    slopes.push(oneWeek - oneMonth)
  }
  if (oneMonth !== null && threeMonth !== null) {
    slopes.push((oneMonth - threeMonth) * 3) // Annualize
  }
  if (threeMonth !== null && sixMonth !== null) {
    slopes.push((threeMonth - sixMonth) * 2) // Annualize
  }

  if (slopes.length === 0) return 'steady'

  const avgSlope = slopes.reduce((a, b) => a + b, 0) / slopes.length

  // Check for momentum reversal (sign change)
  const recentReturns = [oneWeek, oneMonth].filter(r => r !== null) as number[]
  const olderReturns = [threeMonth, sixMonth].filter(r => r !== null) as number[]

  if (recentReturns.length > 0 && olderReturns.length > 0) {
    const recentAvg = recentReturns.reduce((a, b) => a + b, 0) / recentReturns.length
    const olderAvg = olderReturns.reduce((a, b) => a + b, 0) / olderReturns.length

    if (Math.sign(recentAvg) !== Math.sign(olderAvg) && Math.abs(recentAvg) > 1) {
      return 'reversing'
    }
  }

  // Determine trend from average slope
  if (avgSlope > 1) return 'accelerating'
  if (avgSlope < -1) return 'decelerating'
  return 'steady'
}

/**
 * Calculate percentile rank based on historical momentum scores
 * For now, use current distribution across all ETFs
 * In production, would compare against 2-year history
 */
export function calculatePercentileRank(
  currentScore: number,
  allScores: number[]
): number {
  if (allScores.length === 0) return 50

  const sorted = [...allScores].sort((a, b) => a - b)
  const rank = sorted.filter(s => s <= currentScore).length
  return Math.round((rank / sorted.length) * 100)
}

/**
 * Calculate relative strength vs SPY
 */
export function calculateVsSpyExcess(
  etfReturns: {
    oneWeek: number | null
    oneMonth: number | null
    threeMonth: number | null
    sixMonth: number | null
  },
  spyReturns: {
    oneWeek: number | null
    oneMonth: number | null
    threeMonth: number | null
    sixMonth: number | null
  }
): {
  oneWeek: number | null
  oneMonth: number | null
  threeMonth: number | null
  sixMonth: number | null
} {
  return {
    oneWeek: etfReturns.oneWeek !== null && spyReturns.oneWeek !== null
      ? etfReturns.oneWeek - spyReturns.oneWeek
      : null,
    oneMonth: etfReturns.oneMonth !== null && spyReturns.oneMonth !== null
      ? etfReturns.oneMonth - spyReturns.oneMonth
      : null,
    threeMonth: etfReturns.threeMonth !== null && spyReturns.threeMonth !== null
      ? etfReturns.threeMonth - spyReturns.threeMonth
      : null,
    sixMonth: etfReturns.sixMonth !== null && spyReturns.sixMonth !== null
      ? etfReturns.sixMonth - spyReturns.sixMonth
      : null
  }
}

/**
 * Get strength category based on percentile
 */
export function getStrengthCategory(percentile: number): {
  label: string
  color: string
  description: string
} {
  if (percentile >= 80) {
    return {
      label: 'Very Strong',
      color: 'green',
      description: 'Top quintile momentum'
    }
  } else if (percentile >= 60) {
    return {
      label: 'Strong',
      color: 'emerald',
      description: 'Above average momentum'
    }
  } else if (percentile >= 40) {
    return {
      label: 'Neutral',
      color: 'gray',
      description: 'Average momentum'
    }
  } else if (percentile >= 20) {
    return {
      label: 'Weak',
      color: 'amber',
      description: 'Below average momentum'
    }
  } else {
    return {
      label: 'Very Weak',
      color: 'red',
      description: 'Bottom quintile momentum'
    }
  }
}

/**
 * Get trend icon
 */
export function getTrendIcon(trend: string): string {
  switch (trend) {
    case 'accelerating':
      return '🚀'
    case 'steady':
      return '➡️'
    case 'decelerating':
      return '⬇️'
    case 'reversing':
      return '🔄'
    default:
      return '•'
  }
}
