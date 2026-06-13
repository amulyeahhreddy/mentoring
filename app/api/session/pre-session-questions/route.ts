import { NextRequest, NextResponse } from 'next/server';
import { buildBriefingPhase1Context } from '@/lib/briefing-prompt-context';
import { createClient } from '@/lib/supabase/server';
import { callLLM } from '@/lib/llm';

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json();
    const {
      student_id,
      session_id,
      profile,
      sem_records,
      pending_tasks = [],
      prev_suggested,
      carry_forward,
      sessions,
      tone_history,
      engagement_history,
      overall_attendance
    } = body;

    const systemPrompt = `You are a faculty mentor's briefing assistant at an Indian engineering college.

Your job:
1. Identify concrete red flags from the student's data
2. Generate questions the mentor should ask — questions only the STUDENT can answer, not questions the data already answers

CRITICAL: Never ask about data you already have. Ask about the REASON or PLAN behind that data.

Return ONLY valid JSON, no markdown:
{
  "red_flags": [
    {
      "severity": "critical" | "high" | "medium",
      "finding": string,
      "data_source": string
    }
  ],
  "questions": [
    {
      "text": string,
      "reason": string,
      "type": "academic" | "behavioral" | "task_followup" | "carryforward",
      "priority": number
    }
  ]
}

RED FLAG SEVERITY:
- critical: attendance < 75%, CGPA drop > 0.5, backlogs > 2, 3+ consecutive negative tones
- high: CGPA drop 0.3–0.5, backlogs 1–2, overdue tasks > 2, engagement declining 2+ sessions
- medium: attendance 75–80%, single overdue task, one negative tone session
- Always state exact values. "Attendance at 68.4%, below 75% minimum" not "low attendance"
- If no issues exist at a severity level, omit those entries entirely

QUESTION PRIORITY:
1. carryforward — unresolved issues from previous sessions
2. task_followup — for each overdue task, quote the exact task text and ask what blocked it
3. academic — ask about causes and plans, never about the numbers themselves
4. behavioral — only if tone or engagement shows a multi-session pattern

GOOD questions:
- "Your CGPA fell from 7.4 to 6.9 between Sem 3 and Sem 4 — what specifically changed that semester?"
- "The task 'Submit internship application to TCS portal' has been overdue for 12 days — what blocked you?"
- "You had 3 consecutive sessions with low engagement — is something outside college affecting your focus?"

BAD questions (never generate):
- "How are your studies going?"
- "What is your current CGPA?"
- "From which semester did your SGPA drop?"
- "How many backlogs do you have?"

Max 3 red flags. Max 6 questions. Quality over quantity.
If no concerning data exists, return empty red_flags and 2 light check-in questions.`;

    const today = new Date()
    const context = {
      profile,
      sem_records,
      session_number: (sessions?.length ?? 0) + 1,
      pending_tasks: pending_tasks.map((t: any) => ({
        ...t,
        days_overdue: t.due_by
          ? Math.floor((today.getTime() - new Date(t.due_by).getTime()) / (1000 * 60 * 60 * 24))
          : null
      })),
      carry_forward,
      prev_suggested,
      previous_session_summary: sessions?.[0]?.ai_output?.summary || null,
      previous_tone: sessions?.[0]?.ai_output?.student_state?.sentiment || null,
      tone_history,
      engagement_history,
      goals: {
        academic: profile?.goals?.academic || null,
        personal: profile?.goals?.personal || null
      },
      active_backlogs: sem_records?.[sem_records.length - 1]?.backlogs || 0,
      latest_cgpa: sem_records?.[sem_records.length - 1]?.cgpa || null,
      prev_cgpa: sem_records?.[sem_records.length - 2]?.cgpa || null,
      latest_attendance: overall_attendance || null
    };

    let phase1Context = '';
    if (student_id) {
      try {
        phase1Context = await buildBriefingPhase1Context(student_id);
      } catch (phase1Err) {
        console.error('Phase 1 briefing context fetch failed:', phase1Err);
      }
    }

    const studentContextJson = JSON.stringify(context, null, 2);
    const promptParts = [
      systemPrompt,
      '\n\nStudent Context:\n',
      studentContextJson,
    ];
    if (phase1Context.trim()) {
      promptParts.push('\n\n', phase1Context);
    }
    const fullPrompt = promptParts.join('');

    const raw = await callLLM(fullPrompt, systemPrompt);
    let cleanedResponse = raw.trim() || '';

    if (!cleanedResponse) {
      return NextResponse.json({ error: 'Empty response from AI model' }, { status: 500 });
    }

    if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```[\w]*\n/, '').replace(/\n```$/, '');
    }

    try {
      const data = JSON.parse(cleanedResponse);
      if (!data.questions && !Array.isArray(data)) {
         throw new Error('AI did not return expected JSON shape');
      }
      return NextResponse.json(data);
    } catch (parseError: any) {
      console.error('JSON parse error:', parseError);
      console.error('AI Response was:', cleanedResponse);
      return NextResponse.json({ error: 'AI returned invalid JSON. Please retry.' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Pre-session questions error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate questions' }, { status: 500 });
  }
}
