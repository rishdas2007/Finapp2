-- Drop old economic_releases table and create comprehensive structure
DROP TABLE IF EXISTS economic_releases;

-- Create new comprehensive economic indicators table
CREATE TABLE economic_indicators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identification
  series_id TEXT NOT NULL UNIQUE,
  indicator_name TEXT NOT NULL,
  category TEXT NOT NULL, -- Growth, Inflation, Labor, Sentiment
  timing TEXT NOT NULL CHECK (timing IN ('Leading', 'Coincident', 'Lagging')),

  -- Data characteristics
  frequency TEXT NOT NULL, -- Daily, Weekly, Monthly, Quarterly, Annual
  presentation_format TEXT NOT NULL, -- 'yoy_pct_change', 'mom_pct_change', 'level', 'index', 'ratio', '4wk_avg'
  unit TEXT, -- Percent, Billions of Dollars, Index, etc.

  -- Latest data point
  date DATE NOT NULL,
  value NUMERIC NOT NULL,

  -- Calculated values
  prior_value NUMERIC,
  yoy_change NUMERIC, -- Year-over-Year % change
  mom_change NUMERIC, -- Month-over-Month % change

  -- Analysis
  signal TEXT CHECK (signal IN ('Bullish', 'Bearish', 'Neutral')),
  trend TEXT CHECK (trend IN ('up', 'down', 'stable')),
  z_score NUMERIC, -- Z-score vs historical average

  -- Metadata
  description TEXT,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX idx_economic_indicators_category ON economic_indicators(category);
CREATE INDEX idx_economic_indicators_timing ON economic_indicators(timing);
CREATE INDEX idx_economic_indicators_date ON economic_indicators(date DESC);
CREATE INDEX idx_economic_indicators_category_timing ON economic_indicators(category, timing);

-- Create table to store historical values for z-score calculations
CREATE TABLE economic_indicator_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  series_id TEXT NOT NULL,
  date DATE NOT NULL,
  value NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(series_id, date)
);

CREATE INDEX idx_econ_history_series_date ON economic_indicator_history(series_id, date DESC);

-- Function to get latest indicators by category and timing
CREATE OR REPLACE FUNCTION get_indicators_by_category_timing(
  p_category TEXT DEFAULT NULL,
  p_timing TEXT DEFAULT NULL
)
RETURNS TABLE (
  series_id TEXT,
  indicator_name TEXT,
  category TEXT,
  timing TEXT,
  date DATE,
  value NUMERIC,
  yoy_change NUMERIC,
  signal TEXT,
  trend TEXT,
  presentation_format TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.series_id,
    i.indicator_name,
    i.category,
    i.timing,
    i.date,
    i.value,
    i.yoy_change,
    i.signal,
    i.trend,
    i.presentation_format
  FROM economic_indicators i
  WHERE (p_category IS NULL OR i.category = p_category)
    AND (p_timing IS NULL OR i.timing = p_timing)
  ORDER BY i.category, i.timing, i.indicator_name;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate z-score for an indicator
CREATE OR REPLACE FUNCTION calculate_indicator_zscore(
  p_series_id TEXT,
  p_current_value NUMERIC,
  p_lookback_days INT DEFAULT 365
)
RETURNS NUMERIC AS $$
DECLARE
  v_mean NUMERIC;
  v_stddev NUMERIC;
  v_zscore NUMERIC;
BEGIN
  -- Calculate mean and standard deviation from history
  SELECT
    AVG(value),
    STDDEV(value)
  INTO v_mean, v_stddev
  FROM economic_indicator_history
  WHERE series_id = p_series_id
    AND date >= CURRENT_DATE - p_lookback_days;

  -- Calculate z-score
  IF v_stddev IS NULL OR v_stddev = 0 THEN
    RETURN 0;
  ELSE
    v_zscore := (p_current_value - v_mean) / v_stddev;
    RETURN v_zscore;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Cleanup function to remove old history (keep last 2 years)
CREATE OR REPLACE FUNCTION cleanup_old_indicator_history()
RETURNS void AS $$
BEGIN
  DELETE FROM economic_indicator_history
  WHERE date < CURRENT_DATE - INTERVAL '730 days';
END;
$$ LANGUAGE plpgsql;
