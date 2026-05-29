import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

import { verifyMentorAssignment } from '@/lib/acl/verifyMentorAssignment'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studentId } = await params
    if (!studentId) return NextResponse.json({ error: 'Missing student ID' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Fetch user role
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Role check: Only the student themselves or a mentor/admin can view this
    if (profile.role === 'mentee' && user.id !== studentId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await adminClient
      .from('pre_admission_academic_records')
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

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // Only the student can create/update their own pre-admission records
    if (profile?.role !== 'mentee' || user.id !== studentId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    // Upsert record (level must be unique per student, assuming 'level' and 'student_id' might need a composite key check in DB, or just use ID if known)
    // The instructions say "POST (upsert by level)", we can do an insert on conflict if there's a unique constraint, but there isn't one defined in the SQL.
    // Let's just do a manual check or insert.
    const { level } = body
    if (!level) return NextResponse.json({ error: 'Level is required' }, { status: 400 })

    const { data: existing } = await adminClient
      .from('pre_admission_academic_records')
      .select('id')
      .eq('student_id', studentId)
      .eq('level', level)
      .single()

    let result
    if (existing) {
      result = await adminClient
        .from('pre_admission_academic_records')
        .update({ ...body })
        .eq('id', existing.id)
        .select()
    } else {
      result = await adminClient
        .from('pre_admission_academic_records')
        .insert({ ...body, student_id: studentId })
        .select()
    }

    if (result.error) throw result.error

    return NextResponse.json(result.data[0], { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
