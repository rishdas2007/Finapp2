export interface PriceData {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

export interface TechnicalIndicatorResult {
  value: number
  signal?: 'BUY' | 'SELL' | 'NEUTRAL' | 'OVERBOUGHT' | 'OVERSOLD'
  strength?: number // 0-100
}

export interface RSIResult extends TechnicalIndicatorResult {
  isOverbought: boolean  // > 70
  isOversold: boolean    // < 30
}

export interface BollingerBandsResult {
  upper: number
  middle: number
  lower: number
  bandwidth: number
  percentB: number // Price position relative to bands
  signal: 'ABOVE_UPPER' | 'ABOVE_MIDDLE' | 'BELOW_MIDDLE' | 'BELOW_LOWER'
}

export interface MACDResult {
  macd: number
  signal: number
  histogram: number
  crossover: 'BULLISH' | 'BEARISH' | 'NONE'
}

export interface ZScoreResult {
  value: number
  significance: 'NORMAL' | 'HIGH' | 'EXTREME'
  standardDeviations: number
}

export interface TimeSeriesStats {
  mean: number
  median: number
  stdDev: number
  min: number
  max: number
  variance: number
  range: number
}

export interface TrendAnalysis {
  direction: 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS'
  slope: number
  rSquared: number // Goodness of fit
  strength: number // 0-100
}
