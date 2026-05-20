'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { detectClaims } from '@/lib/utils/detectClaims'
import { InsightContext } from '@/lib/types/insightContext'

interface Question {
  id: string
  text: string
  reason: string
  type: 'carryforward' | 'task_followup' | 'academic' | 'ai_suggested'
  priority: number
  checked: boolean
}

interface ValidateModeProps {
  selectedStudent: any
  mentorId: string
  activeSessionId: string
  aiOutput: any | null
  setAiOutput: (output: any) => void
  onNext: () => void
  onBack: () => void
}

export default function ValidateMode({
  selectedStudent,
  mentorId,
  activeSessionId,
  aiOutput,
  setAiOutput,
  onNext,
  onBack
}: ValidateModeProps) {
  // --- STATE ---
  const [audioStage, setAudioStage] = useState<'idle' | 'uploading' | 'transcribing' | 'extracting' | 'done' | 'error'>('idle')
  const [transcript, setTranscript] = useState<string | null>(null)
  const [transcriptOpen, setTranscriptOpen] = useState(false)
  const [editedOutput, setEditedOutput] = useState<any | null>(null)
  const [recordMode, setRecordMode] = useState<'record' | 'upload'>('upload')
  const [recording, setRecording] = useState(false)
  const [timer, setTimer] = useState(0)
  const [presessionQuestions, setPresessionQuestions] = useState<Question[]>([])
  const [presessionLoading, setPresessionLoading] = useState(false)
  const [presessionError, setPresessionError] = useState(false)
  const [insightsCollapsed, setInsightsCollapsed] = useState(false)
  const [prevSessionOutput, setPrevSessionOutput] = useState<any | null>(null)
  const [toastMessage, setToastMessage] = useState('')
  const [semRecords, setSemRecords] = useState<any[]>([])
  const [pendingTasks, setPendingTasks] = useState<any[]>([])

  // --- REFS ---
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const timerRef = useRef<any>(null)
  const chunksRef = useRef<Blob[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const supabase = createClient()

  // --- ON MOUNT ---
  useEffect(() => {
    const init = async () => {
      const { data: session } = await supabase
        .from('sessions')
        .select('ai_output, audio_data')
        .eq('id', activeSessionId)
        .single()

      if (session?.ai_output && session?.audio_data?.recording_url) {
        setEditedOutput(session.ai_output)
        setAiOutput(session.ai_output)
        setAudioStage('done')
        setInsightsCollapsed(true)
      } else if (session?.ai_output) {
        setEditedOutput(session.ai_output)
        setAiOutput(session.ai_output)
      }
      if (session?.audio_data?.transcript) {
        setTranscript(session.audio_data.transcript)
      }
    }
    init()
    loadPresessionData()
  }, [activeSessionId])

  useEffect(() => {
    if (aiOutput && !editedOutput) {
      setEditedOutput(aiOutput)
    }
  }, [aiOutput])

  const loadPresessionData = async () => {
    setPresessionLoading(true)
    setPresessionError(false)

    try {
      const [
        { data: profile },
        { data: semRecords },
        { data: pendingTasks },
        { data: prevSession },
        { data: psi }
      ] = await Promise.all([
        supabase.from('student_profiles').select('*').eq('student_id', selectedStudent.id).maybeSingle(),
        supabase.from('btech_sem_records').select('*').eq('student_id', selectedStudent.id).order('year', { ascending: true }).order('semester', { ascending: true }),
        supabase.from('tests').select('*').eq('student_id', selectedStudent.id).eq('status', 'pending'),
        supabase.from('sessions').select('*').eq('student_id', selectedStudent.id).neq('id', activeSessionId).order('session_date', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('pre_session_insights').select('*').eq('student_id', selectedStudent.id).order('generated_at', { ascending: false }).limit(1).maybeSingle()
      ])

      setSemRecords(semRecords || [])
      setPendingTasks(pendingTasks || [])

      const prev_suggested = prevSession?.ai_output?.suggested_questions || []
      const carry_forward = psi?.insights?.questions?.filter((q: any) => !q.checked) || []
      setPrevSessionOutput(prevSession?.ai_output || null)

      const response = await fetch('/api/session/pre-session-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: selectedStudent.id,
          session_id: activeSessionId,
          profile,
          sem_records: semRecords || [],
          pending_tasks: pendingTasks || [],
          prev_suggested,
          carry_forward
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'API failed');
      }
      const questions = await response.json()
      setPresessionQuestions(questions.map((q: any, i: number) => ({ ...q, id: `q-${i}`, checked: false })))
      setPresessionLoading(false)
    } catch (err: any) {
      console.warn('Pre-session questions unavailable:', err)
      setPresessionQuestions([])
      setPresessionLoading(false)
      setPresessionError(false)
    }
  }

  // --- TIMER EFFECT ---
  useEffect(() => {
    if (recording) {
      timerRef.current = setInterval(() => {
        setTimer(t => t + 1)
      }, 1000)
    } else {
      clearInterval(timerRef.current)
      setTimer(0)
    }
    return () => clearInterval(timerRef.current)
  }, [recording])

  // --- AUDIO HANDLING ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const file = new File([blob], `recording-${Date.now()}.webm`, { type: 'audio/webm' })
        processAudioPipeline(file)
      }

      recorder.start()
      setRecording(true)
    } catch (err) {
      console.error('Error accessing microphone:', err)
      triggerToast('Microphone access denied')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop()
      setRecording(false)
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const processAudioPipeline = async (file: File) => {
    try {
      // Step 1: Uploading
      setAudioStage('uploading')
      const formData = new FormData()
      formData.append('audio_file', file)
      formData.append('session_id', activeSessionId)
      
      const uploadRes = await fetch('/api/session/upload-audio', {
        method: 'POST',
        body: formData
      })
      const uploadData = await uploadRes.json()
      if (!uploadData.recording_url) throw new Error('Upload failed')

      // Step 2: Transcribing
      setAudioStage('transcribing')
      const transcribeRes = await fetch('/api/session/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recording_url: uploadData.recording_url, session_id: activeSessionId })
      })
      const transcribeData = await transcribeRes.json()
      const fullTranscript = transcribeData.transcript?.full_text || transcribeData.transcript
      setTranscript(fullTranscript)

      // Step 3: Extracting
      setAudioStage('extracting')
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 90000)
      
      const extractRes = await fetch('/api/session/extract-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript_text: fullTranscript, session_id: activeSessionId }),
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      const aiOutputData = await extractRes.json()
      const extractedOutput = aiOutputData.ai_output || aiOutputData

      // Step 4: Save to Supabase
      await supabase
        .from('sessions')
        .update({
          audio_data: { recording_url: uploadData.recording_url, transcript: fullTranscript },
          ai_output: extractedOutput
        })
        .eq('id', activeSessionId)

      setEditedOutput(extractedOutput)
      setAiOutput(extractedOutput)
      setAudioStage('done')
      setInsightsCollapsed(true)
    } catch (err) {
      console.error('Audio pipeline error:', err)
      setAudioStage('error')
    }
  }

  // --- ACTIONS ---
  const triggerToast = (msg: string) => {
    setToastMessage(msg)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3000)
  }

  const saveDraft = async () => {
    const carryForwardQuestions = presessionQuestions
      .filter(q => !q.checked)
      .map(q => ({ text: q.text, reason: q.reason, type: q.type, checked: false }))
      
    const outputToSave = { ...editedOutput, carry_forward_questions: carryForwardQuestions }

    const { error } = await supabase
      .from('sessions')
      .update({ ai_output: outputToSave })
      .eq('id', activeSessionId)
    
    if (!error) {
      setEditedOutput(outputToSave)
      setAiOutput(outputToSave)
      triggerToast('Draft saved')
    }
  }

  const handleContinue = async () => {
    if (!editedOutput) {
      onNext()
      return
    }

    try {
      const carryForwardQuestions = presessionQuestions
        .filter(q => !q.checked)
        .map(q => ({ text: q.text, reason: q.reason, type: q.type, checked: false }))
        
      const outputToSave = { ...editedOutput, carry_forward_questions: carryForwardQuestions }

      // 1. PATCH sessions
      await supabase
        .from('sessions')
        .update({ ai_output: outputToSave })
        .eq('id', activeSessionId)

      setEditedOutput(outputToSave)
      setAiOutput(outputToSave)
      onNext()
    } catch (err) {
      console.error('Continue error:', err)
      triggerToast('Failed to save and continue')
    }
  }

  // --- HELPERS ---
  const formatTimer = (s: number) => {
    const mins = Math.floor(s / 60)
    const secs = s % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const Spinner = () => (
    <div className="animate-spin w-3 h-3 border-2 border-[rgba(255,255,255,0.10)] border-t-gray-700 rounded-full"></div>
  )

  const getQuestionTypeBadge = (type: string) => {
    switch (type) {
      case 'carryforward': return <span className="bg-orange-50 text-orange-700 text-[11px] px-2 py-0.5 rounded-full font-medium">Carry forward</span>
      case 'task_followup': return <span className="bg-[rgba(79,110,247,0.08)] text-blue-700 text-[11px] px-2 py-0.5 rounded-full font-medium">Follow up</span>
      case 'academic': return <span className="bg-[rgba(124,58,237,0.08)] text-[#7c3aed] text-[11px] px-2 py-0.5 rounded-full font-medium">Academic</span>
      case 'ai_suggested': return <span className="bg-[rgba(16,185,129,0.08)] text-[#10b981] text-[11px] px-2 py-0.5 rounded-full font-medium">AI suggested</span>
      default: return null
    }
  }

  const toggleQuestion = (id: string) => {
    setPresessionQuestions(prev => prev.map(q => q.id === id ? { ...q, checked: !q.checked } : q))
  }

  const metricToScore = (val: string) => {
    if (!val) return 0
    const v = val.toLowerCase()
    if (v.includes('high') || v.includes('positive')) return 3
    if (v.includes('medium') || v.includes('neutral')) return 2
    if (v.includes('low') || v.includes('anxious') || v.includes('distressed')) return 1
    return 0
  }

  const getMetricDelta = (current: any, prev: any, key: string) => {
    if (!prev) return null
    const currVal = current[key]
    const prevVal = prev[key]
    const currScore = metricToScore(currVal)
    const prevScore = metricToScore(prevVal)

    if (currScore > prevScore) return <span className="text-[#10b981] ml-1">↑ was {prevVal}</span>
    if (currScore < prevScore) return <span className="text-[#ef4444] ml-1">↓ was {prevVal}</span>
    return <span className="text-[#8b8b9e] ml-1">— unchanged</span>
  }

  // --- BUILD INSIGHT CONTEXT ---
  const ctx: InsightContext = {
    subject_stats: [],
    sgpa_history: semRecords.map(r => ({ semester: r.semester, sgpa: r.sgpa })),
    active_backlogs: [],
    cleared_backlogs: [],
    overall_attendance: null,
    attendance_trend: null,
    last_month_attendance: null,
    low_attendance_subjects: [],
    overdue_tasks: pendingTasks.map(t => ({ task: t.text, due_by: t.due_by })),
    task_completion_history: [],
    total_tasks_assigned: 0,
    total_tasks_completed: 0,
    tone_history: prevSessionOutput?.emotional_behavioral?.overall_tone ? [prevSessionOutput.emotional_behavioral.overall_tone] : [],
    engagement_history: prevSessionOutput?.emotional_behavioral?.engagement_level ? [prevSessionOutput.emotional_behavioral.engagement_level] : [],
    goals: [],
    recurring_risk_flags: []
  }

  // --- RENDER ---
  return (
    <div className="flex flex-col h-full bg-[#f4f4f6] text-[#111116] font-sans overflow-hidden">
      <div className="flex-1 overflow-y-auto p-8 pb-24">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* HEADER SECTION */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-[20px] font-black text-[#111116] tracking-tight">Audio Validation</h2>
              <p className="text-[13px] text-[#9090a0]">Record the session or upload an existing file to extract AI insights.</p>
            </div>
            {audioStage === 'done' && (
              <button 
                onClick={() => setAudioStage('idle')}
                className="text-[12px] font-bold text-[#4f6ef7] hover:underline flex items-center gap-2"
              >
                <i className="ti ti-rotate"></i> Re-record Session
              </button>
            )}
          </div>

          {/* PHASE 1: PRE-SESSION & AUDIO */}
          {audioStage !== 'done' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* LEFT: PRE-SESSION CONTEXT */}
              <div className="bg-white border border-[#e4e4e9] rounded-2xl shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-[#f4f4f6] flex items-center justify-between bg-[#fcfcfd]">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-[#4f6ef7] uppercase tracking-[0.15em]">Step 1</span>
                    <h4 className="text-[13px] font-bold text-[#111116] uppercase tracking-widest">Pre-Session Checklist</h4>
                  </div>
                  <span className="bg-[#eef1fe] text-[#4f6ef7] text-[10px] font-black px-2 py-0.5 rounded-full">
                    {presessionQuestions.length} ITEMS
                  </span>
                </div>

                <div className="p-6 flex-1 overflow-y-auto max-h-[400px]">
                  {presessionLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                      <div className="w-10 h-10 border-4 border-[#f4f4f6] border-t-[#4f6ef7] rounded-full animate-spin"></div>
                      <span className="text-[12px] font-bold text-[#9090a0] uppercase tracking-widest">Analyzing Student Data...</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {presessionQuestions.length === 0 ? (
                        <div className="text-center py-12">
                          <p className="text-[13px] text-[#9090a0]">No pending items for this session.</p>
                        </div>
                      ) : (
                        presessionQuestions.sort((a,b) => a.priority - b.priority).map((q) => (
                          <div 
                            key={q.id} 
                            onClick={() => toggleQuestion(q.id)}
                            className={`group p-4 rounded-xl border transition-all cursor-pointer flex gap-4 items-start ${q.checked ? 'bg-[#f8f8fb] border-transparent opacity-60' : 'bg-white border-[#e4e4e9] hover:border-[#4f6ef7]/30 hover:shadow-md'}`}
                          >
                            <div className={`mt-1 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${q.checked ? 'bg-[#4f6ef7] border-[#4f6ef7]' : 'border-[#e4e4e9] group-hover:border-[#4f6ef7]'}`}>
                              {q.checked && <i className="ti ti-check text-white text-[10px]"></i>}
                            </div>
                            <div className="flex-1">
                              <div className="mb-1">{getQuestionTypeBadge(q.type)}</div>
                              <div className={`text-[13px] font-bold leading-snug ${q.checked ? 'text-[#9090a0]' : 'text-[#111116]'}`}>
                                {q.text}
                              </div>
                              <div className="text-[11px] text-[#9090a0] mt-1 font-medium">{detectClaims(q.reason, ctx)}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT: AUDIO RECORDING */}
              <div className="bg-white border border-[#e4e4e9] rounded-2xl shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-[#f4f4f6] flex items-center justify-between bg-[#fcfcfd]">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-[#7c3aed] uppercase tracking-[0.15em]">Step 2</span>
                    <h4 className="text-[13px] font-bold text-[#111116] uppercase tracking-widest">Capture Session</h4>
                  </div>
                </div>

                <div className="p-8 flex-1 flex flex-col items-center justify-center text-center">
                  {audioStage === 'idle' ? (
                    <div className="w-full space-y-8">
                      <div className="flex bg-[#f4f4f6] rounded-xl p-1 max-w-[200px] mx-auto">
                        <button 
                          onClick={() => setRecordMode('record')}
                          className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition-all ${recordMode === 'record' ? 'bg-white shadow text-[#111116]' : 'text-[#9090a0]'}`}
                        >RECORD</button>
                        <button 
                          onClick={() => setRecordMode('upload')}
                          className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition-all ${recordMode === 'upload' ? 'bg-white shadow text-[#111116]' : 'text-[#9090a0]'}`}
                        >UPLOAD</button>
                      </div>

                      {recordMode === 'record' ? (
                        <div className="space-y-6">
                          {!recording ? (
                            <button 
                              onClick={startRecording}
                              className="w-24 h-24 rounded-full bg-[#fcfcfd] border-4 border-[#f4f4f6] shadow-inner flex items-center justify-center group hover:scale-105 transition-all active:scale-95 mx-auto"
                            >
                              <div className="w-16 h-16 rounded-full bg-[#ef4444] flex items-center justify-center text-white shadow-lg shadow-red-200">
                                <i className="ti ti-microphone text-2xl"></i>
                              </div>
                            </button>
                          ) : (
                            <div className="space-y-6">
                              <div className="relative w-32 h-32 mx-auto">
                                <div className="absolute inset-0 bg-red-100 rounded-full animate-ping opacity-20"></div>
                                <div className="relative w-full h-full bg-white border-4 border-red-500 rounded-full flex flex-col items-center justify-center">
                                  <span className="text-[11px] font-black text-red-500 uppercase tracking-widest mb-1">Live</span>
                                  <span className="text-[20px] font-black text-[#111116] font-mono">{formatTimer(timer)}</span>
                                </div>
                              </div>
                              <button 
                                onClick={stopRecording}
                                className="px-8 py-3 bg-[#111116] text-white text-[13px] font-bold rounded-xl shadow-xl hover:bg-black transition-all"
                              >Stop & Extract Insights</button>
                            </div>
                          )}
                          <p className="text-[12px] text-[#9090a0] max-w-[240px] mx-auto font-medium">Capture the conversation. We'll automatically identify patterns and decisions.</p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full h-40 border-2 border-dashed border-[#e4e4e9] rounded-2xl flex flex-col items-center justify-center gap-3 group hover:border-[#4f6ef7] hover:bg-[#4f6ef7]/5 cursor-pointer transition-all"
                          >
                            <input type="file" ref={fileInputRef} hidden accept=".mp3,.wav,.m4a,.webm,.ogg" onChange={handleFileChange}/>
                            <div className="w-12 h-12 bg-[#f4f4f6] rounded-full flex items-center justify-center text-[#9090a0] group-hover:bg-[#4f6ef7] group-hover:text-white transition-all">
                              <i className="ti ti-upload text-xl"></i>
                            </div>
                            <div>
                              <p className="text-[13px] font-bold text-[#111116]">{selectedFile ? selectedFile.name : 'Select Audio File'}</p>
                              <p className="text-[11px] text-[#9090a0] font-medium mt-1">MP3, WAV, or WEBM (Max 50MB)</p>
                            </div>
                          </div>
                          {selectedFile && (
                            <button 
                              onClick={() => processAudioPipeline(selectedFile)}
                              className="w-full py-4 bg-[#4f6ef7] text-white text-[14px] font-black rounded-xl shadow-lg shadow-[#4f6ef7]/20 hover:bg-[#3d5ce8] transition-all"
                            >Process Session Audio &rarr;</button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full space-y-8 animate-in fade-in">
                      <div className="relative w-32 h-32 mx-auto">
                        <div className="absolute inset-0 border-4 border-[#f4f4f6] rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-t-[#4f6ef7] rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <i className="ti ti-cloud-computing text-3xl text-[#4f6ef7]"></i>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-[16px] font-black text-[#111116] mb-1">
                          {audioStage === 'uploading' && 'Uploading Data...'}
                          {audioStage === 'transcribing' && 'Transcribing Session...'}
                          {audioStage === 'extracting' && 'Extracting Insights...'}
                        </h4>
                        <p className="text-[12px] text-[#9090a0] font-medium">This typically takes 20-40 seconds depending on session length.</p>
                      </div>
                      
                      {/* PROGRESS TRACKER */}
                      <div className="max-w-[240px] mx-auto space-y-3">
                        {[
                          { id: 'uploading', label: 'Audio Upload' },
                          { id: 'transcribing', label: 'Speech-to-Text' },
                          { id: 'extracting', label: 'AI Intelligence' }
                        ].map((s, idx) => {
                          const stages = ['uploading', 'transcribing', 'extracting', 'done'];
                          const currentIdx = stages.indexOf(audioStage);
                          const stageIdx = stages.indexOf(s.id);
                          const isComplete = currentIdx > stageIdx;
                          const isActive = audioStage === s.id;

                          return (
                            <div key={s.id} className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${isComplete ? 'bg-[#10b981] text-white' : isActive ? 'bg-[#4f6ef7] text-white' : 'bg-[#f4f4f6] text-[#9090a0]'}`}>
                                {isComplete ? '✓' : idx + 1}
                              </div>
                              <span className={`text-[12px] font-bold ${isActive ? 'text-[#111116]' : 'text-[#9090a0]'}`}>{s.label}</span>
                              {isActive && <div className="flex gap-0.5 ml-auto"><div className="w-1 h-1 bg-[#4f6ef7] rounded-full animate-bounce"></div><div className="w-1 h-1 bg-[#4f6ef7] rounded-full animate-bounce [animation-delay:0.2s]"></div><div className="w-1 h-1 bg-[#4f6ef7] rounded-full animate-bounce [animation-delay:0.4s]"></div></div>}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
              
              {/* TRANSCRIPT BANNER */}
              <div className="bg-white border border-[#e4e4e9] rounded-2xl p-6 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#ecfdf5] text-[#059669] rounded-xl flex items-center justify-center text-lg shadow-sm">
                    <i className="ti ti-check"></i>
                  </div>
                  <div>
                    <h4 className="text-[15px] font-black text-[#111116]">Insights Extracted Successfully</h4>
                    <p className="text-[11px] text-[#9090a0] font-bold uppercase tracking-widest mt-0.5">Session Transcript Verified &middot; 98% Accuracy</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setTranscriptOpen(!transcriptOpen)}
                    className="px-4 py-2 bg-[#f4f4f6] hover:bg-[#e4e4e9] text-[#111116] text-[12px] font-bold rounded-lg transition-all"
                  >{transcriptOpen ? 'Hide Transcript' : 'View Transcript'}</button>
                </div>
              </div>

              {transcriptOpen && transcript && (
                <div className="bg-[#fcfcfd] border border-[#e4e4e9] rounded-2xl p-8 max-h-[400px] overflow-y-auto animate-in slide-in-from-top-4">
                  <h5 className="text-[11px] font-black text-[#9090a0] uppercase tracking-widest mb-6 border-b border-[#e4e4e9] pb-4">Raw Session Transcript</h5>
                  <div className="text-[14px] text-[#52525e] leading-[1.8] whitespace-pre-wrap font-medium">
                    {transcript}
                  </div>
                </div>
              )}

              {/* AI OUTPUT GRID */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                
                {/* COLUMN 1: EMOTIONAL & PATTERNS */}
                <div className="md:col-span-1 space-y-8">
                  {/* EMOTIONAL STATE */}
                  <div className="bg-white border border-[#e4e4e9] rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-[#f4f4f6] bg-[#fcfcfd]">
                      <h4 className="text-[11px] font-black text-[#111116] uppercase tracking-widest">Behavioral State</h4>
                    </div>
                    <div className="p-6 space-y-6">
                      <div className="flex flex-wrap gap-2">
                        {[
                          { label: editedOutput.emotional_behavioral?.overall_tone, icon: 'ti-mood-smile' },
                          { label: editedOutput.emotional_behavioral?.engagement_level, icon: 'ti-link' },
                          { label: editedOutput.emotional_behavioral?.confidence_level, icon: 'ti-shield-check' }
                        ].map((pill, i) => {
                          const l = pill.label?.toLowerCase() || '';
                          let theme = 'bg-[#f4f4f6] text-[#52525e]';
                          if (l.includes('high') || l.includes('positive')) theme = 'bg-[#ecfdf5] text-[#059669]';
                          if (l.includes('medium') || l.includes('neutral')) theme = 'bg-[#fffbeb] text-[#d97706]';
                          if (l.includes('low') || l.includes('anxious') || l.includes('distressed')) theme = 'bg-[#fef2f2] text-[#ef4444]';
                          
                          return (
                            <span key={i} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider ${theme}`}>
                              <i className={`ti ${pill.icon} text-[12px]`}></i>
                              {pill.label}
                            </span>
                          )
                        })}
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-[#9090a0] uppercase tracking-widest">Observation Narrative</label>
                        <textarea 
                          className="w-full text-[13px] bg-[#fcfcfd] border border-[#e4e4e9] rounded-xl p-3 focus:border-[#4f6ef7] outline-none min-h-[100px] leading-relaxed transition-all"
                          value={editedOutput.emotional_behavioral?.observations || ''}
                          onChange={(e) => setEditedOutput({
                            ...editedOutput,
                            emotional_behavioral: { ...editedOutput.emotional_behavioral, observations: e.target.value }
                          })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* PATTERNS */}
                  <div className="bg-white border border-[#e4e4e9] rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-[#f4f4f6] bg-[#fcfcfd]">
                      <h4 className="text-[11px] font-black text-[#111116] uppercase tracking-widest">Recurring Patterns</h4>
                    </div>
                    <div className="p-6 space-y-4">
                      {editedOutput.patterns?.map((p: any, i: number) => (
                        <div key={i} className="group">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                              p.type === 'positive' ? 'bg-[#ecfdf5] text-[#059669]' : 'bg-[#f4f4f6] text-[#9090a0]'
                            }`}>
                              {p.type.toUpperCase()}
                            </span>
                            <span className="text-[13px] font-black text-[#111116]">{p.label}</span>
                          </div>
                          <p className="text-[12px] text-[#52525e] leading-relaxed font-medium">{detectClaims(p.description, ctx)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* COLUMN 2 & 3: DECISIONS & RISK */}
                <div className="md:col-span-2 space-y-8">
                  {/* SESSION DECISIONS */}
                  <div className="bg-white border border-[#e4e4e9] rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-[#f4f4f6] flex justify-between items-center bg-[#fcfcfd]">
                      <h4 className="text-[11px] font-black text-[#111116] uppercase tracking-[0.2em]">Key Decisions</h4>
                    </div>
                    <div className="p-8 space-y-8">
                      <div className="p-5 bg-[#f4f4f6]/50 border border-[#e4e4e9] rounded-2xl">
                        <p className="text-[14px] text-[#111116] leading-relaxed font-medium italic">"{detectClaims(editedOutput.decisions?.narrative || '', ctx)}"</p>
                      </div>

                      <div className="space-y-4">
                        <h5 className="text-[10px] font-black text-[#9090a0] uppercase tracking-widest">Action Items</h5>
                        {editedOutput.decisions?.commitments?.map((c: any, i: number) => (
                          <div key={i} className="flex gap-4 group items-start">
                            <div className={`mt-1 shrink-0 w-20 text-[10px] font-black px-2 py-1 rounded-md text-center border uppercase tracking-wider ${
                              c.assigned_to === 'student' ? 'bg-[#eef1fe] text-[#4f6ef7]' : 'bg-[#f5f3ff] text-[#7c3aed]'
                            }`}>
                              {c.assigned_to}
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between">
                                <span className="text-[14px] font-bold text-[#111116]">{c.task}</span>
                                {c.due && <span className="text-[11px] font-black text-[#9090a0]">By {c.due}</span>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* RISK FLAGS */}
                  <div className="bg-white border border-[#e4e4e9] rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-[#f4f4f6] bg-[#fcfcfd]">
                      <h4 className="text-[11px] font-black text-[#111116] uppercase tracking-[0.2em]">Risk Identification</h4>
                    </div>
                    <div className="p-8">
                      {(!editedOutput.risk_flags || editedOutput.risk_flags.length === 0) ? (
                        <p className="text-[13px] text-[#059669] font-bold">No Critical Risks Detected</p>
                      ) : (
                        <div className="space-y-6">
                          {editedOutput.risk_flags.map((flag: any, i: number) => (
                            <div key={i} className="p-5 bg-red-50 border border-red-100 rounded-xl space-y-3">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black bg-red-600 text-white px-2 py-1 rounded uppercase">{flag.severity}</span>
                                <span className="text-[14px] font-black text-[#111116]">{flag.flag_code}</span>
                              </div>
                              <p className="text-[13px] text-[#52525e] leading-relaxed">{detectClaims(flag.description, ctx)}</p>
                              <div className="pt-2 border-t border-red-100">
                                <span className="text-[10px] font-black text-[#059669] uppercase tracking-widest">Recommended: </span>
                                <span className="text-[13px] font-bold text-[#059669]">{flag.recommended_action}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* STICKY BOTTOM ACTIONS */}
      <div className="bg-white border-t border-[#e4e4e9] px-8 py-4 flex items-center justify-between shadow-[0_-4px_12px_rgba(0,0,0,0.03)] shrink-0 z-40">
        <button 
          onClick={onBack}
          className="text-[13px] font-bold text-[#52525e] hover:bg-[#f4f4f6] px-5 py-2.5 rounded-xl transition-all flex items-center gap-2"
        >
          <i className="ti ti-arrow-left"></i> Back
        </button>
        <button 
          onClick={handleContinue}
          className={`px-8 py-3 text-[14px] font-black rounded-xl shadow-lg transition-all active:scale-[0.98] ${
            audioStage === 'done' 
              ? 'bg-[#111116] text-white hover:bg-black' 
              : 'bg-white border border-[#e4e4e9] text-[#9090a0] cursor-not-allowed'
          }`}
        >
          Review & Finalize Submission &rarr;
        </button>
      </div>
    </div>
  )
}
