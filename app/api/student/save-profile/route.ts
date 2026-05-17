import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { student_id, data, is_complete } = await request.json()
    
    if (!student_id || !data) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    
    const adminClient = createAdminClient()
    
    const { error } = await adminClient
      .from('student_profiles')
      .upsert({
        student_id,
        data,
        ...(is_complete ? { completed_at: new Date().toISOString() } : {})
      }, { onConflict: 'student_id' })
      
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
