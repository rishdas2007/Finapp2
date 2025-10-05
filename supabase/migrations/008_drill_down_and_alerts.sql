-- Dashboard Enhancement: Drill-Down Capabilities and Automated Alerts
-- Adds support for user alerts, alert history, and indicator correlations

-- User alerts configuration table
CREATE TABLE IF NOT EXISTS user_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID, -- References auth.users(id) when auth is enabled
  alert_name TEXT NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('threshold', 'pattern', 'correlation', 'data_quality', 'divergence')),

  -- Target indicator (NULL for multi-indicator alerts)
  indicator_series_id TEXT REFERENCES economic_indicators(series_id),

  -- Flexible alert configuration stored as JSONB
  -- Examples:
  -- Threshold: {"operator": "greater_than", "threshold": 3.5, "consecutive_periods": 2}
  -- Pattern: {"pattern_type": "consecutive_increase", "periods": 3}
  -- Correlation: {"indicators": ["CPIAUCSL", "UNRATE"], "correlation_threshold": 0.7}
  condition_config JSONB NOT NULL,

  severity TEXT NOT NULL DEFAULT 'INFO' CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
  enabled BOOLEAN DEFAULT true,

  -- Notification preferences
  notify_in_app BOOLEAN DEFAULT true,
  notify_email BOOLEAN DEFAULT false,
  notify_frequency TEXT DEFAULT 'immediate' CHECK (notify_frequency IN ('immediate', 'daily', 'weekly')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alert history - tracks when alerts were triggered
CREATE TABLE IF NOT EXISTS alert_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_rule_id UUID REFERENCES user_alerts(id) ON DELETE CASCADE,

  triggered_at TIMESTAMPTZ DEFAULT NOW(),

  -- Context about what triggered the alert
  indicator_series_id TEXT,
  trigger_value NUMERIC,
  trigger_message TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),

  -- Additional context data
  context_data JSONB, -- Store related indicator values, historical context, etc.

  -- User interaction
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID,
  dismissed_at TIMESTAMPTZ,
  snoozed_until TIMESTAMPTZ,

  -- For tracking alert delivery
  delivered_in_app BOOLEAN DEFAULT false,
  delivered_email BOOLEAN DEFAULT false
);

-- Indicator correlations - pre-computed for performance
CREATE TABLE IF NOT EXISTS indicator_correlations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  indicator_a TEXT NOT NULL REFERENCES economic_indicators(series_id),
  indicator_b TEXT NOT NULL REFERENCES economic_indicators(series_id),

  -- Correlation statistics
  correlation_coefficient NUMERIC NOT NULL, -- Pearson correlation coefficient
  p_value NUMERIC, -- Statistical significance

  -- Lead/lag relationship (negative = indicator_a leads, positive = indicator_b leads)
  lag_months INTEGER DEFAULT 0,

  -- Calculation parameters
  lookback_months INTEGER DEFAULT 24,
  last_calculated TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique pairs (with lag consideration)
  UNIQUE(indicator_a, indicator_b, lag_months),

  -- Prevent self-correlation
  CHECK (indicator_a != indicator_b)
);

-- Create indexes for efficient queries

-- User alerts indexes
CREATE INDEX idx_user_alerts_enabled ON user_alerts(enabled) WHERE enabled = true;
CREATE INDEX idx_user_alerts_series ON user_alerts(indicator_series_id) WHERE indicator_series_id IS NOT NULL;
CREATE INDEX idx_user_alerts_type ON user_alerts(alert_type);
CREATE INDEX idx_user_alerts_user ON user_alerts(user_id) WHERE user_id IS NOT NULL;

-- Alert history indexes
CREATE INDEX idx_alert_history_triggered ON alert_history(triggered_at DESC);
CREATE INDEX idx_alert_history_unacknowledged ON alert_history(acknowledged_at, dismissed_at)
  WHERE acknowledged_at IS NULL AND dismissed_at IS NULL;
CREATE INDEX idx_alert_history_rule ON alert_history(alert_rule_id);
CREATE INDEX idx_alert_history_indicator ON alert_history(indicator_series_id) WHERE indicator_series_id IS NOT NULL;
CREATE INDEX idx_alert_history_severity ON alert_history(severity);

-- Indicator correlations indexes
CREATE INDEX idx_correlations_indicator_a ON indicator_correlations(indicator_a);
CREATE INDEX idx_correlations_indicator_b ON indicator_correlations(indicator_b);
CREATE INDEX idx_correlations_coefficient ON indicator_correlations(correlation_coefficient DESC);
CREATE INDEX idx_correlations_calculated ON indicator_correlations(last_calculated DESC);

-- Add comments for documentation
COMMENT ON TABLE user_alerts IS 'User-configured alert rules for economic indicators and market conditions';
COMMENT ON TABLE alert_history IS 'Historical record of triggered alerts with user interaction tracking';
COMMENT ON TABLE indicator_correlations IS 'Pre-computed correlations between economic indicators for relationship analysis';

COMMENT ON COLUMN user_alerts.condition_config IS 'JSONB configuration defining alert trigger conditions';
COMMENT ON COLUMN user_alerts.notify_frequency IS 'How often to send notifications: immediate, daily digest, or weekly summary';
COMMENT ON COLUMN alert_history.context_data IS 'JSONB data providing additional context about the alert trigger';
COMMENT ON COLUMN indicator_correlations.lag_months IS 'Lead/lag relationship: negative = indicator_a leads, positive = indicator_b leads';

-- Insert default alert templates for common use cases
INSERT INTO user_alerts (alert_name, alert_type, indicator_series_id, condition_config, severity, notify_in_app) VALUES
  ('CPI Inflation Alert', 'threshold', 'CPIAUCSL', '{"operator": "greater_than", "threshold": 3.5, "consecutive_periods": 1}', 'WARNING', true),
  ('Unemployment Rate Spike', 'threshold', 'UNRATE', '{"operator": "greater_than", "threshold": 5.0, "consecutive_periods": 1}', 'CRITICAL', true),
  ('Yield Curve Inversion', 'threshold', 'T10Y3M', '{"operator": "less_than", "threshold": 0, "consecutive_periods": 1}', 'CRITICAL', true),
  ('S&P 500 Volatility', 'pattern', 'SP500', '{"pattern_type": "high_volatility", "periods": 5, "threshold_pct": 2.0}', 'WARNING', true),
  ('Inflation Trend', 'pattern', 'CPIAUCSL', '{"pattern_type": "consecutive_increase", "periods": 3}', 'WARNING', true),
  ('Stale Data Warning', 'data_quality', NULL, '{"max_staleness_days": 45, "check_frequency": "Monthly"}', 'INFO', true)
ON CONFLICT DO NOTHING;
