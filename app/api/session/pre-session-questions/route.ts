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

    const systemPrompt = `You are an AI assistant helping a college faculty mentor prepare for a one-on-one student mentoring session.
Your job is to generate SPECIFIC, DATA-DRIVEN questions the mentor should ask today. Every question must reference actual numbers, dates, or named facts from the student's context. Never generate generic questions like "How are your studies going?" — always anchor to specific data points.
Return ONLY a valid JSON array. No markdown, no explanation, no preamble.
Each item:
{
"text": string,       // The actual question to ask — must cite specific data
"reason": string,     // Why this matters — reference the data point
"type": "carryforward" | "task_followup" | "academic" | "wellbeing",
"priority": number    // 1 = ask first
}
PRIORITY ORDER:

carryforward — questions unasked from last session (always ask these first)
task_followup — for each overdue or pending task, ask a specific follow-up
academic — based on SGPA trends, CGPA drops, backlog count, attendance %
wellbeing — based on emotional tone history, engagement decline, goal misalignment

SPECIFICITY RULES:

If attendance < 75%: mention the exact % in the question
If SGPA dropped: mention which semester and by how much
If backlogs exist: mention the count
If a task is overdue: name the task and mention how many days overdue
If tone_history shows 2+ consecutive "negative" or "low": flag it
If goals exist: ask whether the student feels on track toward that specific goal

Generate 6-10 questions. Prioritize quality over quantity.`;

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
