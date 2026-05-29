import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function verifyMentorAssignment(adminClient: any, mentorId: string, studentId: string) {
  const { data: enrollments } = await adminClient
    .from('enrollments')
    .select('class_id')
    .eq('student_id', studentId)
  if (!enrollments || enrollments.length === 0) return false
  const classIds = enrollments.map((e: any) => e.class_id)
  const { data: mentorClasses } = await adminClient
    .from('mentor_classes')
    .select('id')
    .in('class_id', classIds)
    .eq('mentor_id', mentorId)
    .limit(1)
  return mentorClasses && mentorClasses.length > 0
}

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

    if (profile.role === 'mentee' && user.id !== studentId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    } else if (profile.role === 'mentor') {
      const isAssigned = await verifyMentorAssignment(adminClient, user.id, studentId)
      if (!isAssigned) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await adminClient
      .from('backlog_records')
      .select('*')
      .eq('student_id', studentId)

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

    if (profile?.role !== 'mentor') {
      return NextResponse.json({ error: 'Forbidden. Only mentors can post backlogs.' }, { status: 403 })
    }
    
    const isAssigned = await verifyMentorAssignment(adminClient, user.id, studentId)
    if (!isAssigned) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const { data, error } = await adminClient
      .from('backlog_records')
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
    const { data: profile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()

    if (profile?.role !== 'mentor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const isAssigned = await verifyMentorAssignment(adminClient, user.id, studentId)
    if (!isAssigned) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    if (!body.id) return NextResponse.json({ error: 'Missing record id' }, { status: 400 })

    const { data, error } = await adminClient
      .from('backlog_records')
      .update(body)
      .eq('id', body.id)
      .eq('student_id', studentId)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
