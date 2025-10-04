import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const migrationName = searchParams.get('migration') || '007_comprehensive_display_enhancements'

    console.log(`Applying migration: ${migrationName}`)

    // SQL for comprehensive display enhancements
    const migrationSQL = `
      -- Comprehensive Economic Dashboard Enhancements
      -- Add columns for proper macro analysis display

      -- Add value display type column
      ALTER TABLE economic_indicators ADD COLUMN IF NOT EXISTS value_display_type text
        CHECK (value_display_type IN ('level', 'yoy_pct', 'mom_pct', 'index', 'rate'));

      -- Add separate value columns for different representations
      ALTER TABLE economic_indicators ADD COLUMN IF NOT EXISTS value_level numeric;
      ALTER TABLE economic_indicators ADD COLUMN IF NOT EXISTS value_yoy_pct numeric;
      ALTER TABLE economic_indicators ADD COLUMN IF NOT EXISTS value_mom_pct numeric;

      -- Add date tracking columns
      ALTER TABLE economic_indicators ADD COLUMN IF NOT EXISTS release_date date;
      ALTER TABLE economic_indicators ADD COLUMN IF NOT EXISTS data_as_of_date date;

      -- Update existing data to populate new columns with current values
      UPDATE economic_indicators
      SET
        value_level = value,
        data_as_of_date = date::date
      WHERE value_level IS NULL;

      -- Create index for faster date queries
      CREATE INDEX IF NOT EXISTS idx_economic_indicators_data_as_of_date ON economic_indicators(data_as_of_date);
      CREATE INDEX IF NOT EXISTS idx_economic_indicators_release_date ON economic_indicators(release_date);
      CREATE INDEX IF NOT EXISTS idx_economic_indicators_display_type ON economic_indicators(value_display_type);
    `

    // Execute migration using raw SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: migrationSQL })

    if (error) {
      console.error('Migration error:', error)
      // If exec_sql doesn't exist, return manual instructions
      if (error.message?.includes('function') || error.code === '42883') {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '')

        return NextResponse.json({
          success: false,
          message: 'Please apply migration manually via Supabase Dashboard',
          instructions: [
            '1. Go to https://supabase.com/dashboard/project/' + projectRef + '/sql',
            '2. Copy the SQL from supabase/migrations/007_comprehensive_display_enhancements.sql',
            '3. Paste into the SQL editor and click Run',
            '4. Then call /api/economic-indicators/backfill to populate data'
          ],
          sql_location: 'supabase/migrations/007_comprehensive_display_enhancements.sql',
          error: error.message
        })
      }
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Migration applied successfully',
      migrationName
    })
  } catch (error: any) {
    console.error('Migration error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to apply migration' },
      { status: 500 }
    )
  }
}
