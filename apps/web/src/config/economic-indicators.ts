/**
 * Comprehensive Economic Indicators Configuration
 * Based on FRED API data sources
 */

export interface EconomicIndicatorConfig {
  seriesId: string
  name: string
  category: 'Growth' | 'Inflation' | 'Labor' | 'Sentiment'
  timing: 'Leading' | 'Coincident' | 'Lagging'
  frequency: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Annual'
  presentationFormat: 'yoy_pct_change' | 'mom_pct_change' | 'level' | 'index' | 'ratio' | '4wk_avg' | 'annualized_quarterly' | 'percentage' | 'currency' | 'count' | 'basis_points'
  unit: string
  description?: string
}

export const ECONOMIC_INDICATORS: EconomicIndicatorConfig[] = [
  // ==================== GROWTH INDICATORS ====================

  // Leading Growth Indicators
  {
    seriesId: 'NEWOECAP',
    name: 'Business Investment Orders',
    category: 'Growth',
    timing: 'Leading',
    frequency: 'Monthly',
    presentationFormat: 'yoy_pct_change',
    unit: 'Percent',
    description: 'New Orders for Capital Goods'
  },
  {
    seriesId: 'PERMIT',
    name: 'Building Permits',
    category: 'Growth',
    timing: 'Leading',
    frequency: 'Monthly',
    presentationFormat: 'count',
    unit: 'Thousands',
    description: 'New Private Housing Units Authorized by Building Permits'
  },
  {
    seriesId: 'NAPMNOI',
    name: 'ISM Manufacturing New Orders',
    category: 'Growth',
    timing: 'Leading',
    frequency: 'Monthly',
    presentationFormat: 'index',
    unit: 'Index',
    description: 'ISM Manufacturing: New Orders Index (>50 = expansion)'
  },
  {
    seriesId: 'UMCSEC',
    name: 'Consumer Expectations (UMich)',
    category: 'Growth',
    timing: 'Leading',
    frequency: 'Monthly',
    presentationFormat: 'index',
    unit: 'Index',
    description: 'University of Michigan: Consumer Expectations'
  },
  {
    seriesId: 'T10Y3M',
    name: 'Yield Curve Spread (10Y-3M)',
    category: 'Growth',
    timing: 'Leading',
    frequency: 'Daily',
    presentationFormat: 'level',
    unit: 'Basis Points',
    description: '10-Year Treasury minus 3-Month Treasury (negative = inversion)'
  },
  {
    seriesId: 'SP500',
    name: 'S&P 500',
    category: 'Growth',
    timing: 'Leading',
    frequency: 'Daily',
    presentationFormat: 'index',
    unit: 'Index',
    description: 'S&P 500 Stock Market Index'
  },
  {
    seriesId: 'USSLIND',
    name: 'Leading Economic Index (LEI)',
    category: 'Growth',
    timing: 'Leading',
    frequency: 'Monthly',
    presentationFormat: 'mom_pct_change',
    unit: 'Percent',
    description: 'Conference Board Leading Economic Index'
  },

  // Coincident Growth Indicators
  {
    seriesId: 'A191RL1Q225SBEA',
    name: 'Real GDP Growth',
    category: 'Growth',
    timing: 'Coincident',
    frequency: 'Quarterly',
    presentationFormat: 'percentage',
    unit: 'Percent',
    description: 'Real Gross Domestic Product (Annualized % Change)'
  },
  {
    seriesId: 'INDPRO',
    name: 'Industrial Production',
    category: 'Growth',
    timing: 'Coincident',
    frequency: 'Monthly',
    presentationFormat: 'index',
    unit: 'Index',
    description: 'Industrial Production Index'
  },
  {
    seriesId: 'W875RX1',
    name: 'Real Personal Income (ex-transfers)',
    category: 'Growth',
    timing: 'Coincident',
    frequency: 'Monthly',
    presentationFormat: 'currency',
    unit: 'Billions of Dollars',
    description: 'Real Personal Income Excluding Transfer Receipts'
  },
  {
    seriesId: 'NAPM',
    name: 'ISM Manufacturing PMI',
    category: 'Growth',
    timing: 'Coincident',
    frequency: 'Monthly',
    presentationFormat: 'index',
    unit: 'Index',
    description: 'ISM Manufacturing PMI (>50 = expansion)'
  },
  {
    seriesId: 'ISMSRV',
    name: 'ISM Services PMI',
    category: 'Growth',
    timing: 'Coincident',
    frequency: 'Monthly',
    presentationFormat: 'index',
    unit: 'Index',
    description: 'ISM Services PMI (>50 = expansion)'
  },
  {
    seriesId: 'RRSFS',
    name: 'Real Retail Sales',
    category: 'Growth',
    timing: 'Coincident',
    frequency: 'Monthly',
    presentationFormat: 'currency',
    unit: 'Millions of Dollars',
    description: 'Real Retail and Food Services Sales'
  },
  {
    seriesId: 'PCEC96',
    name: 'Real Personal Consumption',
    category: 'Growth',
    timing: 'Coincident',
    frequency: 'Monthly',
    presentationFormat: 'currency',
    unit: 'Billions of Dollars',
    description: 'Real Personal Consumption Expenditures'
  },

  // Lagging Growth Indicators
  {
    seriesId: 'ISRATIO',
    name: 'Inventory-to-Sales Ratio',
    category: 'Growth',
    timing: 'Lagging',
    frequency: 'Monthly',
    presentationFormat: 'ratio',
    unit: 'Ratio',
    description: 'Total Business: Inventories to Sales Ratio'
  },
  {
    seriesId: 'CPATRAT',
    name: 'Corporate Profits (% of GDP)',
    category: 'Growth',
    timing: 'Lagging',
    frequency: 'Quarterly',
    presentationFormat: 'level',
    unit: 'Percent',
    description: 'Corporate Profits After Tax as % of GDP'
  },
  {
    seriesId: 'CUMFNS',
    name: 'Capacity Utilization',
    category: 'Growth',
    timing: 'Lagging',
    frequency: 'Monthly',
    presentationFormat: 'level',
    unit: 'Percent',
    description: 'Capacity Utilization: Manufacturing'
  },
  {
    seriesId: 'PNFIC96',
    name: 'Real Business Investment',
    category: 'Growth',
    timing: 'Lagging',
    frequency: 'Quarterly',
    presentationFormat: 'yoy_pct_change',
    unit: 'Percent',
    description: 'Real Private Nonresidential Fixed Investment'
  },

  // ==================== INFLATION INDICATORS ====================

  // Leading Inflation Indicators
  {
    seriesId: 'PPIITM',
    name: 'PPI Intermediate Goods',
    category: 'Inflation',
    timing: 'Leading',
    frequency: 'Monthly',
    presentationFormat: 'yoy_pct_change',
    unit: 'Percent',
    description: 'Producer Price Index: Intermediate Materials'
  },
  {
    seriesId: 'IR',
    name: 'Import Prices',
    category: 'Inflation',
    timing: 'Leading',
    frequency: 'Monthly',
    presentationFormat: 'yoy_pct_change',
    unit: 'Percent',
    description: 'Import Price Index: All Commodities'
  },
  {
    seriesId: 'BCOM',
    name: 'Commodity Prices (Bloomberg)',
    category: 'Inflation',
    timing: 'Leading',
    frequency: 'Daily',
    presentationFormat: 'yoy_pct_change',
    unit: 'Index',
    description: 'Bloomberg Commodity Index'
  },
  {
    seriesId: 'GSCPI',
    name: 'Global Supply Chain Pressure',
    category: 'Inflation',
    timing: 'Leading',
    frequency: 'Monthly',
    presentationFormat: 'index',
    unit: 'Std Dev',
    description: 'Global Supply Chain Pressure Index'
  },
  {
    seriesId: 'T5YIE',
    name: '5-Year Breakeven Inflation',
    category: 'Inflation',
    timing: 'Leading',
    frequency: 'Daily',
    presentationFormat: 'level',
    unit: 'Percent',
    description: '5-Year Breakeven Inflation Rate'
  },
  {
    seriesId: 'MICH',
    name: 'Inflation Expectation (UMich)',
    category: 'Inflation',
    timing: 'Leading',
    frequency: 'Monthly',
    presentationFormat: 'level',
    unit: 'Percent',
    description: 'University of Michigan: Inflation Expectation'
  },

  // Coincident Inflation Indicators
  {
    seriesId: 'CPIAUCSL',
    name: 'CPI (Headline)',
    category: 'Inflation',
    timing: 'Coincident',
    frequency: 'Monthly',
    presentationFormat: 'index',
    unit: 'Index (1982-84=100)',
    description: 'Consumer Price Index for All Urban Consumers'
  },
  {
    seriesId: 'CPILFESL',
    name: 'CPI (Core)',
    category: 'Inflation',
    timing: 'Coincident',
    frequency: 'Monthly',
    presentationFormat: 'index',
    unit: 'Index (1982-84=100)',
    description: 'Consumer Price Index: All Items Less Food & Energy'
  },
  {
    seriesId: 'PCEPI',
    name: 'PCE Price Index (Headline)',
    category: 'Inflation',
    timing: 'Coincident',
    frequency: 'Monthly',
    presentationFormat: 'index',
    unit: 'Index',
    description: 'Personal Consumption Expenditures: Chain-type Price Index'
  },
  {
    seriesId: 'PCEPILFE',
    name: 'PCE Price Index (Core)',
    category: 'Inflation',
    timing: 'Coincident',
    frequency: 'Monthly',
    presentationFormat: 'index',
    unit: 'Index',
    description: 'Personal Consumption Expenditures Excluding Food and Energy'
  },
  {
    seriesId: 'ULCNFB',
    name: 'Unit Labor Costs',
    category: 'Inflation',
    timing: 'Coincident',
    frequency: 'Quarterly',
    presentationFormat: 'yoy_pct_change',
    unit: 'Percent',
    description: 'Nonfarm Business Sector: Unit Labor Cost'
  },
  {
    seriesId: 'STICKCPIM159SFRBATL',
    name: 'Core Services ex-Shelter CPI',
    category: 'Inflation',
    timing: 'Coincident',
    frequency: 'Monthly',
    presentationFormat: 'yoy_pct_change',
    unit: 'Percent',
    description: 'Sticky Price CPI'
  },

  // Lagging Inflation Indicators
  {
    seriesId: 'CUSR0000SEHC01',
    name: "Owner's Equivalent Rent",
    category: 'Inflation',
    timing: 'Lagging',
    frequency: 'Monthly',
    presentationFormat: 'yoy_pct_change',
    unit: 'Percent',
    description: "Owner's Equivalent Rent of Primary Residence"
  },
  {
    seriesId: 'CES0500000003',
    name: 'Wage Growth (Avg. Hourly Earnings)',
    category: 'Inflation',
    timing: 'Lagging',
    frequency: 'Monthly',
    presentationFormat: 'yoy_pct_change',
    unit: 'Percent',
    description: 'Average Hourly Earnings of All Employees'
  },
  {
    seriesId: 'CUSR0000SAM2',
    name: 'Medical Care Services CPI',
    category: 'Inflation',
    timing: 'Lagging',
    frequency: 'Monthly',
    presentationFormat: 'yoy_pct_change',
    unit: 'Percent',
    description: 'Consumer Price Index: Medical Care Services'
  },

  // ==================== LABOR INDICATORS ====================

  // Leading Labor Indicators
  {
    seriesId: 'IC4WSA',
    name: 'Initial Jobless Claims',
    category: 'Labor',
    timing: 'Leading',
    frequency: 'Weekly',
    presentationFormat: '4wk_avg',
    unit: 'Thousands',
    description: 'Initial Claims (4-Week Moving Average)'
  },
  {
    seriesId: 'JTSJOLR',
    name: 'Job Openings Rate',
    category: 'Labor',
    timing: 'Leading',
    frequency: 'Monthly',
    presentationFormat: 'level',
    unit: 'Percent',
    description: 'Job Openings: Total Nonfarm Rate'
  },
  {
    seriesId: 'TEMPHELPS',
    name: 'Temporary Help Employment',
    category: 'Labor',
    timing: 'Leading',
    frequency: 'Monthly',
    presentationFormat: 'count',
    unit: 'Thousands',
    description: 'Temporary Help Services Employment'
  },
  {
    seriesId: 'JTSQUR',
    name: 'Quits Rate',
    category: 'Labor',
    timing: 'Leading',
    frequency: 'Monthly',
    presentationFormat: 'level',
    unit: 'Percent',
    description: 'Quits: Total Nonfarm Rate'
  },

  // Coincident Labor Indicators
  {
    seriesId: 'PAYEMS',
    name: 'Nonfarm Payrolls',
    category: 'Labor',
    timing: 'Coincident',
    frequency: 'Monthly',
    presentationFormat: 'count',
    unit: 'Thousands',
    description: 'Total Nonfarm Payroll Employment (Monthly Change)'
  },
  {
    seriesId: 'UNRATE',
    name: 'Unemployment Rate',
    category: 'Labor',
    timing: 'Coincident',
    frequency: 'Monthly',
    presentationFormat: 'percentage',
    unit: 'Percent',
    description: 'Civilian Unemployment Rate'
  },
  {
    seriesId: 'LNS11300060',
    name: 'Labor Force Participation (Prime-Age)',
    category: 'Labor',
    timing: 'Coincident',
    frequency: 'Monthly',
    presentationFormat: 'level',
    unit: 'Percent',
    description: 'Labor Force Participation Rate: 25-54 years'
  },
  {
    seriesId: 'U6RATE',
    name: 'Underemployment Rate (U-6)',
    category: 'Labor',
    timing: 'Coincident',
    frequency: 'Monthly',
    presentationFormat: 'level',
    unit: 'Percent',
    description: 'Total Unemployed Plus Marginally Attached'
  },

  // Lagging Labor Indicators
  {
    seriesId: 'LNS13025703',
    name: 'Long-term Unemployment Share',
    category: 'Labor',
    timing: 'Lagging',
    frequency: 'Monthly',
    presentationFormat: 'level',
    unit: 'Percent',
    description: 'Unemployed 27 Weeks & Over as % of Total Unemployed'
  },
  {
    seriesId: 'JTSLDR',
    name: 'Layoffs Rate',
    category: 'Labor',
    timing: 'Lagging',
    frequency: 'Monthly',
    presentationFormat: 'level',
    unit: 'Percent',
    description: 'Layoffs and Discharges: Total Nonfarm Rate'
  },
  {
    seriesId: 'ECIALLCIV',
    name: 'Employment Cost Index',
    category: 'Labor',
    timing: 'Lagging',
    frequency: 'Quarterly',
    presentationFormat: 'yoy_pct_change',
    unit: 'Percent',
    description: 'Employment Cost Index: Total Compensation'
  },

  // ==================== SENTIMENT INDICATORS ====================

  {
    seriesId: 'UMCSENT',
    name: 'Consumer Sentiment (UMich)',
    category: 'Sentiment',
    timing: 'Leading',
    frequency: 'Monthly',
    presentationFormat: 'index',
    unit: 'Index',
    description: 'University of Michigan Consumer Sentiment Index'
  },
  {
    seriesId: 'NFIB',
    name: 'NFIB Small Business Optimism',
    category: 'Sentiment',
    timing: 'Leading',
    frequency: 'Monthly',
    presentationFormat: 'index',
    unit: 'Index',
    description: 'NFIB Small Business Optimism Index'
  },
  {
    seriesId: 'CSCICP03USM665S',
    name: 'Consumer Confidence (OECD)',
    category: 'Sentiment',
    timing: 'Leading',
    frequency: 'Monthly',
    presentationFormat: 'index',
    unit: 'Index',
    description: 'OECD Consumer Confidence Index for United States'
  },
]

