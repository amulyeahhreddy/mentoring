import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { 
      student_id, 
      mentor_id, 
      session_date, 
      session_label, 
      year_of_study, 
      semester, 
      academic_year 
    } = await request.json();

    if (!student_id || !mentor_id || !session_date) {
      return NextResponse.json({ 
        error: 'Missing required fields: student_id, mentor_id, session_date' 
      }, { status: 400 });
    }

    // Count existing sessions for this student+mentor pair to set session_number
    const { data: existingSessions, error: countError } = await supabaseAdmin
      .from('sessions')
      .select('id')
      .eq('student_id', student_id)
      .eq('mentor_id', mentor_id);

    if (countError) {
      console.error('Count error:', countError);
      return NextResponse.json({ 
        error: 'Failed to count existing sessions' 
      }, { status: 500 });
    }

    const sessionNumber = (existingSessions?.length || 0) + 1;

    // Create new session
    const { data: newSession, error: insertError } = await supabaseAdmin
      .from('sessions')
      .insert({
        student_id,
        mentor_id,
        session_date: new Date(session_date).toISOString(),
        session_label: session_label || `Session ${sessionNumber}`,
        year_of_study: year_of_study || null,
        semester: semester || null,
        academic_year: academic_year || null,
        session_number: sessionNumber,
        status: 'draft',
        audio_data: {},
        ai_output: {},
        structured_input: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ 
        error: 'Failed to create session' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      session_id: newSession.id 
    });

  } catch (error) {
    console.error('Create session error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
