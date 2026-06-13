import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// GET - Fetch facility feedback for a session
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
      .from('session_facility_feedback')
      .select('*')
      .eq('session_id', session_id)
      .single()

    if (error && error.code !== 'PGRST116') throw error // PGRST116 = not found

    return NextResponse.json({ data: data || null })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

// POST - Create or update facility feedback for a session
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { session_id, student_id, facility_feedback } = body

    if (!session_id || !student_id || !facility_feedback) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (typeof facility_feedback !== 'object') {
      return NextResponse.json({ error: 'facility_feedback must be an object' }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()

    // Delete existing facility feedback for this session
    const { error: deleteError } = await supabaseAdmin
      .from('session_facility_feedback')
      .delete()
      .eq('session_id', session_id)

    if (deleteError) throw deleteError

    // Map keys to database columns
    const keyMap: Record<string, string> = {
      'Canteen': 'canteen_remarks',
      'Transport': 'transport_remarks',
      'College Transport': 'transport_remarks',
      'Ragging': 'ragging_remarks',
      'Sanitation': 'sanitation_remarks',
      'Library': 'library_remarks',
      'Laboratories': 'lab_remarks'
    }

    const feedbackToInsert: any = {
      session_id,
      student_id
    }

    for (const [key, value] of Object.entries(facility_feedback)) {
      const mappedKey = keyMap[key] || keyMap[Object.keys(keyMap).find(k => k.toLowerCase() === key.toLowerCase()) || '']
      if (mappedKey && value) {
        feedbackToInsert[mappedKey] = value
      }
    }

    // Only insert if we have at least one feedback field
    const hasFeedback = Object.keys(feedbackToInsert).some(key => 
      key !== 'session_id' && key !== 'student_id' && feedbackToInsert[key]
    )

    if (hasFeedback) {
      const { error: insertError } = await supabaseAdmin
        .from('session_facility_feedback')
        .insert(feedbackToInsert)

      if (insertError) throw insertError
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
