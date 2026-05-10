import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { task_id, student_id } = await request.json()
    if (!task_id || !student_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    const adminClient = createAdminClient()
    const { error } = await adminClient
      .from('tasks')
      .update({ status: 'completed' })
      .eq('id', task_id)
      .eq('student_id', student_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
