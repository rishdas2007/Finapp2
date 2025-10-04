# ETF Metrics & Historical Z-Score System

## Overview

This system tracks 12 sector ETFs with technical indicators (RSI, Bollinger Bands %B, MA Gap) and calculates z-scores based on 45-90 days of historical data stored in Supabase.

## Architecture

### Data Flow
1. **Twelve Data API** → Fetches historical price data (250 days)
2. **Calculate Indicators** → RSI, %B, MA Gap for each historical day
3. **Store in Supabase** → `etf_indicator_history` table (90 days per ETF)
4. **Calculate Z-Scores** → Compare current indicators vs 45-90 day baseline
5. **Store Metrics** → `etf_metrics` table with z-scores
6. **Display Dashboard** → Real-time updates every 60 seconds

### Database Tables

#### `etf_indicator_history`
Stores daily technical indicator values for z-score calculations.
```sql
- symbol (TEXT): ETF ticker (SPY, XLB, etc.)
- date (DATE): Trading date
- rsi (NUMERIC): Relative Strength Index (14-period)
- percent_b (NUMERIC): Bollinger Bands %B (20-period, 2σ)
- ma_gap (NUMERIC): Moving Average Gap (50/200 MA)
- close_price (NUMERIC): Closing price
- volume (BIGINT): Trading volume
```

#### `etf_metrics`
Stores current ETF metrics with z-scores.
```sql
- symbol, name, last_price, volume
- rsi, rsi_z (z-score vs historical RSI)
- percent_b, percent_b_z (z-score vs historical %B)
- ma_gap, ma_trend (Bull/Bear)
- change_5day (5-day price change %)
- signal (BUY/SELL/HOLD)
```

## API Endpoints

### 1. `/api/etf-metrics` - Full Backfill
**Purpose**: Initial setup or full historical refresh
**Duration**: ~100 seconds (12 ETFs × 8 seconds rate limiting)
**Data Stored**: 90 days of historical indicators per ETF
**Rate Limit**: 8 requests/min (actually 144/min available)

**Usage**:
```bash
curl http://localhost:3000/api/etf-metrics
```

**What it does**:
- Fetches 250 days of price data from Twelve Data
- Calculates RSI, %B, MA Gap for the last 90 days
- Stores all 90 days in `etf_indicator_history`
- Calculates z-scores using full 90-day baseline
- Updates `etf_metrics` table

### 2. `/api/etf-metrics/daily-update` - Fast Daily Update
**Purpose**: Daily cron job to add today's data
**Duration**: ~10 seconds (12 ETFs × 0.5 seconds)
**Data Stored**: 1 new day per ETF
**Rate Limit**: Well under 144/min

**Usage**:
```bash
curl http://localhost:3000/api/etf-metrics/daily-update
```

**What it does**:
- Fetches latest price data for each ETF
- Calculates today's RSI, %B, MA Gap
- Stores only today's values in `etf_indicator_history`
- Calculates z-scores using 45-90 day baseline from database
- Updates `etf_metrics` table

### 3. `/api/etf-metrics/latest` - Read-Only
**Purpose**: Dashboard display
**Duration**: <1 second
**Usage**: Auto-called by dashboard every 60 seconds

## Technical Indicators

### RSI (Relative Strength Index)
- **Period**: 14 days
- **Range**: 0-100
- **Signals**:
  - < 30 = Oversold (potential BUY)
  - > 70 = Overbought (potential SELL)
- **Z-Score**: How extreme current RSI is vs 45-90 day history

### Bollinger Bands %B
- **Period**: 20 days, 2 standard deviations
- **Range**: Typically 0-100 (can exceed)
- **Calculation**: `(price - lower_band) / (upper_band - lower_band) × 100`
- **Signals**:
  - < 20 = Near lower band (potential BUY)
  - > 80 = Near upper band (potential SELL)
- **Z-Score**: How extreme current %B is vs 45-90 day history

### MA Gap (Moving Average Gap)
- **Calculation**: `((MA50 - MA200) / MA200) × 100`
- **Trend**:
  - Positive = Bull market (MA50 > MA200)
  - Negative = Bear market (MA50 < MA200)
- **Z-Score**: How extreme current gap is vs history

