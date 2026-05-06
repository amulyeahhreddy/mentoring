import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { session_id, structured_input, status } = await request.json();

    if (!session_id) {
      return NextResponse.json({ 
        error: 'Missing session_id' 
      }, { status: 400 });
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (structured_input !== undefined) {
      updateData.structured_input = structured_input;
    }

    if (status !== undefined) {
      updateData.status = status;
    }

    // Update session
    const { data: updatedSession, error: updateError } = await supabaseAdmin
      .from('sessions')
      .update(updateData)
      .eq('id', session_id)
      .select('id')
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update session' 
      }, { status: 500 });
    }

    if (!updatedSession) {
      return NextResponse.json({ 
        error: 'Session not found' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true 
    });

  } catch (error) {
    console.error('Update session error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
