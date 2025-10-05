'use client'

import { ETFMetricsTable } from '@/components/etf-metrics-table'
import { ComprehensiveEconomicCalendarEnhanced } from '@/components/comprehensive-economic-calendar-enhanced'
import SpySparkChart from '@/components/spy-sparkchart'

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-8">
        <h1 className="text-4xl font-bold mb-8">Financial Dashboard</h1>

        {/* SPY 30-Day Sparkchart */}
        <div className="mb-8">
          <SpySparkChart />
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
