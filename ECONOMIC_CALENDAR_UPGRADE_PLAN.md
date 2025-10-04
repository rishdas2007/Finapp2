# Economic Calendar Comprehensive Upgrade Plan

## Overview

Upgrading from **10 basic indicators** to **54 comprehensive macroeconomic indicators** with proper timing classification (Leading/Coincident/Lagging).

## Current State vs Target State

| Aspect | Current | Target |
|--------|---------|--------|
| **Indicators** | 10 indicators | 54 indicators |
| **Categories** | 6 basic categories | 4 major categories + timing |
| **Data Structure** | Simple flat structure | Rich metadata with timing |
| **Presentation** | One format (level) | 6 formats (YoY%, MoM%, Level, Index, Ratio, 4WA) |
| **Z-Scores** | No historical analysis | Z-scores for all indicators |
| **Display** | Single table | Organized by category/timing tabs |

## Changes Required

### 1. Database Schema ✅ Created
**File**: `supabase/migrations/005_comprehensive_economic_indicators.sql`

**New Tables**:
- `economic_indicators` - Main table with rich metadata
- `economic_indicator_history` - Historical values for z-scores

**Key Fields**:
- `timing` (Leading/Coincident/Lagging)
- `presentation_format` (yoy_pct_change, mom_pct_change, level, index, ratio, 4wk_avg, annualized_quarterly)
- `yoy_change`, `mom_change` - Calculated changes
- `z_score` - Statistical analysis vs history

### 2. Configuration ✅ Created
**File**: `apps/web/src/config/economic-indicators.ts`

**54 Indicators Organized**:
- **Growth** (19 indicators)
  - Leading: 7 (Business Investment, Building Permits, ISM New Orders, etc.)
  - Coincident: 7 (GDP, Industrial Production, ISM PMI, etc.)
  - Lagging: 5 (Inventory/Sales, Corporate Profits, Capacity Util, etc.)

- **Inflation** (15 indicators)
  - Leading: 6 (PPI, Import Prices, Commodities, Supply Chain, etc.)
  - Coincident: 6 (CPI, PCE, Unit Labor Costs, etc.)
  - Lagging: 3 (OER, Wage Growth, Medical Care, etc.)

- **Labor** (14 indicators)
  - Leading: 4 (Jobless Claims, Job Openings, Temp Help, Quits)
  - Coincident: 4 (Payrolls, Unemployment, LFPR, U-6)
  - Lagging: 3 (Long-term Unemployment, Layoffs, ECI)

- **Sentiment** (3 indicators)
  - Leading: 3 (UMich, NFIB, OECD Confidence)

### 3. Backend API Updates (TODO)

#### A. FRED API Integration
**File**: `apps/web/src/app/api/economic-indicators/route.ts`

**Responsibilities**:
- Fetch all 54 indicators from FRED API
- Calculate YoY and MoM changes based on presentation format
- Determine bullish/bearish signals
- Calculate z-scores from historical data
- Store in `economic_indicators` and `economic_indicator_history`

**Rate Limit Management**:
- FRED allows 120 req/min
- 54 indicators = ~30 seconds at 2 req/sec
- Run daily via cron

**Calculation Logic**:
```typescript
// For YoY% indicators (like CPI):
yoy_change = ((current - value_12mo_ago) / value_12mo_ago) * 100

// For MoM% indicators (like Payrolls):
mom_change = ((current - value_1mo_ago) / value_1mo_ago) * 100

// For Annualized Quarterly (like GDP):
// Already provided by FRED in annualized format

// For Level indicators (like Unemployment Rate):
// Use raw value, no transformation

// For Index indicators (like ISM PMI):
// Use raw value, interpret >50 as expansion

// For 4-Week Average (like Jobless Claims):
// Calculate rolling 4-week average
```

#### B. Latest Indicators Endpoint
**File**: `apps/web/src/app/api/economic-indicators/latest/route.ts`

**Responsibilities**:
- Retrieve latest values from `economic_indicators`
- Support filtering by category and timing
- Return formatted data for display

#### C. Historical Data Endpoint (Optional)
**File**: `apps/web/src/app/api/economic-indicators/history/[series_id]/route.ts`

**Responsibilities**:
- Retrieve historical data for charting
- Calculate trend lines
- Provide z-score time series

### 4. Frontend Component Updates (TODO)

#### A. Economic Calendar Component
**File**: `apps/web/src/components/economic-calendar.tsx`

**New UI Structure**:
```
┌─────────────────────────────────────────────────┐
│ 📊 Economic Calendar                            │
│                                                  │
│ [Growth] [Inflation] [Labor] [Sentiment]       │
│                                                  │
│ Growth Indicators (19)                          │
│ ┌──────────────────────────────────────────┐   │
│ │ Leading (7)  │ Coincident (7) │ Lagging(5) │   │
│ └──────────────────────────────────────────┘   │
│                                                  │
│ ┌─────────────────────────────────────────────┐│
│ │ Indicator    │ Value │ Change │ Signal │ Z  ││
│ │──────────────┼───────┼────────┼────────┼────││
│ │ Business     │+2.3%  │  YoY   │ 🟢     │+1.2││
│ │ Investment   │       │        │        │    ││
│ └─────────────────────────────────────────────┘│
│                                                  │
└─────────────────────────────────────────────────┘
```

