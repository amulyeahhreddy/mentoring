import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const student_id = searchParams.get('student_id')
    if (!student_id) return NextResponse.json({ error: 'Missing student_id' }, { status: 400 })
    const adminClient = createAdminClient()
    const { data: tasks, error } = await adminClient
      .from('tasks')
      .select('id, text, due_by, created_at, session_id, assigned_to, status')
      .eq('student_id', student_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ tasks: tasks || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
