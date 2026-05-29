import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
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
Return ONLY valid JSON, no markdown, no explanation.

Extraction Rules:
- When identifying risk_flags, cross-reference academic record and attendance, not just transcript content
- When extracting patterns, note if they match previous session summaries (e.g. "anxiety mentioned again — also flagged on [date]")
- For each key_issue in category "academic", check if the subject is goal-related or a prerequisite

Output Schema:
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
  "goal_alignment": [
    {
      "goal": "",
      "related_subjects": [""],
      "current_performance": "on_track|at_risk|critical",
      "prerequisite_concern": false,
      "note": ""
    }
  ],
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
        prompt: systemPrompt + '\n\n' + contextStr + '--- SESSION TRANSCRIPT ---\n' + transcriptContent,
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
      console.error('Initial JSON parse failed, attempting repair:', parseError);
      
      // Attempt 1: Fix unclosed arrays and objects by counting brackets
      try {
        let repaired = cleanedResponse;
        
        // Count unclosed brackets
        const openCurly = (repaired.match(/\{/g) || []).length;
        const closeCurly = (repaired.match(/\}/g) || []).length;
        const openSquare = (repaired.match(/\[/g) || []).length;
        const closeSquare = (repaired.match(/\]/g) || []).length;
        
        // Add missing closing brackets
        for (let i = 0; i < openSquare - closeSquare; i++) repaired += ']';
        for (let i = 0; i < openCurly - closeCurly; i++) repaired += '}';
        
        parsedInsights = JSON.parse(repaired);
        console.log('JSON repaired successfully');
      } catch (repairError) {
        // Attempt 2: Return a safe fallback structure so the UI doesn't hang
        console.error('JSON repair failed, using fallback structure');
        parsedInsights = {
          summary: cleanedResponse.substring(0, 500),
          decisions: { narrative: 'Session recorded. Manual review required.', commitments: [] },
          tasks_assigned: [],
          emotional_behavioral: { overall_tone: 'neutral', engagement_level: 'medium', confidence_level: 'medium' },
          risk_flags: [],
          patterns: [],
          suggested_questions: [],
          key_issues: [],
          goal_alignment: [],
          ai_confidence_overall: 0.5
        };
      }
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
