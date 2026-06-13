import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { AiOutputSchema } from '@/lib/schemas/ai-output';
import { callLLM } from '@/lib/llm';

export const maxDuration = 180;

interface StudentProfile {
  name?: string;
  program?: string;
  current_semester?: string | number;
}

interface SubjectScore {
  subject: string;
  score: number;
  grade: string;
}

interface AcademicRecord {
  semester: string | number;
  sgpa: number;
  backlogs: number;
  subject_scores?: SubjectScore[];
}

interface Attendance {
  overall_percentage: number;
  trend: "improving" | "stable" | "declining";
  low_attendance_subjects: string[];
}

interface PendingTask {
  task: string;
  due_by: string;
  status: "pending" | "overdue";
}

interface RiskFlag {
  flag_code: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  session_date: string;
}

interface SessionSummary {
  date: string;
  summary: string;
}

interface Goal {
  goal_title: string;
  related_subjects: string[];
  target_semester: string | number;
}

interface PrerequisiteMap {
  subject: string;
  required_for: string[];
  student_current_score: number;
}

interface ExtractInsightsRequestBody {
  session_id: string;
  transcript?: string;
  transcript_text?: string;
  student_profile?: StudentProfile;
  academic_record?: AcademicRecord[];
  attendance?: Attendance;
  pending_tasks?: PendingTask[];
  previous_risk_flags?: RiskFlag[];
  past_session_summaries?: SessionSummary[];
  goals?: Goal[];
  prerequisite_map?: PrerequisiteMap[];
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseAdmin = createAdminClient();

