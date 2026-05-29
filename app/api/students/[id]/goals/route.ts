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
      .from('goals_declaration')
      .select('*')
      .eq('student_id', studentId)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    return NextResponse.json(data || null, { status: 200 })
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

    if (profile?.role !== 'mentee' || user.id !== studentId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()

    // Assuming one goals declaration per student per academic year, but no unique constraint exists yet, so manual upsert check
    const { data: existing } = await adminClient
      .from('goals_declaration')
      .select('id')
      .eq('student_id', studentId)
      .eq('academic_year', body.academic_year || '')
      .single()

    let result
    if (existing) {
      result = await adminClient
        .from('goals_declaration')
        .update({ ...body })
        .eq('id', existing.id)
        .select()
        .single()
    } else {
      result = await adminClient
        .from('goals_declaration')
        .insert({ ...body, student_id: studentId })
        .select()
        .single()
    }

    if (result.error) throw result.error

    return NextResponse.json(result.data, { status: 200 })
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

    // Only mentor or admin can review goals
    if (profile?.role === 'mentee') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { id, review_notes, review_year } = body
    if (!id) return NextResponse.json({ error: 'Goal ID is required' }, { status: 400 })

    const { data, error } = await adminClient
      .from('goals_declaration')
      .update({
        review_notes,
        review_year,
        reviewed_by: user.id,
        mentor_reviewed_at: new Date().toISOString()
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
