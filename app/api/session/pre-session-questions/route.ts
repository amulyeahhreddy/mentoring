import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);

  try {
    const body = await request.json();
    const {
      student_id,
      session_id,
      profile,
      sem_records,
      pending_tasks,
      prev_suggested,
      carry_forward
    } = body;

    const systemPrompt = `You are an AI assistant helping a college mentor prepare for a student session.
Analyse the student's full context and generate prioritised questions for the mentor to ask today. Return ONLY a valid JSON array, no markdown, no explanation.

Each question:
{
  "text": string,
  "reason": string,
  "type": "carryforward" | "task_followup" | "academic" | "ai_suggested",
  "priority": number (1 = highest)
}

Priority rules:
1. Carry-forward questions (unasked from last session) — always first
2. Task follow-ups (pending/overdue tasks) — second
3. Academic questions (based on sem records, attendance, SGPA trends, backlogs, subject performance vs goals, prerequisite subjects, extracurricular balance, wellbeing signals) — third
4. AI suggested from previous session — last

Generate 6-10 questions total. Be specific using actual student data, not generic.`;

    const context = {
      profile,
      sem_records,
      pending_tasks,
      prev_suggested,
      carry_forward
    };

    const ollamaResponse = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen2.5:3b',
        prompt: systemPrompt + '\n\nStudent Context:\n' + JSON.stringify(context, null, 2),
        stream: false
      }),
      signal: controller.signal
    }).catch(err => {
      if (err.name === 'AbortError') throw new Error('Ollama request timed out (120s)');
      throw new Error('Failed to connect to Ollama. Ensure it is running on port 11434.');
    });

    clearTimeout(timeoutId);

    if (!ollamaResponse.ok) {
      return NextResponse.json({ error: 'Ollama server returned an error: ' + ollamaResponse.statusText }, { status: 500 });
    }

    const ollamaResult = await ollamaResponse.json();
    let cleanedResponse = ollamaResult.response?.trim() || '';
    
    if (!cleanedResponse) {
      return NextResponse.json({ error: 'Empty response from AI model' }, { status: 500 });
    }

    if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```[\w]*\n/, '').replace(/\n```$/, '');
    }

    try {
      const questions = JSON.parse(cleanedResponse);
      if (!Array.isArray(questions)) throw new Error('AI did not return a JSON array');
      return NextResponse.json(questions);
    } catch (parseError: any) {
      console.error('JSON parse error:', parseError);
      console.error('AI Response was:', cleanedResponse);
      return NextResponse.json({ error: 'AI returned invalid JSON. Please retry.' }, { status: 500 });
    }

  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error('Pre-session questions error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate questions' }, { status: 500 });
  }
}
