import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Header } from '@/components/header'

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
    <html lang="en" className="dark">
      <body className={inter.className}>
        <Header />
        {children}
      </body>
    </html>
  )
}
