import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: studentId } = await params;

    // Fetch data concurrently
    const [
      { data: profile },
      { data: studentProfile },
      { data: semRecords },
      { data: sessions },
      { data: tasks }
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', studentId).single(),
      supabase.from('student_profiles').select('data').eq('student_id', studentId).maybeSingle(),
      supabase.from('btech_sem_records').select('*').eq('student_id', studentId).order('year', { ascending: true }).order('semester', { ascending: true }),
      supabase.from('sessions').select('id, session_number, session_date, status, structured_input, ai_output, mentor_id').eq('student_id', studentId).eq('status', 'completed').order('session_date', { ascending: false }),
      supabase.from('tasks').select('*').eq('student_id', studentId)
    ]);

    if (!profile) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Attempt to get mentor name from first session
    let mentorName = 'Unassigned';
    if (sessions && sessions.length > 0 && sessions[0].mentor_id) {
      const { data: mentorProfile } = await supabase.from('profiles').select('name').eq('id', sessions[0].mentor_id).single();
      if (mentorProfile) mentorName = mentorProfile.name;
    }

    // Build PDF
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const drawText = (page: any, text: string, x: number, y: number, size: number = 12, isBold: boolean = false, color = rgb(0,0,0)) => {
      page.drawText(text, { x, y, size, font: isBold ? fontBold : font, color });
    };

    // PAGE 1: COVER
    let page = pdfDoc.addPage([595.28, 841.89]); // A4
    drawText(page, 'Mentoring Diary — B.Tech Program', 50, 750, 24, true);
    drawText(page, `Student Name: ${profile.name}`, 50, 700, 14);
    drawText(page, `Email/Roll No: ${profile.email}`, 50, 680, 14);
    drawText(page, `Export Date: ${new Date().toLocaleDateString()}`, 50, 660, 14);
    drawText(page, `Mentor: ${mentorName}`, 50, 640, 14);

    if (studentProfile?.data) {
      const d = studentProfile.data;
      let startY = 600;
      drawText(page, 'Profile Details:', 50, startY, 14, true);
      startY -= 20;
      if (d.blood_group) { drawText(page, `Blood Group: ${d.blood_group}`, 50, startY); startY -= 20; }
      if (d.mobile) { drawText(page, `Mobile: ${d.mobile}`, 50, startY); startY -= 20; }
      if (d.father_name) { drawText(page, `Father: ${d.father_name} (${d.father_occupation || 'N/A'})`, 50, startY); startY -= 20; }
      if (d.mother_name) { drawText(page, `Mother: ${d.mother_name} (${d.mother_occupation || 'N/A'})`, 50, startY); startY -= 20; }
    }

    // PAGE 2: ACADEMIC SUMMARY
    page = pdfDoc.addPage([595.28, 841.89]);
    drawText(page, 'Academic Summary', 50, 800, 18, true);
    
    let y = 760;
    drawText(page, 'Year', 50, y, 12, true);
    drawText(page, 'Sem', 100, y, 12, true);
    drawText(page, 'SGPA', 150, y, 12, true);
    drawText(page, 'CGPA', 220, y, 12, true);
    drawText(page, 'Credits', 290, y, 12, true);
    drawText(page, 'Backlogs', 360, y, 12, true);
    
    y -= 25;
    let cgpaDropNote = '';
    let prevCgpa: number | null = null;

    (semRecords || []).forEach(r => {
      drawText(page, String(r.year || '-'), 50, y);
      drawText(page, String(r.semester || '-'), 100, y);
      drawText(page, String(r.sgpa || '-'), 150, y);
      drawText(page, String(r.cgpa || '-'), 220, y);
      drawText(page, String(r.credits_earned || '-'), 290, y);
      drawText(page, String(r.backlogs || '0'), 360, y, 12, false, r.backlogs > 0 ? rgb(0.8,0,0) : rgb(0,0,0));
      
      if (prevCgpa !== null && r.cgpa !== null) {
        if (prevCgpa - r.cgpa > 0.3) {
          cgpaDropNote = `Warning: CGPA dropped by ${(prevCgpa - r.cgpa).toFixed(2)} points in Year ${r.year} Sem ${r.semester}`;
        }
      }
      if (r.cgpa !== null) prevCgpa = r.cgpa;
      y -= 20;
    });

    if (cgpaDropNote) {
      y -= 20;
      drawText(page, cgpaDropNote, 50, y, 12, true, rgb(0.8, 0, 0));
    }

    // PAGE 3+: SESSIONS
    (sessions || []).forEach(session => {
      page = pdfDoc.addPage([595.28, 841.89]);
      let sy = 800;
      drawText(page, `Session ${session.session_number} — ${new Date(session.session_date).toLocaleDateString()}`, 50, sy, 16, true);
      sy -= 30;

      const struct = session.structured_input || {};
      const ai = session.ai_output || {};

      const drawSection = (title: string, items: string[]) => {
        if (!items || items.length === 0) return;
        drawText(page, title, 50, sy, 12, true);
        sy -= 20;
        items.forEach(item => {
          if (sy < 50) { page = pdfDoc.addPage([595.28, 841.89]); sy = 800; }
          drawText(page, `• ${item}`, 60, sy, 11);
          sy -= 15;
        });
        sy -= 10;
      };

      drawSection('Issues Discussed:', struct.discussion?.issues_discussed);
      drawSection('Academic Concerns:', struct.discussion?.academic_concerns);
      drawSection('Personal Concerns:', struct.discussion?.personal_concerns);
      drawSection('Suggestions Given:', struct.mentor_actions?.suggestions);

      const sessionTasks = (tasks || []).filter(t => t.session_id === session.id);
      if (sessionTasks.length > 0) {
        drawText(page, 'Tasks Assigned:', 50, sy, 12, true);
        sy -= 20;
        sessionTasks.forEach(t => {
          drawText(page, `• [${t.status}] ${t.text} (Due: ${t.due_by || 'N/A'})`, 60, sy, 11);
          sy -= 15;
        });
        sy -= 10;
      }

      if (ai.summary) {
        if (sy < 100) { page = pdfDoc.addPage([595.28, 841.89]); sy = 800; }
        drawText(page, 'AI Summary:', 50, sy, 12, true);
        sy -= 20;
        
        // rudimentary word wrap
        const words = ai.summary.split(' ');
        let line = '';
        words.forEach((w: string) => {
          if (line.length + w.length > 80) {
            drawText(page, line, 50, sy, 11);
            sy -= 15;
            line = w + ' ';
            if (sy < 50) { page = pdfDoc.addPage([595.28, 841.89]); sy = 800; }
          } else {
            line += w + ' ';
          }
        });
        if (line) {
          drawText(page, line, 50, sy, 11);
          sy -= 25;
        }
      }

      if (ai.student_state?.sentiment) {
        drawText(page, `Sentiment: ${ai.student_state.sentiment}`, 50, sy, 12, true);
      }
    });

    // FINAL PAGE: TASKS & GOALS
    page = pdfDoc.addPage([595.28, 841.89]);
    let fy = 800;
    drawText(page, 'Open Tasks & Goals', 50, fy, 18, true);
    fy -= 40;

    const pendingTasks = (tasks || []).filter(t => t.status === 'pending');
    drawText(page, `Pending Tasks (${pendingTasks.length}):`, 50, fy, 14, true);
    fy -= 25;
    
    pendingTasks.forEach(t => {
      const isOverdue = t.due_by && new Date(t.due_by) < new Date();
      drawText(page, `• ${t.text} (Due: ${t.due_by || 'N/A'}) ${isOverdue ? '[OVERDUE]' : ''}`, 60, fy, 11, false, isOverdue ? rgb(0.8,0,0) : rgb(0,0,0));
      fy -= 20;
      if (fy < 50) { page = pdfDoc.addPage([595.28, 841.89]); fy = 800; }
    });
    
    fy -= 20;
    const goals = studentProfile?.data?.goals || {};
    drawText(page, 'Goals:', 50, fy, 14, true);
    fy -= 25;
    if (goals.academic) {
      drawText(page, 'Academic Goal:', 50, fy, 12, true);
      fy -= 15;
      drawText(page, goals.academic, 60, fy, 11);
      fy -= 25;
    }
    if (goals.personal) {
      drawText(page, 'Personal Goal:', 50, fy, 12, true);
      fy -= 15;
      drawText(page, goals.personal, 60, fy, 11);
    }

    const pdfBytes = await pdfDoc.save();

    return new Response(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Diary_${profile.name.replace(/\s+/g, '_')}.pdf"`
      }
    });

  } catch (error: any) {
    console.error('PDF Export Error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
