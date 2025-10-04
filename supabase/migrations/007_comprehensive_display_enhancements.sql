-- Comprehensive Economic Dashboard Enhancements
-- Add columns for proper macro analysis display

-- Add value display type column
ALTER TABLE economic_indicators ADD COLUMN IF NOT EXISTS value_display_type text
  CHECK (value_display_type IN ('level', 'yoy_pct', 'mom_pct', 'index', 'rate'));

-- Add separate value columns for different representations
ALTER TABLE economic_indicators ADD COLUMN IF NOT EXISTS value_level numeric;
ALTER TABLE economic_indicators ADD COLUMN IF NOT EXISTS value_yoy_pct numeric;
ALTER TABLE economic_indicators ADD COLUMN IF NOT EXISTS value_mom_pct numeric;

-- Add date tracking columns
ALTER TABLE economic_indicators ADD COLUMN IF NOT EXISTS release_date date;
ALTER TABLE economic_indicators ADD COLUMN IF NOT EXISTS data_as_of_date date;

-- Update existing data to populate new columns with current values
UPDATE economic_indicators
SET
  value_level = value,
  data_as_of_date = date::date
WHERE value_level IS NULL;

-- Create index for faster date queries
CREATE INDEX IF NOT EXISTS idx_economic_indicators_data_as_of_date ON economic_indicators(data_as_of_date);
CREATE INDEX IF NOT EXISTS idx_economic_indicators_release_date ON economic_indicators(release_date);
CREATE INDEX IF NOT EXISTS idx_economic_indicators_display_type ON economic_indicators(value_display_type);

-- Add comment explaining the schema
COMMENT ON COLUMN economic_indicators.value_display_type IS 'Determines how to display the primary value: level (absolute), yoy_pct (year-over-year %), mom_pct (month-over-month %), index (index level), rate (percentage rate)';
COMMENT ON COLUMN economic_indicators.value_level IS 'Raw level value (e.g., index level, count, dollar amount)';
COMMENT ON COLUMN economic_indicators.value_yoy_pct IS 'Year-over-year percentage change';
COMMENT ON COLUMN economic_indicators.value_mom_pct IS 'Month-over-month percentage change';
COMMENT ON COLUMN economic_indicators.release_date IS 'Date when the data was officially released';
COMMENT ON COLUMN economic_indicators.data_as_of_date IS 'Date that the data represents (e.g., "July 2024" data)';
