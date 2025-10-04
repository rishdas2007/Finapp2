import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // Parse the Supabase connection string to get PostgreSQL connection details
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    // Extract project ref from URL (e.g., rrjmouhfwlkwleyvsmeq from https://rrjmouhfwlkwleyvsmeq.supabase.co)
    const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '')

    // For now, return instructions since we need the database password
    return NextResponse.json({
      success: false,
      message: 'Please apply migration manually via Supabase Dashboard',
      instructions: [
        '1. Go to https://supabase.com/dashboard/project/' + projectRef + '/sql',
        '2. Copy the SQL from supabase/migrations/003_etf_indicator_history.sql',
        '3. Paste into the SQL editor and click Run',
        '4. Then call /api/etf-metrics to populate data'
      ],
      sql_location: 'supabase/migrations/003_etf_indicator_history.sql'
    })
  } catch (error: any) {
    console.error('Migration error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to apply migration' },
      { status: 500 }
    )
  }
}
