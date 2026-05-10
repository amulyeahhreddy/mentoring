import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const student_id = searchParams.get('student_id')
    if (!student_id) return NextResponse.json({ error: 'Missing student_id' }, { status: 400 })
    const adminClient = createAdminClient()
    const { data: sessions, error } = await adminClient
      .from('sessions')
      .select('id, session_date, session_label, status, session_number, created_at')
      .eq('student_id', student_id)
      .order('session_date', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ sessions: sessions || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
