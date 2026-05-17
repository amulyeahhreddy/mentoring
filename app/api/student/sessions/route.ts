import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const student_id = searchParams.get('student_id')
    
    if (!student_id) {
      return NextResponse.json({ error: 'Missing student_id' }, { status: 400 })
    }
    
    const adminClient = createAdminClient()
    
    const { data: sessions } = await adminClient
      .from('sessions')
      .select('id, session_date, session_label, session_number, status, structured_input, ai_output')
      .eq('student_id', student_id)
      .eq('status', 'completed')
      .order('session_date', { ascending: false })
      
    return NextResponse.json({ sessions: sessions || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
