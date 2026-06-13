import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const maxDuration = 180;

const supabaseAdmin = createAdminClient();

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { session_id } = await request.json();

    if (!session_id) {
      return NextResponse.json({ 
        error: 'Missing session_id' 
      }, { status: 400 });
    }

    // Fetch session to get audio_data.recording_url
    const { data: session, error: fetchError } = await supabaseAdmin
      .from('sessions')
      .select('audio_data')
      .eq('id', session_id)
      .single();

    if (fetchError || !session) {
      return NextResponse.json({ 
        error: 'Session not found' 
      }, { status: 404 });
    }

    const recordingUrl = session.audio_data?.recording_url;

    if (!recordingUrl) {
      return NextResponse.json({ 
        error: 'No recording URL found for this session. Please upload audio first.' 
      }, { status: 400 });
    }

    // Step 1: Transcribe the audio
    const transcribeResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/session/transcribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id,
        recording_url: recordingUrl
      })
    });

    if (!transcribeResponse.ok) {
      const errorData = await transcribeResponse.json();
      return NextResponse.json({ 
        error: 'Transcription failed: ' + errorData.error 
      }, { status: transcribeResponse.status });
    }

    const transcribeResult = await transcribeResponse.json();
    const transcript = transcribeResult.transcript;

    if (!transcript) {
      return NextResponse.json({ 
        error: 'No transcript generated from audio' 
      }, { status: 500 });
    }

    // Step 2: Extract insights from transcript
    const insightsResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/session/extract-insights`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id,
        transcript
      })
    });

    if (!insightsResponse.ok) {
      const errorData = await insightsResponse.json();
      return NextResponse.json({ 
        error: 'Insight extraction failed: ' + errorData.error 
      }, { status: insightsResponse.status });
    }

    const insightsResult = await insightsResponse.json();
    const aiOutput = insightsResult.ai_output;

    return NextResponse.json({ 
      success: true, 
      transcript,
      ai_output: aiOutput
    });

  } catch (error) {
    console.error('Process audio error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
