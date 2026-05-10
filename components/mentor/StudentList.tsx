'use client'

import { useState, useMemo } from 'react';

interface StudentListProps {
  students: Array<{ id: string; name: string; email: string }>;
  selectedStudent: any;
  onSelect: (student: any) => void;
}

export default function StudentList({ students, selectedStudent, onSelect }: StudentListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStudents = useMemo(() => {
    if (!students) return [];
    if (!searchQuery.trim()) return students;
    const lowerQuery = searchQuery.toLowerCase();
    return students.filter(s => s.name?.toLowerCase().includes(lowerQuery));
  }, [students, searchQuery]);

  const getInitials = (name: string) => {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return (name[0] + (name[1] || '')).toUpperCase();
  };

  return (
    <div className="w-72 border-r border-gray-800 flex flex-col h-full bg-gray-950 shrink-0">
      {/* HEADER */}
      <div className="p-4 border-b border-gray-800 flex flex-col gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
            style={{
              backgroundColor: 'var(--color-background-info, #1e3a8a)',
              color: 'var(--color-text-info, #bfdbfe)'
            }}
          >
            M
          </div>
          <span className="font-semibold text-white">Mentor</span>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Search students..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 pr-8"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              &times;
            </button>
          )}
        </div>
      </div>

      {/* STUDENT LIST */}
      <div className="flex-1 overflow-y-auto">
        {filteredStudents.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No students found
          </div>
        ) : (
          <ul className="flex flex-col">
            {filteredStudents.map((student, index) => {
              const isActive = selectedStudent?.id === student.id;

              return (
                <li
                  key={student.id ?? student.email ?? index}
                  onClick={() => onSelect(student)}
                  className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-900 transition-colors"
                  style={{
                    backgroundColor: isActive ? 'var(--color-background-secondary, #1f2937)' : 'transparent',
                    borderLeft: isActive ? '2px solid var(--color-border-info, #3b82f6)' : '2px solid transparent'
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-medium text-sm"
                    style={{
                      backgroundColor: 'var(--color-background-info, #1e3a8a)',
                      color: 'var(--color-text-info, #bfdbfe)'
                    }}
                  >
                    {getInitials(student.name)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-white truncate">
                      {student.name}
                    </div>
                    <div className="text-[11px] text-gray-500 truncate mt-0.5">
                      {student.email}
                    </div>
                  </div>

                  <div className="w-2 h-2 rounded-full bg-gray-500 shrink-0" />
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* FOOTER */}
      <div className="p-4 border-t border-gray-800 shrink-0">
        <a href="#" className="text-[12px] text-gray-500 hover:text-gray-300">
          Sign out
        </a>
      </div>
    </div>
  );
}
