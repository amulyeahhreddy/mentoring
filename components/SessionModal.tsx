"use client"

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { MentoringSession } from '@/lib/types'

interface SessionModalProps {
  isOpen: boolean
  onClose: () => void
  student: {
    id: string
    email: string
  }
  onSessionCreated: () => void
}

export default function SessionModal({ isOpen, onClose, student, onSessionCreated }: SessionModalProps) {
  const [transcript, setTranscript] = useState('')
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const processTranscript = async (text: string): Promise<MentoringSession> => {
    // This is a placeholder for the existing AI pipeline
    // Replace with actual call to your AI processing function
    const response = await fetch('/api/process-transcript', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transcript: text }),
    })

    if (!response.ok) {
      throw new Error('Failed to process transcript')
    }

    return response.json()
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith(".txt")) {
      alert("Please upload a .txt file")
      return
    }

    const reader = new FileReader()

    reader.onload = (e) => {
      const text = e.target?.result as string
      setTranscript(text)
      setFileName(file.name)
    }

    reader.readAsText(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!transcript.trim()) {
      setError('Please upload a transcript file or enter transcript text')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Get current mentor
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        setError('User not authenticated')
        return
      }

      // Process transcript through AI
      const structuredData = await processTranscript(transcript)

      // Save session to database
      const { error: insertError } = await supabase
        .from('sessions')
        .insert({
          student_id: student.id,
          mentor_id: userData.user.id,
          transcript: transcript.trim(),
          structured_json: structuredData
        })

      if (insertError) {
        setError('Failed to save session: ' + insertError.message)
        return
      }

      // Reset form and close modal
      setTranscript('')
      setFileName('')
      onClose()
      onSessionCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-semibold">New Session</h2>
              <p className="text-sm text-gray-600 mt-1">Student: {student.email}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="transcript-file" className="block text-sm font-medium text-gray-700 mb-2">
                Session Transcript File
              </label>
              <input
                id="transcript-file"
                type="file"
                accept=".txt"
                onChange={handleFileUpload}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
              
              {fileName && (
                <p className="text-sm text-green-600 mt-2">
                  Uploaded: {fileName}
                </p>
              )}
              
              {/* Optional: Keep textarea as fallback for manual input */}
              {/* 
              <div className="mt-4">
                <label htmlFor="transcript" className="block text-sm font-medium text-gray-700 mb-2">
                  Or paste transcript manually:
                </label>
                <textarea
                  id="transcript"
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Paste or type the session transcript here..."
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              */}
            </div>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded">
                {error}
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !transcript.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Process Session'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
