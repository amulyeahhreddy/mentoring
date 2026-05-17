'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const STEPS = [
  'Identity',
  'Family',
  'Admission',
  'Pre-Engineering Record',
  'Goals',
  'Self Assessment',
  'Interests',
  'General Onboarding',
  'Psychometric Test'
]

const INITIAL_FORM_DATA = {
  identity: {
    full_name: '',
    roll_number: '',
    branch: '',
    section: '',
    blood_group: '',
    identification_mark_1: '',
    identification_mark_2: '',
    mobile: '',
    parent_email: '',
    residential_address: ''
  },
  family: {
    father: { name: '', occupation: '', education: '', contact: '', address: '' },
    mother: { name: '', occupation: '', education: '', contact: '' },
    local_guardian: { name: '', occupation: '', education: '', contact: '', address: '' }
  },
  admission: { entrance_exam: 'EAMCET', rank: '', quota: 'Convenor', category: 'OC' },
  pre_engineering_record: [
    { level: '10th', board: '', subjects: '', year_of_passing: '', percentage: '', class_grade: '', medium: '' }
  ],
  goals: {
    academic: { goal_statement: '', activities_planned: '', success_criteria: '' },
    personal: { goal_statement: '', activities_planned: '', success_criteria: '' },
    college_year_goal_1: '',
    college_year_goal_2: '',
    best_talent_1: '',
    best_talent_2: '',
    proud_of: '',
    most_prized_possession: ''
  },
  self_assessment: {
    strengths: '',
    weaknesses: '',
    career_qualities: [
      { skill: 'Problem Solving', rating: '' },
      { skill: 'Communication', rating: '' },
      { skill: 'Mathematical Ability', rating: '' },
      { skill: 'Inquisitiveness', rating: '' },
      { skill: 'Learning Ability', rating: '' },
      { skill: 'Innovation Skills', rating: '' }
    ],
    improvement_efforts: '',
    institutional_expectations: ''
  },
  interests: {
    transport_mode: '',
    transport_route_number: '',
    transport_inconvenience: '',
    hobbies: '',
    sports_interest: '',
    games_sports_detail: '',
    club_memberships: [],
    professional_bodies_interested: [],
    interested_in_organising: null
  },
  general_onboarding: {
    health_problems: '',
    home_atmosphere_suitable: null,
    home_support_needed: '',
    issues_hampering_studies: '',
    ragging_experienced: null,
    ragging_details: '',
    ragging_prevention_suggestions: '',
    aware_of_academic_regulations: null,
    parents_informed_of_regulations: null,
    determined_to_be_engineer: null
  },
  psychometric: [] as { question_id: number; aspect_category: string; question_text: string; answer: string }[]
}

