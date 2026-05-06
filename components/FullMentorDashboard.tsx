'use client';

import { useState, useEffect, useMemo } from 'react'
import { MentoringSession } from '@/lib/types'
import { supabase } from '@/lib/supabase'

// Constants for localStorage (will be replaced with Supabase)
const STORAGE_KEY = 'mentoring_sessions'
const USERS_STORAGE_KEY = 'mentoring_users'
const TASKS_STORAGE_KEY = 'mentoring_tasks'

// Type definitions
interface Task {
  id: string
  student_id: string
  session_id: string
  text: string
  status: "pending" | "completed"
  created_at: string
}

interface StudentMetrics {
  student_id: string
  totalSessions: number
  lastSessionDate: string | null
  daysSinceLastSession: number | null
  pendingTasksCount: number
  completedTasksCount: number
  latestSentiment: string | null
  status: "needs_attention" | "active"
  alertReasons: string[]
}

interface StudentReport {
  studentName: string
  studentId: string
  generatedDate: string
  totalSessions: number
  lastSessionDate: string | null
  status: "needs_attention" | "active"
  alertReasons: string[]
  allIssuesDiscussed: string[]
  allAcademicConcerns: string[]
  allPersonalConcerns: string[]
  allSuggestions: string[]
  totalTasks: number
  pendingTasks: Task[]
  completedTasks: Task[]
  sentimentHistory: Array<{ date: string; sentiment: "positive" | "neutral" | "negative" }>
  overallSentiment: "positive" | "neutral" | "negative" | "mixed"
  sessionSummaries: Array<{ date: string; category: string; summary: string }>
}

interface Props {
  users: Array<{ id: string; name: string }>
}

/**
 * Safely renders array items that might be strings or objects
 */
const renderItem = (item: any): string => {
  // If it's already a string, return it
  if (typeof item === "string") return item;
  
  // If it's null or undefined, return empty string
  if (!item) return "";
  
  // Handle object with 'topic' and 'level' keys
  if (item.topic && item.level) {
    return `${item.topic} (Level: ${item.level})`;
  }
  
  // Handle object with 'topic' only
  if (item.topic) {
    return item.topic;
  }
  
  // Handle object with 'text' key
  if (item.text) {
    return item.text;
  }
  
  // Handle object with 'description' key
  if (item.description) {
    return item.description;
  }
  
  // Handle object with 'name' key
  if (item.name) {
    return item.name;
  }
  
  // Fallback: try to stringify or return empty
  try {
    return JSON.stringify(item);
  } catch {
    return "";
  }
};

