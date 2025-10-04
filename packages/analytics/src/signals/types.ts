export interface TechnicalSignal {
  type: 'BUY' | 'SELL' | 'HOLD'
  strength: number // 0-100
  confidence: number // 0-100
  indicators: {
    rsi?: {
      value: number
      signal: string
      weight: number
    }
    bollingerBands?: {
      position: string
      signal: string
      weight: number
    }
    macd?: {
      crossover: string
      histogram: number
      signal: string
      weight: number
    }
    zScore?: {
      value: number
      significance: string
      signal: string
      weight: number
    }
  }
  timestamp: Date
  reasoning: string[]
}

export interface SignalWeights {
  rsi: number
  bollingerBands: number
  macd: number
  zScore: number
}

export const DEFAULT_SIGNAL_WEIGHTS: SignalWeights = {
  rsi: 0.25,
  bollingerBands: 0.25,
  macd: 0.30,
  zScore: 0.20,
}
