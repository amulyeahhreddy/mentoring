import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { session_id, transcript } = await request.json();

    if (!session_id || !transcript) {
      return NextResponse.json({ 
        error: 'Missing session_id or transcript' 
      }, { status: 400 });
    }

    const systemPrompt = `You are an AI assistant analyzing a college mentoring session transcript.
Extract ONLY what is explicitly mentioned. Never invent information.
Return ONLY valid JSON, no markdown, no explanation.
{
  "summary": "2-3 sentence summary",
  "key_issues": [{"issue": "", "category": "academic|financial|personal|health|social|career|unclear", "confidence": 0.9}],
  "tasks_assigned": [{"task": "", "assigned_to": "student|mentor|both", "due_by": "null", "inferred_from_quote": "null"}],
  "emotional_behavioral": {"overall_tone": "positive|neutral|anxious|disengaged|distressed|unclear", "engagement_level": "high|medium|low|unclear", "confidence_level": "high|medium|low|unclear", "observations": ""},
  "risk_flags": [{"flag_code": "", "description": "", "severity": "low|medium|high|critical", "evidence_quote": "null", "recommended_action": "null"}],
  "ai_confidence_overall": 0.85
}`;

    // Call Ollama API
    const ollamaResponse = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen2.5:3b',
        prompt: systemPrompt + '\n\nTranscript:\n' + transcript,
        stream: false
      })
    });

    if (!ollamaResponse.ok) {
      return NextResponse.json({ 
        error: 'Failed to connect to Ollama server. Make sure Ollama is running with qwen2.5:3b model' 
      }, { status: 503 });
    }

    const ollamaResult = await ollamaResponse.json();
    
    if (!ollamaResult.response) {
      return NextResponse.json({ 
        error: 'Invalid response from Ollama server' 
      }, { status: 500 });
    }

    // Strip markdown fences and parse JSON
    let cleanedResponse = ollamaResult.response.trim();
    
    // Remove markdown code fences if present
    if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```[\w]*\n/, '').replace(/\n```$/, '');
    }
    
    // Remove any leading/trailing quotes
    if (cleanedResponse.startsWith('"') && cleanedResponse.endsWith('"')) {
      cleanedResponse = cleanedResponse.slice(1, -1);
    }

    let parsedInsights;
    try {
      parsedInsights = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Response was:', cleanedResponse);
      return NextResponse.json({ 
        error: 'Failed to parse AI insights as JSON' 
      }, { status: 500 });
    }

    // Update sessions table with AI output
    const aiOutput = {
      ...parsedInsights,
      model_used: 'qwen2.5:3b',
      processed_at: new Date().toISOString()
    };

    const { error: updateError } = await supabaseAdmin
      .from('sessions')
      .update({
        ai_output: aiOutput
      })
      .eq('id', session_id);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update session with AI insights' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      ai_output: aiOutput
    });

  } catch (error) {
    console.error('Extract insights error:', error);
    
    // Check if it's a connection error to Ollama
    if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
      return NextResponse.json({ 
        error: 'Ollama server not running. Make sure Ollama is installed and running with: ollama serve' 
      }, { status: 503 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
