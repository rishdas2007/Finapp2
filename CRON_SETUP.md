# Cron Job Setup Guide

## Overview

The Financial Dashboard uses cron jobs to automatically update ETF metrics and economic data daily after market close.

## What Gets Updated

1. **ETF Metrics** (`/api/etf-metrics/daily-update`)
   - 12 sector ETFs (SPY, XLB, XLC, XLE, XLF, XLI, XLK, XLP, XLRE, XLU, XLV, XLY)
   - Technical indicators: RSI, Bollinger Bands %B, MA Gap
   - Z-scores calculated from 90-day historical baseline
   - Duration: ~8-10 seconds

2. **Economic Releases** (`/api/economic-releases`)
   - 10 economic indicators from FRED API
   - PCE, Federal Funds Rate, CPI, Unemployment, GDP, etc.
   - Duration: ~6-7 seconds

**Total Time**: ~15 seconds per day

## Deployment Options

### Option 1: Vercel Cron (Recommended for Production)

**Configuration**: [vercel.json](vercel.json) (already created)

```json
{
  "crons": [
    {
      "path": "/api/etf-metrics/daily-update",
      "schedule": "0 21 * * 1-5"
    },
    {
      "path": "/api/economic-releases",
      "schedule": "0 22 * * 1-5"
    }
  ]
}
```

**Schedule**:
- ETF Metrics: 9:00 PM UTC (4:00 PM ET) Mon-Fri
- Economic Releases: 10:00 PM UTC (5:00 PM ET) Mon-Fri

**Setup**:
1. Deploy to Vercel: `vercel --prod`
2. Cron jobs automatically run on Vercel's infrastructure
3. View logs in Vercel dashboard

**Pros**:
- No local infrastructure needed
- Automatic scaling and monitoring
- Built-in logging

**Cons**:
- Requires Vercel Pro plan ($20/month) for cron jobs
- Limited to Vercel's cron schedule syntax

---

### Option 2: System Crontab (Local/Server)

**Configuration**: [scripts/crontab-entry.txt](scripts/crontab-entry.txt)

**Installation**:
```bash
# Review the crontab entry
cat scripts/crontab-entry.txt

# Install (WARNING: This replaces your entire crontab)
crontab scripts/crontab-entry.txt

# Or manually add to existing crontab
crontab -e
# Then paste: 30 16 * * 1-5 cd /path/to/project && ./scripts/run-cron.sh >> logs/cron.log 2>&1
```

**Schedule**: 4:30 PM ET, Monday-Friday

**Verify**:
```bash
# List installed cron jobs
crontab -l

# Check logs
tail -f logs/cron.log
```

**Pros**:
- Free (runs on your machine)
- Full control over schedule and execution

**Cons**:
- Requires local server to be running 24/7
- Need to manage logs manually
- Computer must be on and connected

---

### Option 3: GitHub Actions (Free Alternative)

**Configuration**: Create `.github/workflows/daily-update.yml`

```yaml
name: Daily Data Update
on:
  schedule:
    - cron: '0 21 * * 1-5'  # 9 PM UTC, Mon-Fri (4 PM ET)
  workflow_dispatch:  # Allow manual trigger

jobs:
  update-data:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger ETF Metrics Update
        run: |
          curl -X GET https://your-domain.com/api/etf-metrics/daily-update

      - name: Trigger Economic Releases Update
        run: |
          curl -X GET https://your-domain.com/api/economic-releases
```

**Setup**:
1. Create the workflow file above
2. Push to GitHub
3. Actions run automatically on schedule

**Pros**:
- Completely free
- No local infrastructure needed
- Built-in logging and monitoring

**Cons**:
- Requires GitHub repository
- Schedule resolution limited to 5 minutes
- May have slight delays (GitHub Actions queue)

---

## Manual Testing

### Test Locally

```bash
# Run the full cron job simulation
./scripts/run-cron.sh

# Or test individual endpoints
curl http://localhost:3000/api/etf-metrics/daily-update
curl http://localhost:3000/api/economic-releases
```

### Test in Production

```bash
# Test ETF update
curl https://your-domain.com/api/etf-metrics/daily-update

# Test economic update
curl https://your-domain.com/api/economic-releases
```

---

## Monitoring & Logs

### Local Logs

