-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  preferences JSONB DEFAULT '{"theme": "dark", "refreshInterval": 60000, "alertsEnabled": true}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Watchlists table
CREATE TABLE IF NOT EXISTS watchlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  symbols TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;

-- Watchlists policies
CREATE POLICY "Users can view their own watchlists"
  ON watchlists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own watchlists"
  ON watchlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own watchlists"
  ON watchlists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own watchlists"
  ON watchlists FOR DELETE
  USING (auth.uid() = user_id);

-- Update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_watchlists_updated_at
  BEFORE UPDATE ON watchlists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Market data cache table
CREATE TABLE IF NOT EXISTS market_data_cache (
  symbol TEXT NOT NULL,
  interval TEXT NOT NULL,
  data JSONB NOT NULL,
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (symbol, interval)
);

-- Create index for faster lookups
CREATE INDEX idx_market_data_cache_cached_at ON market_data_cache(cached_at);

-- Economic data cache table
CREATE TABLE IF NOT EXISTS economic_data_cache (
  series_id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  cached_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_economic_data_cache_cached_at ON economic_data_cache(cached_at);

-- API metrics table
CREATE TABLE IF NOT EXISTS api_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  endpoint TEXT NOT NULL,
  response_time INTEGER NOT NULL,
  cache_hit BOOLEAN NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance monitoring
CREATE INDEX idx_api_metrics_endpoint ON api_metrics(endpoint);
CREATE INDEX idx_api_metrics_timestamp ON api_metrics(timestamp DESC);
CREATE INDEX idx_api_metrics_cache_hit ON api_metrics(cache_hit);

-- Economic scores table
CREATE TABLE IF NOT EXISTS economic_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  score JSONB NOT NULL,
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for time-based queries
CREATE INDEX idx_economic_scores_calculated_at ON economic_scores(calculated_at DESC);

-- Function to clean old cache entries (7 days old)
CREATE OR REPLACE FUNCTION clean_old_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM market_data_cache WHERE cached_at < NOW() - INTERVAL '7 days';
  DELETE FROM economic_data_cache WHERE cached_at < NOW() - INTERVAL '7 days';
  DELETE FROM api_metrics WHERE timestamp < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Create a function to get cache statistics
CREATE OR REPLACE FUNCTION get_cache_stats()
RETURNS TABLE (
  total_market_entries BIGINT,
  total_economic_entries BIGINT,
  avg_response_time NUMERIC,
  cache_hit_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM market_data_cache),
    (SELECT COUNT(*) FROM economic_data_cache),
    (SELECT ROUND(AVG(response_time)::numeric, 2) FROM api_metrics WHERE timestamp > NOW() - INTERVAL '1 hour'),
    (SELECT ROUND((COUNT(*) FILTER (WHERE cache_hit = true)::numeric / NULLIF(COUNT(*), 0)) * 100, 2)
     FROM api_metrics WHERE timestamp > NOW() - INTERVAL '1 hour');
END;
$$ LANGUAGE plpgsql;
