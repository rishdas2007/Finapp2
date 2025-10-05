'use client'

import { ThemeProvider, MediaQueryProvider } from '@coinbase/cds-web/system'
import { defaultTheme } from '@coinbase/cds-web/themes/defaultTheme'

export function CoinbaseProviders({ children }: { children: React.ReactNode }) {
  return (
    <MediaQueryProvider>
      <ThemeProvider theme={defaultTheme} activeColorScheme="dark">
        {children}
      </ThemeProvider>
    </MediaQueryProvider>
  )
}
