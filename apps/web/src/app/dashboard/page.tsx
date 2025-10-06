'use client'

import { ETFMetricsTable } from '@/components/etf-metrics-table'
import { ComprehensiveEconomicCalendarEnhanced } from '@/components/comprehensive-economic-calendar-enhanced'
import { EconomicRegimeDashboard } from '@/components/economic-regime-dashboard'
import { RelativeStrengthDashboard } from '@/components/relative-strength-dashboard'

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-8">
        {/* Economic Regime & Sector Playbook */}
        <div className="mb-8">
          <EconomicRegimeDashboard />
        </div>

        {/* Relative Strength Rankings */}
        <div className="mt-8">
          <RelativeStrengthDashboard />
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