```bash
# View recent logs
tail -20 logs/cron.log

# Follow logs in real-time
tail -f logs/cron.log

# Check if cron job ran today
grep "$(date +%Y-%m-%d)" logs/cron.log
```

### Vercel Logs

1. Go to Vercel Dashboard
2. Select your project
3. Click "Logs" tab
4. Filter by "/api/etf-metrics/daily-update" or "/api/economic-releases"

### GitHub Actions Logs

1. Go to your repository on GitHub
2. Click "Actions" tab
3. Select "Daily Data Update" workflow
4. View run logs

---

## Troubleshooting

### Cron job not running

**Check if crontab is installed**:
```bash
crontab -l
```

**Check system logs**:
```bash
# macOS
log show --predicate 'process == "cron"' --last 1h

# Linux
grep CRON /var/log/syslog
```

### Server not running

The cron script checks if the server is running. If not:
```bash
# Make sure dev server is running
pnpm dev

# Or in production
pnpm build && pnpm start
```

### Data not updating

**Check API response**:
```bash
# Should return JSON with updated data
curl http://localhost:3000/api/etf-metrics/daily-update | jq .

# Check for errors
curl http://localhost:3000/api/etf-metrics/daily-update 2>&1 | grep -i error
```

**Check database**:
```sql
-- Verify recent data
SELECT symbol, date, rsi, percent_b
FROM etf_indicator_history
WHERE date >= CURRENT_DATE - 7
ORDER BY date DESC, symbol;
```

### Rate limit errors

If you see "Rate limit exceeded" from Twelve Data:
- Current limit: 144 requests/minute
- Our usage: 12 requests per run
- This should never happen with daily updates

If it does occur:
1. Wait 1 minute
2. Re-run: `./scripts/run-cron.sh`

---

## Schedule Reference

All times are for **US Eastern Time (ET)**:

| Time   | Day       | What Happens                          |
|--------|-----------|---------------------------------------|
| 4:00 PM | Mon-Fri   | US stock market closes                |
| 4:30 PM | Mon-Fri   | **Cron job runs** (system crontab)   |
| 9:00 PM | Mon-Fri   | **Cron job runs** (Vercel UTC)        |

**Note**: Markets close at 4:00 PM ET, so running at 4:30 PM ensures all end-of-day data is available.

---

## Removing Cron Jobs

### System Crontab

```bash
# Remove all cron jobs
crontab -r

# Or edit to remove specific entry
crontab -e
# Delete the line with run-cron.sh
```

### Vercel

Delete or comment out entries in `vercel.json`:
```json
{
  "crons": []
}
```

Then redeploy: `vercel --prod`

### GitHub Actions

Delete or disable `.github/workflows/daily-update.yml`

---

## Cost Analysis

| Method          | Cost          | Infrastructure | Reliability |
|-----------------|---------------|----------------|-------------|
| Vercel Cron     | $20/month     | None needed    | ⭐⭐⭐⭐⭐       |
| System Crontab  | Free          | Local server   | ⭐⭐⭐         |
| GitHub Actions  | Free          | None needed    | ⭐⭐⭐⭐        |

**Recommendation**:
- **Development**: System Crontab (free, easy to test)
- **Production**: Vercel Cron (most reliable) or GitHub Actions (free alternative)

---

## API Rate Limits

### Twelve Data
- **Free Plan**: 800 requests/day, 8 requests/minute
- **Our Usage**: 12 requests/day (1 per ETF)
- **Headroom**: 788 requests/day remaining

### FRED API
- **Limit**: 120 requests/minute
- **Our Usage**: 10 requests/day
- **Headroom**: Virtually unlimited

---

## Next Steps

1. **Choose deployment method** (Vercel, System Crontab, or GitHub Actions)
2. **Test manually** using `./scripts/run-cron.sh`
3. **Install cron job** using one of the methods above
4. **Monitor logs** for first few days to ensure success
5. **Check dashboard** at http://localhost:3000/dashboard to see updated data

---

## Support

If you encounter issues:
1. Check logs: `tail -f logs/cron.log`
2. Test endpoints manually: `curl http://localhost:3000/api/etf-metrics/daily-update`
3. Review [ETF_METRICS_GUIDE.md](ETF_METRICS_GUIDE.md) for troubleshooting
4. Verify API keys in `.env.local`
