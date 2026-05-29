import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studentId } = await params
    if (!studentId) return NextResponse.json({ error: 'Missing student ID' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()
    const { data: profile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    // Allow student to see their own assignments, or an admin to see all.
    // Mentors usually see assignments they are part of, but we'll allow admin to view/create.
    // The instructions don't strictly lock GET, but let's be safe.
    if (profile.role === 'mentee' && user.id !== studentId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await adminClient
      .from('mentor_assignments')
      .select('*')
      .eq('student_id', studentId)
      .order('start_date', { ascending: true })

    if (error) throw error
    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studentId } = await params
    if (!studentId) return NextResponse.json({ error: 'Missing student ID' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()
    const { data: profile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden. Only admins can create mentor assignments.' }, { status: 403 })
    }

    const body = await request.json()
    const { data, error } = await adminClient
      .from('mentor_assignments')
      .insert({ ...body, student_id: studentId })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studentId } = await params
    if (!studentId) return NextResponse.json({ error: 'Missing student ID' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()

    const body = await request.json()
    const { id, handoff_notes, handoff_unresolved_recommendations, handoff_completed, handoff_completed_at } = body
    if (!id) return NextResponse.json({ error: 'Missing record id' }, { status: 400 })

    // Verify the assignment belongs to this mentor
    const { data: assignment, error: assignmentError } = await adminClient
      .from('mentor_assignments')
      .select('mentor_id')
      .eq('id', id)
      .eq('student_id', studentId)
      .single()

    if (assignmentError || !assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    if (assignment.mentor_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden. You are not the mentor for this assignment.' }, { status: 403 })
    }

    const { data, error } = await adminClient
      .from('mentor_assignments')
      .update({
        handoff_notes,
        handoff_unresolved_recommendations,
        handoff_completed,
        handoff_completed_at
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
