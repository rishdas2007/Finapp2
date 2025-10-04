# Testing Guide for Comprehensive Dashboard Enhancements

## Overview
This guide will help you test the comprehensive economic dashboard enhancements that include:
- Smart value display (YoY% for inflation indices)
- Data freshness indicators
- Enhanced UI with sorting, filtering, and export
- Mobile-responsive design

## Prerequisites
- Supabase project configured with environment variables
- FRED API key configured
- Development environment set up

## Step-by-Step Testing Instructions

### 1. Start Development Server

```bash
cd /Users/rishabhdas/Code_Projects/Economic\ Calendar\ App
pnpm install  # If not already done
pnpm --filter web dev
```

The server should start at `http://localhost:3000`

### 2. Apply Database Migration

This adds the new columns to the `economic_indicators` table.

```bash
curl -X GET http://localhost:3000/api/apply-migration
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Migration applied successfully"
}
```

### 3. Populate Economic Indicators

This fetches data from FRED and populates all indicators with the new columns.

```bash
curl -X GET http://localhost:3000/api/economic-indicators/backfill
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Backfill complete: XX/47 indicators",
  "processed": XX,
  "total": 47
}
```

**Note:** This may take 5-10 minutes due to FRED API rate limiting (120 req/min).

### 4. Access the Dashboard

Open your browser and navigate to:
```
http://localhost:3000/dashboard
```

## Features to Test

### ✅ 1. Smart Value Display

**Test: Inflation Indicators**
- Navigate to the "Inflation" category
- Look for "CPI (Core)" and "CPI (Headline)"
- **Expected:** Should show "2.5%" or similar (YoY % change), NOT "329.79" (index level)
- **Verify:** Subtitle should say "12-month % change"

**Test: Growth Indicators**
- Navigate to the "Growth" category
- Look for "Real GDP Growth"
- **Expected:** Should show percentage with "Percentage rate" subtitle

**Test: Count Values**
- Look for "Building Permits"
- **Expected:** Should show "1,450K" with "Thousands of units" subtitle

### ✅ 2. Data Freshness Badges

**Test: Fresh Data**
- Look for any indicator with recent data
- **Expected:** Green badge labeled "Current" for data <45 days old (monthly)

**Test: Stale Data**
- Look for any indicator that hasn't updated recently
- **Expected:** Red badge labeled "Stale" for data >75 days old (monthly)

### ✅ 3. Date Formatting

**Test: Monthly Data**
- Check any monthly indicator
- **Expected:** Date formatted as "Jul 2025" or "Jan 2024"
- **Expected:** Shows relative time like "2mo ago"

**Test: Quarterly Data**
- Check GDP or other quarterly indicators
- **Expected:** Date formatted as "Q2 2025"

### ✅ 4. Sorting

**Test: Click Column Headers**
- Click "Indicator" header → Should sort alphabetically
- Click "Value" header → Should sort by value numerically
- Click "Change" header → Should sort by percentage change
- Click "Z-Score" header → Should sort by z-score
- **Expected:** Arrow indicator (↑/↓) shows sort direction

### ✅ 5. Signal Filtering

**Test: Filter by Signal**
- Click "Bullish" button in the filter row
- **Expected:** Table shows only bullish indicators
- Try "Bearish" and "Neutral"
- Click "All Signals" to reset

### ✅ 6. Timing Filtering

**Test: Filter by Timing**
- Click "Leading" button
- **Expected:** Shows only leading indicators with count
- Try "Coincident" and "Lagging"
- Click "All Timings" to reset

### ✅ 7. Export to CSV

**Test: Export Functionality**
- Click "📥 Export CSV" button
- **Expected:** Downloads file named `economic-indicators-YYYY-MM-DD.csv`
- Open CSV file
- **Expected:** Contains all indicator data in spreadsheet format

### ✅ 8. Z-Score Color Coding

