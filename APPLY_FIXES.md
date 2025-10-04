# Apply Formatting Fixes

## Steps to fix the data formatting issues:

### 1. Apply the Schema Migration

Run this SQL in your Supabase SQL Editor:

```sql
-- Update presentation_format constraint to include all necessary format types
ALTER TABLE economic_indicators DROP CONSTRAINT IF EXISTS economic_indicators_presentation_format_check;

ALTER TABLE economic_indicators ADD CONSTRAINT economic_indicators_presentation_format_check
CHECK (presentation_format IN (
  'yoy_pct_change',
  'mom_pct_change',
  'annualized_quarterly',
  'level',
  'index',
  'ratio',
  '4wk_avg',
  'percentage',
  'currency',
  'count',
  'basis_points'
));
```

### 2. Rebuild and Restart Your App

```bash
# From the root directory
pnpm install
pnpm --filter web dev
```

### 3. Trigger Data Update

Once your app is running, visit this URL in your browser to refresh all economic indicators:

```
http://localhost:3000/api/economic-indicators/update
```

This will fetch fresh data from FRED with the correct formatting.

**Note:** This may take 30-60 seconds as it fetches data for all 54+ indicators with rate limiting.

### 4. Verify the Fixes

Open your app at http://localhost:3000 and check:

- **Growth Tab:**
  - S&P 500 should show: `6,715.35` (not `+6715.35%`)
  - Building Permits should show: `1,330K` (not `+1330.00%`)
  - Real GDP Growth should show: `3.80%` with change `+4.40pp`

- **Inflation Tab:**
  - CPI (Core) should show: `329.79` (not `+329.79%`)
  - PCE Price Index should show: `126.70` (not `+126.70%`)

- **Labor Tab:**
  - Nonfarm Payrolls should show: `159,540K` (not `+159540.00%`)
  - Unemployment Rate should show: `4.30%` with change in `pp`

## What Was Fixed:

1. **Schema**: Added new presentation format types
2. **FRED API Processing**: Now handles `index`, `percentage`, `currency`, `count`, `basis_points` formats correctly
3. **Value Formatting**: Index values no longer show %, currency shows $, counts show K/M suffix
4. **Change Calculation**: Percentage indicators now show percentage point difference (pp) instead of % change
5. **Config Updates**: Updated 13+ indicators to use correct presentation formats