## Z-Score Calculation

**Formula**: `z = (current_value - mean) / std_dev`

**Baseline**:
- **Minimum**: 45 days of historical data required
- **Optimal**: 90 days of historical data
- **Rolling Window**: Automatically maintained in database

**Interpretation**:
- `z = 0`: Current value is at historical average
- `z = +2`: Current value is 2 standard deviations above average (very high)
- `z = -2`: Current value is 2 standard deviations below average (very low)

**Example**:
If SPY's RSI is currently 70 with `rsi_z = 1.5`:
- RSI of 70 is 1.5 standard deviations above the 45-90 day average
- This is moderately elevated compared to recent history

## 5-Day Price Change

**Calculation**:
```typescript
change_5day = ((price_today - price_5days_ago) / price_5days_ago) × 100
```

**Purpose**: Shows momentum over the past week

## Cron Job Setup

### Option 1: Vercel Cron (Recommended for Production)

Create `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/etf-metrics/daily-update",
      "schedule": "0 21 * * 1-5"
    }
  ]
}
```

Schedule: Every weekday at 9 PM UTC (4 PM ET, after market close)

### Option 2: System Cron (Local/Server)

Add to crontab:
```bash
# Run daily at 4:30 PM ET (after market close)
30 16 * * 1-5 curl -X GET http://localhost:3000/api/etf-metrics/daily-update
```

### Option 3: GitHub Actions (Free Alternative)

Create `.github/workflows/daily-etf-update.yml`:
```yaml
name: Daily ETF Update
on:
  schedule:
    - cron: '0 21 * * 1-5'  # 9 PM UTC, Mon-Fri
  workflow_dispatch:  # Allow manual trigger

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger ETF Update
        run: |
          curl -X GET https://your-domain.com/api/etf-metrics/daily-update
```

## Rate Limits

### Twelve Data API
- **Limit**: 144 requests/minute (confirmed)
- **Our Usage**:
  - Full backfill: 12 requests (well under limit)
  - Daily update: 12 requests (well under limit)
- **Delays**: 500ms between requests (conservative)

## Current Status

✅ **Historical Data**: 90 days stored for all 12 ETFs
✅ **Z-Scores**: Calculated from 90-day baseline
✅ **Dashboard**: Auto-refreshes every 60 seconds
✅ **5-Day Change**: Correctly calculated from price history
✅ **Indicators**: RSI, %B, MA Gap all accurate

## Monitored ETFs

1. **SPY** - S&P 500 Index
2. **XLB** - Materials
3. **XLC** - Communication Services
4. **XLE** - Energy
5. **XLF** - Financials
6. **XLI** - Industrials
7. **XLK** - Technology
8. **XLP** - Consumer Staples
9. **XLRE** - Real Estate
10. **XLU** - Utilities
11. **XLV** - Health Care
12. **XLY** - Consumer Discretionary

## Maintenance

### Weekly Check
```bash
# Verify data freshness
curl http://localhost:3000/api/etf-metrics/latest | jq '.metrics[0]'
```

### Monthly Cleanup
```sql
-- Run cleanup function (keeps last 365 days)
SELECT cleanup_old_indicator_history();
```

### Manual Refresh
```bash
# If data seems stale, run full backfill
curl http://localhost:3000/api/etf-metrics
```

## Troubleshooting

### Issue: Z-scores are all 0
**Cause**: Insufficient historical data (< 45 days)
**Fix**: Run `/api/etf-metrics` to backfill

### Issue: Same indicator values for multiple days
**Cause**: Incorrect price array ordering
**Fix**: Already fixed - prices are now reversed correctly

### Issue: Rate limit errors
**Cause**: Too many requests to Twelve Data
**Fix**: Increase delay between requests (currently 500ms)

### Issue: Dashboard shows stale data
**Cause**: Cron job not running
**Fix**: Check cron logs, verify API endpoint accessibility

## Future Enhancements

1. **Add more indicators**: MACD, Volume trends, Support/Resistance
2. **Machine learning**: Predict direction based on historical patterns
3. **Alerts**: Email/SMS when z-scores exceed thresholds
4. **Backtesting**: Historical signal performance analysis
5. **Portfolio tracking**: User-specific watchlists