const PSYCHOMETRIC_QUESTIONS = [
  { id: 1, group: 'Personality Assessment', text: 'I prefer working in groups over working alone' },
  { id: 2, group: 'Personality Assessment', text: 'I enjoy meeting new people easily' },
  { id: 3, group: 'Personality Assessment', text: 'I take initiative in social situations' },
  { id: 4, group: 'Personality Assessment', text: 'I am comfortable speaking in public' },
  { id: 5, group: 'Personality Assessment', text: 'I adapt quickly to new environments' },
  { id: 6, group: 'Personality Assessment', text: 'I enjoy leadership roles' },
  { id: 7, group: 'Personality Assessment', text: 'I am optimistic about my future' },
  { id: 8, group: 'Personality Assessment', text: 'I maintain a positive attitude under stress' },
  { id: 9, group: 'Security & Stability', text: 'I feel secure about my career choices' },
  { id: 10, group: 'Security & Stability', text: 'I have a clear sense of my strengths' },
  { id: 11, group: 'Security & Stability', text: 'I am confident in my abilities' },
  { id: 12, group: 'Security & Stability', text: 'I handle criticism constructively' },
  { id: 13, group: 'Security & Stability', text: 'I recover quickly from setbacks' },
  { id: 14, group: 'Security & Stability', text: 'I trust my own judgment' },
  { id: 15, group: 'Security & Stability', text: 'I feel financially stable in my studies' },
  { id: 16, group: 'Strengths Identification', text: 'I am good at explaining complex ideas' },
  { id: 17, group: 'Strengths Identification', text: 'I can motivate others effectively' },
  { id: 18, group: 'Strengths Identification', text: 'I solve problems systematically' },
  { id: 19, group: 'Strengths Identification', text: 'I learn new skills quickly' },
  { id: 20, group: 'Strengths Identification', text: 'I am creative in finding solutions' },
  { id: 21, group: 'Strengths Identification', text: 'I manage my time effectively' },
  { id: 22, group: 'Strengths Identification', text: 'I set and achieve goals consistently' },
  { id: 23, group: 'Areas for Growth', text: 'I sometimes procrastinate on tasks' },
  { id: 24, group: 'Areas for Growth', text: 'I find it hard to concentrate for long periods' },
  { id: 25, group: 'Areas for Growth', text: 'I get anxious before exams' },
  { id: 26, group: 'Areas for Growth', text: 'I struggle with complex mathematical problems' },
  { id: 27, group: 'Areas for Growth', text: 'I find group discussions challenging' },
  { id: 28, group: 'Areas for Growth', text: 'I tend to avoid conflict situations' },
  { id: 29, group: 'Areas for Growth', text: 'I sometimes doubt my capabilities' },
  { id: 30, group: 'Areas for Growth', text: 'I find it difficult to ask for help' },
  { id: 31, group: 'Social Responsibility', text: 'I volunteer for community activities' },
  { id: 32, group: 'Social Responsibility', text: 'I care about environmental issues' },
  { id: 33, group: 'Social Responsibility', text: 'I help classmates who are struggling' },
  { id: 34, group: 'Social Responsibility', text: 'I participate in social causes' },
  { id: 35, group: 'Social Responsibility', text: 'I respect diverse opinions and cultures' },
  { id: 36, group: 'Social Responsibility', text: 'I try to be fair in all my dealings' },
  { id: 37, group: 'Social Responsibility', text: 'I take responsibility for my actions' },
  { id: 38, group: 'Social Responsibility', text: 'I contribute positively to group activities' },
  { id: 39, group: 'Learning Style', text: 'I enjoy learning from books and resources' },
  { id: 40, group: 'Learning Style', text: 'I prefer hands-on learning experiences' },
  { id: 41, group: 'Learning Style', text: 'I like to understand concepts deeply before moving on' },
  { id: 42, group: 'Learning Style', text: 'I learn best through visual aids' },
  { id: 43, group: 'Learning Style', text: 'I remember things better when I teach others' },
  { id: 44, group: 'Learning Style', text: 'I enjoy solving puzzles and brain teasers' },
  { id: 45, group: 'Learning Style', text: 'I seek feedback to improve my learning' },
  { id: 46, group: 'Analytical Thinking', text: 'I can identify patterns in data' },
  { id: 47, group: 'Analytical Thinking', text: 'I enjoy logical problem-solving exercises' },
  { id: 48, group: 'Analytical Thinking', text: 'I can break down complex problems into parts' },
  { id: 49, group: 'Analytical Thinking', text: 'I analyze situations before making decisions' },
  { id: 50, group: 'Analytical Thinking', text: 'I enjoy strategic planning activities' },
  { id: 51, group: 'Analytical Thinking', text: 'I can evaluate arguments critically' },
  { id: 52, group: 'Creative Thinking', text: 'I enjoy brainstorming new ideas' },
  { id: 53, group: 'Creative Thinking', text: 'I often think of unconventional solutions' },
  { id: 54, group: 'Creative Thinking', text: 'I enjoy artistic and creative activities' },
  { id: 55, group: 'Creative Thinking', text: 'I like to experiment with new approaches' },
  { id: 56, group: 'Creative Thinking', text: 'I can see connections between unrelated concepts' },
  { id: 57, group: 'Creative Thinking', text: 'I enjoy designing and creating things' },
  { id: 58, group: 'Logical Reasoning', text: 'I enjoy mathematical reasoning' },
  { id: 59, group: 'Logical Reasoning', text: 'I can follow complex sequences of steps' },
  { id: 60, group: 'Logical Reasoning', text: 'I enjoy debugging and finding errors' },
  { id: 61, group: 'Logical Reasoning', text: 'I can construct valid arguments' },
  { id: 62, group: 'Logical Reasoning', text: 'I enjoy number patterns and sequences' },
  { id: 63, group: 'Logical Reasoning', text: 'I can think through problems step by step' },
  { id: 64, group: 'Logical Reasoning', text: 'I enjoy chess or strategic games' },
  { id: 65, group: 'Logical Reasoning', text: 'I can evaluate the validity of reasoning' }
]

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState(INITIAL_FORM_DATA)
  const [userId, setUserId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        // Optionally fetch existing draft
        const { data: profile } = await supabase
          .from('student_profiles')
          .select('*')
          .eq('student_id', user.id)
          .maybeSingle()
        
        if (profile && profile.data) {
          setFormData(profile.data)
        }
      } else {
        router.push('/login')
      }
    }
    getUser()
  }, [supabase, router])

  const saveDraft = async (isComplete = false) => {
    if (!userId) return
    setSaving(true)
    setError('')
    try {
      const response = await fetch('/api/student/save-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: userId,
          data: formData,
          is_complete: isComplete
        })
      })
      if (!response.ok) throw new Error('Failed to save')
      if (isComplete) {
        router.push('/mentee/join-class')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      saveDraft(false)
      setCurrentStep(prev => Math.min(prev + 1, 9))
    }
  }

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const validateStep = (step: number) => {
    if (step === 1) {
      const { full_name, roll_number, branch, section, mobile } = formData.identity
      if (!full_name || !roll_number || !branch || !section || !mobile) {
        setError('Please fill in all required fields')
        return false
      }
    }
    if (step === 2) {
      if (!formData.family.father.name) {
        setError("Father's name is required")
        return false
      }
    }
    if (step === 5) {
      if (!formData.goals.academic.goal_statement) {
        setError("Academic goal statement is required")
        return false
      }
    }
    // Add more validation as needed
    setError('')
    return true
  }

  const updateFormData = (path: string, value: any) => {
    const keys = path.split('.')
    setFormData(prev => {
      const newData = { ...prev }
      let current: any = newData
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]]
      }
      current[keys[keys.length - 1]] = value
      return newData
    })
  }

  const renderStepHeader = () => {
    const progress = ((currentStep - 1) / 8) * 100
    return (
      <div className="mb-8">
        <div className="flex justify-between items-end mb-2">
          <h2 className="text-[#111116] text-xl font-bold">
            Step {currentStep} of 9 — {STEPS[currentStep - 1]}
          </h2>
          <span className="text-[13px] text-[#9090a0]">
            {Math.round(progress)}% Complete
          </span>
        </div>
        <div className="w-full bg-[#e4e4e9] rounded-full h-2">
          <div 
            className="bg-[#4f6ef7] h-2 rounded-full transition-all duration-500" 
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    )
  }

  const renderButtons = () => (
    <div className="flex justify-between mt-8 pt-6 border-t border-[#e4e4e9]">
      <button
        onClick={handleBack}
        disabled={currentStep === 1 || saving}
        className={`px-6 py-2 rounded-xl border border-[#d1d1db] text-[#111116] transition-colors ${
          currentStep === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#f8f8fb]'
        }`}
      >
        Previous
      </button>
      {currentStep === 9 ? (
        <button
          onClick={() => saveDraft(true)}
          disabled={saving}
          className="px-6 py-2 bg-[#4f6ef7] hover:bg-[#3d5ce8] text-white rounded-xl font-medium transition-colors disabled:opacity-50"
        >
          {saving ? 'Submitting...' : 'Complete Onboarding'}
        </button>
      ) : (
        <button
          onClick={handleNext}
          disabled={saving}
          className="px-6 py-2 bg-[#4f6ef7] hover:bg-[#3d5ce8] text-white rounded-xl font-medium transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Next Step'}
        </button>
      )}
    </div>
  )

  const renderIdentity = () => (
    <div className="space-y-4">
      <div>
        <label className="text-[13px] font-semibold text-[#52525e] mb-1 block">Full Name *</label>
        <input 
          className="bg-[#fcfcfd] border border-[#e4e4e9] rounded-lg focus:border-[#4f6ef7] focus:outline-none px-3 py-2 text-[#111116] w-full"
          value={formData.identity.full_name}
          onChange={e => updateFormData('identity.full_name', e.target.value)}
          placeholder="Enter your full name"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[13px] font-semibold text-[#52525e] mb-1 block">Roll Number *</label>
          <input 
            className="bg-[#fcfcfd] border border-[#e4e4e9] rounded-lg focus:border-[#4f6ef7] focus:outline-none px-3 py-2 text-[#111116] w-full"
            value={formData.identity.roll_number}
            onChange={e => updateFormData('identity.roll_number', e.target.value)}
            placeholder="e.g. 21XX1A0501"
          />
        </div>
        <div>
          <label className="text-[13px] font-semibold text-[#52525e] mb-1 block">Branch *</label>
          <input 
            className="bg-[#fcfcfd] border border-[#e4e4e9] rounded-lg focus:border-[#4f6ef7] focus:outline-none px-3 py-2 text-[#111116] w-full"
            value={formData.identity.branch}
            onChange={e => updateFormData('identity.branch', e.target.value)}
            placeholder="e.g. CSE"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[13px] font-semibold text-[#52525e] mb-1 block">Section *</label>
          <input 
            className="bg-[#fcfcfd] border border-[#e4e4e9] rounded-lg focus:border-[#4f6ef7] focus:outline-none px-3 py-2 text-[#111116] w-full"
            value={formData.identity.section}
            onChange={e => updateFormData('identity.section', e.target.value)}
            placeholder="e.g. A"
          />
        </div>
        <div>
          <label className="text-[13px] font-semibold text-[#52525e] mb-1 block">Mobile *</label>
          <input 
            className="bg-[#fcfcfd] border border-[#e4e4e9] rounded-lg focus:border-[#4f6ef7] focus:outline-none px-3 py-2 text-[#111116] w-full"
            value={formData.identity.mobile}
            onChange={e => updateFormData('identity.mobile', e.target.value)}
            placeholder="Phone number"
          />
        </div>
      </div>
      <div>
        <label className="text-[13px] font-semibold text-[#52525e] mb-1 block">Blood Group</label>
        <input 
          className="bg-[#fcfcfd] border border-[#e4e4e9] rounded-lg focus:border-[#4f6ef7] focus:outline-none px-3 py-2 text-[#111116] w-full"
          value={formData.identity.blood_group}
          onChange={e => updateFormData('identity.blood_group', e.target.value)}
          placeholder="e.g. O+"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[13px] font-semibold text-[#52525e] mb-1 block">ID Mark 1</label>
          <input 
            className="bg-[#fcfcfd] border border-[#e4e4e9] rounded-lg focus:border-[#4f6ef7] focus:outline-none px-3 py-2 text-[#111116] w-full"
            value={formData.identity.identification_mark_1}
            onChange={e => updateFormData('identity.identification_mark_1', e.target.value)}
          />
        </div>
        <div>
          <label className="text-[13px] font-semibold text-[#52525e] mb-1 block">ID Mark 2</label>
          <input 
            className="bg-[#fcfcfd] border border-[#e4e4e9] rounded-lg focus:border-[#4f6ef7] focus:outline-none px-3 py-2 text-[#111116] w-full"
            value={formData.identity.identification_mark_2}
            onChange={e => updateFormData('identity.identification_mark_2', e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="text-[13px] font-semibold text-[#52525e] mb-1 block">Parent Email</label>
        <input 
          type="email"
          className="bg-[#fcfcfd] border border-[#e4e4e9] rounded-lg focus:border-[#4f6ef7] focus:outline-none px-3 py-2 text-[#111116] w-full"
          value={formData.identity.parent_email}
          onChange={e => updateFormData('identity.parent_email', e.target.value)}
          placeholder="parent@example.com"
        />
      </div>
      <div>
        <label className="text-[13px] font-semibold text-[#52525e] mb-1 block">Residential Address</label>
        <textarea 
          className="bg-[#fcfcfd] border border-[#e4e4e9] rounded-lg focus:border-[#4f6ef7] focus:outline-none px-3 py-2 text-[#111116] w-full min-h-[100px]"
          value={formData.identity.residential_address}
          onChange={e => updateFormData('identity.residential_address', e.target.value)}
        />
      </div>
    </div>
  )

  const renderFamily = () => (
    <div className="space-y-8">
      {/* Father */}
      <div>
        <h3 className="text-[#111116] font-bold mb-4 border-b pb-2">Father's Details</h3>
        <div className="space-y-4">
          <div>
            <label className="text-[13px] font-semibold text-[#52525e] mb-1 block">Name *</label>
            <input 
              className="bg-[#fcfcfd] border border-[#e4e4e9] rounded-lg focus:border-[#4f6ef7] focus:outline-none px-3 py-2 text-[#111116] w-full"
              value={formData.family.father.name}
              onChange={e => updateFormData('family.father.name', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[13px] font-semibold text-[#52525e] mb-1 block">Occupation</label>
              <input 
                className="bg-[#fcfcfd] border border-[#e4e4e9] rounded-lg focus:border-[#4f6ef7] focus:outline-none px-3 py-2 text-[#111116] w-full"
                value={formData.family.father.occupation}
                onChange={e => updateFormData('family.father.occupation', e.target.value)}
              />
            </div>
            <div>
              <label className="text-[13px] font-semibold text-[#52525e] mb-1 block">Education</label>
              <input 
                className="bg-[#fcfcfd] border border-[#e4e4e9] rounded-lg focus:border-[#4f6ef7] focus:outline-none px-3 py-2 text-[#111116] w-full"
                value={formData.family.father.education}
                onChange={e => updateFormData('family.father.education', e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-[13px] font-semibold text-[#52525e] mb-1 block">Contact Number</label>
            <input 
              className="bg-[#fcfcfd] border border-[#e4e4e9] rounded-lg focus:border-[#4f6ef7] focus:outline-none px-3 py-2 text-[#111116] w-full"
              value={formData.family.father.contact}
              onChange={e => updateFormData('family.father.contact', e.target.value)}
            />
          </div>
          <div>
            <label className="text-[13px] font-semibold text-[#52525e] mb-1 block">Address</label>
            <textarea 
              className="bg-[#fcfcfd] border border-[#e4e4e9] rounded-lg focus:border-[#4f6ef7] focus:outline-none px-3 py-2 text-[#111116] w-full h-20"
              value={formData.family.father.address}
              onChange={e => updateFormData('family.father.address', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Mother */}
      <div>
        <h3 className="text-[#111116] font-bold mb-4 border-b pb-2">Mother's Details</h3>
        <div className="space-y-4">
          <div>
            <label className="text-[13px] font-semibold text-[#52525e] mb-1 block">Name</label>
            <input 
              className="bg-[#fcfcfd] border border-[#e4e4e9] rounded-lg focus:border-[#4f6ef7] focus:outline-none px-3 py-2 text-[#111116] w-full"
              value={formData.family.mother.name}
              onChange={e => updateFormData('family.mother.name', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[13px] font-semibold text-[#52525e] mb-1 block">Occupation</label>
              <input 
                className="bg-[#fcfcfd] border border-[#e4e4e9] rounded-lg focus:border-[#4f6ef7] focus:outline-none px-3 py-2 text-[#111116] w-full"
                value={formData.family.mother.occupation}
                onChange={e => updateFormData('family.mother.occupation', e.target.value)}
              />
            </div>
            <div>
              <label className="text-[13px] font-semibold text-[#52525e] mb-1 block">Education</label>
              <input 
                className="bg-[#fcfcfd] border border-[#e4e4e9] rounded-lg focus:border-[#4f6ef7] focus:outline-none px-3 py-2 text-[#111116] w-full"
                value={formData.family.mother.education}
                onChange={e => updateFormData('family.mother.education', e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-[13px] font-semibold text-[#52525e] mb-1 block">Contact Number</label>
            <input 
              className="bg-[#fcfcfd] border border-[#e4e4e9] rounded-lg focus:border-[#4f6ef7] focus:outline-none px-3 py-2 text-[#111116] w-full"
              value={formData.family.mother.contact}
              onChange={e => updateFormData('family.mother.contact', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Local Guardian */}
      <details className="group">
        <summary className="text-[#111116] font-bold mb-4 border-b pb-2 cursor-pointer list-none flex justify-between items-center">
          Local Guardian (Optional)
          <span className="group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="space-y-4 pt-4">
          <div>
            <label className="text-[13px] font-semibold text-[#52525e] mb-1 block">Name</label>
            <input 
              className="bg-[#fcfcfd] border border-[#e4e4e9] rounded-lg focus:border-[#4f6ef7] focus:outline-none px-3 py-2 text-[#111116] w-full"
              value={formData.family.local_guardian.name}
              onChange={e => updateFormData('family.local_guardian.name', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[13px] font-semibold text-[#52525e] mb-1 block">Occupation</label>
              <input 
                className="bg-[#fcfcfd] border border-[#e4e4e9] rounded-lg focus:border-[#4f6ef7] focus:outline-none px-3 py-2 text-[#111116] w-full"
                value={formData.family.local_guardian.occupation}
                onChange={e => updateFormData('family.local_guardian.occupation', e.target.value)}
              />
            </div>
            <div>
              <label className="text-[13px] font-semibold text-[#52525e] mb-1 block">Education</label>
              <input 
                className="bg-[#fcfcfd] border border-[#e4e4e9] rounded-lg focus:border-[#4f6ef7] focus:outline-none px-3 py-2 text-[#111116] w-full"
                value={formData.family.local_guardian.education}
                onChange={e => updateFormData('family.local_guardian.education', e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-[13px] font-semibold text-[#52525e] mb-1 block">Contact Number</label>
            <input 
              className="bg-[#fcfcfd] border border-[#e4e4e9] rounded-lg focus:border-[#4f6ef7] focus:outline-none px-3 py-2 text-[#111116] w-full"
              value={formData.family.local_guardian.contact}
              onChange={e => updateFormData('family.local_guardian.contact', e.target.value)}
            />
          </div>
          <div>
            <label className="text-[13px] font-semibold text-[#52525e] mb-1 block">Address</label>
            <textarea 
              className="bg-[#fcfcfd] border border-[#e4e4e9] rounded-lg focus:border-[#4f6ef7] focus:outline-none px-3 py-2 text-[#111116] w-full h-20"
              value={formData.family.local_guardian.address}
              onChange={e => updateFormData('family.local_guardian.address', e.target.value)}
            />
          </div>
        </div>
      </details>
    </div>
  )

  const renderAdmission = () => (
    <div className="space-y-4">
      <div>
        <label className="text-[13px] font-semibold text-[#52525e] mb-1 block">Entrance Exam</label>
        <select 
          className="bg-[#fcfcfd] border border-[#e4e4e9] rounded-lg focus:border-[#4f6ef7] focus:outline-none px-3 py-2 text-[#111116] w-full"
          value={formData.admission.entrance_exam}
          onChange={e => updateFormData('admission.entrance_exam', e.target.value)}
        >
          <option value="EAMCET">EAMCET</option>
          <option value="ECET">ECET</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div>
        <label className="text-[13px] font-semibold text-[#52525e] mb-1 block">Rank</label>
        <input 
          type="number"
          className="bg-[#fcfcfd] border border-[#e4e4e9] rounded-lg focus:border-[#4f6ef7] focus:outline-none px-3 py-2 text-[#111116] w-full"
          value={formData.admission.rank}
          onChange={e => updateFormData('admission.rank', e.target.value)}
        />
      </div>
      <div>
        <label className="text-[13px] font-semibold text-[#52525e] mb-1 block">Quota</label>
        <select 
          className="bg-[#fcfcfd] border border-[#e4e4e9] rounded-lg focus:border-[#4f6ef7] focus:outline-none px-3 py-2 text-[#111116] w-full"
          value={formData.admission.quota}
          onChange={e => updateFormData('admission.quota', e.target.value)}
        >
          <option value="Convenor">Convenor</option>
          <option value="Management">Management</option>
          <option value="NRI">NRI</option>
        </select>
      </div>
      <div>
        <label className="text-[13px] font-semibold text-[#52525e] mb-1 block">Category</label>
        <select 
          className="bg-[#fcfcfd] border border-[#e4e4e9] rounded-lg focus:border-[#4f6ef7] focus:outline-none px-3 py-2 text-[#111116] w-full"
          value={formData.admission.category}
          onChange={e => updateFormData('admission.category', e.target.value)}
        >
          {['OC', 'BC', 'SC', 'ST', 'EWS', 'Sports', 'NCC', 'PH'].map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
    </div>
  )

  const renderPreEngineering = () => {
    const addRow = () => {
      setFormData(prev => ({
        ...prev,
        pre_engineering_record: [
          ...prev.pre_engineering_record,
          { level: '12th', board: '', subjects: '', year_of_passing: '', percentage: '', class_grade: '', medium: '' }
        ]
      }))
    }

    const removeRow = (index: number) => {
      setFormData(prev => ({
        ...prev,
        pre_engineering_record: prev.pre_engineering_record.filter((_, i) => i !== index)
      }))
    }

    const updateRow = (index: number, field: string, value: any) => {
      setFormData(prev => {
        const newRecord = [...prev.pre_engineering_record]
        newRecord[index] = { ...newRecord[index], [field]: value }
        return { ...prev, pre_engineering_record: newRecord }
      })
    }

    return (
      <div className="space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#e4e4e9]">
                <th className="py-2 text-[13px] font-semibold text-[#52525e]">Level</th>
                <th className="py-2 text-[13px] font-semibold text-[#52525e]">Board</th>
                <th className="py-2 text-[13px] font-semibold text-[#52525e]">Year</th>
                <th className="py-2 text-[13px] font-semibold text-[#52525e]">%</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {formData.pre_engineering_record.map((row, i) => (
                <tr key={i} className="border-b border-[#e4e4e9]">
                  <td className="py-2 pr-2">
                    <select 
                      className="bg-[#fcfcfd] border border-[#e4e4e9] rounded-lg px-2 py-1 text-sm w-full"
                      value={row.level}
                      onChange={e => updateRow(i, 'level', e.target.value)}
                    >
                      <option value="10th">10th</option>
                      <option value="12th">12th</option>
                      <option value="Diploma">Diploma</option>
                    </select>
                  </td>
                  <td className="py-2 pr-2">
                    <input 
                      className="bg-[#fcfcfd] border border-[#e4e4e9] rounded-lg px-2 py-1 text-sm w-full"
                      value={row.board}
                      onChange={e => updateRow(i, 'board', e.target.value)}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input 
                      className="bg-[#fcfcfd] border border-[#e4e4e9] rounded-lg px-2 py-1 text-sm w-full"
                      value={row.year_of_passing}
                      onChange={e => updateRow(i, 'year_of_passing', e.target.value)}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input 
                      className="bg-[#fcfcfd] border border-[#e4e4e9] rounded-lg px-2 py-1 text-sm w-full"
                      value={row.percentage}
                      onChange={e => updateRow(i, 'percentage', e.target.value)}
                    />
                  </td>
                  <td className="py-2">
                    <button 
                      onClick={() => removeRow(i)}
                      className="text-red-500 hover:bg-red-50 p-1 rounded"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button 
          onClick={addRow}
          className="text-[#4f6ef7] text-sm font-semibold hover:underline"
        >
          + Add Row
        </button>
      </div>
    )
  }

  const renderGoals = () => (
    <div className="space-y-8">
      {/* Academic Goals */}
      <div>
        <h3 className="text-[#111116] font-bold mb-4 border-b pb-2">Academic Goals</h3>
        <div className="space-y-4">
          <div>
            <label className="text-[13px] font-semibold text-[#52525e] mb-1 block">Goal Statement *</label>
            <textarea 
              className="bg-[#fcfcfd] border border-[#e4e4e9] rounded-lg focus:border-[#4f6ef7] focus:outline-none px-3 py-2 text-[#111116] w-full h-20"
              value={formData.goals.academic.goal_statement}
              onChange={e => updateFormData('goals.academic.goal_statement', e.target.value)}
            />
          </div>
          <div>
            <label className="text-[13px] font-semibold text-[#52525e] mb-1 block">Activities Planned</label>
            <textarea 
              className="bg-[#fcfcfd] border border-[#e4e4e9] rounded-lg focus:border-[#4f6ef7] focus:outline-none px-3 py-2 text-[#111116] w-full h-20"
              value={formData.goals.academic.activities_planned}
              onChange={e => updateFormData('goals.academic.activities_planned', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Personal Goals */}
      <div>
        <h3 className="text-[#111116] font-bold mb-4 border-b pb-2">Personal Goals</h3>
        <div className="space-y-4">
          <div>
            <label className="text-[13px] font-semibold text-[#52525e] mb-1 block">Goal Statement</label>
            <textarea 
              className="bg-[#fcfcfd] border border-[#e4e4e9] rounded-lg focus:border-[#4f6ef7] focus:outline-none px-3 py-2 text-[#111116] w-full h-20"
              value={formData.goals.personal.goal_statement}
              onChange={e => updateFormData('goals.personal.goal_statement', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Additional */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[13px] font-semibold text-[#52525e] mb-1 block">Best Talent 1</label>
          <input 
            className="bg-[#fcfcfd] border border-[#e4e4e9] rounded-lg focus:border-[#4f6ef7] focus:outline-none px-3 py-2 text-[#111116] w-full"
            value={formData.goals.best_talent_1}
            onChange={e => updateFormData('goals.best_talent_1', e.target.value)}
          />
        </div>
        <div>
          <label className="text-[13px] font-semibold text-[#52525e] mb-1 block">Best Talent 2</label>
          <input 
            className="bg-[#fcfcfd] border border-[#e4e4e9] rounded-lg focus:border-[#4f6ef7] focus:outline-none px-3 py-2 text-[#111116] w-full"
            value={formData.goals.best_talent_2}
            onChange={e => updateFormData('goals.best_talent_2', e.target.value)}
          />
        </div>
      </div>
    </div>
  )

  const renderSelfAssessment = () => {
    const ratings = ['Excellent', 'Very Good', 'Good', 'Satisfactory', 'Unable to Judge']
    
    const updateRating = (index: number, rating: string) => {
      const newQualities = [...formData.self_assessment.career_qualities]
      newQualities[index].rating = rating
      updateFormData('self_assessment.career_qualities', newQualities)
    }

    return (
      <div className="space-y-6">
        <div>
          <label className="text-[13px] font-semibold text-[#52525e] mb-1 block">Strengths</label>
          <textarea 
            className="bg-[#fcfcfd] border border-[#e4e4e9] rounded-lg focus:border-[#4f6ef7] focus:outline-none px-3 py-2 text-[#111116] w-full h-20"
            value={formData.self_assessment.strengths}
            onChange={e => updateFormData('self_assessment.strengths', e.target.value)}
          />
        </div>
        <div>
          <label className="text-[13px] font-semibold text-[#52525e] mb-1 block">Weaknesses</label>
          <textarea 
            className="bg-[#fcfcfd] border border-[#e4e4e9] rounded-lg focus:border-[#4f6ef7] focus:outline-none px-3 py-2 text-[#111116] w-full h-20"
            value={formData.self_assessment.weaknesses}
            onChange={e => updateFormData('self_assessment.weaknesses', e.target.value)}
          />
        </div>

        <div>
          <label className="text-[13px] font-semibold text-[#52525e] mb-4 block">Career Qualities Rating</label>
          <div className="space-y-6">
            {formData.self_assessment.career_qualities.map((q, i) => (
              <div key={q.skill}>
                <p className="text-sm font-medium text-[#111116] mb-2">{q.skill}</p>
                <div className="flex flex-wrap gap-2">
                  {ratings.map(r => (
                    <button
                      key={r}
                      onClick={() => updateRating(i, r)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        q.rating === r 
                          ? 'bg-[#4f6ef7] border-[#4f6ef7] text-white' 
                          : 'bg-white border-[#d1d1db] text-[#52525e] hover:bg-[#f8f8fb]'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const renderInterests = () => {
    const clubs = [
      'AICHE', 'ARC', 'ASTRO', 'BIO', 'CHESS', 'CRICKET', 'CSI', 'DANCE', 
      'DRAMA', 'ECO', 'EEE', 'FOOD', 'IEEE', 'IETE', 'ISA', 'ISTE', 
      'LITERATURE', 'MATHS', 'MUSIC', 'PHOTOGRAPHY', 'QUIZ', 'ROBOTICS', 'SAE', 'SPORTS'
    ]
    const profBodies = ['IEEE', 'ISTE', 'IETE', 'CSI', 'SAE', 'ICI']

    const toggleItem = (field: string, item: string) => {
      const current = (formData.interests as any)[field] || []
      const next = current.includes(item) 
        ? current.filter((i: string) => i !== item)
        : [...current, item]
      updateFormData(`interests.${field}`, next)
    }

    return (
      <div className="space-y-8">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[13px] font-semibold text-[#52525e] mb-1 block">Mode of Transport</label>
            <input 
              className="bg-[#fcfcfd] border border-[#e4e4e9] rounded-lg focus:border-[#4f6ef7] focus:outline-none px-3 py-2 text-[#111116] w-full"
              value={formData.interests.transport_mode}
              onChange={e => updateFormData('interests.transport_mode', e.target.value)}
              placeholder="e.g. College Bus, Personal"
            />
          </div>
          <div>
            <label className="text-[13px] font-semibold text-[#52525e] mb-1 block">Hobbies</label>
            <input 
              className="bg-[#fcfcfd] border border-[#e4e4e9] rounded-lg focus:border-[#4f6ef7] focus:outline-none px-3 py-2 text-[#111116] w-full"
              value={formData.interests.hobbies}
              onChange={e => updateFormData('interests.hobbies', e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="text-[13px] font-semibold text-[#52525e] mb-3 block">Club Memberships</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {clubs.map(club => (
              <label key={club} className="flex items-center space-x-2 text-sm text-[#52525e] cursor-pointer">
                <input 
                  type="checkbox"
                  className="rounded border-[#d1d1db] text-[#4f6ef7] focus:ring-[#4f6ef7]"
                  checked={formData.interests.club_memberships.includes(club as never)}
                  onChange={() => toggleItem('club_memberships', club)}
                />
                <span>{club}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[13px] font-semibold text-[#52525e] mb-2 block">Interested in organizing events?</label>
          <div className="flex gap-2">
            {[true, false].map(val => (
              <button
                key={val ? 'yes' : 'no'}
                onClick={() => updateFormData('interests.interested_in_organising', val)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  formData.interests.interested_in_organising === val
                    ? 'bg-[#4f6ef7] border-[#4f6ef7] text-white'
                    : 'bg-white border-[#d1d1db] text-[#52525e] hover:bg-[#f8f8fb]'
                }`}
              >
                {val ? 'Yes' : 'No'}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const renderGeneralOnboarding = () => (
    <div className="space-y-6">
      <div>
        <label className="text-[13px] font-semibold text-[#52525e] mb-2 block">Is home atmosphere suitable for studies?</label>
        <div className="flex gap-2">
          {[true, false].map(val => (
            <button
              key={val ? 'yes' : 'no'}
              onClick={() => updateFormData('general_onboarding.home_atmosphere_suitable', val)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                formData.general_onboarding.home_atmosphere_suitable === val
                  ? 'bg-[#4f6ef7] border-[#4f6ef7] text-white'
                  : 'bg-white border-[#d1d1db] text-[#52525e] hover:bg-[#f8f8fb]'
              }`}
            >
              {val ? 'Yes' : 'No'}
            </button>
          ))}
        </div>
      </div>

      {formData.general_onboarding.home_atmosphere_suitable === false && (
        <div>
          <label className="text-[13px] font-semibold text-[#52525e] mb-1 block">What support is needed at home?</label>
          <textarea 
            className="bg-[#fcfcfd] border border-[#e4e4e9] rounded-lg focus:border-[#4f6ef7] focus:outline-none px-3 py-2 text-[#111116] w-full h-20"
            value={formData.general_onboarding.home_support_needed}
            onChange={e => updateFormData('general_onboarding.home_support_needed', e.target.value)}
          />
        </div>
      )}

      <div>
        <label className="text-[13px] font-semibold text-[#52525e] mb-2 block">Experienced any ragging?</label>
        <div className="flex gap-2">
          {[true, false].map(val => (
            <button
              key={val ? 'yes' : 'no'}
              onClick={() => updateFormData('general_onboarding.ragging_experienced', val)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                formData.general_onboarding.ragging_experienced === val
                  ? 'bg-[#4f6ef7] border-[#4f6ef7] text-white'
                  : 'bg-white border-[#d1d1db] text-[#52525e] hover:bg-[#f8f8fb]'
              }`}
            >
              {val ? 'Yes' : 'No'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[13px] font-semibold text-[#52525e] mb-2 block">Determined to be an engineer?</label>
        <div className="flex gap-2">
          {[true, false].map(val => (
            <button
              key={val ? 'yes' : 'no'}
              onClick={() => updateFormData('general_onboarding.determined_to_be_engineer', val)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                formData.general_onboarding.determined_to_be_engineer === val
                  ? 'bg-[#4f6ef7] border-[#4f6ef7] text-white'
                  : 'bg-white border-[#d1d1db] text-[#52525e] hover:bg-[#f8f8fb]'
              }`}
            >
              {val ? 'Yes' : 'No'}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  const renderPsychometric = () => {
    const answeredCount = formData.psychometric.filter((q: any) => q.answer !== null).length
    const groups = Array.from(new Set(PSYCHOMETRIC_QUESTIONS.map(q => q.group)))

    const updateAnswer = (question_id: number, aspect_category: string, question_text: string, answer: string) => {
      setFormData(f => ({
        ...f,
        psychometric: [
          ...((f.psychometric as any[]).filter((q: any) => q.question_id !== question_id)),
          { question_id, aspect_category, question_text, answer }
        ]
      }))
    }

    return (
      <div className="space-y-12">
        <div className="sticky top-0 bg-white pt-2 pb-4 border-b border-[#e4e4e9] z-10">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-medium text-[#111116]">Questions Answered</p>
            <p className="text-sm font-bold text-[#4f6ef7]">{answeredCount} / 65</p>
          </div>
          <div className="w-full bg-[#e4e4e9] rounded-full h-1.5">
            <div 
              className="bg-[#4f6ef7] h-1.5 rounded-full transition-all" 
              style={{ width: `${(answeredCount / 65) * 100}%` }}
            />
          </div>
        </div>

        {groups.map(group => (
          <div key={group} className="space-y-6">
            <h3 className="text-[#111116] font-bold text-lg sticky top-16 bg-white py-2 z-10 border-b border-[#f4f4f6]">
              {group}
            </h3>
            <div className="space-y-8">
              {PSYCHOMETRIC_QUESTIONS.filter(q => q.group === group).map(q => {
                const answer = formData.psychometric.find((pq: any) => pq.question_id === q.id)?.answer
                return (
                  <div key={q.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <p className="text-[#111116] text-[15px] leading-relaxed">
                      {q.id}. {q.text}
                    </p>
                    <div className="flex gap-2 shrink-0">
                      {['Yes', 'No'].map(choice => (
                        <button
                          key={choice}
                          onClick={() => updateAnswer(q.id, q.group, q.text, choice)}
                          className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors min-w-[60px] ${
                            answer === choice
                              ? 'bg-[#4f6ef7] border-[#4f6ef7] text-white'
                              : 'bg-white border-[#d1d1db] text-[#52525e] hover:bg-[#f8f8fb]'
                          }`}
                        >
                          {choice}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1: return renderIdentity()
      case 2: return renderFamily()
      case 3: return renderAdmission()
      case 4: return renderPreEngineering()
      case 5: return renderGoals()
      case 6: return renderSelfAssessment()
      case 7: return renderInterests()
      case 8: return renderGeneralOnboarding()
      case 9: return renderPsychometric()
      default: return null
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f4f6] pb-20">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white border border-[#e4e4e9] rounded-2xl shadow-sm p-8">
          {renderStepHeader()}
          
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg">
              {error}
            </div>
          )}

          {renderStepContent()}
          {renderButtons()}
        </div>
      </div>
    </div>
  )
}
