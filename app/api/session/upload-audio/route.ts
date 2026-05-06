import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {

    const formData = await request.formData();
    const audioFile = formData.get('audio_file') as File;
    const sessionId = formData.get('session_id') as string;

    if (!audioFile || !sessionId) {
      return NextResponse.json({ error: 'Missing audio_file or session_id' }, { status: 400 });
    }

    // Validate file type
    const allowedExtensions = ['mp3', 'wav', 'm4a', 'webm', 'ogg', 'mp4', 'weba', 'opus', 'aac', 'flac'];
    const fileExtension = audioFile.name.split('.').pop()?.toLowerCase() || '';
    const isValidType = audioFile.type.startsWith('audio/') || 
                        audioFile.type.startsWith('video/') || 
                        allowedExtensions.includes(fileExtension);
    if (!isValidType) {
      return NextResponse.json({
        error: 'Invalid file type. Allowed: mp3, wav, m4a, webm, ogg, mp4'
      }, { status: 400 });
    }

    // Validate file size (100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB in bytes
    if (audioFile.size > maxSize) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 100MB' 
      }, { status: 400 });
    }

    // Get file extension
    const extension = audioFile.name.split('.').pop() || 'wav';
    const fileName = `${sessionId}/${Date.now()}.${extension}`;

    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from('session-recordings')
      .upload(fileName, audioFile, {
        contentType: audioFile.type,
        upsert: true
      });

    if (error) {
      console.error('Upload error:', error);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    // Create signed URL valid for 7 days
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from('session-recordings')
      .createSignedUrl(fileName, 60 * 60 * 24 * 7); // 7 days

    if (signedUrlError || !signedUrlData) {
      console.error('Signed URL error:', signedUrlError);
      return NextResponse.json({ error: 'Failed to create signed URL' }, { status: 500 });
    }

    const signedUrl = signedUrlData.signedUrl;

    // Update sessions table
    const { error: updateError } = await supabaseAdmin
      .from('sessions')
      .update({
        audio_data: {
          recording_url: signedUrl,
          recorded_at: new Date().toISOString()
        }
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      recording_url: signedUrl 
    });

  } catch (error) {
    console.error('Upload audio error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
