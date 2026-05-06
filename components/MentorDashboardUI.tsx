"use client"

import { useState, useMemo } from 'react'
import SessionModal from './SessionModal'

interface Class {
  id: string
  name: string
  class_code: string
  students: Array<{
    student_id: string
    profiles?: {
      id: string
      email: string
      role: string
    }
  }>
}

interface Student {
  student_id: string
  email: string
  classId: string
  className: string
}

interface Props {
  classes: Class[]
  mentorId: string
}

export default function MentorDashboardUI({ classes, mentorId }: Props) {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentView, setCurrentView] = useState<"dashboard" | "session">("dashboard")
  const [studentFilter, setStudentFilter] = useState<"all" | "needs_attention" | "active">("all")

  // Transform classes to flat student list for UI compatibility
  const allStudents: Student[] = useMemo(() => {
    console.log("UI STUDENT DATA:", classes)
    return classes.flatMap(classItem => 
      classItem.students.map(student => ({
        student_id: student.student_id,
        email: student.profiles?.email || 'Unknown Email',
        classId: classItem.id,
        className: classItem.name
      }))
    )
  }, [classes])

  // Calculate student status (simplified for now)
  const calculateStudentStatus = (student: Student) => {
    // For now, all students are "active" - this can be enhanced with real session data
    return { status: "active", label: "Active", color: "green" }
  }

  // Get filtered students based on selected filter
  const getFilteredStudents = () => {
    return allStudents.filter(student => {
      const studentStatus = calculateStudentStatus(student)
      
      if (studentFilter === "needs_attention") {
        return studentStatus.status === "needs_attention"
      } else if (studentFilter === "active") {
        return studentStatus.status === "active"
      }
      
      return true // "all" filter
    })
  }

  // Handle student card click
  const handleStudentCardClick = (student: Student) => {
    setSelectedStudent(student)
    setIsModalOpen(true)
  }

  // Handle session created
  const handleSessionCreated = () => {
    // Refresh data or handle session creation
    console.log("Session created for student:", selectedStudent?.email)
  }

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
                Mentor Dashboard
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Overview of all students and their mentoring status
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition duration-150 hover:bg-slate-100"
              >
                Reset
              </button>
            </div>
          </div>
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

            {/* Classes and Students */}
            {getFilteredStudents().length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-600">
                  {allStudents.length === 0 
                    ? "No students added yet" 
                    : studentFilter === "needs_attention"
                    ? "No students need attention"
                    : studentFilter === "active"
                    ? "No active students"
                    : "No students found"
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {classes.map((classItem) => (
                  <div key={classItem.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{classItem.name}</h3>
                        <p className="text-sm text-gray-500">Code: {classItem.class_code}</p>
                      </div>
                      <span className="text-sm text-gray-500">
                        {classItem.students.length} student{classItem.students.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {classItem.students.map((student) => {
                        const studentWithClass = {
                          student_id: student.student_id,
                          email: student.profiles?.email || 'Unknown Email',
                          classId: classItem.id,
                          className: classItem.name
                        }
                        const studentStatus = calculateStudentStatus(studentWithClass)
                        
                        return (
                          <button
                            key={student.student_id}
                            onClick={() => handleStudentCardClick(studentWithClass)}
                            className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 text-left"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <h4 className="text-base font-semibold text-slate-900 truncate">
                                {student.profiles?.email || 'Unknown Email'}
                              </h4>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                                studentStatus.color === "red" 
                                  ? "bg-red-100 text-red-700"
                                  : "bg-green-100 text-green-700"
                              }`}>
                                {studentStatus.label}
                              </span>
                            </div>
                            
                            <div className="space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-600">Class:</span>
                                <span className="text-sm font-medium text-slate-900 truncate ml-2">
                                  {classItem.name}
                                </span>
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Session Modal */}
      {selectedStudent && (
        <SessionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          student={{
            id: selectedStudent.student_id,
            email: selectedStudent.email
          }}
          onSessionCreated={handleSessionCreated}
        />
      )}
    </>
  )
}
