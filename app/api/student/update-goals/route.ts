import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { student_id, goals } = await request.json()
    
    if (!student_id || !goals) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    
    const adminClient = createAdminClient()
    
    const { data: existing } = await adminClient
      .from('student_profiles')
      .select('data')
      .eq('student_id', student_id)
      .maybeSingle()
      
    const updatedData = { ...(existing?.data || {}), goals }
    
    await adminClient
      .from('student_profiles')
      .upsert({ student_id, data: updatedData }, { onConflict: 'student_id' })
      
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
