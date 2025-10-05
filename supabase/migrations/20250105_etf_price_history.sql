-- Create table for storing ETF price history
CREATE TABLE IF NOT EXISTS etf_price_history (
  id BIGSERIAL PRIMARY KEY,
  symbol VARCHAR(10) NOT NULL,
  date DATE NOT NULL,
  price DECIMAL(12, 4) NOT NULL,
  volume BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique combination of symbol and date
  UNIQUE(symbol, date)
);

-- Create index for faster queries by symbol and date range
CREATE INDEX idx_etf_price_history_symbol_date ON etf_price_history(symbol, date DESC);

-- Create index for faster queries by symbol only
CREATE INDEX idx_etf_price_history_symbol ON etf_price_history(symbol);

-- Enable Row Level Security
ALTER TABLE etf_price_history ENABLE ROW LEVEL SECURITY;

-- Create policy to allow read access to all authenticated and anonymous users
CREATE POLICY "Allow public read access" ON etf_price_history
  FOR SELECT
  USING (true);

-- Create policy to allow insert/update only for service role
-- (API routes will use service role key for writing)
CREATE POLICY "Allow service role write access" ON etf_price_history
  FOR ALL
  USING (auth.role() = 'service_role');

-- Add comment to table
COMMENT ON TABLE etf_price_history IS 'Stores historical price data for ETFs fetched from Yahoo Finance API';
