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
    
    const [semRes, taskRes, sessionRes] = await Promise.all([
      adminClient.from('btech_sem_records').select('cgpa, year, semester').eq('student_id', student_id).order('year', { ascending: false }).order('semester', { ascending: false }).limit(1).maybeSingle(),
      adminClient.from('tasks').select('id', { count: 'exact', head: true }).eq('student_id', student_id).eq('status', 'pending'),
      adminClient.from('sessions').select('id, session_date, session_label, structured_input, ai_output').eq('student_id', student_id).eq('status', 'completed').order('session_date', { ascending: false }).limit(1).maybeSingle()
    ])
    
    const { count: completedCount } = await adminClient
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', student_id)
      .eq('status', 'completed')
      
    return NextResponse.json({
      latest_cgpa: semRes.data?.cgpa || null,
      pending_task_count: taskRes.count || 0,
      completed_session_count: completedCount || 0,
      last_session: sessionRes.data || null
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