export default function FullMentorDashboard({ users }: Props) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState("Ready");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<MentoringSession | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState(users[0]?.id || "");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentView, setCurrentView] = useState<"dashboard" | "session">("dashboard");
  const [studentFilter, setStudentFilter] = useState<"all" | "needs_attention" | "active">("all");
  const [taskFilter, setTaskFilter] = useState<"all" | "pending" | "completed">("all");
  const [alertFilter, setAlertFilter] = useState<"all" | "needs_attention" | "active">("all");
  const [showReport, setShowReport] = useState(false);
  const [currentReport, setCurrentReport] = useState<StudentReport | null>(null);

  const maxFileSizeBytes = 25 * 1024 * 1024;
  const allowedExtensions = [".mp3", ".wav", ".m4a", ".webm"];
  const allowedMimeTypes = [
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/mp4",
    "audio/x-m4a",
    "audio/webm",
  ];

  const statusClassName = useMemo(() => {
    if (error) return "text-red-600";
    if (status === "Complete") return "text-green-600";
    if (isProcessing) return "text-blue-600";
    return "text-slate-600";
  }, [error, isProcessing, status]);

  const formatFileSize = (sizeInBytes: number) => {
    const units = ["B", "KB", "MB", "GB"];
    let size = sizeInBytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex += 1;
    }

    return `${size.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
  };

  // Initialize selectedUser when users change
  useEffect(() => {
    if (users.length > 0 && !users.find(u => u.id === selectedUser)) {
      setSelectedUser(users[0].id);
    }
  }, [users, selectedUser]);

  // Supabase functions for data operations
  const readSessionsFromStorage = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return []

      const { data: sessions, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('mentor_id', userData.user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching sessions:', error)
        return []
      }

      return sessions || []
    } catch (error) {
      console.error('Error in readSessionsFromStorage:', error)
      return []
    }
  };

  const readTasksFromStorage = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return []

      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('mentor_id', userData.user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching tasks:', error)
        return []
      }

      return tasks || []
    } catch (error) {
      console.error('Error in readTasksFromStorage:', error)
      return []
    }
  };

  useEffect(() => {
    const loadData = async () => {
      const sessionsData = await readSessionsFromStorage();
      const tasksData = await readTasksFromStorage();
      setSessions(sessionsData);
      setTasks(tasksData);
    };
    loadData();
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    setError(null);
    setResult(null);
    setStatus("Ready");

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const lowerName = file.name.toLowerCase();
    const hasValidExtension = allowedExtensions.some((ext) =>
      lowerName.endsWith(ext)
    );
    const hasValidMime = allowedMimeTypes.includes(file.type);

    if (!hasValidExtension && !hasValidMime) {
      setSelectedFile(null);
      setError(
        "Invalid file type. Please select .mp3, .wav, .m4a, or .webm audio."
      );
      return;
    }

    if (file.size > maxFileSizeBytes) {
      setSelectedFile(null);
      setError("File is too large. Maximum allowed size is 25MB.");
      return;
    }

    setSelectedFile(file);
  };

  const handleProcess = async () => {
    if (isProcessing) return;

    if (!selectedFile) {
      setError("Please select an audio file.");
      setStatus("Error");
      return;
    }

    // Step 0: Validation + reset
    setError(null);
    setResult(null);
    setIsProcessing(true);
    setStatus("Transcribing audio...");

    try {
      // Step 1: Transcribe
      console.log("Starting transcription...");
      const formData = new FormData();
      formData.append("audio", selectedFile);

      const transcribeRes = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });
      const transcribeData = await transcribeRes.json();

      if (!transcribeRes.ok) {
        throw new Error(transcribeData?.error ?? "Failed to transcribe audio.");
      }

      const transcript = transcribeData?.transcript;
      if (!transcript) {
        throw new Error("No transcript returned from transcription API.");
      }
      console.log("Transcript:", transcript);

      // Step 2: Extract
      setStatus("Extracting structured data...");
      console.log("Starting extraction...");
      const extractRes = await fetch("/api/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transcript }),
      });
      const structuredData: MentoringSession = await extractRes.json();

      if (!extractRes.ok) {
        throw new Error(
          (structuredData as { error?: string })?.error ??
            "Failed to extract structured data."
        );
      }

      console.log("Structured Data:", structuredData);

      // Step 3: Finish
      const newSession = {
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        student_id: selectedUser,
        data: structuredData,
      };

      // Extract and create tasks
      const tasksFromSession = (structuredData.mentor_actions?.tasks_assigned || []).map((taskText, index) => ({
        id: crypto.randomUUID(),
        student_id: selectedUser,
        session_id: newSession.id,
        text: taskText,
        status: "pending" as const,
        created_at: new Date().toISOString()
      }));

      try {
        // Store session in Supabase
        const { data: userData } = await supabase.auth.getUser()
        if (!userData.user) throw new Error('User not authenticated')

        // Insert session
        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions')
          .insert({
            student_id: selectedUser,
            mentor_id: userData.user.id,
            transcript: '', // Will be populated by transcription
            structured_json: structuredData
          })
          .select()
          .single()

        if (sessionError) throw sessionError

        // Insert tasks
        const tasksToInsert = tasksFromSession.map(task => ({
          ...task,
          mentor_id: userData.user.id,
          session_id: sessionData.id
        }))

        const { error: tasksError } = await supabase
          .from('tasks')
          .insert(tasksToInsert)

        if (tasksError) throw tasksError

        // Refresh data
        const updatedSessions = await readSessionsFromStorage();
        const updatedTasks = await readTasksFromStorage();
        
        setSessions(updatedSessions);
        setTasks(updatedTasks);
        setSelectedId(sessionData.id);
      } catch (storageError) {
        console.error("Failed to save session:", storageError);
      }

      setResult(structuredData);
      setStatus("Complete");
      setIsProcessing(false);
      console.log("Pipeline complete");
    } catch (error) {
      console.error(error);
      setError(error instanceof Error ? error.message : "Something went wrong");
      setStatus("Error");
      setIsProcessing(false);
    }
  };

  const handleCopyJson = async () => {
    if (!result) return;

    try {
      await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      setStatus("Complete");
    } catch {
      setError("Failed to copy JSON to clipboard.");
      setStatus("Error");
    }
  };

  const handleProcessAnother = () => {
    setSelectedFile(null);
    setError(null);
    setResult(null);
    setSelectedId(null);
    setIsProcessing(false);
    setStatus("Ready");
  };

  const handleUserChange = (newUserId: string) => {
    setSelectedUser(newUserId);
    setResult(null);
    setSelectedId(null);
  };

  const handleSelectSession = (sessionId: string, sessionData: any) => {
    setError(null);
    setSelectedId(sessionId);
    // Extract the structured_json data from Supabase session
    setResult(sessionData.structured_json || sessionData.data);
    setStatus("Complete");
  };

  const handleTaskToggle = async (taskId: string) => {
    try {
      const currentTask = tasks.find(t => t.id === taskId)
      if (!currentTask) return

      const newStatus = currentTask.status === "pending" ? "completed" : "pending"

      // Update in Supabase
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId)

      if (error) throw error

      // Update local state
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId 
            ? { ...task, status: newStatus }
            : task
        )
      );
    } catch (error) {
      console.error('Error updating task:', error)
    }
  };

  const handleClearHistory = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return

      // Delete all sessions and tasks for this mentor
      const { error: sessionsError } = await supabase
        .from('sessions')
        .delete()
        .eq('mentor_id', userData.user.id)

      if (sessionsError) throw sessionsError

      const { error: tasksError } = await supabase
        .from('tasks')
        .delete()
        .eq('mentor_id', userData.user.id)

      if (tasksError) throw tasksError

      // Refresh data
      const updatedSessions = await readSessionsFromStorage();
      const updatedTasks = await readTasksFromStorage();
      
      setSessions(updatedSessions);
      setTasks(updatedTasks);
      setSelectedId(null);
      setResult(null);
    } catch (error) {
      console.error('Error clearing history:', error)
    }
  };

  const getDisplayValue = (item: unknown) => {
    if (typeof item === "string") return item;
    if (item && typeof item === "object") {
      const candidate = item as { description?: unknown; name?: unknown };
      if (typeof candidate.description === "string" && candidate.description.trim()) {
        return candidate.description;
      }
      if (typeof candidate.name === "string" && candidate.name.trim()) {
        return candidate.name;
      }
      return JSON.stringify(item);
    }
    return String(item ?? "");
  };

  const renderList = (items?: unknown[]) => {
    if (!items || items.length === 0) {
      return <p className="text-slate-600">No data available</p>;
    }

    return (
      <ul className="list-disc ml-5">
        {items.map((item, index) => (
          <li key={index} className="text-slate-700">
            {getDisplayValue(item)}
          </li>
        ))}
      </ul>
    );
  };

  const getSentimentClassName = (sentiment?: string) => {
    const normalizedSentiment = sentiment?.toLowerCase();
    if (normalizedSentiment === "negative") return "text-red-500";
    if (normalizedSentiment === "positive") return "text-green-500";
    if (normalizedSentiment === "neutral") return "text-yellow-500";
    return "text-slate-700";
  };

  const computeStudentMetrics = (studentId: string): StudentMetrics => {
    const studentSessions = sessions.filter(s => s.student_id === studentId);
    const studentTasks = tasks.filter(t => t.student_id === studentId);

    const totalSessions = studentSessions.length;
    const lastSession = studentSessions.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];

    const lastSessionDate = lastSession ? lastSession.created_at : null;
    const daysSinceLastSession = lastSessionDate
      ? Math.floor((Date.now() - new Date(lastSessionDate).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const pendingTasksCount = studentTasks.filter(t => t.status === "pending").length;
    const completedTasksCount = studentTasks.filter(t => t.status === "completed").length;

    // Extract sentiment from structured_json or data
    const lastSessionData = lastSession?.structured_json || lastSession?.data || {};
    const latestSentiment = lastSessionData?.student_state?.sentiment || null;

    // Alert logic
    const alertReasons: string[] = [];
    let status: "needs_attention" | "active" = "active";

    if (daysSinceLastSession === null || daysSinceLastSession > 7) {
      alertReasons.push("No session in 7+ days");
      status = "needs_attention";
    }

    if (latestSentiment === "negative") {
      alertReasons.push("Negative sentiment in last session");
      status = "needs_attention";
    }

    if (pendingTasksCount > 3) {
      alertReasons.push(`${pendingTasksCount} pending tasks`);
      status = "needs_attention";
    }

    return {
      student_id: studentId,
      totalSessions,
      lastSessionDate,
      daysSinceLastSession,
      pendingTasksCount,
      completedTasksCount,
      latestSentiment,
      status,
      alertReasons
    };
  };

  // Continue with the rest of the component in the next part...
  return (
    <>
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          
          .page-break-before {
            page-break-before: always;
          }
          
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          * {
            box-shadow: none !important;
          }
        }
      `}</style>
      <main className="flex min-h-screen flex-col bg-slate-50 p-4">
      {/* Header Section */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {currentView === "dashboard" ? "Mentor Dashboard" : "Mentoring Assistant"}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {currentView === "dashboard" 
                ? "Overview of all students and their mentoring status"
                : "Upload an audio file to prepare it for transcription and structured extraction."
              }
            </p>
          </div>
          <div className="flex gap-2">
            {currentView === "session" && (
              <button
                type="button"
                onClick={() => setCurrentView("dashboard")}
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition duration-150 hover:bg-slate-100"
              >
                Back to Dashboard
              </button>
            )}
            <button
              type="button"
              onClick={handleProcessAnother}
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition duration-150 hover:bg-slate-100"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Audio Processing Section - Only show in session view */}
        {currentView === "session" && (
          <>
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-center">
              <input
                id="audioUpload"
                type="file"
                accept=".mp3,.wav,.m4a,.webm,audio/*"
                onChange={handleFileChange}
                className="block w-full cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-4 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
              />
              <button
                type="button"
                onClick={handleProcess}
                disabled={isProcessing}
                className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition duration-150 hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isProcessing ? "Processing..." : "Process Audio"}
              </button>
              <div className="rounded-lg border border-slate-200 bg-white px-4 py-2">
                <p className="text-xs font-medium text-slate-700">Status</p>
                <p className={`text-sm font-semibold ${statusClassName}`}>{status}</p>
              </div>
            </div>

            {selectedFile && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                <p className="font-medium text-slate-900">{selectedFile.name}</p>
                <p className="mt-1 text-slate-600">Size: {formatFileSize(selectedFile.size)}</p>
              </div>
            )}

            {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
          </>
        )}
      </section>

      {/* Dashboard View */}
      {currentView === "dashboard" && (
        <section className="mt-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {/* Filter Controls */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Filter Students</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setStudentFilter("all")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition duration-150 ${
                  studentFilter === "all"
                    ? "bg-blue-500 text-white"
                    : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                }`}
              >
                All Students
              </button>
              <button
                onClick={() => setStudentFilter("needs_attention")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition duration-150 ${
                  studentFilter === "needs_attention"
                    ? "bg-red-500 text-white"
                    : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                }`}
              >
                Needs Attention
              </button>
              <button
                onClick={() => setStudentFilter("active")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition duration-150 ${
                  studentFilter === "active"
                    ? "bg-green-500 text-white"
                    : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                }`}
              >
                Active
              </button>
            </div>
          </div>

          {/* Student Cards Grid */}
          {users.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-600">No students added yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.map((user) => {
                const studentStatus = { status: "active", label: "Active", color: "green" }; // Simplified for now
                const studentSessions = sessions.filter(s => s.student_id === user.id);
                const sessionCount = studentSessions.length;
                const lastSession = studentSessions[0];
                
                return (
                  <button
                    key={user.id}
                    onClick={() => {
                      setSelectedUser(user.id);
                      setCurrentView("session");
                    }}
                    className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 text-left"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-semibold text-slate-900">{user.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        studentStatus.color === "red" 
                          ? "bg-red-100 text-red-700"
                          : "bg-green-100 text-green-700"
                      }`}>
                        {studentStatus.label}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Total Sessions:</span>
                        <span className="text-sm font-medium text-slate-900">{sessionCount}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Last Session:</span>
                        <span className="text-sm font-medium text-slate-900">
                          {lastSession 
                            ? new Date(lastSession.created_at).toLocaleDateString()
                            : "No sessions"
                          }
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Session View - Only show when in session view */}
      {currentView === "session" && (
        <section className="mt-4 flex min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <aside className="w-1/3 h-screen overflow-y-auto border-r border-slate-200 bg-gray-50">
          <div className="sticky top-0 flex items-center justify-between bg-white p-4 font-semibold text-lg border-b border-slate-200">
            <h2 className="text-slate-900">Sessions</h2>
            <button
              type="button"
              onClick={handleClearHistory}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition duration-150 hover:bg-slate-100"
            >
              Clear
            </button>
          </div>

          {/* Analytics Summary */}
          <div className="p-4">
            <div className="mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
              <h3 className="font-semibold text-sm mb-2">Dashboard Overview</h3>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-gray-600">Students</p>
                  <p className="font-bold text-lg">{users.length}</p>
                </div>
                <div>
                  <p className="text-gray-600">Need Attention</p>
                  <p className="font-bold text-lg text-red-600">0</p>
                </div>
                <div>
                  <p className="text-gray-600">Pending Tasks</p>
                  <p className="font-bold text-lg text-orange-600">{tasks.filter(t => t.status === "pending").length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Student Profile Card */}
          <div className="px-4 pb-4">
            <div className="mb-4 bg-white shadow rounded-lg p-4 border border-gray-200">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-lg">
                  {users.find(u => u.id === selectedUser)?.name || "Unknown Student"}
                </h3>
                <span className="text-sm px-3 py-1 rounded-full font-medium bg-green-100 text-green-800">
                  ✓ Active
                </span>
              </div>

              {/* Existing stats */}
              <div className="space-y-1 text-sm text-gray-600">
                <p><span className="font-medium">Total Sessions:</span> {sessions.filter(s => s.student_id === selectedUser).length}</p>
                <p><span className="font-medium">Pending Tasks:</span> {tasks.filter(t => t.student_id === selectedUser && t.status === "pending").length}</p>
                <p><span className="font-medium">Completed Tasks:</span> {tasks.filter(t => t.student_id === selectedUser && t.status === "completed").length}</p>
              </div>
            </div>
          </div>

          {/* All Tasks Section */}
          {tasks.filter(t => t.student_id === selectedUser).length > 0 && (
            <div className="px-4 pb-4">
              <details className="bg-white rounded-lg border border-slate-200 shadow-sm">
                <summary className="p-4 cursor-pointer hover:bg-gray-50">
                  <h4 className="text-sm font-semibold text-slate-900">
                    All Tasks ({tasks.filter(t => t.student_id === selectedUser).length})
                  </h4>
                </summary>
                <div className="border-t border-slate-200">
                  <div className="max-h-64 overflow-y-auto">
                    <div className="divide-y divide-slate-200">
                      {tasks.filter(t => t.student_id === selectedUser).map((task) => {
                        const taskSession = sessions.find(s => s.id === task.session_id);
                        const sessionDate = taskSession 
                          ? new Date(taskSession.created_at).toLocaleDateString()
                          : "Unknown";
                        
                        return (
                          <div 
                            key={task.id} 
                            className="p-3 hover:bg-gray-50 cursor-pointer"
                            onClick={() => {
                              setSelectedId(task.session_id);
                              const sessionData = taskSession?.structured_json || taskSession?.data || null;
                              setResult(sessionData);
                            }}
                          >
                            <div className="flex items-start gap-2">
                              <input
                                type="checkbox"
                                checked={task.status === "completed"}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleTaskToggle(task.id);
                                }}
                                className="mt-1 h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm ${task.status === "completed" ? "line-through text-gray-500" : "text-gray-900"}`}>
                                  {task.text}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  Session {task.session_id?.slice(0, 8) || "Unknown"} • {sessionDate}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </details>
            </div>
          )}

          {sessions.filter(s => s.student_id === selectedUser).length === 0 ? (
            <div className="px-4">
              <p className="text-sm text-slate-600 bg-white rounded-lg border border-slate-200 p-4 text-center">
                No sessions yet for {users.find(u => u.id === selectedUser)?.name || "this student"}
              </p>
            </div>
          ) : (
            <div className="px-4">
              {sessions.filter(s => s.student_id === selectedUser).map((session, index) => {
                const isSelected = selectedId === session.id;
                const sessionData = session.structured_json || session.data || {};
                const summary = sessionData?.summary ?? "No summary available";
                const previewSummary = summary.length > 80 ? `${summary.slice(0, 80)}...` : summary;
                const sessionDate = new Date(session.created_at);
                
                return (
                  <div key={session.id} className="mb-3">
                    <button
                      type="button"
                      onClick={() => handleSelectSession(session.id, session)}
                      className={`w-full rounded-lg border p-4 text-left transition-all duration-200 ${
                        isSelected
                          ? "bg-blue-50 border-blue-500 shadow-md"
                          : "bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm hover:bg-blue-50/30"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">
                            Session {index + 1}
                          </span>
                          <span className="text-xs text-slate-500">
                            ID: {session.id}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500">
                          {sessionDate.toLocaleDateString()} {sessionDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                      <div className="mb-2">
                        <span className="text-sm font-semibold text-slate-900">
                          {sessionData?.session_info?.session_category ?? "general"}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {previewSummary}
                      </p>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </aside>

        <section className="w-2/3 h-screen overflow-y-auto p-4">
          <div className="sticky top-0 z-10 bg-white p-4 font-semibold text-lg border-b border-slate-200">
            Session Report
          </div>
          {result ? (
            <div className="pt-4">
              <div className="mx-auto max-w-3xl space-y-6">
                <div className="bg-white shadow rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-lg text-slate-900">Session Info</h3>
                  <p className="mt-2 text-slate-700">
                    Category: {result.session_info?.session_category ?? "No data available"}
                  </p>
                  {result.session_info?.date && (
                    <p className="text-slate-700">Date: {result.session_info.date}</p>
                  )}
                </div>

                <div className="bg-white shadow rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-lg text-slate-900">Issues Discussed</h3>
                  <div className="mt-2">{renderList(result.discussion?.issues_discussed)}</div>
                </div>

                <div className="bg-white shadow rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-lg text-slate-900">Academic Concerns</h3>
                  <div className="mt-2">{renderList(result.discussion?.academic_concerns)}</div>
                </div>

                <div className="bg-white shadow rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-lg text-slate-900">Personal Concerns</h3>
                  <div className="mt-2">{renderList(result.discussion?.personal_concerns)}</div>
                </div>

                <div className="bg-white shadow rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-lg text-slate-900">Suggestions</h3>
                  <div className="mt-2">{renderList(result.mentor_actions?.suggestions)}</div>
                </div>

                <div className="bg-white shadow rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-lg text-slate-900">Tasks Assigned</h3>
                  <div className="mt-2">{renderList(result.mentor_actions?.tasks_assigned)}</div>
                </div>

                <div className="bg-white shadow rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-lg text-slate-900">Student State</h3>
                  <p className={`mt-2 ${getSentimentClassName(result.student_state?.sentiment)}`}>
                    Sentiment: {result.student_state?.sentiment ?? "No data available"}
                  </p>
                  <p className="text-slate-700">
                    Confidence Level:{" "}
                    {result.student_state?.confidence_level ?? "No data available"}
                  </p>
                </div>

                <div className="bg-white shadow rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-lg text-slate-900">Summary</h3>
                  <div className="mt-2 bg-blue-50 border-l-4 border-blue-500 p-3 text-slate-700">
                    {result.summary || "No data available"}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition duration-150 hover:bg-slate-100"
                >
                  Copy JSON
                </button>
                <button
                  type="button"
                  onClick={handleProcessAnother}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition duration-150 hover:bg-slate-100"
                >
                  Process Another
                </button>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-gray-500">Select a session to view details</p>
            </div>
          )}
        </section>
        </section>
      )}
      </main>
    </>
  )
}
