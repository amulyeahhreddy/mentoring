import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params
    if (!sessionId) return NextResponse.json({ error: 'Missing session ID' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()
    const { data: profile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()

    if (profile?.role !== 'mentee') {
      return NextResponse.json({ error: 'Forbidden. Only students can acknowledge sessions.' }, { status: 403 })
    }

    // Verify the session belongs to the student
    const { data: session, error: sessionError } = await adminClient
      .from('sessions')
      .select('student_id, session_status')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    if (session.student_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    
    // Only allow acknowledgement if it's currently in mentor_review (or draft depending on business logic, but typically mentor_review)
    if (session.session_status !== 'mentor_review') {
      return NextResponse.json({ error: 'Session is not ready for student acknowledgement' }, { status: 400 })
    }

    const { data, error } = await adminClient
      .from('sessions')
      .update({
        student_acknowledged: true,
        student_acknowledged_at: new Date().toISOString(),
        session_status: 'student_acknowledged'
      })
      .eq('id', sessionId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
