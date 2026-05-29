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

    // Assuming coordinators have the role 'admin' in this system, as per instructions "admin role only"
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden. Only admins/coordinators can approve sessions.' }, { status: 403 })
    }

    const { data: session, error: sessionError } = await adminClient
      .from('sessions')
      .select('session_status')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    if (session.session_status !== 'student_acknowledged') {
      return NextResponse.json({ error: 'Session is not ready for coordinator approval' }, { status: 400 })
    }

    let coordinator_notes = ''
    try {
      const body = await request.json()
      coordinator_notes = body.coordinator_notes || ''
    } catch {
      // Body is optional
    }

    const { data, error } = await adminClient
      .from('sessions')
      .update({
        coordinator_id: user.id,
        coordinator_approved: true,
        coordinator_approved_at: new Date().toISOString(),
        coordinator_notes: coordinator_notes,
        session_status: 'coordinator_approved'
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