**Test: Color Coding**
- Look for indicators with high z-scores (>2.0)
- **Expected:** Text is red and bold
- Look for moderate z-scores (1.5-2.0)
- **Expected:** Text is orange
- Look for normal z-scores (<1.5)
- **Expected:** Text is gray

### ✅ 9. Change Value Formatting

**Test: Percentage Points**
- Find "Unemployment Rate" or other rate indicator
- Check the "Change" column
- **Expected:** Shows "pp" suffix (e.g., "+0.2pp")

**Test: Percentage Change**
- Find "Building Permits" or other count indicator
- Check the "Change" column
- **Expected:** Shows "%" suffix (e.g., "+5.3%")

### ✅ 10. Mobile Responsive Design

**Test: Mobile View**
- Resize browser window to mobile width (<768px)
- **Expected:** Table switches to card view
- **Expected:** Each indicator shown as expandable card
- Tap a card to expand
- **Expected:** Shows detailed information (timing, trend, z-score)

### ✅ 11. Hover Tooltips

**Test: Indicator Descriptions**
- Hover over any indicator row
- **Expected:** Browser tooltip shows full description

## Verification Checklist

Use this checklist to verify all enhancements are working:

- [ ] CPI/PCE show YoY% instead of index levels
- [ ] Data freshness badges appear and are color-coded correctly
- [ ] Dates are formatted by frequency (monthly = "Jul 2025", quarterly = "Q2 2025")
- [ ] Relative time appears ("2mo ago")
- [ ] Column sorting works for all sortable columns
- [ ] Signal filtering works (Bullish/Bearish/Neutral)
- [ ] Timing filtering works (Leading/Coincident/Lagging)
- [ ] CSV export downloads and contains correct data
- [ ] Z-scores are color-coded (red >2.0, orange >1.5)
- [ ] Change values show "pp" for rates, "%" for others
- [ ] Mobile view shows card layout
- [ ] Cards are expandable on mobile
- [ ] Hover tooltips work on desktop
- [ ] "Last refreshed" timestamp appears and updates
- [ ] Refresh button works

## Troubleshooting

### Issue: Migration Fails
**Solution:** Check Supabase connection and ensure environment variables are set:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Issue: Backfill Returns Errors
**Solution:** Check FRED API key:
- Verify `FRED_API_KEY` is set in environment variables
- Check FRED API rate limits (120 requests/minute)

### Issue: Data Still Shows Index Levels
**Solution:** Re-run backfill to populate new columns:
```bash
curl -X GET http://localhost:3000/api/economic-indicators/backfill
```

### Issue: Freshness Badges Not Appearing
**Solution:** Ensure data includes `data_as_of_date` column. Re-run backfill.

### Issue: Mobile View Not Working
**Solution:** Hard refresh browser (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)

## Performance Notes

- **Initial Backfill:** 5-10 minutes (one-time operation)
- **Daily Updates:** ~30 seconds (run via cron)
- **Page Load:** Should be <2 seconds with cached data
- **Refresh Button:** ~1-2 seconds to fetch latest data

## Next Steps

After verifying everything works locally:

1. **Deploy to Vercel:**
   - Push changes to GitHub (already done)
   - Vercel should auto-deploy
   - Apply migration on production via `/api/apply-migration`
   - Run backfill on production via `/api/economic-indicators/backfill`

2. **Set Up Cron Jobs:**
   - Use Vercel Cron or external service
   - Schedule daily updates: `GET /api/economic-indicators/update`
   - Recommended time: After market close (6 PM ET)

3. **Monitor Data Quality:**
   - Check for stale indicators
   - Verify freshness badges are accurate
   - Review z-scores for anomalies

## Support

If you encounter issues:
1. Check browser console for errors
2. Check server logs for API errors
3. Verify database schema in Supabase dashboard
4. Ensure all environment variables are set
5. Re-run migration and backfill if needed

---

**Last Updated:** 2025-01-27
**Version:** 1.0.0
