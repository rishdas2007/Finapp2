import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import '@coinbase/cds-web/globalStyles'
import '@coinbase/cds-web/defaultFontStyles'
import { Header } from '@/components/header'
import { CoinbaseProviders } from '@/components/coinbase-providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Financial Dashboard - Real-time Market Analysis',
  description: 'Comprehensive financial dashboard with real-time market data, economic analysis, and advanced technical indicators',
  keywords: ['financial dashboard', 'market data', 'ETF analysis', 'economic indicators', 'technical analysis'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <CoinbaseProviders>
          <Header />
          {children}
        </CoinbaseProviders>
      </body>
    </html>
  )
}
