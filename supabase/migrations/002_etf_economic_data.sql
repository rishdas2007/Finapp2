-- ETF Technical Metrics table
CREATE TABLE IF NOT EXISTS etf_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  change_5day NUMERIC,
  signal TEXT CHECK (signal IN ('BUY', 'SELL', 'HOLD')),
  rsi NUMERIC,
  rsi_z NUMERIC,
  percent_b NUMERIC,
  percent_b_z NUMERIC,
  ma_gap NUMERIC,
  ma_trend TEXT CHECK (ma_trend IN ('Bull', 'Bear')),
  volume BIGINT,
  last_price NUMERIC,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(symbol, updated_at)
);

-- Create index for faster lookups
CREATE INDEX idx_etf_metrics_symbol ON etf_metrics(symbol);
CREATE INDEX idx_etf_metrics_updated_at ON etf_metrics(updated_at DESC);

-- Economic Releases table
CREATE TABLE IF NOT EXISTS economic_releases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  release_date DATE NOT NULL,
  frequency TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  series_id TEXT NOT NULL,
  category TEXT NOT NULL,
  actual_value TEXT,
  prior_reading TEXT,
  signal TEXT CHECK (signal IN ('Bullish', 'Bearish', 'Neutral')),
  trend TEXT CHECK (trend IN ('up', 'down', 'stable')),
  description TEXT,
  unit TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(series_id, release_date)
);

-- Create indexes
CREATE INDEX idx_economic_releases_date ON economic_releases(release_date DESC);
CREATE INDEX idx_economic_releases_series ON economic_releases(series_id);
CREATE INDEX idx_economic_releases_category ON economic_releases(category);

-- Update trigger for economic_releases
CREATE TRIGGER update_economic_releases_updated_at
  BEFORE UPDATE ON economic_releases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to get latest ETF metrics
CREATE OR REPLACE FUNCTION get_latest_etf_metrics()
RETURNS TABLE (
  symbol TEXT,
  name TEXT,
  change_5day NUMERIC,
  signal TEXT,
  rsi NUMERIC,
  rsi_z NUMERIC,
  percent_b NUMERIC,
  percent_b_z NUMERIC,
  ma_gap NUMERIC,
  ma_trend TEXT,
  volume BIGINT,
  last_price NUMERIC,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (e.symbol)
    e.symbol,
    e.name,
    e.change_5day,
    e.signal,
    e.rsi,
    e.rsi_z,
    e.percent_b,
    e.percent_b_z,
    e.ma_gap,
    e.ma_trend,
    e.volume,
    e.last_price,
    e.updated_at
  FROM etf_metrics e
  ORDER BY e.symbol, e.updated_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get economic releases for a time period
CREATE OR REPLACE FUNCTION get_economic_releases(
  months_back INTEGER DEFAULT 6,
  release_category TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  release_date DATE,
  frequency TEXT,
  metric_name TEXT,
  series_id TEXT,
  category TEXT,
  actual_value TEXT,
  prior_reading TEXT,
  signal TEXT,
  trend TEXT,
  description TEXT,
  unit TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.release_date,
    e.frequency,
    e.metric_name,
    e.series_id,
    e.category,
    e.actual_value,
    e.prior_reading,
    e.signal,
    e.trend,
    e.description,
    e.unit
  FROM economic_releases e
  WHERE e.release_date >= CURRENT_DATE - (months_back || ' months')::INTERVAL
    AND (release_category IS NULL OR e.category = release_category)
  ORDER BY e.release_date DESC, e.metric_name;
END;
$$ LANGUAGE plpgsql;

-- Function to clean old ETF metrics (keep last 7 days)
CREATE OR REPLACE FUNCTION clean_old_etf_metrics()
RETURNS void AS $$
BEGIN
  DELETE FROM etf_metrics WHERE updated_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;