  try {
    const body: ExtractInsightsRequestBody = await request.json();
    const { 
      session_id, 
      transcript, 
      transcript_text,
      student_profile,
      academic_record,
      attendance,
      pending_tasks,
      previous_risk_flags,
      past_session_summaries,
      goals,
      prerequisite_map
    } = body;
    
    const transcriptContent = transcript || transcript_text;

    if (!session_id || !transcriptContent) {
      return NextResponse.json({ 
        error: 'Missing session_id or transcript' 
      }, { status: 400 });
    }

    // Build student context string
    const name = student_profile?.name || 'N/A';
    const program = student_profile?.program || 'N/A';
    const semester = student_profile?.current_semester || 'N/A';

    let contextStr = `--- STUDENT CONTEXT ---
Name: ${name} | Program: ${program} | Semester: ${semester}

Academic Record:
`;

    if (academic_record && academic_record.length > 0) {
      academic_record.forEach(rec => {
        contextStr += `Sem ${rec.semester} — SGPA: ${rec.sgpa}, Backlogs: ${rec.backlogs}\n`;
      });
      
      const latestRec = academic_record[academic_record.length - 1];
      if (latestRec && latestRec.subject_scores) {
        const scoresStr = latestRec.subject_scores.map(s => `${s.subject}: ${s.score}`).join(', ');
        contextStr += `Current semester subject scores: {${scoresStr}}\n`;
      } else {
        contextStr += `Current semester subject scores: {}\n`;
      }
    } else {
      contextStr += 'N/A\n';
    }

    contextStr += `
Attendance: ${attendance?.overall_percentage || 'N/A'}% overall | Trend: ${attendance?.trend || 'N/A'}
Low attendance subjects: ${attendance?.low_attendance_subjects?.length ? attendance.low_attendance_subjects.join(', ') : 'None'}

Pending/Overdue Tasks:
`;

    if (pending_tasks && pending_tasks.length > 0) {
      pending_tasks.forEach(t => {
        contextStr += `- ${t.task} (Due: ${t.due_by}, Status: ${t.status})\n`;
      });
    } else {
      contextStr += 'None\n';
    }

    contextStr += `
Previous Risk Flags (last 3 sessions):
`;

    if (previous_risk_flags && previous_risk_flags.length > 0) {
      previous_risk_flags.slice(0, 3).forEach(f => {
        contextStr += `- [${f.severity.toUpperCase()}] ${f.flag_code}: ${f.description} (Date: ${f.session_date})\n`;
      });
    } else {
      contextStr += 'None\n';
    }

    contextStr += `
Past Session Summaries:
`;

    if (past_session_summaries && past_session_summaries.length > 0) {
      past_session_summaries.slice(0, 3).forEach(s => {
        contextStr += `- ${s.date}: ${s.summary}\n`;
      });
    } else {
      contextStr += 'None\n';
    }

    contextStr += `
Student Goals:
`;

    if (goals && goals.length > 0) {
      goals.forEach(g => {
        contextStr += `- ${g.goal_title} (Related: ${g.related_subjects?.join(', ') || 'None'})\n`;
      });
    } else {
      contextStr += 'None\n';
    }

    contextStr += `
Prerequisite Analysis:
`;

    if (prerequisite_map && prerequisite_map.length > 0) {
      prerequisite_map.forEach(p => {
        contextStr += `- Subject ${p.subject} is required for ${p.required_for?.join(', ') || 'N/A'} — student current score: ${p.student_current_score}\n`;
      });
    } else {
      contextStr += 'None\n';
    }

    contextStr += '\n';

    const systemPrompt = `You are an AI assistant analyzing a college mentoring session transcript.
Extract ONLY what is explicitly mentioned. Never invent information.
Return ONLY valid JSON, no preamble, no markdown fences, no explanation.

Base all boolean fields on what was actually mentioned in the transcript. If a topic was not discussed, set it to false. Do not infer topics that were not explicitly mentioned.
For tasks, only include specific commitments made during the session. Each task must have a non-empty text field. If no tasks were committed to, return an empty array.

Output Schema:
{
  "observation": "string — 2-4 sentence summary of what was discussed in this session",
  "recommendation": "string — 1-3 sentences of mentor's recommended next steps",
  "sentiment": "positive | neutral | anxious | disengaged | distressed",
  "engagement": "high | medium | low",
  "topics_addressed": {
    "academic_counselling": boolean,
    "career_guidance": boolean,
    "personal_issues": boolean,
    "time_management": boolean,
    "study_skills": boolean,
    "co_curricular": boolean,
    "placement_preparation": boolean,
    "other": boolean
  },
  "issues_checklist": {
    "attendance": boolean,
    "mid_exam_marks": boolean,
    "assignment_submission": boolean,
    "lab_performance": boolean,
    "class_participation": boolean,
    "interest_in_course": boolean,
    "motivation": boolean
  },
  "tasks": [
    {
      "text": "string — specific actionable task",
      "assigned_to": "student | mentor | both",
      "due_by": "string — e.g. 'Next session' or 'End of semester' or a specific date"
    }
  ],
  "risk_flags": ["string"]
}
`;

    // Call Groq LLM
    const userPrompt = contextStr + '--- SESSION TRANSCRIPT ---\n' + transcriptContent;
    const raw = await callLLM(userPrompt, systemPrompt);

    // Strip markdown fences and parse JSON
    let cleanedResponse = raw.trim();

    // Remove markdown code fences if present
    if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```[\w]*\n/, '').replace(/\n```$/, '');
    }

    // Remove any leading/trailing quotes
    if (cleanedResponse.startsWith('"') && cleanedResponse.endsWith('"')) {
      cleanedResponse = cleanedResponse.slice(1, -1);
    }

    // Parse with Zod validation and retry on failure
    async function parseWithRetry(raw: string, callLLMAgain: () => Promise<string>) {
      let parsed: unknown
      try {
        parsed = JSON.parse(raw)
      } catch {
        // Retry once if JSON is malformed
        const retryRaw = await callLLMAgain()
        parsed = JSON.parse(retryRaw) // let this throw — 500 is correct here
      }
      return AiOutputSchema.parse(parsed)
    }

    let parsedInsights;
    try {
      parsedInsights = await parseWithRetry(cleanedResponse, async () => {
        // Retry the LLM call if JSON parsing failed
        const retryRaw = await callLLM(userPrompt, systemPrompt);
        let retryCleaned = retryRaw.trim()
        if (retryCleaned.startsWith('```')) {
          retryCleaned = retryCleaned.replace(/^```[\w]*\n/, '').replace(/\n```$/, '');
        }
        if (retryCleaned.startsWith('"') && retryCleaned.endsWith('"')) {
          retryCleaned = retryCleaned.slice(1, -1);
        }
        return retryCleaned
      })
    } catch (validationError) {
      console.error('AI output validation failed:', validationError);
      return NextResponse.json({
        error: 'AI output did not match expected schema after retry'
      }, { status: 500 });
    }

    // Update sessions table with AI output
    const aiOutput = {
      observation: parsedInsights.observation,
      recommendation: parsedInsights.recommendation,
      sentiment: parsedInsights.sentiment,
      engagement: parsedInsights.engagement,
      risk_flags: parsedInsights.risk_flags ?? [],
    };

    const { error: updateError } = await supabaseAdmin
      .from('sessions')
      .update({
        ai_output: aiOutput,
        topics_addressed: parsedInsights.topics_addressed,
        issues_checklist: parsedInsights.issues_checklist
      })
      .eq('id', session_id);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update session with AI insights' 
      }, { status: 500 });
    }

    // Save tasks to tasks table
    // First, get student_id and mentor_id for this session
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('student_id, mentor_id')
      .eq('id', session_id)
      .single();

    if (sessionError || !sessionData) {
      console.error('Failed to fetch session data:', sessionError);
      return NextResponse.json({ 
        error: 'Failed to fetch session data for task creation' 
      }, { status: 500 });
    }

    const { student_id, mentor_id } = sessionData;

    // Insert tasks as a batch
    const tasksToInsert = (parsedInsights.tasks ?? [])
      .filter((task: any) => task.text && task.text.trim() !== '')
      .map((task: any) => ({
        session_id: session_id,
        student_id: student_id,
        mentor_id: mentor_id,
        text: task.text.trim(),
        assigned_to: task.assigned_to ?? 'student',
        due_by: task.due_by ?? 'Next session',
        status: 'pending',
      }));

    if (tasksToInsert.length > 0) {
      const { error: taskError } = await supabaseAdmin.from('tasks').insert(tasksToInsert);
      if (taskError) {
        console.error('Task batch insert failed:', taskError);
        // do not throw — tasks failing should not fail the whole route
      }
    }

    return NextResponse.json({ 
      success: true, 
      ai_output: aiOutput,
      topics_addressed: parsedInsights.topics_addressed,
      issues_checklist: parsedInsights.issues_checklist,
      tasks_count: (parsedInsights.tasks ?? []).filter((t: any) => t.text && t.text.trim() !== '').length
    });

  } catch (error) {
    console.error('Extract insights error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
