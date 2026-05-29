import { createClient } from '@/lib/supabase/client'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// GET - Fetch course ratings for a session
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const session_id = searchParams.get('session_id')

    if (!session_id) {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('session_course_ratings')
      .select('*')
      .eq('session_id', session_id)

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

// POST - Create or update course ratings for a session
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { session_id, student_id, course_ratings } = body

    if (!session_id || !student_id || !course_ratings) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!Array.isArray(course_ratings)) {
      return NextResponse.json({ error: 'course_ratings must be an array' }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()

    // Delete existing course ratings for this session
    const { error: deleteError } = await supabaseAdmin
      .from('session_course_ratings')
      .delete()
      .eq('session_id', session_id)

    if (deleteError) throw deleteError

    // Insert new course ratings
    const ratingsToInsert = course_ratings
      .filter((cr: any) => cr.name) // Only insert ratings with a course name
      .map((cr: any) => ({
        session_id,
        student_id,
        course_code: cr.course_code || null,
        course_name: cr.name,
        difficulty_scale: cr.rating || null,
        teacher_informed: cr.informed_teacher || false,
        faculty_response: cr.faculty_action || cr.reason || null
      }))

    if (ratingsToInsert.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('session_course_ratings')
        .insert(ratingsToInsert)

      if (insertError) throw insertError
    }

    return NextResponse.json({ success: true, count: ratingsToInsert.length })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