**Features**:
- Tabbed interface by category (Growth/Inflation/Labor/Sentiment)
- Within each category, group by timing (Leading/Coincident/Lagging)
- Color-coded signals (Bullish/Bearish/Neutral)
- Tooltip with full description and z-score interpretation
- Sortable columns
- Expandable rows for historical charts

#### B. Updated Dashboard Page
**File**: `apps/web/src/app/dashboard/page.tsx`

**Layout**:
```
1. SPY Price Overview (existing)
2. Economic Health Score (existing)
3. ETF Technical Metrics (existing)
4. 📊 Economic Calendar (NEW comprehensive version)
```

### 5. Data Population Strategy

#### Initial Backfill
```bash
# Run once to populate all 54 indicators with 2 years of history
curl http://localhost:3000/api/economic-indicators/backfill
```

This will:
1. Fetch 2 years of historical data for each indicator (~108 data points per indicator)
2. Calculate YoY/MoM changes
3. Store in `economic_indicator_history`
4. Calculate initial z-scores
5. Store latest values in `economic_indicators`

**Duration**: ~5 minutes (54 indicators × 2 years × rate limits)

#### Daily Updates (Cron)
```bash
# Update cron to run both endpoints
./scripts/run-cron.sh
```

**Updated cron script**:
- ETF metrics (~10s)
- Economic indicators (~30s)
- Total: ~40s per day

### 6. Migration Steps

**Step 1**: Apply Database Migration
```sql
-- In Supabase SQL Editor
-- Run: supabase/migrations/005_comprehensive_economic_indicators.sql
```

**Step 2**: Create API Endpoints
- [ ] `/api/economic-indicators` - Backfill route
- [ ] `/api/economic-indicators/update` - Daily update route
- [ ] `/api/economic-indicators/latest` - Read route

**Step 3**: Update Frontend
- [ ] New Economic Calendar component
- [ ] Tab-based navigation
- [ ] Indicator cards with z-scores
- [ ] Tooltips and descriptions

**Step 4**: Initial Data Load
```bash
curl http://localhost:3000/api/economic-indicators/backfill
```

**Step 5**: Update Cron
- [ ] Add economic indicators to `scripts/run-cron.sh`
- [ ] Update `vercel.json` cron config

**Step 6**: Testing
- [ ] Verify all 54 indicators display correctly
- [ ] Check z-score calculations
- [ ] Confirm signals are accurate
- [ ] Test filtering and sorting

## FRED API Considerations

### Rate Limits
- **Free Tier**: 120 requests/minute
- **Our Usage**: 54 indicators/day = well under limit
- **Backfill**: 54 × 24 months = 1,296 data points (~10 minutes at 2 req/sec)

### Data Availability
Some series may have:
- Different update schedules (daily vs monthly vs quarterly)
- Revisions (GDP, employment data often revised)
- Missing data (some series discontinued)

**Handling Strategy**:
- Check `observation_date` to ensure we have latest data
- Store revision history
- Flag stale data (>30 days old for monthly indicators)

### API Response Format
```json
{
  "observations": [
    {
      "date": "2025-09-01",
      "value": "3.1"
    }
  ]
}
```

## Display Priorities

### Phase 1: Core Indicators (Most Important)
Start with these 12 key indicators:
1. Real GDP Growth
2. CPI (Headline)
3. CPI (Core)
4. PCE (Core)
5. Unemployment Rate
6. Nonfarm Payrolls
7. ISM Manufacturing PMI
8. ISM Services PMI
9. Yield Curve Spread
10. Initial Jobless Claims
11. Consumer Sentiment
12. LEI

### Phase 2: Full Suite
Add remaining 42 indicators after Phase 1 is validated.

## Success Criteria

✅ All 54 indicators fetching successfully
✅ Z-scores calculated correctly
✅ Signals (Bullish/Bearish/Neutral) accurate
✅ Dashboard loads in <2 seconds
✅ Data updates daily via cron
✅ Mobile-responsive design
✅ Tooltips provide context
✅ Historical data available for charting

## Timeline Estimate

- **Database & Config**: ✅ Complete (30 mins)
- **API Endpoints**: 2-3 hours
- **Frontend Component**: 2-3 hours
- **Testing & Refinement**: 1-2 hours
- **Total**: ~6-8 hours

## Next Steps

1. **Decide**: Do you want to implement all 54 indicators at once, or start with Phase 1 (12 core indicators)?
2. **Apply Migration**: Run the SQL migration in Supabase
3. **Build API**: Create FRED API integration endpoints
4. **Update UI**: Redesign Economic Calendar component
5. **Test**: Validate data accuracy and display

**Recommendation**: Start with Phase 1 (12 indicators) to validate approach, then expand to full 54.
