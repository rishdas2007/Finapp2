-- Update presentation_format constraint to include all necessary format types
ALTER TABLE economic_indicators DROP CONSTRAINT IF EXISTS economic_indicators_presentation_format_check;

ALTER TABLE economic_indicators ADD CONSTRAINT economic_indicators_presentation_format_check
CHECK (presentation_format IN (
  'yoy_pct_change',      -- Year-over-year percentage change
  'mom_pct_change',      -- Month-over-month percentage change
  'annualized_quarterly', -- Annualized quarterly percentage
  'level',               -- Raw level (with unit context)
  'index',               -- Index value (no % sign)
  'ratio',               -- Ratio value
  '4wk_avg',             -- 4-week moving average
  'percentage',          -- Already a percentage rate
  'currency',            -- Currency value
  'count',               -- Count value
  'basis_points'         -- Basis points
));

-- Add comment to clarify usage
COMMENT ON COLUMN economic_indicators.presentation_format IS
'Format type controls display:
- index: Show raw value (e.g., S&P 500: 6715.35)
- percentage: Value is already a % rate (e.g., GDP Growth: 3.80%)
- level: Raw value with unit context (e.g., Unemployment: 4.30%)
- count: Absolute count (e.g., Building Permits: 1,330K)
- currency: Dollar amount (e.g., Personal Income: $16,726.7B)
- yoy_pct_change: Show as YoY % change
- mom_pct_change: Show as MoM % change
- annualized_quarterly: Annualized quarterly % change
- ratio: Ratio value (e.g., 1.25)
- 4wk_avg: 4-week moving average
- basis_points: Basis points (e.g., 25bp)';
