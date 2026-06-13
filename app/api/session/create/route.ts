import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseAdmin = createAdminClient()

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

    // Get next session number using atomic Postgres function
    const { data: nextNum, error: rpcError } = await supabaseAdmin.rpc('assign_session_number', {
      p_student_id: student_id,
      p_mentor_id: mentor_id,
    });

    if (rpcError || !nextNum) {
      console.error('RPC error:', rpcError);
      return NextResponse.json({
        error: 'Failed to assign session number'
      }, { status: 500 });
    }

    const sessionNumber = nextNum as number;

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
