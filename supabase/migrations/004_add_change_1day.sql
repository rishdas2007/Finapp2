-- Add change_1day column to etf_metrics table
ALTER TABLE etf_metrics
ADD COLUMN IF NOT EXISTS change_1day NUMERIC;

-- Add comment for documentation
COMMENT ON COLUMN etf_metrics.change_1day IS '1-day price change percentage';