// Helper function to get indicators by category and timing
export function getIndicatorsByCategory(category: string, timing?: string) {
  return ECONOMIC_INDICATORS.filter(
    (ind) => ind.category === category && (!timing || ind.timing === timing)
  )
}

// Helper function to get all categories
export function getCategories() {
  return Array.from(new Set(ECONOMIC_INDICATORS.map((ind) => ind.category)))
}

// Helper function to format value based on presentation format
export function formatIndicatorValue(value: number, format: string, unit: string): string {
  switch (format) {
    case 'yoy_pct_change':
    case 'mom_pct_change':
    case 'annualized_quarterly':
      // These are percentage changes - always show with % sign
      return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`

    case 'index':
      // Index values (S&P 500, CPI, PCE) - no % sign
      if (Math.abs(value) >= 1000) {
        return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      }
      return value.toFixed(2)

    case 'percentage':
      // Already a percentage rate (GDP Growth %, Unemployment %) - show with % sign
      return `${value.toFixed(2)}%`

    case 'level':
      // Raw level - format based on unit
      if (unit === 'Percent') {
        return `${value.toFixed(2)}%`
      }
      if (unit === 'Basis Points') {
        return `${value.toFixed(0)}bp`
      }
      if (unit === 'Thousands') {
        return value.toLocaleString('en-US', { maximumFractionDigits: 0 })
      }
      if (unit === 'Billions of Dollars') {
        return `$${value.toFixed(1)}B`
      }
      if (Math.abs(value) >= 1000) {
        return value.toLocaleString('en-US', { maximumFractionDigits: 1 })
      }
      return value.toFixed(2)

    case 'count':
      // Count values (Building Permits, Payrolls) - show with K/M/B suffix
      if (unit?.includes('Thousand')) {
        return `${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}K`
      }
      if (unit?.includes('Million')) {
        return `${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}M`
      }
      return value.toLocaleString('en-US', { maximumFractionDigits: 0 })

    case 'currency':
      // Currency values (Personal Income, Consumption)
      if (unit?.includes('Billion')) {
        return `$${value.toLocaleString('en-US', { maximumFractionDigits: 1 })}B`
      }
      if (unit?.includes('Million')) {
        return `$${value.toLocaleString('en-US', { maximumFractionDigits: 1 })}M`
      }
      return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

    case 'ratio':
      return value.toFixed(2)

    case '4wk_avg':
      return `${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}K`

    case 'basis_points':
      return `${value.toFixed(0)}bp`

    default:
      return value.toFixed(2)
  }
}

// Helper function to format change based on presentation format
export function formatIndicatorChange(
  currentValue: number,
  priorValue: number | null | undefined,
  format: string,
  unit?: string
): string {
  if (priorValue === null || priorValue === undefined) {
    return '-'
  }

  // For percentage-based indicators (already %), show percentage point difference
  if (format === 'percentage') {
    const diff = currentValue - priorValue
    return `${diff >= 0 ? '+' : ''}${diff.toFixed(2)}pp`
  }

  // For level with Percent unit, also show percentage point difference
  if (format === 'level' && unit === 'Percent') {
    const diff = currentValue - priorValue
    return `${diff >= 0 ? '+' : ''}${diff.toFixed(2)}pp`
  }

  // Guard against division by zero
  if (priorValue === 0) {
    return currentValue > 0 ? '+∞' : currentValue < 0 ? '-∞' : '0%'
  }

  // For all other types, show percentage change
  const pctChange = ((currentValue - priorValue) / Math.abs(priorValue)) * 100
  return `${pctChange >= 0 ? '+' : ''}${pctChange.toFixed(2)}%`
}
