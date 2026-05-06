import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(request: NextRequest) {
  try {
    const { session_id, recording_url } = await request.json()

    if (!session_id || !recording_url) {
      return NextResponse.json({ error: 'Missing session_id or recording_url' }, { status: 400 })
    }

    // Download audio from Supabase signed URL
    const audioResponse = await fetch(recording_url)
    if (!audioResponse.ok) {
      return NextResponse.json({ error: 'Failed to download audio' }, { status: 500 })
    }

    const audioBuffer = await audioResponse.arrayBuffer()
    const audioBlob = new Blob([audioBuffer], { type: 'audio/mp3' })
    const audioFile = new File([audioBlob], 'audio.mp3', { type: 'audio/mp3' })

    // Transcribe using Groq Whisper
    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3',
      response_format: 'text',
    })

    const transcriptText = typeof transcription === 'string'
      ? transcription
      : (transcription as any).text || ''

    // Update session with transcript
    const adminClient = createAdminClient()
    const { data: session } = await adminClient
      .from('sessions')
      .select('audio_data')
      .eq('id', session_id)
      .single()

    await adminClient
      .from('sessions')
      .update({
        audio_data: {
          ...((session?.audio_data as object) || {}),
          transcript: {
            full_text: transcriptText,
            transcribed_at: new Date().toISOString(),
            transcription_model: 'whisper-large-v3',
            language: 'auto'
          }
        }
      })
      .eq('id', session_id)

    return NextResponse.json({ success: true, transcript: transcriptText })

  } catch (error: any) {
    console.error('Transcription error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
