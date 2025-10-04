-- Create table to store daily ETF indicator values for historical z-score calculations
CREATE TABLE IF NOT EXISTS etf_indicator_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol TEXT NOT NULL,
  date DATE NOT NULL,
  rsi NUMERIC,
  percent_b NUMERIC,
  ma_gap NUMERIC,
  close_price NUMERIC,
  volume BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(symbol, date)
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_etf_indicator_history_symbol_date
  ON etf_indicator_history(symbol, date DESC);

-- Function to get historical indicators for z-score calculation
CREATE OR REPLACE FUNCTION get_historical_indicators(
  p_symbol TEXT,
  p_days INT DEFAULT 90
)
RETURNS TABLE (
  date DATE,
  rsi NUMERIC,
  percent_b NUMERIC,
  ma_gap NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.date,
    h.rsi,
    h.percent_b,
    h.ma_gap
  FROM etf_indicator_history h
  WHERE h.symbol = p_symbol
    AND h.date >= CURRENT_DATE - p_days
  ORDER BY h.date DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old history (keep last 365 days)
CREATE OR REPLACE FUNCTION cleanup_old_indicator_history()
RETURNS void AS $$
BEGIN
  DELETE FROM etf_indicator_history
  WHERE date < CURRENT_DATE - INTERVAL '365 days';
END;
$$ LANGUAGE plpgsql;
