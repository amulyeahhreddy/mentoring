'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

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
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

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
      // A) Load existing AI output
      if (aiOutput) {
        setEditedOutput(aiOutput)
        setAudioStage('done')
        setInsightsCollapsed(true)
      } else {
        const { data: session } = await supabase
          .from('sessions')
          .select('ai_output, audio_data')
          .eq('id', activeSessionId)
          .single()

        if (session?.ai_output) {
          setEditedOutput(session.ai_output)
          setAiOutput(session.ai_output)
          setAudioStage('done')
          setInsightsCollapsed(true)
        }
        if (session?.audio_data?.transcript) {
          setTranscript(session.audio_data.transcript)
        }
      }

      // B) Build pre-session questions
      loadPresessionData()
    }

    init()
  }, [activeSessionId, aiOutput])

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
      console.error('Failed to load pre-session questions:', err)
      setToastMessage(err.message || 'Failed to load questions')
      setPresessionError(true)
      setPresessionLoading(false)
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
      const timeoutId = setTimeout(() => controller.abort(), 30000)
      
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
    const { error } = await supabase
      .from('sessions')
      .update({ ai_output: editedOutput })
      .eq('id', activeSessionId)
    
    if (!error) triggerToast('Draft saved')
  }

  const handleContinue = async () => {
    try {
      // 1. PATCH sessions
      await supabase
        .from('sessions')
        .update({ ai_output: editedOutput })
        .eq('id', activeSessionId)

      // 2. INSERT into pre_session_insights
      const carryForwardQuestions = presessionQuestions
        .filter(q => !q.checked)
        .map(q => ({ text: q.text, reason: q.reason, type: q.type, checked: false }))
      
      const suggestedNext = (editedOutput.suggested_questions || []).map((q: any) => ({ ...q, checked: false }))

      await supabase.from('pre_session_insights').insert({
        student_id: selectedStudent.id,
        mentor_id: mentorId,
        insights: {
          questions: [...carryForwardQuestions, ...suggestedNext]
        },
        model_used: 'ollama',
        generated_at: new Date().toISOString()
      })

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
    <div className="animate-spin w-3 h-3 border-2 border-gray-300 border-t-gray-700 rounded-full"></div>
  )

  const getQuestionTypeBadge = (type: string) => {
    switch (type) {
      case 'carryforward': return <span className="bg-orange-50 text-orange-700 text-[11px] px-2 py-0.5 rounded-full font-medium">Carry forward</span>
      case 'task_followup': return <span className="bg-blue-50 text-blue-700 text-[11px] px-2 py-0.5 rounded-full font-medium">Follow up</span>
      case 'academic': return <span className="bg-purple-50 text-purple-700 text-[11px] px-2 py-0.5 rounded-full font-medium">Academic</span>
      case 'ai_suggested': return <span className="bg-green-50 text-green-700 text-[11px] px-2 py-0.5 rounded-full font-medium">AI suggested</span>
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

    if (currScore > prevScore) return <span className="text-green-600 ml-1">↑ was {prevVal}</span>
    if (currScore < prevScore) return <span className="text-red-500 ml-1">↓ was {prevVal}</span>
    return <span className="text-gray-400 ml-1">— unchanged</span>
  }

  // --- RENDER ---

  return (
    <div className="flex flex-col h-full bg-gray-50 relative overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 pb-24">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* PHASE 1: PRE-SESSION & AUDIO */}
          {audioStage !== 'done' ? (
            <>
              {/* SECTION 1: PRE-SESSION INSIGHTS */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] uppercase text-gray-500 tracking-wider">Pre-session insights</span>
                    <span className="bg-gray-100 text-gray-600 text-[11px] px-2 py-0.5 rounded-full">
                      {presessionQuestions.length}
                    </span>
                  </div>
                  <button onClick={() => setInsightsCollapsed(!insightsCollapsed)}>
                    <i className={`ti ti-chevron-${insightsCollapsed ? 'down' : 'up'} text-gray-400`}></i>
                  </button>
                </div>

                {presessionLoading ? (
                  <div className="flex items-center gap-3 py-4">
                    <Spinner />
                    <span className="text-[13px] text-gray-500">Generating questions...</span>
                  </div>
                ) : presessionError ? (
                  <div className="py-4">
                    <p className="text-red-500 text-[13px] mb-2">Failed to load questions</p>
                    <button 
                      onClick={loadPresessionData}
                      className="text-blue-600 text-[13px] font-medium hover:underline"
                    >
                      Retry
                    </button>
                  </div>
                ) : !insightsCollapsed && (
                  <div className="animate-in fade-in slide-in-from-top-2">
                    <p className="text-[11px] text-gray-400 mb-3">
                      Check off questions as you ask them. Unchecked ones carry to next session.
                    </p>
                    <div className="space-y-1">
                      {presessionQuestions.sort((a,b) => a.priority - b.priority).map((q) => (
                        <div key={q.id} className="border-b border-gray-100 py-3 flex gap-3 items-start last:border-0">
                          <input 
                            type="checkbox" 
                            checked={q.checked}
                            onChange={() => toggleQuestion(q.id)}
                            className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            {getQuestionTypeBadge(q.type)}
                            <div className={`text-[13px] font-medium mt-1 transition-all ${q.checked ? 'opacity-50 line-through' : 'text-gray-800'}`}>
                              {q.text}
                            </div>
                            <div className="text-[11px] text-gray-400 mt-0.5">{q.reason}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 2: AUDIO */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="text-[13px] font-medium mb-3">Record or upload session audio</div>
                
                <div className="flex gap-4 mb-6">
                  <button 
                    onClick={() => setRecordMode('record')}
                    className={`text-[12px] px-3 py-1 rounded-lg transition-all ${recordMode === 'record' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Record
                  </button>
                  <button 
                    onClick={() => setRecordMode('upload')}
                    className={`text-[12px] px-3 py-1 rounded-lg transition-all ${recordMode === 'upload' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Upload
                  </button>
                </div>

                <div className="min-h-[60px] flex flex-col justify-center">
                  {recordMode === 'upload' ? (
                    <div className="flex items-center gap-3">
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        hidden 
                        accept=".mp3,.wav,.m4a,.webm,.ogg" 
                        onChange={handleFileChange}
                      />
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-[13px] px-4 py-2 rounded-lg transition-colors"
                      >
                        Choose file
                      </button>
                      {selectedFile && (
                        <div className="flex items-center gap-3">
                          <span className="text-[12px] text-gray-500 truncate max-w-[150px]">{selectedFile.name.length > 20 ? selectedFile.name.substring(0, 20) + '...' : selectedFile.name}</span>
                          <button 
                            onClick={() => processAudioPipeline(selectedFile)}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-[12px] px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Process
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      {!recording ? (
                        <button 
                          onClick={startRecording}
                          className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-600 hover:bg-red-100 transition-colors"
                        >
                          <i className="ti ti-microphone text-xl"></i>
                        </button>
                      ) : (
                        <div className="flex items-center gap-4">
                          <span className="text-red-600 font-mono text-lg">{formatTimer(timer)}</span>
                          <button 
                            onClick={stopRecording}
                            className="bg-red-600 hover:bg-red-700 text-white text-[13px] px-4 py-2 rounded-lg transition-colors"
                          >
                            Stop & process
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="text-[12px]">
                    {audioStage === 'idle' && <span className="text-gray-400">Upload or record to begin</span>}
                    {audioStage === 'uploading' && <span className="text-gray-600 flex items-center gap-2"><Spinner /> Uploading...</span>}
                    {audioStage === 'transcribing' && <span className="text-gray-600 flex items-center gap-2"><Spinner /> Transcribing with Whisper...</span>}
                    {audioStage === 'extracting' && <span className="text-gray-600 flex items-center gap-2"><Spinner /> Extracting insights...</span>}
                    {audioStage === 'error' && (
                      <div className="flex items-center gap-2">
                        <span className="text-red-500">Processing failed</span>
                        <button 
                          onClick={() => setAudioStage('idle')}
                          className="text-blue-600 hover:underline"
                        >
                          Retry
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* PHASE 2: INSIGHTS REVIEW */}
              
              {/* INSIGHTS COLLAPSED BAR */}
              <div 
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex flex-col cursor-pointer"
                onClick={() => setInsightsCollapsed(!insightsCollapsed)}
              >
                <div className="flex justify-between items-center">
                  <span className="text-[12px] text-gray-500">
                    {presessionQuestions.length} questions · {presessionQuestions.filter(q => q.checked).length} asked
                  </span>
                  <i className={`ti ti-chevron-${insightsCollapsed ? 'down' : 'up'} text-gray-400`}></i>
                </div>
                {!insightsCollapsed && (
                  <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                    {presessionQuestions.sort((a,b) => a.priority - b.priority).map((q) => (
                      <div key={q.id} className="border-t border-gray-100 py-3 flex gap-3 items-start first:border-0">
                        <input 
                          type="checkbox" 
                          checked={q.checked}
                          onChange={(e) => {
                            e.stopPropagation()
                            toggleQuestion(q.id)
                          }}
                          className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          {getQuestionTypeBadge(q.type)}
                          <div className={`text-[13px] font-medium mt-1 ${q.checked ? 'opacity-50 line-through' : 'text-gray-800'}`}>
                            {q.text}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>



              {/* AI OUTPUT PANELS */}
              
              {/* 1. WHAT WAS DECIDED */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="text-[11px] uppercase text-gray-500 tracking-wider mb-2">What was decided this session</div>
                <div className="text-[13px] text-gray-700 leading-relaxed mb-4">{editedOutput.decisions?.narrative}</div>
                <div className="space-y-3">
                  {editedOutput.decisions?.commitments?.map((c: any, i: number) => (
                    <div key={i} className="border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                          c.assigned_to === 'student' ? 'bg-gray-100 text-gray-700' : 
                          c.assigned_to === 'mentor' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                        }`}>
                          {c.assigned_to}
                        </span>
                        <span className="text-[13px] flex-1">{c.task}</span>
                        {c.due && <span className="text-[11px] text-gray-400 ml-auto">{c.due}</span>}
                      </div>
                      {c.evidence_quote && (
                        <div className="text-[11px] italic text-gray-400 border-l-2 border-gray-200 pl-2 mt-1">
                          "{c.evidence_quote}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. COMPARED TO LAST SESSION */}
              {prevSessionOutput && (
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                  <div className="text-[11px] uppercase text-gray-500 tracking-wider mb-3">Compared to last session</div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-[11px] text-gray-500 mb-1">Engagement</div>
                      <div className="text-[13px] font-medium">{editedOutput.emotional_behavioral?.engagement_level}</div>
                      <div className="text-[11px] mt-0.5">
                        {getMetricDelta(editedOutput.emotional_behavioral || {}, prevSessionOutput.emotional_behavioral || {}, 'engagement_level')}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-[11px] text-gray-500 mb-1">Confidence</div>
                      <div className="text-[13px] font-medium">{editedOutput.emotional_behavioral?.confidence_level}</div>
                      <div className="text-[11px] mt-0.5">
                        {getMetricDelta(editedOutput.emotional_behavioral || {}, prevSessionOutput.emotional_behavioral || {}, 'confidence_level')}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-[11px] text-gray-500 mb-1">Tasks</div>
                      <div className="text-[13px] font-medium">{editedOutput.tasks_assigned?.length || 0} items</div>
                      <div className="text-[11px] mt-0.5">
                        {editedOutput.tasks_assigned?.length > (prevSessionOutput.tasks_assigned?.length || 0) ? (
                          <span className="text-blue-600">↑ more than last</span>
                        ) : editedOutput.tasks_assigned?.length < (prevSessionOutput.tasks_assigned?.length || 0) ? (
                          <span className="text-amber-600">↓ fewer than last</span>
                        ) : (
                          <span className="text-gray-400">— same as last</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. PATTERNS */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="text-[11px] uppercase text-gray-500 tracking-wider mb-2">Patterns noticed</div>
                <div className="divide-y divide-gray-100">
                  {editedOutput.patterns?.map((p: any, i: number) => (
                    <div key={i} className="py-2 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          p.session_count > 1 ? 'bg-amber-50 text-amber-700' : 
                          p.type === 'positive' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {p.session_count > 1 ? `${p.session_count}x` : p.type}
                        </span>
                        <span className="text-[13px] font-bold">{p.label}</span>
                      </div>
                      <div className="text-[12px] text-gray-500">{p.description}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. EMOTIONAL & BEHAVIORAL */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="text-[11px] uppercase text-gray-500 tracking-wider mb-3">Emotional & behavioral</div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {[
                    { label: editedOutput.emotional_behavioral?.overall_tone, type: 'tone' },
                    { label: editedOutput.emotional_behavioral?.engagement_level, type: 'engagement' },
                    { label: editedOutput.emotional_behavioral?.confidence_level, type: 'confidence' }
                  ].map((pill, i) => {
                    const l = pill.label?.toLowerCase() || '';
                    let color = 'bg-gray-100 text-gray-600';
                    if (l.includes('high') || l.includes('positive')) color = 'bg-green-50 text-green-700';
                    else if (l.includes('medium') || l.includes('neutral')) color = 'bg-amber-50 text-amber-700';
                    else if (l.includes('low') || l.includes('anxious') || l.includes('distressed')) color = 'bg-red-50 text-red-700';
                    
                    return (
                      <span key={i} className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${color}`}>
                        {pill.label}
                      </span>
                    )
                  })}
                </div>
                <textarea 
                  className="w-full text-[13px] border border-gray-200 rounded-lg p-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 mt-2"
                  rows={3}
                  value={editedOutput.emotional_behavioral?.observations || ''}
                  onChange={(e) => setEditedOutput({
                    ...editedOutput,
                    emotional_behavioral: { ...editedOutput.emotional_behavioral, observations: e.target.value }
                  })}
                  placeholder="Observations..."
                />
              </div>

              {/* 5. RISK FLAGS */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="text-[11px] uppercase text-gray-500 tracking-wider mb-2">Risk flags</div>
                {(!editedOutput.risk_flags || editedOutput.risk_flags.length === 0) ? (
                  <p className="text-[13px] text-green-600">✓ No risk flags identified</p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {editedOutput.risk_flags.map((flag: any, i: number) => (
                      <div key={i} className="py-3 first:pt-0 last:pb-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            flag.severity === 'critical' ? 'bg-red-100 text-red-700 animate-pulse' :
                            flag.severity === 'high' ? 'bg-red-100 text-red-700' :
                            flag.severity === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {flag.severity}
                          </span>
                          <span className="text-[13px] font-bold">{flag.flag_code}</span>
                        </div>
                        <textarea 
                          className="w-full text-[13px] border border-gray-200 rounded-lg p-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                          rows={2}
                          value={flag.description}
                          onChange={(e) => {
                            const flags = [...editedOutput.risk_flags]
                            flags[i] = { ...flags[i], description: e.target.value }
                            setEditedOutput({ ...editedOutput, risk_flags: flags })
                          }}
                        />
                        <div className="mt-2">
                          <div className="text-[11px] text-gray-400 mb-1">Recommended action</div>
                          <input 
                            type="text"
                            className="w-full text-[13px] border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            value={flag.recommended_action}
                            onChange={(e) => {
                              const flags = [...editedOutput.risk_flags]
                              flags[i] = { ...flags[i], recommended_action: e.target.value }
                              setEditedOutput({ ...editedOutput, risk_flags: flags })
                            }}
                          />
                        </div>
                        {flag.evidence_quote && (
                          <div className="text-[11px] italic text-gray-400 border-l-2 border-gray-200 pl-2 mt-2">
                            "{flag.evidence_quote}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 6. ACTION ITEMS */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <div className="text-[11px] uppercase text-gray-500 tracking-wider">Action items</div>
                  <button 
                    onClick={() => setEditedOutput({
                      ...editedOutput,
                      tasks_assigned: [
                        ...(editedOutput.tasks_assigned || []),
                        { id: crypto.randomUUID(), task: '', assigned_to: 'student', due_by: '', source: 'mentor_added' }
                      ]
                    })}
                    className="text-[12px] text-blue-600 font-medium hover:underline"
                  >
                    + Add manually
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead className="text-[11px] text-gray-400 border-b border-gray-100">
                      <tr>
                        <th className="text-left font-normal pb-2">Task</th>
                        <th className="text-left font-normal pb-2 px-2">Assigned to</th>
                        <th className="text-left font-normal pb-2 px-2">Due by</th>
                        <th className="text-left font-normal pb-2 px-2">Source</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {(editedOutput.tasks_assigned || []).map((t: any, i: number) => (
                        <tr key={t.id || i}>
                          <td className="py-2 pr-2">
                            <input 
                              type="text"
                              className="w-full border-b border-gray-100 py-1 text-[13px] focus:outline-none focus:border-blue-500 transition-colors"
                              value={t.task}
                              onChange={(e) => {
                                const tasks = [...editedOutput.tasks_assigned]
                                tasks[i] = { ...tasks[i], task: e.target.value }
                                setEditedOutput({ ...editedOutput, tasks_assigned: tasks })
                              }}
                            />
                          </td>
                          <td className="py-2 px-2">
                            <select 
                              className="bg-transparent text-[12px] focus:outline-none"
                              value={t.assigned_to}
                              onChange={(e) => {
                                const tasks = [...editedOutput.tasks_assigned]
                                tasks[i] = { ...tasks[i], assigned_to: e.target.value }
                                setEditedOutput({ ...editedOutput, tasks_assigned: tasks })
                              }}
                            >
                              <option value="student">Student</option>
                              <option value="mentor">Mentor</option>
                              <option value="both">Both</option>
                            </select>
                          </td>
                          <td className="py-2 px-2">
                            <input 
                              type="text"
                              className="w-full bg-transparent text-[12px] focus:outline-none"
                              value={t.due_by}
                              onChange={(e) => {
                                const tasks = [...editedOutput.tasks_assigned]
                                tasks[i] = { ...tasks[i], due_by: e.target.value }
                                setEditedOutput({ ...editedOutput, tasks_assigned: tasks })
                              }}
                              placeholder="MM/DD"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              t.source === 'ai_extracted' ? 'bg-purple-50 text-purple-700' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {t.source === 'ai_extracted' ? 'AI' : 'Manual'}
                            </span>
                          </td>
                          <td className="py-2 text-right">
                            <button 
                              onClick={() => {
                                const tasks = editedOutput.tasks_assigned.filter((_: any, idx: number) => idx !== i)
                                setEditedOutput({ ...editedOutput, tasks_assigned: tasks })
                              }}
                              className="text-gray-300 hover:text-red-500 transition-colors"
                            >
                              <i className="ti ti-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 7. SUGGESTED QUESTIONS FOR NEXT SESSION */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="text-[11px] uppercase text-gray-500 tracking-wider">Suggested questions for next session</div>
                <p className="text-[11px] text-gray-400 mb-3">These will appear at the start of the next session</p>
                <div className="space-y-3">
                  {(editedOutput.suggested_questions || []).map((q: any, i: number) => (
                    <div key={i} className="border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                          q.type === 'follow_up' ? 'bg-blue-50 text-blue-700' :
                          q.type === 'probe' ? 'bg-purple-50 text-purple-700' :
                          q.type === 'check_in' ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'
                        }`}>
                          {q.type?.replace('_', ' ')}
                        </span>
                        <span className="text-[13px] font-medium">{q.question}</span>
                      </div>
                      <div className="text-[11px] text-gray-400">{q.reason}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* STICKY BOTTOM BAR */}
      {editedOutput && (
        <div 
          className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 px-6 flex items-center justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40"
          style={{ backgroundColor: 'var(--color-background-primary)', borderTop: '0.5px solid var(--color-border-tertiary)' }}
        >
          <div className="text-[12px] text-gray-400">
            Changes confirmed in Review tab
          </div>
          <div className="flex gap-3">
            <button 
              onClick={saveDraft}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors"
            >
              Save draft
            </button>
            <button 
              onClick={handleContinue}
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg px-5 py-2.5 text-sm font-medium transition-colors shadow-sm"
            >
              Continue to Review
            </button>
          </div>
        </div>
      )}

      {/* TOAST */}
      {showToast && (
        <div className="fixed top-4 right-4 bg-gray-900 text-white px-6 py-3 rounded-xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-4">
          <span className="text-[14px] font-medium">{toastMessage}</span>
        </div>
      )}
    </div>
  )
}
