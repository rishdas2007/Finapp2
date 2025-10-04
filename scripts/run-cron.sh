#!/bin/bash

# Local Cron Job Simulator for ETF Metrics
# This script simulates the daily cron job by calling the update endpoints

echo "==================================="
echo "Starting Daily Data Update Cron Job"
echo "==================================="
echo ""
echo "Timestamp: $(date)"
echo ""

# Check if server is running
echo "1. Checking if dev server is running..."
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Server is running"
else
    echo "❌ Server is not running. Please start with 'pnpm dev'"
    exit 1
fi

echo ""
echo "2. Running ETF Metrics Daily Update..."
echo "   Endpoint: /api/etf-metrics/daily-update"
echo "   Expected duration: ~10 seconds"
echo ""

# Run ETF metrics update
START_TIME=$(date +%s)
ETF_RESPONSE=$(curl -s http://localhost:3000/api/etf-metrics/daily-update)
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

if echo "$ETF_RESPONSE" | jq -e '.metrics' > /dev/null 2>&1; then
    echo "✅ ETF Metrics Updated Successfully"
    echo "   Duration: ${DURATION}s"
    UPDATED_COUNT=$(echo "$ETF_RESPONSE" | jq -r '.count')
    UPDATED_SYMBOLS=$(echo "$ETF_RESPONSE" | jq -r '.updated | join(", ")')
    TIMESTAMP=$(echo "$ETF_RESPONSE" | jq -r '.timestamp')
    echo "   Updated ETFs ($UPDATED_COUNT): $UPDATED_SYMBOLS"
    echo "   Timestamp: $TIMESTAMP"
else
    echo "❌ ETF Metrics Update Failed"
    echo "   Error: $(echo "$ETF_RESPONSE" | jq -r '.error // "Unknown error"')"
fi

echo ""
echo "3. Running Economic Releases Update..."
echo "   Endpoint: /api/economic-releases"
echo "   Expected duration: ~7 seconds"
echo ""

# Run economic releases update
START_TIME=$(date +%s)
ECON_RESPONSE=$(curl -s http://localhost:3000/api/economic-releases)
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

if echo "$ECON_RESPONSE" | jq -e '.releases' > /dev/null 2>&1; then
    echo "✅ Economic Releases Updated Successfully"
    echo "   Duration: ${DURATION}s"
    RELEASE_COUNT=$(echo "$ECON_RESPONSE" | jq -r '.count')
    TIMESTAMP=$(echo "$ECON_RESPONSE" | jq -r '.timestamp')
    echo "   Release count: $RELEASE_COUNT"
    echo "   Timestamp: $TIMESTAMP"
else
    echo "❌ Economic Releases Update Failed"
    echo "   Error: $(echo "$ECON_RESPONSE" | jq -r '.error // "Unknown error"')"
fi

echo ""
echo "==================================="
echo "Daily Data Update Cron Job Complete"
echo "==================================="
echo ""
echo "Next Steps:"
echo "- Add this to your crontab for automated daily updates"
echo "- Or deploy to Vercel to use their cron functionality"
echo ""
echo "To add to crontab (runs at 4:30 PM ET, Mon-Fri):"
echo "30 16 * * 1-5 cd $(pwd) && ./scripts/run-cron.sh >> logs/cron.log 2>&1"
