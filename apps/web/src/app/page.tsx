import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-br from-background via-background to-secondary">
      <div className="max-w-4xl w-full space-y-8 text-center">
        <div className="space-y-4">
          <h1 className="text-6xl font-bold tracking-tight text-foreground">
            Financial Dashboard
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Enterprise-grade financial analysis platform with real-time market data,
            advanced technical indicators, and comprehensive economic health scoring
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="p-6 rounded-lg bg-card border border-border hover:border-primary transition-colors">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-lg font-semibold mb-2">Real-time Market Data</h3>
            <p className="text-sm text-muted-foreground">
              Live quotes, ETF tracking, and technical analysis with RSI, Bollinger Bands, and more
            </p>
          </div>

          <div className="p-6 rounded-lg bg-card border border-border hover:border-primary transition-colors">
            <div className="text-4xl mb-4">📈</div>
            <h3 className="text-lg font-semibold mb-2">Economic Health Scoring</h3>
            <p className="text-sm text-muted-foreground">
              Time series analysis using FRED economic data with z-score calculations
            </p>
          </div>

          <div className="p-6 rounded-lg bg-card border border-border hover:border-primary transition-colors">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-lg font-semibold mb-2">Enterprise Performance</h3>
            <p className="text-sm text-muted-foreground">
              Advanced caching, sub-3s load times, and comprehensive performance monitoring
            </p>
          </div>
        </div>

        <div className="flex gap-4 justify-center mt-12">
          <Link
            href="/dashboard"
            className="px-8 py-3 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/auth/signin"
            className="px-8 py-3 rounded-md bg-secondary text-secondary-foreground font-semibold hover:bg-secondary/80 transition-colors"
          >
            Sign In
          </Link>
        </div>

        <div className="mt-16 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Powered by Twelve Data API, FRED Economic Data, Next.js 14, and Supabase
          </p>
        </div>
      </div>
    </main>
  )
}
