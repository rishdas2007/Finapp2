# Financial Dashboard

A comprehensive financial dashboard application for individual investors and financial professionals featuring real-time market data, economic analysis, and advanced technical indicators.

## Features

### 🎯 Core Capabilities

- **Real-time Market Data**: Live ETF quotes, technical analysis with RSI, Bollinger Bands, and MACD
- **Economic Health Scoring**: Time series analysis using FRED economic data with z-score calculations
- **Technical Analysis**: Advanced statistical calculations and buy/sell signal generation
- **Performance Monitoring**: Enterprise-grade caching with response time tracking
- **12+ Months Historical Data**: Comprehensive historical analysis for all metrics
- **Z-Score Analysis**: Standardized statistical analysis across all financial metrics

### 📊 Data Sources

- **[Twelve Data API](https://twelvedata.com)**: Real-time quotes, historical data, technical indicators
  - Stocks, ETFs, Forex, Crypto
  - 1min to 1month intervals
  - Built-in rate limiting (8 req/min on free tier)

- **[FRED API](https://fred.stlouisfed.org)**: US Federal Reserve Economic Data
  - GDP, Employment, Inflation, Interest Rates
  - Manufacturing, Consumer Sentiment, Housing
  - No rate limits (government data)

## Architecture

### Monorepo Structure (Turborepo)

```
/
├── apps/
│   └── web/                    # Next.js 14 application
│       ├── src/
│       │   ├── app/           # App Router pages
│       │   ├── components/    # React components
│       │   └── lib/           # Utilities
│       └── public/
├── packages/
│   ├── ui/                     # Shadcn component library
│   ├── database/               # Supabase types & client
│   ├── analytics/              # Technical indicators & z-scores
│   │   ├── technical/         # RSI, Bollinger Bands, MACD
│   │   ├── statistical/       # Z-scores, statistics
│   │   └── signals/           # Buy/sell signal generation
│   ├── economic-scoring/       # Economic health scoring
│   └── data-sources/           # API integrations
│       ├── twelve-data/       # Twelve Data client
│       ├── fred/              # FRED API client
│       └── cache/             # Enterprise caching
└── supabase/
    ├── migrations/            # Database schema
    └── config.toml            # Supabase config
```

### Tech Stack

- **Framework**: Next.js 14 (App Router, Server Components, Server Actions)
- **Language**: TypeScript
- **Styling**: TailwindCSS + Shadcn UI
- **Charts**: Recharts + Tremor
- **Database**: Supabase (PostgreSQL + Auth)
- **State Management**: Zustand + React Query
- **Validation**: Zod
- **Monorepo**: Turborepo
- **Package Manager**: pnpm

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- Supabase account
- API keys:
  - Twelve Data API key
  - FRED API key

### Installation

1. **Clone and install dependencies**

```bash
# Install pnpm if not already installed
npm install -g pnpm

# Install dependencies
pnpm install
```

2. **Set up environment variables**

Create `.env.local` files in `apps/web/`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://rrjmouhfwlkwleyvsmeq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJyam1vdWhmd2xrd2xleXZzbWVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0NTEwMzcsImV4cCI6MjA3NTAyNzAzN30.2lczH2Br80Lh7WLoD11HLJXQKTZ5RZ0U0BmQ6gScBcw
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Twelve Data API
TWELVE_DATA_API_KEY=bdceed179a5d435ba78072dfd05f8619

# FRED API
FRED_API_KEY=e801b5960c02dda70bf004c7ec706329

# Optional: Upstash Redis for caching
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

3. **Set up Supabase**

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase (if not using cloud)
supabase init

# Run migrations
supabase db push
```

Alternatively, use Supabase Cloud:
1. Create a project at [supabase.com](https://supabase.com)
2. Copy the migration SQL from `supabase/migrations/001_initial_schema.sql`
3. Run it in the SQL Editor

4. **Run development server**

```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000)

### Building for Production

```bash
pnpm build
pnpm start
```

## API Usage Examples

### Technical Analysis

```typescript
import { calculateRSI, calculateBollingerBands, calculateMACD } from '@financial-dashboard/analytics'

// Calculate RSI
const rsi = calculateRSI(priceData, 14)
console.log(`RSI: ${rsi.value}, Signal: ${rsi.signal}`)

// Calculate Bollinger Bands
const bb = calculateBollingerBands(priceData, 20, 2)
console.log(`BB Upper: ${bb.upper}, Middle: ${bb.middle}, Lower: ${bb.lower}`)

// Calculate MACD
const macd = calculateMACD(priceData, 12, 26, 9)
console.log(`MACD: ${macd.macd}, Signal: ${macd.signal}, Crossover: ${macd.crossover}`)
```

### Z-Score Analysis

```typescript
import { calculateZScore, calculateRollingZScores } from '@financial-dashboard/analytics'

// Single z-score
const zScore = calculateZScore(currentValue, historicalValues)
console.log(`Z-Score: ${zScore.value}, Significance: ${zScore.significance}`)

// Rolling z-scores
const rollingZScores = calculateRollingZScores(timeSeriesData, 12)
```

### Buy/Sell Signal Generation

```typescript
import { generateTechnicalSignal } from '@financial-dashboard/analytics'

const signal = generateTechnicalSignal(priceData)
console.log(`Signal: ${signal.type}, Confidence: ${signal.confidence}%`)
console.log(`Reasoning: ${signal.reasoning.join(', ')}`)
```

### Economic Health Scoring

```typescript
import { calculateEconomicHealthScore } from '@financial-dashboard/economic-scoring'

const healthScore = calculateEconomicHealthScore(fredData)
console.log(`Overall Score: ${healthScore.overall}/100`)
console.log(`Trend: ${healthScore.trend}`)
console.log(`Growth: ${healthScore.categories.growth}`)
console.log(`Employment: ${healthScore.categories.employment}`)
```

### Data Fetching with Caching

```typescript
import { createTwelveDataClient } from '@financial-dashboard/data-sources'
import { getCacheManager, CacheManager } from '@financial-dashboard/data-sources'

const twelveData = createTwelveDataClient({ apiKey: process.env.TWELVE_DATA_API_KEY })
const cache = getCacheManager()

// Fetch with cache
const quote = await cache.getOrFetch(
  CacheManager.quoteKey('SPY'),
  () => twelveData.getQuote('SPY'),
  cache.getTTL('realtime')
)
```

## Key Packages

### `@financial-dashboard/analytics`

Technical indicators and statistical analysis:
- **Technical**: RSI, Bollinger Bands, MACD, EMA, SMA
- **Statistical**: Z-scores, mean, median, std dev, percentiles, linear regression
- **Signals**: Buy/sell signal generation with confidence scores

### `@financial-dashboard/economic-scoring`

Economic health scoring system:
- **Categories**: Growth, Employment, Inflation, Monetary, Sentiment
- **Indicators**: 15+ FRED economic series
- **Scoring**: Weighted composite with z-score normalization
- **Trends**: Improving, Stable, Declining detection

### `@financial-dashboard/data-sources`

API clients with enterprise caching:
- **Twelve Data**: Time series, quotes, technical indicators
- **FRED**: Economic data, observations, releases
- **Cache**: In-memory cache with metrics tracking

### `@financial-dashboard/database`

Supabase integration:
- Type-safe database client
- Row-level security policies
- Zod schema validation

## Database Schema

### Core Tables

- **profiles**: User preferences and settings
- **watchlists**: User watchlists with symbols
- **market_data_cache**: Cached market data (symbol, interval)
- **economic_data_cache**: Cached FRED data (series_id)
- **api_metrics**: Performance monitoring (response times, cache hits)
- **economic_scores**: Historical economic health scores

### Performance Features

- Indexes on frequently queried columns
- Automatic cache cleanup (7-day retention)
- Cache statistics function
- Row-level security for user data

## Performance

### Optimization Strategies

- **Server Components**: Render on server for fast initial load
- **Aggressive Caching**: Multi-tier cache (memory → Redis → Supabase)
- **Code Splitting**: Route-based splitting with Next.js
- **Lazy Loading**: Charts and heavy components loaded on demand
- **Prefetching**: Critical data prefetched on hover

### Performance Budgets

- Initial Load: < 3 seconds
- Time to Interactive: < 3.5 seconds
- API Response: < 200ms (cached), < 2s (uncached)
- Chart Rendering: < 500ms

### Monitoring

```typescript
// Get cache performance metrics
const metrics = cache.getMetrics()
console.log(`Hit Rate: ${metrics.hitRate}%`)
console.log(`Avg Response: ${metrics.avgResponseTime}ms`)
```

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

Environment variables:
- Configure in Vercel dashboard
- Add all variables from `.env.local`

### Docker

```dockerfile
# Build
docker build -t financial-dashboard .

# Run
docker run -p 3000:3000 financial-dashboard
```

## Contributing

This is a personal project, but suggestions and feedback are welcome!

## API Rate Limits

### Twelve Data (Free Tier)
- **Rate**: 8 requests/minute
- **Daily**: 800 requests/day
- **Mitigation**: Aggressive caching (1-60 min TTL)

### FRED API
- **Rate**: 120 requests/minute
- **Bulk Record Limits**: 1,000 records per request
- **Best Practice**: Cache for 24 hours (data updates daily)
- **Recommendation**: Respect server resources

## Roadmap

- [ ] Real-time WebSocket integration (Twelve Data)
- [ ] Alert system for z-score anomalies
- [ ] Portfolio tracking and performance
- [ ] Advanced charting with drawing tools
- [ ] Mobile app (React Native)
- [ ] AI-powered insights and predictions
- [ ] Multi-currency support
- [ ] Cryptocurrency integration
- [ ] Social features (share analysis)

## License

MIT

## Credits

- Data sources: [Twelve Data](https://twelvedata.com), [FRED](https://fred.stlouisfed.org)
- UI Components: [Shadcn UI](https://ui.shadcn.com)
- Framework: [Next.js](https://nextjs.org)
- Database: [Supabase](https://supabase.com)
