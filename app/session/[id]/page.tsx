'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import SessionApprovalPanel from '@/components/mentor/SessionApprovalPanel'
import ImpactAssessmentForm from '@/components/mentor/ImpactAssessmentForm'
import FortnightlyAttendanceForm from '@/components/mentor/FortnightlyAttendanceForm'
import CareerCounsellingForm from '@/components/mentor/CareerCounsellingForm'
import { getSessionStatusBadge, showCareerCounselling, TOPICS_ADDRESSED_ITEMS } from '@/lib/session-utils'

export default function SessionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.id as string
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<any>(null)
  const [userRole, setUserRole] = useState<string>('')
  const [userId, setUserId] = useState<string>('')

  const loadSession = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setUserId(user.id)
    const { data: profile } = await supabase.from('profiles').select('role, name').eq('id', user.id).single()
    setUserRole(profile?.role || '')

    const { data, error } = await supabase.from('sessions').select('*').eq('id', sessionId).single()
    if (error || !data) {
      setLoading(false)
      return
    }
    if (profile?.role === 'mentee' && data.student_id !== user.id) {
      router.push('/mentee')
      return
    }
    setSession(data)
    setLoading(false)
  }

  useEffect(() => {
    loadSession()
  }, [sessionId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f4f6]">
        <p className="text-[#9090a0] animate-pulse">Loading session…</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f4f6]">
        <p className="text-[#dc2626]">Session not found</p>
      </div>
    )
  }

  const badge = getSessionStatusBadge(session)
  const topics = (session.topics_addressed || {}) as Record<string, boolean>
  const readOnly = true
  const canResume =
    userRole === 'mentor' &&
    session.mentor_id === userId &&
    (session.session_status === 'draft' || session.status === 'draft')

  return (
    <div className="min-h-screen bg-[#f4f4f6] text-[#111116] font-sans">
      <header className="bg-white border-b border-[#e4e4e9] px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <Link
            href={userRole === 'mentee' ? '/mentee' : '/mentor'}
            className="text-[13px] text-[#4f6ef7] font-semibold hover:underline"
          >
            ← Back
          </Link>
          <div>
            <h1 className="text-[17px] font-bold">
              Session {session.session_number}
              {session.session_date &&
                ` · ${new Date(session.session_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
            </h1>
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${badge.className}`}>
              {badge.label}
            </span>
          </div>
        </div>
        {canResume && (
          <Link
            href="/mentor"
            className="bg-[#4f6ef7] text-white text-[13px] font-medium px-4 py-2 rounded-lg hover:bg-[#3d5ce8]"
          >
            Resume in MentorOS
          </Link>
        )}
      </header>

      <main className="max-w-[760px] mx-auto py-8 px-6 space-y-8">
        <div className="bg-white border border-[#e4e4e9] rounded-2xl shadow-sm p-8">
          <SessionApprovalPanel
            sessionId={sessionId}
            sessionStatus={session.session_status || 'draft'}
            userRole={userRole}
            showWorkflowProgress={true}
            mentorSignedOffAt={session.mentor_signed_off_at}
            studentAcknowledgedAt={session.student_acknowledged_at}
            onStatusChange={loadSession}
          />
        </div>

        {session.session_number > 1 && (
          <div className="bg-white border border-[#e4e4e9] rounded-2xl shadow-sm p-8">
            <ImpactAssessmentForm
              studentId={session.student_id}
              sessionId={sessionId}
              readOnly={readOnly}
            />
          </div>
        )}

        <div className="bg-white border border-[#e4e4e9] rounded-2xl shadow-sm p-8">
          <FortnightlyAttendanceForm
            studentId={session.student_id}
            sessionId={sessionId}
            readOnly={readOnly}
          />
        </div>

        {showCareerCounselling(session.session_number, session.semester) && (
          <div className="bg-white border border-[#e4e4e9] rounded-2xl shadow-sm p-8">
            <CareerCounsellingForm
              studentId={session.student_id}
              sessionId={sessionId}
              readOnly={readOnly}
            />
          </div>
        )}

        <div className="bg-white border border-[#e4e4e9] rounded-2xl shadow-sm p-8 space-y-6">
          <h3 className="text-[13px] font-bold uppercase tracking-widest text-[#111116]">
            Topics Addressed This Session
          </h3>
          <ul className="space-y-2">
            {TOPICS_ADDRESSED_ITEMS.map((item) => (
              <li key={item.key} className="flex items-center gap-2 text-[13px] text-[#52525e]">
                <span
                  className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${
                    topics[item.key] ? 'bg-[#7c3aed] border-[#7c3aed] text-white' : 'border-[#d1d1db]'
                  }`}
                >
                  {topics[item.key] ? '✓' : ''}
                </span>
                {item.label}
              </li>
            ))}
          </ul>

          {session.indisciplinary_activity && (
            <div className="space-y-2 pt-4 border-t border-[#e4e4e9]">
              <p className="text-[13px] font-bold text-[#dc2626]">Indisciplinary Activity Observed</p>
              <p className="text-[13px] text-[#52525e]">{session.indisciplinary_details || '—'}</p>
            </div>
          )}
        </div>

        {session.structured_input && (() => {
          const student = session.structured_input.student || {}
          const mentor = session.structured_input.mentor || {}
          
          const hasCourseRatings = student.course_ratings && student.course_ratings.some((c: any) => c.name);
          const hasFacilityFeedback = student.facility_feedback && Object.keys(student.facility_feedback).length > 0;
          const hasStudyHabits = student.study_habits && Object.values(student.study_habits).some(v => v !== 0 && v !== null);
          const hasMentorObs = !!mentor.mentor_observation;
          const hasMentorRec = !!mentor.mentor_recommendation;
          const hasAttendance = mentor.attendance && mentor.attendance.is_above_90 !== undefined && mentor.attendance.is_above_90 !== null;

          if (!hasCourseRatings && !hasFacilityFeedback && !hasStudyHabits && !hasMentorObs && !hasMentorRec && !hasAttendance) {
            return null;
          }

          return (
            <div className="bg-white border border-[#e4e4e9] rounded-2xl shadow-sm p-8 space-y-8">
              <h3 className="text-[13px] font-bold uppercase tracking-widest text-[#111116] border-b border-[#f4f4f6] pb-3">
                Session Record Summary
              </h3>

              {/* Course Ratings */}
              {hasCourseRatings && (
                <div className="space-y-3">
                  <h4 className="text-[12px] font-bold uppercase tracking-wider text-[#9090a0]">Course Ratings</h4>
                  <div className="overflow-hidden border border-[#e4e4e9] rounded-xl">
                    <table className="w-full text-left text-[13px]">
                      <thead className="bg-[#fcfcfd] border-b border-[#e4e4e9] text-[#9090a0] font-bold">
                        <tr>
                          <th className="px-4 py-3">Course Name</th>
                          <th className="px-4 py-3 w-32">Rating</th>
                          <th className="px-4 py-3 w-32">Difficulty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e4e4e9] text-[#111116]">
                        {student.course_ratings.filter((c: any) => c.name).map((c: any, i: number) => (
                          <tr key={i} className="hover:bg-[#fcfcfd]/50">
                            <td className="px-4 py-3 font-semibold">{c.name}</td>
                            <td className="px-4 py-3 text-amber-500 font-serif">
                              {'★'.repeat(c.rating || 0)}{'☆'.repeat(5 - (c.rating || 0))}
                            </td>
                            <td className="px-4 py-3">
                              {c.has_difficulty ? (
                                <span className="inline-block bg-red-50 text-red-700 px-2 py-0.5 rounded text-[11px] font-bold">
                                  Yes: {c.reason || 'Gap'}
                                </span>
                              ) : (
                                <span className="inline-block bg-green-50 text-green-700 px-2 py-0.5 rounded text-[11px] font-bold">
                                  No
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Study Habits */}
              {hasStudyHabits && (
                <div className="space-y-3">
                  <h4 className="text-[12px] font-bold uppercase tracking-wider text-[#9090a0]">Study Commitment</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { label: 'Self Study', val: student.study_habits.hours ? `${student.study_habits.hours} hrs` : null },
                      { label: 'Vocabulary', val: student.study_habits.vocabulary ? `${student.study_habits.vocabulary} min` : null },
                      { label: 'Reading', val: student.study_habits.reading ? `${student.study_habits.reading} min` : null },
                      { label: 'Logic/Reasoning', val: student.study_habits.reasoning ? `${student.study_habits.reasoning} min` : null },
                    ].map((item, idx) => {
                      if (!item.val) return null;
                      return (
                        <div key={idx} className="bg-[#fcfcfd] border border-[#e4e4e9] rounded-xl p-3.5 flex flex-col gap-1 text-center">
                          <span className="text-[10px] font-bold text-[#9090a0] uppercase tracking-wider">{item.label}</span>
                          <span className="text-[15px] font-extrabold text-[#7c3aed]">{item.val}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Facility Feedback */}
              {hasFacilityFeedback && (
                <div className="space-y-3">
                  <h4 className="text-[12px] font-bold uppercase tracking-wider text-[#9090a0]">Facility Feedback</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries((student.facility_feedback || {}) as Record<string, string>).map(([category, feedback]) => {
                      if (!feedback) return null;
                      return (
                        <div key={category} className="bg-[#fcfcfd] border border-[#e4e4e9] rounded-xl p-4 space-y-1">
                          <span className="text-[10px] font-bold text-[#9090a0] uppercase tracking-wider">{category}</span>
                          <p className="text-[13px] text-[#52525e] leading-relaxed italic">"{feedback}"</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Attendance */}
              {hasAttendance && (
                <div className="bg-[#fcfcfd] border border-[#e4e4e9] rounded-xl p-4 flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-[#111116]">Attendance above 90% threshold</span>
                  <span className={`px-3 py-1 rounded-full text-[11px] font-extrabold ${
                    mentor.attendance.is_above_90 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {mentor.attendance.is_above_90 ? 'YES' : 'NO'}
                  </span>
                </div>
              )}

              {/* Mentor Observations & Recommendations */}
              {(hasMentorObs || hasMentorRec) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[#e4e4e9]">
                  {hasMentorObs && (
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-black text-[#9090a0] uppercase tracking-widest">Mentor Observation</h4>
                      <div className="text-[13px] text-[#52525e] bg-[#fcfcfd] p-4 rounded-xl border border-[#e4e4e9] leading-relaxed italic">
                        "{mentor.mentor_observation}"
                      </div>
                    </div>
                  )}
                  {hasMentorRec && (
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-black text-[#059669] uppercase tracking-widest">Mentor Recommendation</h4>
                      <div className="text-[13px] text-[#111116] bg-[#ecfdf5]/30 p-4 rounded-xl border border-[#059669]/10 leading-relaxed font-semibold">
                        {mentor.mentor_recommendation}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}
      </main>
    </div>
  )
}
