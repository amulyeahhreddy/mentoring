import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { session_id, transcript, transcript_text } = await request.json();
    const transcriptContent = transcript || transcript_text;

    if (!session_id || !transcriptContent) {
      return NextResponse.json({ 
        error: 'Missing session_id or transcript' 
      }, { status: 400 });
    }

    const systemPrompt = `You are an AI assistant analyzing a college mentoring session transcript.
Extract ONLY what is explicitly mentioned. Never invent information.
Return ONLY valid JSON, no markdown, no explanation.
{
  "summary": "2-3 sentence summary of the session",
  "decisions": {
    "narrative": "What was decided and agreed upon this session in 1-2 sentences",
    "commitments": [{"task": "", "assigned_to": "student|mentor|both", "due": "", "evidence_quote": ""}]
  },
  "tasks_assigned": [{"task": "", "assigned_to": "student|mentor|both", "due_by": "", "source": "ai_extracted"}],
  "emotional_behavioral": {"overall_tone": "positive|neutral|anxious|disengaged|distressed", "engagement_level": "high|medium|low", "confidence_level": "high|medium|low", "observations": ""},
  "risk_flags": [{"flag_code": "RF01", "description": "", "severity": "low|medium|high|critical", "evidence_quote": "", "recommended_action": ""}],
  "patterns": [{"label": "", "description": "", "type": "positive|negative|neutral", "session_count": 1}],
  "suggested_questions": [{"question": "", "reason": "", "type": "follow_up|probe|check_in|academic"}],
  "key_issues": [{"issue": "", "category": "academic|financial|personal|health|social|career", "confidence": 0.9}],
  "ai_confidence_overall": 0.85
}
`;

    // Call Ollama API
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 120000)
    
    const ollamaResponse = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen2.5:3b',
        prompt: systemPrompt + '\n\nTranscript:\n' + transcriptContent,
        stream: false
      }),
      signal: controller.signal
    })
    clearTimeout(timeoutId)

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
