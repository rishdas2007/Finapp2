-- Update ETF metrics signal constraint to support STRONG BUY and STRONG SELL
-- This migration extends the signal types to include statistical z-score based strong signals

-- Drop existing constraint on etf_metrics table
ALTER TABLE etf_metrics
DROP CONSTRAINT IF EXISTS etf_metrics_signal_check;

-- Add new constraint with STRONG BUY and STRONG SELL
ALTER TABLE etf_metrics
ADD CONSTRAINT etf_metrics_signal_check
CHECK (signal IN ('BUY', 'SELL', 'HOLD', 'STRONG BUY', 'STRONG SELL'));

-- Add comment explaining the signal types
COMMENT ON COLUMN etf_metrics.signal IS 'Trading signal based on statistical z-score analysis: BUY (RSI & %B z-score < -1.5), SELL (z-score > 1.5), STRONG signals (z-score beyond ±2.0)';
