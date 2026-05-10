import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { session_id, student_id, mentor_id, tasks } = await request.json()
    if (!session_id || !student_id || !mentor_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    const adminClient = createAdminClient()
    await adminClient.from('tasks').delete().eq('session_id', session_id)
    if (tasks && tasks.length > 0) {
      const taskRows = tasks.map((t: any) => ({
        session_id,
        student_id,
        mentor_id,
        text: t.text,
        assigned_to: t.assigned_to || 'student',
        due_by: t.due_by || null,
        status: 'pending'
      }))
      const { error } = await adminClient.from('tasks').insert(taskRows)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
