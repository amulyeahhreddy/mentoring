'use client';

import { useState } from 'react';

interface ProcessingStep {
  id: string;
  label: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
}

export default function TestPipeline() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sessionId, setSessionId] = useState('');
  const [steps, setSteps] = useState<ProcessingStep[]>([
    { id: 'upload', label: 'Uploading', status: 'pending' },
    { id: 'transcribe', label: 'Transcribing', status: 'pending' },
    { id: 'extract', label: 'Extracting', status: 'pending' },
    { id: 'done', label: 'Done', status: 'pending' }
  ]);
  const [transcript, setTranscript] = useState('');
  const [aiOutput, setAiOutput] = useState<any>(null);
  const [error, setError] = useState('');

  const updateStepStatus = (stepId: string, status: ProcessingStep['status']) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status } : step
    ));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError('');
    }
  };

  const handleUploadAndProcess = async () => {
    if (!selectedFile || !sessionId) {
      setError('Please select a file and enter a session ID');
      return;
    }

    // Reset state
    setError('');
    setTranscript('');
    setAiOutput(null);
    setSteps(prev => prev.map(step => ({ ...step, status: 'pending' as const })));

    try {
      // Step 1: Upload audio
      updateStepStatus('upload', 'processing');
      const formData = new FormData();
      formData.append('audio_file', selectedFile);
      formData.append('session_id', sessionId);

      const uploadResponse = await fetch('/api/session/upload-audio', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const uploadResult = await uploadResponse.json();
      updateStepStatus('upload', 'completed');

      // Step 2: Process audio (transcribe + extract insights)
      updateStepStatus('transcribe', 'processing');
      
      const processResponse = await fetch('/api/session/process-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId
        })
      });

      if (!processResponse.ok) {
        const errorData = await processResponse.json();
        throw new Error(errorData.error || 'Processing failed');
      }

      const processResult = await processResponse.json();
      updateStepStatus('transcribe', 'completed');
      updateStepStatus('extract', 'processing');

      setTranscript(processResult.transcript);
      setAiOutput(processResult.ai_output);
      
      updateStepStatus('extract', 'completed');
      updateStepStatus('done', 'completed');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      
      // Mark current step as error
      const currentStep = steps.find(s => s.status === 'processing');
      if (currentStep) {
        updateStepStatus(currentStep.id, 'error');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Audio Pipeline Test</h1>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> Make sure GROQ_API_KEY is set in .env.local
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="audio-file" className="block text-sm font-medium text-gray-700 mb-2">
                Audio File
              </label>
              <input
                id="audio-file"
                type="file"
                accept="audio/*,video/mp4"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            <div>
              <label htmlFor="session-id" className="block text-sm font-medium text-gray-700 mb-2">
                Session ID
              </label>
              <input
                id="session-id"
                type="text"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                placeholder="e.g., 12345678-1234-1234-1234-123456789012"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            <button
              onClick={handleUploadAndProcess}
              disabled={!selectedFile || !sessionId || steps.some(s => s.status === 'processing')}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {steps.some(s => s.status === 'processing') ? 'Processing...' : 'Upload & Process'}
            </button>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Progress</h2>
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step.status === 'completed' ? 'bg-green-100 text-green-800' :
                  step.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                  step.status === 'error' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {step.status === 'completed' ? '✓' :
                   step.status === 'processing' ? '⟳' :
                   step.status === 'error' ? '✗' :
                   index + 1}
                </div>
                <span className={`ml-2 text-sm ${
                  step.status === 'completed' ? 'text-green-800' :
                  step.status === 'processing' ? 'text-blue-800' :
                  step.status === 'error' ? 'text-red-800' :
                  'text-gray-500'
                }`}>
                  {step.label}
                </span>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-px mx-4 ${
                    step.status === 'completed' ? 'bg-green-300' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Transcript Display */}
        {transcript && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Transcript</h2>
            <div className="bg-gray-50 rounded-md p-4 max-h-64 overflow-y-auto">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{transcript}</p>
            </div>
          </div>
        )}

        {/* AI Output Display */}
        {aiOutput && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">AI Output</h2>
            <div className="bg-gray-50 rounded-md p-4 max-h-96 overflow-y-auto">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                {JSON.stringify(aiOutput, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
