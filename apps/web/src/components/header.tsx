'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@coinbase/cds-web/buttons'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <Link href="/" className="text-xl font-bold">
              Rishabh's Financial Dashboard
            </Link>
            <div className="flex items-center gap-3 mt-0.5">
              <a
                href="https://rishabhdas.substack.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Substack
              </a>
              <span className="text-xs text-muted-foreground">•</span>
              <a
                href="https://www.linkedin.com/in/rishabh-das/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                LinkedIn
              </a>
            </div>
          </div>
          {user && (
            <nav className="hidden md:flex items-center gap-4">
              <Link
                href="/dashboard"
                className={`text-sm transition-colors hover:text-foreground ${
                  pathname === '/dashboard' ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                Dashboard
              </Link>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground hidden md:inline">
                {user.email}
              </span>
              <Button variant="secondary" onClick={handleSignOut}>
                Sign Out
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/auth/signin">
                <Button variant="secondary">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button variant="primary">
                  Sign Up
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
