'use client'

import { ETFMetricsTable } from '@/components/etf-metrics-table'
import { ComprehensiveEconomicCalendarEnhanced } from '@/components/comprehensive-economic-calendar-enhanced'
import MarketSignalsDashboard from '@/components/market-signals-dashboard'

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-8">
        <h1 className="text-4xl font-bold mb-8">Financial Dashboard</h1>

        {/* Market Signals Dashboard */}
        <div className="mb-8">
          <MarketSignalsDashboard />
        </div>

        {/* ETF Technical Metrics Table */}
        <div className="mt-8">
          <ETFMetricsTable />
        </div>

        {/* Economic Calendar */}
        <div className="mt-8">
          <ComprehensiveEconomicCalendarEnhanced />
        </div>
      </div>
    </div>
  )
}
